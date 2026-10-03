import type { UiLang } from '../i18n/copy';

/**
 * Runtime config from EXPO_PUBLIC_* env vars (see .env.example).
 * Only public values belong here — never Supabase service keys, Quick
 * credentials or Agora secrets. Those stay on the backend.
 */

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

/** e.g. http://192.168.1.23:3000 — a phone cannot reach your laptop's "localhost". */
export const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : null;

/** Mock until a backend URL is configured, or when explicitly forced for rehearsals. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true' || API_BASE_URL === null;

export const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS) || 30_000;

export const DEFAULT_UI_LANG: UiLang = process.env.EXPO_PUBLIC_UI_LANG === 'bik' ? 'bik' : 'en';

/**
 * Features that stay HIDDEN until they really work end-to-end.
 * `listen`: flip on only after the Agora/TTS route passes the native-speaker
 * pronunciation check (Teammates 3 & 4). Never show a button that fakes it.
 */
export const FEATURES = {
  listen: process.env.EXPO_PUBLIC_ENABLE_LISTEN === 'true',
} as const;
