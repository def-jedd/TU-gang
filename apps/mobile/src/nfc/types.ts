/**
 * - `expo_go`: running inside Expo Go, which cannot load native NFC code.
 * - `unsupported`: no NFC hardware (or web).
 * - `disabled`: hardware exists but the user switched NFC off.
 */
export type NfcAvailability = 'checking' | 'expo_go' | 'unsupported' | 'disabled' | 'ready' | 'error';

/** What we pulled off one physical tag. */
export type ScannedTag = {
  /** Decoded NDEF Text / URI records, in order. */
  payloads: string[];
  /** Factory UID in hex, when the platform exposes it. */
  id?: string;
};

export type NfcReader = {
  /**
   * `true` when tags are delivered continuously while the app is open (Android).
   * `false` when each scan must be started by a button (iOS system sheet).
   */
  continuous: boolean;
  checkAvailability(): Promise<NfcAvailability>;
  /** Starts listening. Resolves to a stop function. */
  listen(onTag: (tag: ScannedTag) => void, onSessionEnd?: () => void): Promise<() => void>;
  openSettings(): Promise<void>;
};
