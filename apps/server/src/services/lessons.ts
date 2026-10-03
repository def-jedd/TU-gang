import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { env, publicDir } from '../lib/env.js';
import type { Difficulty, Language } from '../types/tutor.js';
import { VoiceError } from './agora.js';
import { saveAnswer } from './answerStore.js';
import { bikolExamples } from './bikolExamples.js';

/**
 * ILAW lessons (DepEd Order No. 16, s. 2026) generated from the OFFICIAL
 * Term 1 competencies in data/curriculum (Budgets of Work, word for word):
 *
 *   I  Intentions          — what the student will be able to do today
 *   L  Learning experiences — 3 short steps, each with a quick check question
 *   A  Assessment          — a 5-question exam (tracked on the student's card)
 *   W  Ways forward        — recap + something small to practise
 *
 * Third-party DLLs and exams are NOT copied (see the resources note); Gemini
 * writes the lesson from the competency text, labelled draft / AI-generated.
 * Cached on disk so a lesson is generated once per language and level.
 */

const ROOT = join(publicDir, '../../..');
const CURRICULUM_DIR = join(ROOT, 'data/curriculum');
const CACHE_DIR = join(publicDir, '../.cache/lessons');

type CurriculumEntry = { id: string; grade: number; subject: string; week: number; competency: string; topic?: string; title?: { en?: string } };

let curriculum: Map<string, CurriculumEntry> | undefined;
function entry(id: string): CurriculumEntry | undefined {
  if (!curriculum) {
    curriculum = new Map();
    for (let grade = 1; grade <= 9; grade++) {
      try {
        const data = JSON.parse(readFileSync(join(CURRICULUM_DIR, `grade-${grade}.json`), 'utf8')) as { entries: CurriculumEntry[] };
        for (const e of data.entries) curriculum.set(e.id, e);
      } catch (error) {
        console.warn(`[lessons] grade ${grade}: ${(error as Error).message}`);
      }
    }
  }
  return curriculum.get(id);
}

/** The official competency for a lesson id (also used by live calls). */
export function curriculumEntry(id: string) {
  return entry(id) ?? null;
}

// ---- what Gemini must return

const choiceQuestion = z.object({
  question: z.string().min(3).max(400),
  choices: z.array(z.string().min(1).max(160)).length(3),
  answer: z.number().int().min(0).max(2),
  why: z.string().min(3).max(400),
});
const generated = z.object({
  intentions: z.string().min(5).max(500),
  steps: z.array(z.object({ text: z.string().min(10).max(900), check: choiceQuestion })).min(2).max(4),
  exam: z.array(choiceQuestion).min(4).max(6),
  ways_forward: z.string().min(5).max(600),
});
type Generated = z.infer<typeof generated>;
type ChoiceQuestion = z.infer<typeof choiceQuestion>;

const S = (description: string) => ({ type: 'STRING', description });
const QUESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    question: S('The question, spoken style'),
    choices: { type: 'ARRAY', items: S('Short choice, at most about 6 words'), minItems: 3, maxItems: 3 },
    answer: { type: 'INTEGER', description: 'Index (0-2) of the one correct choice' },
    why: S('One short sentence: why the answer is right'),
  },
  required: ['question', 'choices', 'answer', 'why'],
};
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intentions: S('1-2 sentences: what the student will be able to do after this lesson'),
    steps: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: { text: S('2-4 short sentences teaching one idea, with an everyday example'), check: QUESTION_SCHEMA },
        required: ['text', 'check'],
      },
    },
    exam: { type: 'ARRAY', minItems: 5, maxItems: 5, items: QUESTION_SCHEMA },
    ways_forward: S('2 sentences: a recap and one small thing to practise at home'),
  },
  required: ['intentions', 'steps', 'exam', 'ways_forward'],
};

const LANGUAGE_RULE: Record<Language, string> = {
  bikol_daet: 'natural Bikol, not Tagalog, following the wording of the Bikol examples. Keep English for technical terms you are unsure of.',
  tagalog: 'natural, simple Tagalog. Taglish is fine for technical terms.',
  english: 'simple, clear English.',
};
const LEVEL: Record<Difficulty, string> = {
  very_simple: 'everyday words, one idea per step, tiny examples, as for a young child',
  simple: 'grade-school words, one cause and one example per step',
  normal: 'the correct terms, how it works, fuller examples',
};

function buildPrompt(e: CurriculumEntry, language: Language, difficulty: Difficulty): { system: string; user: string } {
  const system = `You write one short lesson in the DepEd ILAW format for a Filipino Grade ${e.grade} student
who may not read well. The student HEARS every word, so write the way a kind teacher speaks:
short sentences, no markdown, no symbols, no emojis, numbers as words.

Write everything (including questions and choices) in ${LANGUAGE_RULE[language]}
Level: ${LEVEL[difficulty]}.

Rules for questions:
- Exactly 3 choices, exactly one correct; wrong choices are believable but clearly wrong.
- No "all of the above" or "none of the above". No trick questions.
- Every exam question must be answerable from the lesson steps.
- Nothing needs a picture or reading a long text: the student only hears it.
- For phonics or reading skills, ask about sounds and spoken words.
Teach only what the competency asks. If unsure of a fact, keep it simple and correct.
Use everyday Filipino life for examples (rice, rain, the market, the sari-sari store, the sea).
${language === 'bikol_daet' ? bikolExamples(e.topic ?? null, 4) : ''}`;

  const user = `DepEd Term 1 competency (${e.subject.replace(/_/g, ' ')}, Grade ${e.grade}, Week ${e.week}):
"""
${e.competency}
"""
Write the lesson for this competency.`;
  return { system, user };
}

