/**
 * LIVE VOICE — Agora Conversational AI.
 *
 *  phone ──POST /api/voice/sessions──▶ backend ──Agora REST /join──▶ AI agent
 *    │◀── app_id, channel, token, uid, agent_uid ──┘                    │
 *    └──────────── joins the same RTC channel (audio both ways) ◀───────┘
 *
 * The agent does speech recognition (+ turn detection, so the student just
 * talks — no push-to-talk) → Gemini → text-to-speech, all server-side. The phone only streams
 * the microphone and plays the reply, and reads captions from the agent's
 * data stream.
 *
 * Needs a development build: react-native-agora cannot load in Expo Go.
 * Server side: apps/server/src/services/conversation.ts.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import type { AudioVolumeInfo, IRtcEngine, RtcConnection } from 'react-native-agora';

import { AgentMessageParser } from './agoraMessages';
import type { VoiceAgent, VoiceContext, VoiceControl, VoiceListener, VoicePhase } from './types';
import { createVoiceSession, endVoiceSession, sendVoiceControl, type VoiceSession } from './voiceApi';

type AgoraModule = typeof import('react-native-agora');

let cached: AgoraModule | null | undefined;

function loadAgora(): AgoraModule | null {
  if (cached !== undefined) return cached;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null; // Expo Go has no Agora native code
    return cached;
  }
  try {
    cached = require('react-native-agora') as AgoraModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function agoraAvailable(): boolean {
  return loadAgora() !== null;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS prompts on first capture (NSMicrophoneUsageDescription)
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Volume (0–255) above which someone counts as talking. Tune on the demo phone. */
const AGENT_LOUD = 12;
const STUDENT_LOUD = 25;

export class AgoraVoiceAgent implements VoiceAgent {
  readonly kind = 'agora' as const;
  readonly canHear = true;

  private engine: IRtcEngine | null = null;
  private session: VoiceSession | null = null;
  private listener!: VoiceListener;
  private parser = new AgentMessageParser();
  private stopped = false;
  private muted = false;
  private agentJoined = false;
  private phase: VoicePhase = 'idle';
  private agentLoudAt = 0;
  private studentLoudAt = 0;
  /** When the agent last told us its state explicitly (preferred over guessing). */
  private reportedAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  async start(context: VoiceContext, listener: VoiceListener) {
    this.listener = listener;
    this.setPhase('connecting');

    const agora = loadAgora();
    if (!agora) return listener.onError('unavailable');
    if (!(await ensureMicPermission())) return listener.onError('mic_denied');

    try {
      this.session = await createVoiceSession(context);
    } catch (error) {
      return listener.onError('session', String(error));
    }
    if (this.stopped) {
      endVoiceSession(this.session.session_id);
      return;
    }
    if (this.session.provider) listener.onProvider?.(this.session.provider);
    listener.onVoice?.('agora');

    const { app_id, channel, token, uid, agent_uid } = this.session;
    const engine = agora.createAgoraRtcEngine();
    this.engine = engine;
    engine.initialize({
      appId: app_id,
      channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting,
      // Agora's echo-cancellation/noise profile tuned for talking to AI agents.
      audioScenario: agora.AudioScenarioType.AudioScenarioAiClient,
    });
    engine.enableAudio();
    engine.setDefaultAudioRouteToSpeakerphone(true);
    engine.enableAudioVolumeIndication(200, 3, true);

    engine.addListener('onUserJoined', (_c: RtcConnection, remoteUid: number) => {
      if (remoteUid !== agent_uid) return;
      this.agentJoined = true;
      this.setPhase('listening');
      // Both of us are in the channel: the tutor can start explaining the
      // topic now without the first words being lost.
      if (this.session) sendVoiceControl(this.session.session_id, { action: 'ready' }).catch(() => {});
    });
    engine.addListener('onUserOffline', (_c: RtcConnection, remoteUid: number) => {
      if (remoteUid === agent_uid && !this.stopped) listener.onError('agent_left');
    });
    engine.addListener('onAudioVolumeIndication', (_c: RtcConnection, speakers: AudioVolumeInfo[]) =>
      this.onVolumes(speakers, agent_uid),
    );
    engine.addListener('onStreamMessage', (_c: RtcConnection, remoteUid: number, _s: number, data: Uint8Array) => {
      if (remoteUid !== agent_uid) return;
      for (const event of this.parser.push(data)) {
        if (event.type === 'caption') listener.onCaption(event.caption);
        else {
          this.reportedAt = Date.now();
          this.setPhase(event.state === 'idle' ? 'listening' : event.state);
        }
      }
    });
    engine.addListener('onConnectionStateChanged', (_c: RtcConnection, state: number) => {
      if (state === agora.ConnectionStateType.ConnectionStateFailed && !this.stopped) listener.onError('network');
    });

    const result = engine.joinChannel(token, channel, uid, {
      clientRoleType: agora.ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: false,
      autoSubscribeAudio: true,
      autoSubscribeVideo: false,
    });
    if (result < 0) return listener.onError('network', `joinChannel failed (${result})`);

    this.ticker = setInterval(() => this.inferPhase(), 250);
  }

  async control(command: VoiceControl) {
    if (!this.session || this.stopped) return;
    try {
      await sendVoiceControl(this.session.session_id, command);
    } catch (error) {
      console.warn('[voice] control failed', command, error);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.engine?.muteLocalAudioStream(muted);
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.ticker) clearInterval(this.ticker);
    const engine = this.engine;
    this.engine = null;
    if (engine) {
      engine.leaveChannel();
      engine.removeAllListeners();
      engine.release();
    }
    if (this.session) await endVoiceSession(this.session.session_id);
    this.listener?.onPhase('ended');
  }

  private onVolumes(speakers: AudioVolumeInfo[], agentUid: number) {
    const now = Date.now();
    for (const { uid, volume = 0, vad = 0 } of speakers) {
      if (uid === 0) {
        // Local mic (reported in its own callback, uid 0).
        const level = this.muted ? 0 : volume / 255;
        this.listener.onLevel?.('student', level);
        if (!this.muted && vad === 1 && volume > STUDENT_LOUD) this.studentLoudAt = now;
      } else if (uid === agentUid) {
        this.listener.onLevel?.('agent', volume / 255);
        if (volume > AGENT_LOUD) this.agentLoudAt = now;
      }
    }
  }

  /** Guess the turn from who is loud, unless the agent reported its state recently. */
  private inferPhase() {
    if (!this.agentJoined || this.stopped) return;
    const now = Date.now();
    if (now - this.reportedAt < 1500) return;
    if (now - this.agentLoudAt < 600) this.setPhase('speaking');
    else if (now - this.studentLoudAt < 600) this.setPhase('user_speaking');
    else if (this.studentLoudAt > this.agentLoudAt && now - this.studentLoudAt < 10_000) this.setPhase('thinking');
    else this.setPhase('listening');
  }

  private setPhase(phase: VoicePhase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.listener.onPhase(phase);
  }
}
