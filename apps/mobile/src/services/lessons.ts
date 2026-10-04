import type { Difficulty, Language } from '../types/tutor';
import { requestJson } from './api';
import { API_BASE_URL } from './config';
import { TutorError } from './errors';

/** One multiple-choice question; `answer` is the index of the right choice. */
export type LessonQuestion = { question: string; choices: string[]; answer: number; why: string; request_id: string };

/** An ILAW lesson made by the server (apps/server/src/services/lessons.ts). */
export type LessonPack = {
  lesson_id: string;
  language: Language;
  difficulty: Difficulty;
  /** 'quick' = checked by Amazon Quick (saved); 'gemini' = AI draft. */
  provider: 'gemini' | 'quick';
  review_status: 'draft' | 'quick_reviewed';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  competency: string;
  intentions: { text: string; request_id: string };
  steps: { text: string; request_id: string; check: LessonQuestion }[];
  exam: LessonQuestion[];
  ways_forward: { text: string; request_id: string };
};

export async function fetchLesson(lessonId: string, language: Language, difficulty: Difficulty, signal?: AbortSignal): Promise<LessonPack> {
  if (!API_BASE_URL) throw new TutorError('network', 'EXPO_PUBLIC_API_BASE_URL is not set');
  const raw = (await requestJson(
    `${API_BASE_URL}/api/lessons`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, language, difficulty }),
    },
    120_000, // first time, the server writes the lesson (a few seconds); then it's cached
    signal,
  )) as Partial<LessonPack> | null;
  const ok =
    raw &&
    typeof raw.intentions?.text === 'string' &&
    Array.isArray(raw.steps) &&
    raw.steps.length > 0 &&
    Array.isArray(raw.exam) &&
    raw.exam.length > 0 &&
    typeof raw.ways_forward?.text === 'string';
  if (!ok) throw new TutorError('bad_response', 'Lesson response is missing parts');
  return raw as LessonPack;
}

/** 0–100. */
export const examScore = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);