async function askGemini(system: string, user: string, temperature = 0.4): Promise<Generated> {
  if (!env.GEMINI_API_KEY) throw new VoiceError(503, 'Lessons need GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature,
          maxOutputTokens: 4096,
        },
      }),
    });
    if (!response.ok) {
      lastError = `Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`;
      continue;
    }
    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      const parsed = generated.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
      lastError = `bad lesson shape: ${parsed.error.issues[0]?.message}`;
    } catch {
      lastError = 'Gemini did not return JSON';
    }
    console.warn(`[lessons] attempt ${attempt}: ${lastError}`);
  }
  throw new VoiceError(502, `Could not make this lesson: ${lastError}`);
}

const REVIEW_SYSTEM = `You are a strict primary-school teacher checking a lesson and quiz before
children use it. The children only HEAR the questions. Return the SAME lesson as JSON in the same
format, changing only what is wrong:
- Every question must have exactly ONE correct choice. If two choices could be right (for example
  two words that both rhyme, or two true statements), replace the extra one with a clearly wrong choice.
- "answer" must be the index of the correct choice, and "why" must agree with it.
- Every quiz question must be answerable from the lesson steps.
- Facts must be correct for the grade. Fix any wrong fact.
- Keep the language, wording and level; do not add new content. If nothing is wrong, return it unchanged.`;

/** A second pass that catches questions with two right answers, wrong keys and wrong facts. */
async function review(lesson: Generated, e: CurriculumEntry): Promise<Generated> {
  try {
    const user = `Competency: "${e.competency}" (Grade ${e.grade}).\n\nLesson JSON:\n${JSON.stringify(lesson)}`;
    return await askGemini(REVIEW_SYSTEM, user, 0);
  } catch (error) {
    console.warn(`[lessons] review failed, keeping first draft: ${(error as Error).message}`);
    return lesson;
  }
}

/** Repeatable pseudo-random numbers from a seed (so a cached lesson never changes). */
function seeded(seed: string) {
  let n = 0;
  return () => createHash('sha256').update(`${seed}:${n++}`).digest().readUInt32BE(0) / 2 ** 32;
}

/**
 * Models put the right answer first far too often (and children notice "it's
 * usually A"). Spread the correct answers evenly over A/B/C, in a repeatable order.
 */
function balanceAnswers(questions: ChoiceQuestion[], seed: string): ChoiceQuestion[] {
  const random = seeded(seed);
  const targets = questions.map((_, i) => i % 3).sort(() => random() - 0.5);
  return questions.map((q, i) => {
    const wrong = q.choices.filter((_, c) => c !== q.answer).sort(() => random() - 0.5);
    const choices = [...wrong];
    choices.splice(targets[i], 0, q.choices[q.answer]);
    return { ...q, choices, answer: targets[i] };
  });
}

// ---- public API

export type SpokenText = { text: string; request_id: string };
export type LessonQuestion = ChoiceQuestion & { request_id: string };
export type LessonPack = {
  lesson_id: string;
  language: Language;
  difficulty: Difficulty;
  provider: 'gemini';
  review_status: 'draft';
  competency: string;
  intentions: SpokenText;
  steps: { text: string; request_id: string; check: LessonQuestion }[];
  exam: LessonQuestion[];
  ways_forward: SpokenText;
};

const LETTERS = ['A', 'B', 'C'];
const asSpeech = (q: ChoiceQuestion) => `${q.question} ${q.choices.map((c, i) => `${LETTERS[i]}: ${c}.`).join(' ')}`;

const inFlight = new Map<string, Promise<Generated>>();

export async function getLesson(lessonId: string, language: Language, difficulty: Difficulty): Promise<LessonPack> {
  const e = entry(lessonId);
  if (!e) throw new VoiceError(404, 'Lesson not found');

  const key = `${lessonId}.${language}.${difficulty}`;
  const cacheFile = join(CACHE_DIR, `${key}.json`);
  let lesson: Generated | undefined;
  try {
    lesson = generated.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
  } catch {
    // not cached yet (or an old/broken cache file): generate
  }
  if (!lesson) {
    let pending = inFlight.get(key);
    if (!pending) {
      const { system, user } = buildPrompt(e, language, difficulty);
      pending = askGemini(system, user).then((draft) => review(draft, e)).then((g) => ({
        ...g,
        steps: balanceAnswers(g.steps.map((s) => s.check), `${key}:steps`).map((check, i) => ({ ...g.steps[i], check })),
        exam: balanceAnswers(g.exam, `${key}:exam`),
      }));
      inFlight.set(key, pending);
      pending.finally(() => inFlight.delete(key)).catch(() => {});
    }
    lesson = await pending;
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(lesson, null, 1));
    console.log(`[lessons] generated ${key}`);
  }

  // Every part gets a request_id so "Listen" (Agora voice) can speak it.
  const spoken = (text: string, part: string): string => {
    const request_id = `lesson-${randomUUID()}`;
    saveAnswer({
      request_id, topic: e.topic ?? null, language, explanation: text, example: '', key_points: [],
      source_ids: [`${lessonId}#${part}`], provider: 'gemini',
    });
    return request_id;
  };
  const question = (q: ChoiceQuestion, part: string): LessonQuestion => ({ ...q, request_id: spoken(asSpeech(q), part) });

  return {
    lesson_id: lessonId,
    language,
    difficulty,
    provider: 'gemini',
    review_status: 'draft',
    competency: e.competency,
    intentions: { text: lesson.intentions, request_id: spoken(lesson.intentions, 'I') },
    steps: lesson.steps.map((s, i) => ({ text: s.text, request_id: spoken(s.text, `L${i}`), check: question(s.check, `L${i}q`) })),
    exam: lesson.exam.map((q, i) => question(q, `A${i}`)),
    ways_forward: { text: lesson.ways_forward, request_id: spoken(lesson.ways_forward, 'W') },
  };
}
