// Make a paste-ready packet for the Amazon Quick "Bikol Tutor" agent: the
// Gemini draft of each lesson, for Quick to check and correct.
//
//   npm run quick:export -- <grade> [language] [difficulty] [--subject science] [--limit 10] [--ids id1,id2]
//   npm run quick:export -- 3 bikol_daet simple --subject science --limit 5
//
// Writes data/quick_review/grade-<g>.<language>.<difficulty>.md (git-ignored).
// Quick's replies go into data/quick_review/replies.txt, then: npm run quick:import
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicDir } from '../src/lib/env.js';
import { curriculumEntry, draftLesson } from '../src/services/lessons.js';
import type { Difficulty, Language } from '../src/types/tutor.js';

const ROOT = join(publicDir, '../../..');
const OUT_DIR = join(ROOT, 'data/quick_review');

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const subject = flag('subject');
const limit = Number(flag('limit') ?? 10);
const onlyIds = flag('ids')?.split(',').map((s) => s.trim());
const [gradeArg, language = 'bikol_daet', difficulty = 'simple'] = args;
const grade = Number(gradeArg);
if (!(grade >= 1 && grade <= 9) || !['bikol_daet', 'tagalog', 'english'].includes(language) || !['very_simple', 'simple', 'normal'].includes(difficulty)) {
  console.error('Usage: npm run quick:export -- <grade 1-9> [bikol_daet|tagalog|english] [very_simple|simple|normal] [--subject science] [--limit 10] [--ids id1,id2]');
  process.exit(1);
}

type Entry = { id: string; subject: string; week: number };
const all = (JSON.parse(readFileSync(join(ROOT, 'data/curriculum', `grade-${grade}.json`), 'utf8')) as { entries: Entry[] }).entries;
const chosen = (onlyIds ? all.filter((e) => onlyIds.includes(e.id)) : all.filter((e) => !subject || e.subject === subject)).slice(0, onlyIds ? undefined : limit);
if (!chosen.length) {
  console.error(`No lessons match (grade ${grade}${subject ? `, subject ${subject}` : ''}).`);
  process.exit(1);
}

const LANGUAGE_NAME: Record<string, string> = { bikol_daet: 'Bikol', tagalog: 'Tagalog', english: 'English' };

const setup = `You are checking short lessons for TU-gang, a voice tutor for Filipino children aged 16 and under
who may not read well: they HEAR every word. Each lesson follows the DepEd ILAW format
(Intentions, Learning steps with a quick check, Assessment quiz, Ways forward) and was drafted
by another AI from an official DepEd competency. Your job is to check it and fix what is wrong.

Check and fix:
1. Every question has exactly ONE correct choice (for example, never two words that both rhyme).
2. "answer" is the index of the correct choice: 0 = first, 1 = second, 2 = third. "why" agrees with it.
3. Every quiz question can be answered from the lesson steps.
4. Facts are correct for the grade, and the lesson teaches the competency.
5. The language is natural ${LANGUAGE_NAME[language]}${language === 'bikol_daet' ? ' (not Tagalog). Use the Bikol examples in your knowledge (quick_reference) for wording' : ''}.
6. Short spoken sentences, no symbols or markdown inside the text.
Keep the same structure: 3 steps, 5 quiz questions, 3 choices each. Do not add anything else.

Reply with ONLY one JSON code block in exactly this shape:
\`\`\`json
{"lesson_id": "...", "language": "...", "difficulty": "...", "changes": "one short sentence: what you fixed, or 'no changes'",
 "lesson": {"intentions": "...", "steps": [{"text": "...", "check": {"question": "...", "choices": ["...", "...", "..."], "answer": 0, "why": "..."}}],
            "exam": [{"question": "...", "choices": ["...", "...", "..."], "answer": 0, "why": "..."}], "ways_forward": "..."}}
\`\`\`
Say "ready" now. I will send one lesson per message.`;

const parts: string[] = [
  `# Amazon Quick review packet: Grade ${grade}, ${LANGUAGE_NAME[language]}, ${difficulty}`,
  '',
  '**How to use (for the person at the keyboard)**',
  '1. Quick console → open the **Bikol Tutor** chat agent (its knowledge should include `data/quick_reference.md`).',
  '2. Paste **MESSAGE 0** once. Then paste each **LESSON** message, one at a time, and wait for the reply.',
  '3. Copy each JSON reply from Quick and paste it at the end of `data/quick_review/replies.txt` (keep adding; any extra text is fine).',
  '4. In `apps/server`, run `npm run quick:import`. Imported lessons show "Checked by Amazon Quick" in the app.',
  '',
  '---',
  '',
  '## MESSAGE 0 (paste once)',
  '',
  '```text',
  setup,
  '```',
];

let n = 0;
for (const e of chosen) {
  process.stdout.write(`drafting ${e.id}… `);
  const draft = await draftLesson(e.id, language as Language, difficulty as Difficulty);
  console.log('ok');
  const entry = curriculumEntry(e.id)!;
  n++;
  parts.push(
    '',
    `## LESSON ${n}: ${e.id} (${e.subject.replace(/_/g, ' ')}, week ${e.week})`,
    '',
    '```text',
    `Check this lesson. lesson_id: ${e.id}, language: ${language}, difficulty: ${difficulty}`,
    `DepEd competency (Grade ${grade}): "${entry.competency.replace(/\n/g, ' ')}"`,
    'Draft:',
    JSON.stringify(draft),
    '```',
  );
}

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `grade-${grade}.${language}.${difficulty}.md`);
writeFileSync(out, parts.join('\n') + '\n');
const replies = join(OUT_DIR, 'replies.txt');
try {
  readFileSync(replies);
} catch {
  writeFileSync(replies, "Paste Amazon Quick's JSON replies below (one after another).\n\n");
}
console.log(`\nWrote ${n} lessons to ${out}\nPaste Quick's replies into ${replies}, then run: npm run quick:import`);
process.exit(0);
