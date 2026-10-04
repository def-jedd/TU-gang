export type Language = 'bikol_daet' | 'tagalog' | 'english';

// Shared API contract (frozen with Teammate 1). Keep in sync with apps/mobile/src/types/tutor.ts.

export const DIFFICULTIES = ['very_simple', 'simple', 'normal'] as const;
export const STYLES = ['teacher', 'friend', 'ate_kuya'] as const;
export const ACTIONS = ['explain', 'explain_differently'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Style = (typeof STYLES)[number];
export type Action = (typeof ACTIONS)[number];
export type Provider = 'gemini' | 'quick' | 'approved_fallback' | 'mock';

export type ExplainRequest = {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  topic?: string | null;
  language: Language;
  difficulty: Difficulty;
  style: Style;
  action: Action;
};

export type ExplainResponse = {
  request_id: string;
  topic: string | null;
  language: Language;
  explanation: string;
  example: string;
  key_points: string[];
  source_ids: string[];
  provider: Provider;
};
