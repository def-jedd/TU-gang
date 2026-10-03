/**
 * Web / fallback: Agora's React Native SDK is native-only.
 * iOS/Android load agoraAgent.native.ts instead (Metro platform extensions).
 */
import type { VoiceAgent, VoiceListener } from './types';

export function agoraAvailable(): boolean {
  return false;
}

export class AgoraVoiceAgent implements VoiceAgent {
  readonly kind = 'agora' as const;
  readonly canHear = true;
  async start(_context: unknown, listener: VoiceListener) {
    listener.onError('unavailable', 'Agora voice is not available on this platform');
  }
  async control() {}
  setMuted() {}
  async stop() {}
}
