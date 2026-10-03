/**
 * The phone's own text-to-speech (expo-speech — works in Expo Go).
 *
 * Used for (1) spoken button labels, so a child who can't read hears what a
 * picture means, and (2) the practice voice agent. It is NOT the Agora tutor
 * voice and is labelled as such. No phone ships a Bikol voice; a Filipino
 * (fil-PH) voice is the closest available and mispronounces some Bikol words.
 */
import * as Speech from 'expo-speech';

import { SPOKEN_LABELS } from '../services/config';
import type { Language } from '../types/tutor';

type VoiceChoice = { language?: string; voice?: string };

const chosen = new Map<Language, Promise<VoiceChoice>>();

/**
 * Pick a phone voice for the answer language (Bikol uses Filipino as the
 * closest). If none is installed, use the phone's default voice: asking for
 * an uninstalled language makes many Android engines say nothing at all.
 */
export function preferredVoice(language: Language = 'bikol_daet'): Promise<VoiceChoice> {
  const cached = chosen.get(language);
  if (cached) return cached;
  const preference = language === 'english' ? /^en([-_]|$)/i : /^(fil|tl)([-_]|$)/i;
  const choice = Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const match = voices.find((v) => preference.test(v.language));
      return match ? { language: match.language, voice: match.identifier } : {};
    })
    .catch(() => ({}));
  chosen.set(language, choice);
  return choice;
}

/** Use the phone's default voice for this language from now on (the chosen one failed). */
export function fallBackToDefaultVoice(language: Language) {
  chosen.set(language, Promise.resolve({}));
}

/** Speak one line; if the chosen voice errors, retry once with the default voice. Resolves false if stopped. */
export async function speakLine(
  text: string,
  options: { rate?: number; language?: Language } = {},
): Promise<boolean> {
  const language = options.language ?? 'bikol_daet';
  const attempt = (voice: VoiceChoice) =>
    new Promise<'done' | 'stopped' | 'error'>((resolve) =>
      Speech.speak(text, {
        ...voice,
        rate: options.rate,
        onDone: () => resolve('done'),
        onStopped: () => resolve('stopped'),
        onError: () => resolve('error'),
      }),
    );
  const voice = await preferredVoice(language);
  let result = await attempt(voice);
  if (result === 'error' && (voice.language || voice.voice)) {
    fallBackToDefaultVoice(language);
    result = await attempt({});
  }
  if (result === 'error') console.warn('[speech] the phone could not speak:', text.slice(0, 40));
  return result !== 'stopped';
}

let labelsMuted = false;

/** Silenced during a call so labels never talk over the tutor. */
export function setLabelsMuted(muted: boolean) {
  labelsMuted = muted;
}

/** Say a short UI label aloud (e.g. "Pinakasimple" when that button is tapped). */
export function speakLabel(text: string) {
  if (!SPOKEN_LABELS || labelsMuted || !text) return;
  Speech.stop();
  speakLine(text, { rate: 0.95 });
}

export { Speech };
