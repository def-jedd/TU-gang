/**
 * Web / fallback: Listen needs react-native-agora (dev build only).
 * iOS/Android load listen.native.ts instead (Metro platform extensions).
 */
import type { ListenRef } from './listenProtocol';

export type ListenState = 'idle' | 'preparing' | 'ready' | 'playing' | 'done' | 'error';

export function listenSupported(): boolean {
  return false;
}

export class ListenPlayer {
  constructor(_onState: (state: ListenState, detail?: string) => void) {}
  async prepare(_ref: ListenRef) {}
  async play() {}
  async stop() {}
}
