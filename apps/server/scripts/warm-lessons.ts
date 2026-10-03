// Pre-generate (cache) lessons so the demo never waits on Gemini.
//   npm run lessons:warm -- <grade> [language] [difficulty]
//   npm run lessons:warm -- 3 bikol_daet simple
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicDir } from '../src/lib/env.js';
import { getLesson } from '../src/services/lessons.js';
import type { Difficulty, Language } from '../src/types/tutor.js';

const [gradeArg, language = 'bikol_daet', difficulty = 'simple'] = process.argv.slice(2);
const grade = Number(gradeArg);
if (!(grade >= 1 && grade <= 9)) {
  console.error('Usage: npm run lessons:warm -- <grade 1-9> [bikol_daet|tagalog|english] [very_simple|simple|normal]');
  process.exit(1);
}
const file = join(publicDir, '../../../data/curriculum', `grade-${grade}.json`);
const ids = (JSON.parse(readFileSync(file, 'utf8')) as { entries: { id: string }[] }).entries.map((e) => e.id);

let done = 0;
let failed = 0;
const queue = [...ids];
async function worker() {
  for (let id = queue.shift(); id; id = queue.shift()) {
    try {
      await getLesson(id, language as Language, difficulty as Difficulty);
    } catch (error) {
      failed++;
      console.warn(`  ${id}: ${(error as Error).message}`);
    }
    if (++done % 10 === 0 || done === ids.length) console.log(`${done}/${ids.length} (${failed} failed)`);
  }
}
await Promise.all([worker(), worker(), worker()]); // 3 at a time: gentle on the Gemini quota
process.exit(failed ? 1 : 0);
