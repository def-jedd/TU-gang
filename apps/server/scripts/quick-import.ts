// Save Amazon Quick's checked lessons so the app serves them ("Checked by Amazon Quick").
//
//   npm run quick:import                 (reads data/quick_review/replies.txt)
//   npm run quick:import -- path/to/replies.txt
//
// The file can hold Quick's chat replies as pasted (extra text is fine): every
// JSON object with a lesson_id is validated and saved to data/quick_lessons/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { publicDir } from '../src/lib/env.js';
import { balanceLesson, curriculumEntry, lessonSchema, quickLessonFile, quickLessonPath } from '../src/services/lessons.js';

const ROOT = join(publicDir, '../../..');
const input = process.argv[2]
  ? resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2])
  : join(ROOT, 'data/quick_review/replies.txt');

let text: string;
try {
  text = readFileSync(input, 'utf8');
} catch {
  console.error(`Can't read ${input}. Run npm run quick:export first, then paste Quick's replies there.`);
  process.exit(1);
}

/** Every top-level {...} in the text (brace matching that skips strings). */
function jsonObjects(source: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"' && depth > 0) inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0) found.push(source.slice(start, i + 1));
    }
  }
  return found;
}

/** Quick sometimes answers "B" instead of 1. */
function normaliseAnswers(lesson: unknown) {
  const fix = (q: { answer?: unknown }) => {
    if (typeof q?.answer === 'string') {
      const letter = 'ABC'.indexOf(q.answer.trim().toUpperCase());
      q.answer = letter >= 0 ? letter : Number(q.answer);
    }
  };
  const l = lesson as { steps?: { check?: { answer?: unknown } }[]; exam?: { answer?: unknown }[] };
  l?.steps?.forEach((s) => s?.check && fix(s.check));
  l?.exam?.forEach(fix);
}

let saved = 0;
let rejected = 0;
const today = new Date().toISOString().slice(0, 10);

for (const raw of jsonObjects(text)) {
  let data: { lesson_id?: string; language?: string; difficulty?: string; changes?: string; lesson?: unknown };
  try {
    data = JSON.parse(raw);
  } catch {
    continue; // not JSON (e.g. braces in prose)
  }
  if (!data || typeof data.lesson_id !== 'string') continue;
  const id = data.lesson_id;
  const reject = (why: string) => {
    rejected++;
    console.warn(`✗ ${id}: ${why}`);
  };

  if (!curriculumEntry(id)) {
    reject('unknown lesson_id');
    continue;
  }
  normaliseAnswers(data.lesson);
  const lesson = lessonSchema.safeParse(data.lesson);
  if (!lesson.success) {
    const issue = lesson.error.issues[0];
    reject(`lesson doesn't match the format (${issue?.path.join('.')}: ${issue?.message})`);
    continue;
  }
  const file = quickLessonFile.safeParse({
    lesson_id: id,
    language: data.language,
    difficulty: data.difficulty,
    generated_by: 'Gemini draft, checked and corrected by Amazon Quick (Bikol Tutor agent)',
    reviewed_at: today,
    changes: typeof data.changes === 'string' ? data.changes.slice(0, 300) : undefined,
    lesson: balanceLesson(lesson.data, `${id}:quick`),
  });
  if (!file.success) {
    reject(`missing or wrong language/difficulty (${file.error.issues[0]?.message})`);
    continue;
  }
  const path = quickLessonPath(id, file.data.language, file.data.difficulty);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file.data, null, 2) + '\n');
  saved++;
  console.log(`✓ ${id} (${file.data.language}, ${file.data.difficulty})${file.data.changes ? `: ${file.data.changes}` : ''}`);
}

console.log(`\n${saved} saved to data/quick_lessons/, ${rejected} rejected.`);
if (!saved && !rejected) console.log(`No lesson JSON found in ${input}. Paste Quick's replies there first.`);
process.exit(rejected ? 1 : 0);
