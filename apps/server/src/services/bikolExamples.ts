import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicDir } from '../lib/env.js';

// Speaker-reviewed Bikol tutoring lines from Jed's dataset. Without them Gemini
// drifts into Tagalog (seen in testing). Wording only, never facts.
const CHUNKS_PATH = join(publicDir, '../../bikol-rag-cli/data/processed/bikol_chunks.json');
type Chunk = { role?: string; topic?: string; text?: string };
let chunks: Chunk[] | undefined;

/** A prompt section with up to `count` Bikol examples, same topic first ('' if none). */
export function bikolExamples(topic: string | null, count = 5): string {
  if (chunks === undefined) {
    try {
      const raw = JSON.parse(readFileSync(CHUNKS_PATH, 'utf8')) as Chunk[] | { chunks: Chunk[] };
      chunks = (Array.isArray(raw) ? raw : raw.chunks).filter((c) => c.role === 'tutoring_style' && c.text);
    } catch {
      chunks = [];
      console.warn(`[bikol] no examples at ${CHUNKS_PATH}; Bikol output may drift into Tagalog`);
    }
  }
  const wanted = topic ?? '';
  const picked = [...chunks].sort((a, b) => Number(b.topic === wanted) - Number(a.topic === wanted)).slice(0, count);
  if (!picked.length) return '';
  const lines = picked.map((c) => c.text).join('\n\n');
  return `\nBIKOL EXAMPLES (wording and style only; not facts for other topics)\n${lines}\n`;
}
