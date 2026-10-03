/**
 * Kiev's Listen API (apps/server/README.md on the supabase-setup branch):
 *
 *   POST /api/voice/start  { request_id } | { example_id }
 *     → { session_id, app_id, channel, uid, token, agent_uid, chunk_count, expires_in_seconds }
 *   POST /api/voice/:session_id/speak   (only after the app joined the channel)
 *   POST /api/voice/:session_id/stop
 *
 * The app never sends text to speak, only a reference to a stored answer.
 * Pure and dependency-free so it can be unit-tested with node --test.
 */

export type ListenRef = { request_id: string } | { example_id: string };

export type ListenSession = {
  session_id: string;
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  agent_uid: number;
  chunk_count: number;
  expires_in_seconds: number;
};

export function parseListenStart(raw: unknown): ListenSession {
  const d = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string) => typeof d[k] === 'string' && (d[k] as string).length > 0;
  const num = (k: string) => typeof d[k] === 'number' && Number.isFinite(d[k] as number);
  if (!str('session_id') || !str('app_id') || !str('channel') || !str('token') || !num('uid') || !num('agent_uid')) {
    throw new Error('Listen session response is missing fields');
  }
  return {
    session_id: d.session_id as string,
    app_id: d.app_id as string,
    channel: d.channel as string,
    uid: d.uid as number,
    token: d.token as string,
    agent_uid: d.agent_uid as number,
    chunk_count: num('chunk_count') ? (d.chunk_count as number) : 1,
    expires_in_seconds: num('expires_in_seconds') ? (d.expires_in_seconds as number) : 180,
  };
}

/**
 * Speech is "done" once the agent has been heard and then stays quiet this
 * long. Agora reports volume every 200 ms; chunk boundaries are gap-free
 * (measured), so a 2.5 s silence means the answer finished.
 */
export const LISTEN_SILENCE_DONE_MS = 2_500;
export const LISTEN_AGENT_LOUD = 8; // 0–255

export function isListenDone(heardAt: number | null, lastLoudAt: number, now: number): boolean {
  return heardAt !== null && now - lastLoudAt >= LISTEN_SILENCE_DONE_MS;
}
