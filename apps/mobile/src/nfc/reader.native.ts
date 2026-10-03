/**
 * Real NFC via react-native-nfc-manager. Requires a development build
 * (`npx expo run:android` or an EAS dev build) — Expo Go cannot load it, so in
 * Expo Go we report `expo_go` and the app falls back to on-screen cards.
 *
 * Android: tags are delivered continuously while the app is in the foreground
 *          (the library re-enables foreground dispatch on resume).
 * iOS:     each scan opens the system NFC sheet, so it starts from a button.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { NfcAvailability, NfcReader, ScannedTag, WriteResult } from './types';

type NfcModule = typeof import('react-native-nfc-manager');
type TagEvent = import('react-native-nfc-manager').TagEvent;

let cached: NfcModule | null | undefined;

function loadModule(): NfcModule | null {
  if (cached !== undefined) return cached;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null; // Expo Go
    return cached;
  }
  try {
    // Lazy require so a missing native module degrades instead of crashing.
    cached = require('react-native-nfc-manager') as NfcModule;
  } catch {
    cached = null;
  }
  return cached;
}

let started = false;

async function ensureStarted(nfc: NfcModule) {
  if (started) return;
  await nfc.default.start();
  started = true;
}

function decodeTag(nfc: NfcModule, tag: TagEvent): ScannedTag {
  const { Ndef } = nfc;
  const payloads: string[] = [];
  for (const record of tag.ndefMessage ?? []) {
    try {
      const bytes = Uint8Array.from(record.payload ?? []);
      if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
        payloads.push(Ndef.text.decodePayload(bytes));
      } else if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
        payloads.push(Ndef.uri.decodePayload(bytes));
      }
    } catch {
      // Skip records we cannot decode; other records on the tag may still work.
    }
  }
  return { payloads, id: tag.id };
}

export const nfcReader: NfcReader = {
  continuous: Platform.OS === 'android',

  async checkAvailability(): Promise<NfcAvailability> {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo_go';
    const nfc = loadModule();
    if (!nfc) return 'unsupported';
    try {
      if (!(await nfc.default.isSupported())) return 'unsupported';
      await ensureStarted(nfc);
      if (Platform.OS === 'android' && !(await nfc.default.isEnabled())) return 'disabled';
      return 'ready';
    } catch {
      return 'error';
    }
  },

  async listen(onTag, onSessionEnd) {
    const nfc = loadModule();
    if (!nfc) return () => {};
    const { default: manager, NfcEvents } = nfc;
    await ensureStarted(nfc);

    manager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => onTag(decodeTag(nfc, tag)));
    manager.setEventListener(NfcEvents.SessionClosed, () => onSessionEnd?.());
    await manager.registerTagEvent({
      alertMessage: 'Hold a TU-gang card near the top of the phone',
      invalidateAfterFirstRead: true, // iOS: one card per sheet
    });

    return () => {
      manager.setEventListener(NfcEvents.DiscoverTag, null);
      manager.setEventListener(NfcEvents.SessionClosed, null);
      manager.unregisterTagEvent().catch(() => {});
    };
  },

  async writeText(build): Promise<WriteResult> {
    const nfc = loadModule();
    if (!nfc) return { ok: false, error: 'unavailable' };
    const { default: manager, NfcTech, Ndef } = nfc;
    try {
      await ensureStarted(nfc);
      await manager.requestTechnology(NfcTech.Ndef, { alertMessage: 'Hold the card to the phone' });
      const tag = await manager.getTag();
      // NDEF message + Text record headers + "en" language code take ~10 bytes.
      const maxTextBytes = Math.max(0, (tag?.maxSize ?? 144) - 10);
      let text: string;
      try {
        text = build(maxTextBytes);
      } catch {
        return { ok: false, error: 'too_small' };
      }
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      if (tag?.maxSize && bytes.length > tag.maxSize) return { ok: false, error: 'too_small' };
      await manager.ndefHandler.writeNdefMessage(bytes);
      return { ok: true, text, maxTextBytes };
    } catch (error) {
      const detail = String(error);
      return { ok: false, error: /cancel/i.test(detail) ? 'cancelled' : 'failed', detail };
    } finally {
      manager.cancelTechnologyRequest().catch(() => {});
    }
  },

  async cancelWrite() {
    const nfc = loadModule();
    await nfc?.default.cancelTechnologyRequest().catch(() => {});
  },

  async openSettings() {
    const nfc = loadModule();
    if (nfc && Platform.OS === 'android') await nfc.default.goToNfcSetting().catch(() => false);
  },
};
