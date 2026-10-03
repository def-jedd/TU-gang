/**
 * LISTEN: an Agora agent (MiniMax voice) reads a stored answer aloud.
 * Server side is Kiev's apps/server; this follows its README's call order:
 *
 *   /start (when the answer screen opens) → join channel as AUDIENCE
 *   → agent appears → /speak (when the student taps Listen)
 *   → silence after speech = done → /stop + leave (also on Stop / unmount)
 *
 * The microphone is never published. Needs the dev build (react-native-agora).
 * ⚠ Written against react-native-agora 4.6 typings + Kiev's README; first
 *   real run happens on the dev build.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { AudioVolumeInfo, IRtcEngine, RtcConnection } from 'react-native-agora';

import { requestJson } from '../services/api';
import { VOICE_API_BASE_URL } from '../services/config';
import { isListenDone, LISTEN_AGENT_LOUD, parseListenStart, type ListenRef, type ListenSession } from './listenProtocol';

export type ListenState = 'idle' | 'preparing' | 'ready' | 'playing' | 'done' | 'error';

type AgoraModule = typeof import('react-native-agora');
let cached: AgoraModule | null | undefined;

function loadAgora(): AgoraModule | null {
  if (cached !== undefined) return cached;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return (cached = null); // Expo Go
  try {
    cached = require('react-native-agora') as AgoraModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function listenSupported(): boolean {
  return VOICE_API_BASE_URL !== null && loadAgora() !== null;
}

const json = { 'Content-Type': 'application/json', Accept: 'application/json' };
const post = (path: string, body?: object) =>
  requestJson(`${VOICE_API_BASE_URL}${path}`, { method: 'POST', headers: json, body: JSON.stringify(body ?? {}) }, 15_000);

/** How long to wait for the agent to join before giving up. */
const AGENT_JOIN_TIMEOUT_MS = 15_000;

export class ListenPlayer {
  private state: ListenState = 'idle';
  private session: ListenSession | null = null;
  private engine: IRtcEngine | null = null;
  private agentPresent = false;
  private wantPlay = false;
  private ref: ListenRef | null = null;
  private heardAt: number | null = null;
  private lastLoudAt = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ticker: ReturnType<typeof setInterval> | null = null;
  /** Bumped by stop(); async steps from an older run bail out. */
  private run = 0;

  constructor(private readonly onState: (state: ListenState, detail?: string) => void) {}

  /** Start the agent early (answer screen opened) so tapping Listen feels instant. */
  async prepare(ref: ListenRef) {
    const agora = loadAgora();
    if (!agora || !VOICE_API_BASE_URL) return this.fail('Listen needs the dev build and EXPO_PUBLIC_VOICE_API_BASE_URL');
    await this.teardown();
    const run = ++this.run;
    this.ref = ref;
    this.agentPresent = false;
    this.heardAt = null;
    this.set('preparing');

    let session: ListenSession;
    try {
      session = parseListenStart(await post('/api/voice/start', ref));
    } catch (error) {
      if (run === this.run) this.fail(String(error));
      return;
    }
    if (run !== this.run) {
      post(`/api/voice/${session.session_id}/stop`).catch(() => {});
      return;
    }
    this.session = session;

    const engine = agora.createAgoraRtcEngine();
    this.engine = engine;
    engine.initialize({
      appId: session.app_id,
      channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting,
      audioScenario: agora.AudioScenarioType.AudioScenarioAiClient,
    });
    engine.enableAudio();
    engine.setDefaultAudioRouteToSpeakerphone(true);
    engine.enableAudioVolumeIndication(200, 3, false);

    const agentHere = (uid: number) => {
      if (uid !== session.agent_uid || this.agentPresent || run !== this.run) return;
      this.agentPresent = true;
      this.set('ready');
      if (this.wantPlay) this.speak(run);
    };
    engine.addListener('onUserJoined', (_c: RtcConnection, uid: number) => agentHere(uid));
    engine.addListener('onRemoteAudioStateChanged', (_c: RtcConnection, uid: number, state: number) => {
      if (state === agora.RemoteAudioState.RemoteAudioStateStarting || state === agora.RemoteAudioState.RemoteAudioStateDecoding) {
        agentHere(uid);
      }
    });
    engine.addListener('onAudioVolumeIndication', (_c: RtcConnection, speakers: AudioVolumeInfo[]) => {
      const agent = speakers.find((s) => s.uid === session.agent_uid);
      if (agent && (agent.volume ?? 0) > LISTEN_AGENT_LOUD) {
        const now = Date.now();
        this.heardAt ??= now;
        this.lastLoudAt = now;
      }
    });
    engine.addListener('onUserOffline', (_c: RtcConnection, uid: number) => {
      if (uid === session.agent_uid && run === this.run && this.state === 'playing') this.finish(run);
    });

    const joined = engine.joinChannel(session.token, session.channel, session.uid, {
      clientRoleType: agora.ClientRoleType.ClientRoleAudience, // listen only: never publish the mic
      publishMicrophoneTrack: false,
      publishCameraTrack: false,
      autoSubscribeAudio: true,
      autoSubscribeVideo: false,
    });
    if (joined < 0) return this.fail(`joinChannel failed (${joined})`);

    this.timers.push(
      setTimeout(() => {
        if (run === this.run && !this.agentPresent) this.fail('The voice agent did not join in time');
      }, AGENT_JOIN_TIMEOUT_MS),
    );
  }

  /** Student tapped Listen. Replays need a fresh session (the server allows one /speak per session). */
  async play() {
    if (this.state === 'done' || this.state === 'error') {
      if (!this.ref) return;
      this.wantPlay = true;
      await this.prepare(this.ref);
      return;
    }
    this.wantPlay = true;
    if (this.state === 'ready') this.speak(this.run);
    // 'preparing': speak() runs as soon as the agent appears.
  }

  async stop() {
    await this.teardown();
    this.set('idle');
  }

  private async speak(run: number) {
    if (!this.session || run !== this.run) return;
    this.wantPlay = false;
    this.set('playing');
    try {
      await post(`/api/voice/${this.session.session_id}/speak`);
    } catch (error) {
      if (run === this.run) this.fail(String(error));
      return;
    }
    this.lastLoudAt = Date.now();
    this.ticker = setInterval(() => {
      if (run === this.run && isListenDone(this.heardAt, this.lastLoudAt, Date.now())) this.finish(run);
    }, 250);
    // Safety net: never stay "playing" past the server's own hard stop.
    this.timers.push(setTimeout(() => run === this.run && this.finish(run), this.session.expires_in_seconds * 1000));
  }

  private async finish(run: number) {
    if (run !== this.run) return;
    await this.teardown();
    this.set('done');
  }

  private async fail(detail: string) {
    await this.teardown();
    this.set('error', detail);
  }

  /** Always /stop the agent and leave the channel, whatever state we're in. */
  private async teardown() {
    this.run++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    const engine = this.engine;
    const session = this.session;
    this.engine = null;
    this.session = null;
    this.agentPresent = false;
    if (engine) {
      engine.leaveChannel();
      engine.removeAllListeners();
      engine.release();
    }
    if (session) await post(`/api/voice/${session.session_id}/stop`).catch(() => {});
  }

  private set(state: ListenState, detail?: string) {
    this.state = state;
    this.onState(state, detail);
  }
}
