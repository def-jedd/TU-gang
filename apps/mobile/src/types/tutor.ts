/**
 * Shared API contract for POST /api/explain.
 *
 * FROZEN with the backend owner (Teammate 3). If a field changes here it must
 * change in apps/bikol-rag-cli/server.py (ExplainRequest) in the same hour —
 * otherwise the request will fail validation.
 */

export type Language = 'bikol_daet';
export type Difficulty = 'very_simple' | 'simple' | 'normal';
export type TeachingStyle = 'teacher' | 'friend' | 'ate_kuya';
export type TutorAction = 'explain' | 'explain_differently';
/** `ollama` = local placeholder model; `kiro` = Kiro CLI (the planned agent model). */
export type Provider = 'gemini' | 'ollama' | 'kiro' | 'quick' | 'approved_fallback' | 'mock';

/** Request body. Key order matches the agreed JSON so logs are easy to diff. */
export type ExplainRequest = {
  question: string;
  /** Filled in when a topic card (NFC or on-screen) is used; null for free-text questions. */
  topic: string | null;
  language: Language;
  difficulty: Difficulty;
  style: TeachingStyle;
  action: TutorAction;
};

export type ExplainResponse = {
  request_id: string;
  topic: string | null;
  language: Language;
  explanation: string;
  /** May be empty — the UI hides the section rather than showing a blank card. */
  example: string;
  key_points: string[];
  /** May be empty. The UI never depends on citations being present. */
  source_ids: string[];
  /**
   * Who actually generated the text. `unknown` is a client-side value used
   * only when the server omits or misspells the field, so we never mislabel it.
   */
  provider: Provider | 'unknown';
};

export type HealthResponse = {
  status: string;
  version?: string;
  provider?: string;
};
