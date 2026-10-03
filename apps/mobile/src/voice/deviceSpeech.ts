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
      return match ? { language: match.language, voice: match.identifier } : { language: 'fil-PH' };
    })
    .catch(() => ({ language: 'fil-PH' }));
  return chosen;
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
  preferredVoice().then((v) => Speech.speak(text, { ...v, rate: 0.95 }));
}

export { Speech };
