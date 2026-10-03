/**
 * Web / fallback NFC reader: no NFC. The on-screen card simulator still works.
 * iOS and Android load reader.native.ts instead (Metro platform extensions).
 */
import type { NfcReader } from './types';

export const nfcReader: NfcReader = {
  continuous: false,
  checkAvailability: async () => 'unsupported',
  listen: async () => () => {},
  openSettings: async () => {},
};
