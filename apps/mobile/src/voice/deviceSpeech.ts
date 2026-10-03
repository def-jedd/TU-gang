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

/** Select a phone voice for the answer language; Bikol uses Filipino as a fallback. */
export function preferredVoice(language: Language = 'bikol_daet'): Promise<VoiceChoice> {
  const cached = chosen.get(language);
  if (cached) return cached;
  const english = language === 'english';
  const preference = english ? /^en([-_]|$)/i : /^(fil|tl)([-_]|$)/i;
  const fallback = english ? 'en-US' : 'fil-PH';
  const choice = Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const match = voices.find((v) => preference.test(v.language));
      return match ? { language: match.language, voice: match.identifier } : { language: fallback };
    })
    .catch(() => ({ language: fallback }));
  chosen.set(language, choice);
  return choice;
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
