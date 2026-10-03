import type { ExplainResponse } from '../types/tutor.js';

// Agora's speak API accepts at most 512 bytes per call; leave headroom.
export const SPEAK_LIMIT_BYTES = 500;

const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

export function answerToSpeech(answer: Pick<ExplainResponse, 'explanation' | 'example' | 'key_points'>): string {
  return [answer.explanation, answer.example, ...answer.key_points]
    .map((part) => part?.trim())
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');
}

/** Split text into speak-sized chunks at sentence ends (word ends as a last resort). */
export function chunkForSpeak(text: string, limit = SPEAK_LIMIT_BYTES): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const pieces: string[] = [];
  for (const sentence of sentences) {
    if (bytes(sentence) <= limit) {
      pieces.push(sentence);
      continue;
    }
    let current = '';
    for (const word of sentence.split(' ')) {
      if (current && bytes(`${current} ${word}`) > limit) {
        pieces.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) pieces.push(current);
  }

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const next = current ? `${current} ${piece.trim()}` : piece.trim();
    if (current && bytes(next) > limit) {
      chunks.push(current);
      current = piece.trim();
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
