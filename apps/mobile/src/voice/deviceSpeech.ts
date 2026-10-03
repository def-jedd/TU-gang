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

type VoiceChoice = { language?: string; voice?: string };

let chosen: Promise<VoiceChoice> | null = null;

/** Prefer an installed Filipino/Tagalog voice; otherwise let the OS pick. */
export function preferredVoice(): Promise<VoiceChoice> {
  chosen ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const match = voices.find((v) => /^(fil|tl)([-_]|$)/i.test(v.language));
      // No Filipino voice installed: use the phone's default voice. Asking for
      // an uninstalled language makes many Android engines say nothing at all.
      return match ? { language: match.language, voice: match.identifier } : {};
    })
    .catch(() => ({}));
  return chosen;
}

/** Use the phone's default voice from now on (after the chosen one failed). */
export function fallBackToDefaultVoice() {
  chosen = Promise.resolve({});
}

/** Speak one line; if the chosen voice errors, retry once with the default voice. Resolves false if stopped. */
export async function speakLine(text: string, options: { rate?: number } = {}): Promise<boolean> {
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
  const voice = await preferredVoice();
  let result = await attempt(voice);
  if (result === 'error' && (voice.language || voice.voice)) {
    fallBackToDefaultVoice();
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
