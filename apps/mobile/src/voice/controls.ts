/**
 * Pure mapping from learning cards to in-call voice controls, so a physical
 * card tapped DURING a call steers the tutor ("Very simple" card → the tutor
 * re-explains more simply). Type-only imports: unit-testable with node --test.
 */
import type { CardAction } from '../nfc/cardReducer';
import type { Difficulty } from '../types/tutor';
import type { VoiceControl } from './types';

export type CardInCall = { kind: 'control'; control: VoiceControl } | { kind: 'end_call' } | { kind: 'ignore' };

export function cardToVoiceControl(action: CardAction): CardInCall {
  switch (action.type) {
    case 'TOPIC':
      return { kind: 'control', control: { action: 'set_topic', value: action.value } };
    case 'DIFFICULTY':
      return { kind: 'control', control: { action: 'set_difficulty', value: action.value } };
    case 'STYLE':
      return { kind: 'control', control: { action: 'set_style', value: action.value } };
    case 'EXPLAIN_DIFFERENTLY':
      return { kind: 'control', control: { action: 'explain_differently' } };
    case 'SUBMIT':
      // "Explain" while already talking = say it again.
      return { kind: 'control', control: { action: 'repeat' } };
    case 'RESET':
      return { kind: 'end_call' };
    case 'LANGUAGE':
      return { kind: 'control', control: { action: 'set_language', value: action.value } };
  }
}

const ORDER: Difficulty[] = ['very_simple', 'simple', 'normal'];

/** One step simpler, never below very_simple. */
export function simplerThan(level: Difficulty): Difficulty {
  return ORDER[Math.max(0, ORDER.indexOf(level) - 1)];
}
