import { router, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useTutor, type CardOutcome } from '../hooks/useTutor';
import { decodeProfileCard, isProfileCardText, type Profile } from '../profiles/profileCard';
import { useProfiles } from '../profiles/ProfileProvider';
import { speakLabel } from '../voice/deviceSpeech';
import { INTERACTION_MODE } from '../services/config';
import { useVoice } from '../voice/VoiceProvider';
import { UID_TO_CARD } from './cards';
import { parseCardCode } from './cardReducer';
import { nfcReader } from './reader';
import type { NfcAvailability, ScannedTag, WriteResult } from './types';

export type LastScan = { code: string | null; outcome: CardOutcome; at: number };

type NfcContextValue = {
  availability: NfcAvailability;
  /** False on iOS: each scan is started with `scanOnce`. */
  continuous: boolean;
  scanning: boolean;
  lastScan: LastScan | null;
  scanOnce: () => void;
  openSettings: () => void;
  recheck: () => void;
  /** Same path a physical tag takes — used by the on-screen card simulator. */
  tapCard: (code: string) => CardOutcome;
  /** Last student profile card tapped (Home shows "Hi, <name>!"). */
  lastProfile: { profile: Profile; at: number } | null;
  /** True while waiting for a card to write to (normal listening is paused). */
  writing: boolean;
  writeCardText: (build: (maxTextBytes: number) => string) => Promise<WriteResult>;
  cancelWrite: () => void;
};

const NfcContext = createContext<NfcContextValue | null>(null);

/** First payload on the tag that is a TU-gang card, else a UID mapping. */
function cardCodeFromTag(tag: ScannedTag): string | null {
  const fromPayload = tag.payloads.find((payload) => parseCardCode(payload) !== null);
  if (fromPayload) return fromPayload;
  const uid = tag.id?.toUpperCase();
  return uid && UID_TO_CARD[uid] ? UID_TO_CARD[uid] : null;
}

/**
 * App-wide NFC listener. Mounted once in the root layout so a card works on
 * any screen: tapping ACTION_EXPLAIN anywhere jumps straight to the answer.
 */
export function NfcProvider({ children }: { children: ReactNode }) {
  const { applyCard, t } = useTutor();
  const voice = useVoice();
  const profiles = useProfiles();
  const [writing, setWriting] = useState(false);
  const [lastProfile, setLastProfile] = useState<{ profile: Profile; at: number } | null>(null);
  const profilesRef = useRef(profiles);
  const helloRef = useRef(t.helloStudent);
  useEffect(() => {
    profilesRef.current = profiles;
    helloRef.current = t.helloStudent;
  }, [profiles, t.helloStudent]);
  const pathname = usePathname();
  const [availability, setAvailability] = useState<NfcAvailability>('checking');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);

  // The native listener is registered once; these refs let it always call the
  // latest callbacks without re-registering on every render.
  const applyRef = useRef(applyCard);
  const voiceRef = useRef(voice);
  const pathRef = useRef(pathname);
  useEffect(() => {
    applyRef.current = applyCard;
    voiceRef.current = voice;
    pathRef.current = pathname;
  }, [applyCard, voice, pathname]);

  const tapCard = useCallback((code: string) => {
    const outcome = routeCard(code);
    setLastScan({ code, outcome, at: Date.now() });
    return outcome;

    function routeCard(raw: string): CardOutcome {
      const call = voiceRef.current;
      // During a call, every card steers the tutor (e.g. "Very simple" → re-explain).
      if (call.active) return call.applyCardInCall(raw);

      if (INTERACTION_MODE === 'voice') {
        const action = parseCardCode(raw);
        // Voice-first: one topic card is enough. Tapping it starts the tutor
        // talking about that topic (level/tutor cards tapped before still apply),
        // just like tapping the topic picture on Home.
        if (action?.type === 'TOPIC') {
          applyRef.current(raw); // keep the draft (and Cards tray) in sync
          call.startCall({ topic: action.value, question: null });
          if (pathRef.current !== '/call') router.push('/call');
          return { kind: 'submitted' };
        }
        // "Explain" starts a call about the cards picked so far.
        if (action?.type === 'SUBMIT') {
          call.startCall();
          if (pathRef.current !== '/call') router.push('/call');
          return { kind: 'submitted' };
        }
      }

      const result = applyRef.current(raw);
      if (result.kind === 'submitted' && pathRef.current !== '/result') router.push('/result');
      return result;
    }
  }, []);

  const handleTag = useCallback(
    (tag: ScannedTag) => {
      // Student profile card: switch to that student (merging their progress).
      const profileText = tag.payloads.find(isProfileCardText);
      const card = profileText ? decodeProfileCard(profileText) : null;
      if (card) {
        const merged = profilesRef.current.importFromCard(card);
        setLastProfile({ profile: merged, at: Date.now() });
        speakLabel(`${helloRef.current}, ${merged.name}!`);
        return;
      }
      const code = cardCodeFromTag(tag);
      if (code) tapCard(code);
      else setLastScan({ code: null, outcome: { kind: 'unknown' }, at: Date.now() });
    },
    [tapCard],
  );

  const recheck = useCallback(() => {
    nfcReader.checkAvailability().then(setAvailability);
  }, []);

  // Availability: on mount, and whenever the app returns to the foreground
  // (the user may have just switched NFC on in Settings).
  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  // Android: listen continuously while NFC is ready.
  useEffect(() => {
    if (availability !== 'ready' || !nfcReader.continuous || writing) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    nfcReader
      .listen(handleTag)
      .then((stopFn) => {
        if (cancelled) stopFn();
        else stop = stopFn;
      })
      .catch(() => setAvailability('error'));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [availability, handleTag, writing]);

  const writeCardText = useCallback(async (build: (maxTextBytes: number) => string) => {
    setWriting(true); // stops the normal listener (effect above) so the write can own the NFC chip
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      return await nfcReader.writeText(build);
    } finally {
      setWriting(false);
    }
  }, []);

  const cancelWrite = useCallback(() => {
    nfcReader.cancelWrite();
  }, []);

  // iOS: one scan per button press (system sheet).
  const scanOnce = useCallback(() => {
    if (availability !== 'ready' || nfcReader.continuous || scanning) return;
    setScanning(true);
    let stop: (() => void) | null = null;
    const finish = () => {
      setScanning(false);
      stop?.();
    };
    nfcReader
      .listen(
        (tag) => {
          handleTag(tag);
          finish();
        },
        finish,
      )
      .then((stopFn) => {
        stop = stopFn;
      })
      .catch(finish);
  }, [availability, handleTag, scanning]);

  const openSettings = useCallback(() => {
    nfcReader.openSettings();
  }, []);

  return (
    <NfcContext.Provider
      value={{
        availability,
        continuous: nfcReader.continuous,
        scanning,
        lastScan,
        scanOnce,
        openSettings,
        recheck,
        tapCard,
        lastProfile,
        writing,
        writeCardText,
        cancelWrite,
      }}>
      {children}
    </NfcContext.Provider>
  );
}

export function useNfc(): NfcContextValue {
  const ctx = useContext(NfcContext);
  if (!ctx) throw new Error('useNfc must be used inside <NfcProvider>');
  return ctx;
}
