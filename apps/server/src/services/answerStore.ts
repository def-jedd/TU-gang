import type { ExplainResponse } from '../types/tutor.js';

// Recent /api/explain answers, so "Listen" can speak an answer by request_id
// instead of accepting arbitrary text from the app. In-memory: fine for one
// demo server; answers are lost on restart.
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 500;

const answers = new Map<string, { answer: ExplainResponse; savedAt: number }>();

export function saveAnswer(answer: ExplainResponse): void {
  answers.set(answer.request_id, { answer, savedAt: Date.now() });
  while (answers.size > MAX_ENTRIES) {
    const oldest = answers.keys().next().value;
    if (oldest === undefined) break;
    answers.delete(oldest);
  }
}

export function getAnswer(requestId: string): ExplainResponse | null {
  const entry = answers.get(requestId);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL_MS) {
    answers.delete(requestId);
    return null;
  }
  return entry.answer;
}
