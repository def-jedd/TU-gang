/**
 * Voice-session endpoints the backend (Teammate 3) needs to provide.
 * Full contract + reasoning: apps/mobile/VOICE_CONTRACT.md.
 *
 * The phone never sees Agora customer secrets or Quick credentials: the
 * backend starts the Agora Conversational AI agent and only hands the phone
 * a short-lived RTC token for one channel.
 */
import { API_BASE_URL } from '../services/config';
import { requestJson } from '../services/api';
import { TutorError } from '../services/errors';
import type { Provider } from '../types/tutor';
import type { VoiceContext, VoiceControl } from './types';

export type VoiceSession = {
  session_id: string;
  app_id: string;
  channel: string;
  /** RTC token for `uid` in `channel` only. */
  token: string;
  uid: number;
  agent_uid: number;
  /** Which LLM route the agent uses — shown on screen, never guessed. */
  provider?: Provider;
};

function base(): string {
  if (!API_BASE_URL) throw new TutorError('network', 'EXPO_PUBLIC_API_BASE_URL is not set');
  return API_BASE_URL;
}

export async function createVoiceSession(context: VoiceContext): Promise<VoiceSession> {
  const raw = (await requestJson(
    `${base()}/api/voice/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(context),
    },
    20_000,
  )) as Partial<VoiceSession> | null;

  const ok =
    raw &&
    typeof raw.session_id === 'string' &&
    typeof raw.app_id === 'string' &&
    typeof raw.channel === 'string' &&
    typeof raw.token === 'string' &&
    typeof raw.uid === 'number' &&
    typeof raw.agent_uid === 'number';
  if (!ok) throw new TutorError('bad_response', 'Voice session response is missing fields');
  return raw as VoiceSession;
}

/** `ready` is internal: the phone joined the channel, so the tutor may start talking. */
export async function sendVoiceControl(sessionId: string, control: VoiceControl | { action: 'ready' }): Promise<void> {
  await requestJson(
    `${base()}/api/voice/sessions/${encodeURIComponent(sessionId)}/control`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(control),
    },
    10_000,
  );
}

/** Best effort: the agent also leaves on its own after `idle_timeout`. */
export async function endVoiceSession(sessionId: string): Promise<void> {
  await requestJson(
    `${base()}/api/voice/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', headers: { Accept: 'application/json' } },
    5_000,
  ).catch(() => {});
}
