import Constants from 'expo-constants';

import type { UiLang } from '../i18n/copy';

/**
 * Runtime config from EXPO_PUBLIC_* env vars (see .env.example).
 * Only public values belong here — never Supabase service keys, Quick
 * credentials or Agora secrets. Those stay on the backend.
 */

const API_PORT = process.env.EXPO_PUBLIC_API_PORT?.trim() || '8000';

/** The computer running `npx expo start`, as the phone sees it (e.g. "192.168.43.12"). */
function devMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri; // "192.168.43.12:8081" in Expo Go
  if (hostUri) return hostUri.split(':')[0];
  const web = (globalThis as { location?: { hostname?: string } }).location;
  return web?.hostname || null;
}

/**
 * `auto` = the tutor API runs on the same computer as Expo, so the app follows
 * that computer's address on any Wi-Fi or hotspot. Otherwise a full URL,
 * e.g. http://192.168.1.23:8000. A phone cannot reach your laptop's "localhost".
 */
function resolveBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.toLowerCase() === 'auto') {
    const host = devMachineHost();
    return host ? `http://${host}:${API_PORT}` : null;
  }
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

/** Mock until a backend URL is configured, or when explicitly forced for rehearsals. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true' || API_BASE_URL === null;

export const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS) || 30_000;

export const DEFAULT_UI_LANG: UiLang = process.env.EXPO_PUBLIC_UI_LANG === 'bik' ? 'bik' : 'en';

/**
 * Voice engine for calls:
 * - `simulated` (default): practice voice — device speech, works in Expo Go,
 *   cannot hear the student. Always labelled as practice.
 * - `agora`: live Agora Conversational AI agent. Needs the dev build AND the
 *   backend's /api/voice/sessions route; falls back to practice (with an
 *   on-screen notice) when either is missing.
 */
export const VOICE_MODE: 'agora' | 'simulated' = process.env.EXPO_PUBLIC_VOICE_MODE === 'agora' ? 'agora' : 'simulated';

/** Voice-first by default; `text` makes cards/Explain use the reading flow. */
export const INTERACTION_MODE: 'voice' | 'text' = process.env.EXPO_PUBLIC_INTERACTION === 'text' ? 'text' : 'voice';

/** Speak button labels aloud when tapped (for students who can't read them). */
export const SPOKEN_LABELS = process.env.EXPO_PUBLIC_SPOKEN_LABELS !== 'false';

/** Show words on screen during calls by default (teachers, judges, read-along). */
export const CAPTIONS_DEFAULT = process.env.EXPO_PUBLIC_CAPTIONS === 'true';

/**
 * Features that stay HIDDEN until they really work end-to-end.
 * `listen`: flip on only after the Agora/TTS route passes the native-speaker
 * pronunciation check (Teammates 3 & 4). Never show a button that fakes it.
 */
export const FEATURES = {
  listen: process.env.EXPO_PUBLIC_ENABLE_LISTEN === 'true',
} as const;
