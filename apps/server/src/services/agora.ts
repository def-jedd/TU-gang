import { randomBytes, randomInt } from 'node:crypto';
import {
  AgoraClient, Agent, AgentSession, Area, AresSTT, ExpiresIn, MiniMaxTTS, OpenAI,
} from 'agora-agents';
import agoraToken from 'agora-token';
import { env } from '../lib/env.js';
import { chunkForSpeak } from './speechText.js';

const { RtcTokenBuilder, RtcRole } = agoraToken;

// Voices approved by the team in the round-1 pronunciation test (tools/voice-test).
const MINIMAX_MODEL = 'speech-2.8-turbo';
const MINIMAX_VOICE = 'English_captivating_female1';

function makeTts() {
  const tts = new MiniMaxTTS({ model: MINIMAX_MODEL, voiceId: MINIMAX_VOICE });
  if (env.VOICE_TTS === 'minimax-filipino-boost') {
    // Passed through to MiniMax unvalidated; not confirmed that Agora forwards it.
    const base = tts.toConfig.bind(tts);
    tts.toConfig = () => {
      const config = base();
      config.params = { ...config.params, language_boost: 'Filipino' };
      return config;
    };
  }
  return tts;
}

export const voiceDescription = {
  vendor: 'minimax',
  model: MINIMAX_MODEL,
  voice_id: MINIMAX_VOICE,
  preset: env.VOICE_TTS,
  credential_mode: 'agora_managed',
};

const client = new AgoraClient({
  area: Area.AP,
  appId: env.AGORA_APP_ID,
  appCertificate: env.AGORA_APP_CERTIFICATE,
});

const AGENT_UID = 9001;
const TOKEN_TTL_SECONDS = 15 * 60;
const MAX_SESSION_MS = 3 * 60 * 1000; // hard stop so a forgotten session can't burn credits
// Clients call /speak once the agent's audio track appears (it is then in the
// channel), so only a small safety margin is needed; say() also retries.
const AGENT_WARMUP_MS = 300;

type ListenSession = {
  id: string;
  channel: string;
  listenerUid: number;
  chunks: string[];
  session: AgentSession;
  startedAt: number;
  spoken: boolean;
  stopTimer: NodeJS.Timeout;
};

const sessions = new Map<string, ListenSession>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type StartedListen = {
  session_id: string;
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  agent_uid: number;
  chunk_count: number;
  expires_in_seconds: number;
};

export async function startListen(text: string): Promise<StartedListen> {
  const chunks = chunkForSpeak(text);
  if (chunks.length === 0) throw new VoiceError(400, 'Nothing to speak');

  const id = randomBytes(8).toString('hex');
  const channel = `listen-${id}`;
  const listenerUid = randomInt(100_000, 999_999);

  const agent = new Agent({ client, turnDetection: { language: 'en-US' } })
    // A conversational agent needs STT + LLM configured, but we only use it as a
    // speaker: the app never publishes a mic, and the LLM is told never to reply.
    .withStt(new AresSTT({}))
    .withLlm(new OpenAI({
      model: 'gpt-4o-mini',
      systemMessages: [{ role: 'system', content: 'Never respond. Stay silent.' }],
      maxHistory: 1,
    }))
    .withTts(makeTts());

  const session = agent.createSession({
    name: channel,
    channel,
    agentUid: String(AGENT_UID),
    remoteUids: [String(listenerUid)],
    idleTimeout: 30, // agent leaves 30 s after the listener does
    expiresIn: ExpiresIn.hours(1),
  });
  await session.start();

  const stopTimer = setTimeout(() => void stopListen(id), MAX_SESSION_MS);
  sessions.set(id, { id, channel, listenerUid, chunks, session, startedAt: Date.now(), spoken: false, stopTimer });

  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, channel, listenerUid,
    RtcRole.SUBSCRIBER, TOKEN_TTL_SECONDS, TOKEN_TTL_SECONDS,
  );

  return {
    session_id: id,
    app_id: env.AGORA_APP_ID,
    channel,
    uid: listenerUid,
    token,
    agent_uid: AGENT_UID,
    chunk_count: chunks.length,
    expires_in_seconds: Math.round(MAX_SESSION_MS / 1000),
  };
}

/** Call after the app has joined the channel, so the start of the speech isn't lost. */
export async function speakListen(id: string): Promise<{ chunks_sent: number }> {
  const listen = sessions.get(id);
  if (!listen) throw new VoiceError(404, 'Voice session not found or already ended');
  if (listen.spoken) throw new VoiceError(409, 'This session already spoke; start a new one');
  listen.spoken = true;

  const wait = AGENT_WARMUP_MS - (Date.now() - listen.startedAt);
  if (wait > 0) await sleep(wait);

  for (const [index, chunk] of listen.chunks.entries()) {
    for (let attempt = 1; ; attempt++) {
      try {
        await listen.session.say(chunk, { priority: 'APPEND', interruptable: false });
        break;
      } catch (error) {
        if (attempt >= 3) {
          throw new VoiceError(502, `Agora speak failed on chunk ${index + 1}: ${(error as Error).message}`);
        }
        await sleep(1000);
      }
    }
  }
  return { chunks_sent: listen.chunks.length };
}

export async function stopListen(id: string): Promise<boolean> {
  const listen = sessions.get(id);
  if (!listen) return false;
  sessions.delete(id);
  clearTimeout(listen.stopTimer);
  await listen.session.stop().catch((error: Error) => console.warn(`[voice] stop ${id}: ${error.message}`));
  return true;
}

export function activeListenCount(): number {
  return sessions.size;
}

export async function stopAllListens(): Promise<void> {
  if (sessions.size) console.log(`[voice] stopping ${sessions.size} active agent(s)`);
  await Promise.all([...sessions.keys()].map(stopListen));
}

export class VoiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
