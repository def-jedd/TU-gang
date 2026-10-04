import { API_BASE_URL, VOICE_MODE } from '../services/config';
import { AgoraVoiceAgent, agoraAvailable } from './agoraAgent';
import { SimulatedVoiceAgent } from './simulatedAgent';
import type { VoiceAgent } from './types';

/** Why we fell back to the practice voice, so the screen can say so honestly. */
export type VoiceNotice = 'needs_build' | 'no_backend' | 'live_failed' | null;

/** `liveFailed`: the live call couldn't start, so this call uses practice voice. */
export function createVoiceAgent(liveFailed = false): { agent: VoiceAgent; notice: VoiceNotice } {
  if (liveFailed) return { agent: new SimulatedVoiceAgent(), notice: 'live_failed' };
  if (VOICE_MODE !== 'agora') return { agent: new SimulatedVoiceAgent(), notice: null };
  if (!API_BASE_URL) return { agent: new SimulatedVoiceAgent(), notice: 'no_backend' };
  if (!agoraAvailable()) return { agent: new SimulatedVoiceAgent(), notice: 'needs_build' };
  return { agent: new AgoraVoiceAgent(), notice: null };
}
