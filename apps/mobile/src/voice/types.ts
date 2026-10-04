import type { Difficulty, Language, Provider, TeachingStyle } from '../types/tutor';

/**
 * Where the conversation is, from the student's point of view. The UI shows
 * each phase with a colour, an icon and a haptic cue, so a child who can't
 * read still knows when to talk and when to listen.
 */
export type VoicePhase =
  | 'idle'
  | 'connecting'
  | 'listening' // agent waits — student's turn
  | 'user_speaking' // agent hears the student talking
  | 'thinking' // student finished, agent preparing an answer
  | 'speaking' // agent talking
  | 'ended'
  | 'error';

export type Caption = {
  /** Same id = same utterance; later events replace the text (streaming captions). */
  id: string;
  speaker: 'agent' | 'student';
  text: string;
  final: boolean;
};

/** What the tutor should talk about and how. Built from the learning draft. */
export type VoiceContext = {
  /** DepEd lesson id: the live tutor teaches it step by step (ILAW) with an oral quiz. */
  lesson?: string | null;
  topic: string | null;
  question: string | null;
  language: Language;
  difficulty: Difficulty;
  style: TeachingStyle;
};

export type VoiceControl =
  | { action: 'simpler' }
  | { action: 'repeat' }
  | { action: 'explain_differently' }
  | { action: 'set_topic'; value: string }
  | { action: 'set_difficulty'; value: Difficulty }
  | { action: 'set_style'; value: TeachingStyle }
  | { action: 'set_language'; value: Language };

export type VoiceErrorKind = 'mic_denied' | 'network' | 'session' | 'agent_left' | 'unavailable';

export type VoiceAgentKind = 'agora' | 'simulated';

export type VoiceListener = {
  onPhase(phase: VoicePhase): void;
  onCaption(caption: Caption): void;
  /** 0..1 loudness, for the avatar animation. */
  onLevel?(who: 'agent' | 'student', level: number): void;
  /** Who generated the words the agent is speaking (for the honesty badge). */
  onProvider?(provider: Provider | 'unknown'): void;
  /** Which engine is actually speaking (for the honesty badge). */
  onVoice?(voice: 'agora' | 'phone'): void;
  onError(kind: VoiceErrorKind, detail?: string): void;
};

export interface VoiceAgent {
  readonly kind: VoiceAgentKind;
  /** False for the practice voice: it can talk but cannot hear the student. */
  readonly canHear: boolean;
  start(context: VoiceContext, listener: VoiceListener): Promise<void>;
  control(command: VoiceControl): Promise<void>;
  setMuted(muted: boolean): void;
  stop(): Promise<void>;
}
