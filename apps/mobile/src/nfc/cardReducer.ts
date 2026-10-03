/**
 * The learning-request "draft" and every way to change it.
 *
 * Physical NFC cards, the on-screen card simulator, AND the normal buttons on
 * the Home screen all go through this one reducer. That is what guarantees a
 * tapped card produces exactly the same JSON as typing + tapping buttons.
 *
 * This file must stay dependency-free (type-only imports) so it can be unit
 * tested with plain `node --test`.
 */
import type {
  Difficulty,
  ExplainRequest,
  Language,
  TeachingStyle,
  TutorAction,
} from '../types/tutor';

export const MAX_QUESTION_LENGTH = 500;

/**
 * Built-in topic cards → the question each card asks. Topic ids match the
 * `topic` field in Teammate 4's dataset. Unknown TOPIC_* cards are still
 * accepted (see parseCardCode) so teachers can make new cards without an
 * app update — topics are a shortcut, never a whitelist.
 */
export const TOPIC_QUESTIONS: Record<string, string> = {
  photosynthesis: 'How do plants make their own food?',
  gravity: 'Why do things fall down?',
  melting: 'Why does ice melt?',
  friction: 'Why do moving things slow down?',
  fractions: 'What is a fraction?',
};

export function questionForTopic(topic: string): string {
  return TOPIC_QUESTIONS[topic] ?? `Explain ${topic.replace(/_/g, ' ')}`;
}

export type CardAction =
  | { type: 'TOPIC'; value: string }
  | { type: 'DIFFICULTY'; value: Difficulty }
  | { type: 'STYLE'; value: TeachingStyle }
  | { type: 'LANGUAGE'; value: Language }
  | { type: 'SUBMIT' }
  | { type: 'EXPLAIN_DIFFERENTLY' }
  | { type: 'RESET' };

export type DraftAction = CardAction | { type: 'QUESTION'; value: string };

export type LearningDraft = {
  question: string;
  topic: string | null;
  language: Language;
  difficulty: Difficulty;
  style: TeachingStyle;
};

export const INITIAL_DRAFT: LearningDraft = {
  question: '',
  topic: null,
  language: 'bikol_daet',
  difficulty: 'simple',
  style: 'ate_kuya',
};

const DIFFICULTY_CODES: Record<string, Difficulty> = {
  MODE_VERY_SIMPLE: 'very_simple',
  MODE_SIMPLE: 'simple',
  MODE_NORMAL: 'normal',
};

const STYLE_CODES: Record<string, TeachingStyle> = {
  STYLE_TEACHER: 'teacher',
  STYLE_FRIEND: 'friend',
  STYLE_ATE_KUYA: 'ate_kuya',
};

const LANGUAGE_CODES: Record<string, Language> = {
  LANG_BIKOL_DAET: 'bikol_daet',
  LANG_TAGALOG: 'tagalog',
  LANG_ENGLISH: 'english',
};

const ACTION_CODES: Record<string, CardAction> = {
  ACTION_EXPLAIN: { type: 'SUBMIT' },
  ACTION_EXPLAIN_DIFFERENTLY: { type: 'EXPLAIN_DIFFERENTLY' },
  ACTION_RESET: { type: 'RESET' },
};

const TOPIC_PATTERN = /^TOPIC_([A-Z0-9_]{2,40})$/;

/**
 * Normalises whatever a tag (or deep link) carries into a canonical card code.
 * Accepts `TOPIC_PHOTOSYNTHESIS`, ` topic-photosynthesis `,
 * `tugang://card/TOPIC_PHOTOSYNTHESIS` and `...?card=TOPIC_PHOTOSYNTHESIS`.
 */
export function normalizeCardCode(raw: string): string {
  let value = raw.trim();
  const query = value.match(/[?&]card=([^&#]+)/i);
  if (query) {
    value = decodeURIComponent(query[1]);
  } else if (value.includes('/')) {
    value = value.slice(value.lastIndexOf('/') + 1);
  }
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

const has = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key);

/** Returns null for anything that is not a TU-gang card. Never throws. */
export function parseCardCode(raw: string): CardAction | null {
  if (typeof raw !== 'string' || raw.length > 200) return null;
  let code: string;
  try {
    code = normalizeCardCode(raw);
  } catch {
    return null; // malformed %-escape in a URI payload
  }

  if (has(DIFFICULTY_CODES, code)) return { type: 'DIFFICULTY', value: DIFFICULTY_CODES[code] };
  if (has(STYLE_CODES, code)) return { type: 'STYLE', value: STYLE_CODES[code] };
  if (has(LANGUAGE_CODES, code)) return { type: 'LANGUAGE', value: LANGUAGE_CODES[code] };
  if (has(ACTION_CODES, code)) return ACTION_CODES[code];

  const topic = code.match(TOPIC_PATTERN);
  if (topic) return { type: 'TOPIC', value: topic[1].toLowerCase() };

  return null;
}

export function draftReducer(state: LearningDraft, action: DraftAction): LearningDraft {
  switch (action.type) {
    case 'QUESTION':
      // A typed question is free text: drop any topic a card set earlier so
      // the backend never receives a topic that contradicts the question.
      return { ...state, question: action.value.slice(0, MAX_QUESTION_LENGTH), topic: null };
    case 'TOPIC':
      return { ...state, topic: action.value, question: questionForTopic(action.value) };
    case 'DIFFICULTY':
      return { ...state, difficulty: action.value };
    case 'STYLE':
      return { ...state, style: action.value };
    case 'LANGUAGE':
      return { ...state, language: action.value };
    case 'RESET':
      return INITIAL_DRAFT;
    case 'SUBMIT':
    case 'EXPLAIN_DIFFERENTLY':
      // Side effects (network calls), handled by the tutor provider.
      return state;
  }
}

export type BuildResult =
  | { ok: true; request: ExplainRequest }
  | { ok: false; reason: 'empty_question' };

export function buildExplainRequest(
  draft: LearningDraft,
  action: TutorAction = 'explain',
): BuildResult {
  const question = draft.question.trim();
  if (!question) return { ok: false, reason: 'empty_question' };
  return {
    ok: true,
    request: {
      question,
      topic: draft.topic,
      language: draft.language,
      difficulty: draft.difficulty,
      style: draft.style,
      action,
    },
  };
}
