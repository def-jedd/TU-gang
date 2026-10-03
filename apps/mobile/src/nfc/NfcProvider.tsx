import { router, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useTutor, type CardOutcome } from '../hooks/useTutor';
import { INTERACTION_MODE } from '../services/config';
import { useVoice } from '../voice/VoiceProvider';
import { UID_TO_CARD } from './cards';
import { parseCardCode } from './cardReducer';
import { nfcReader } from './reader';
import type { NfcAvailability, ScannedTag } from './types';

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
  const { applyCard } = useTutor();
  const voice = useVoice();
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

      // Voice-first: "Explain" starts a call about the cards picked so far.
      if (INTERACTION_MODE === 'voice' && parseCardCode(raw)?.type === 'SUBMIT') {
        call.startCall();
        if (pathRef.current !== '/call') router.push('/call');
        return { kind: 'submitted' };
      }

      const result = applyRef.current(raw);
      if (result.kind === 'submitted' && pathRef.current !== '/result') router.push('/result');
      return result;
    }
  }, []);

  const handleTag = useCallback(
    (tag: ScannedTag) => {
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
    if (availability !== 'ready' || !nfcReader.continuous) return;
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
  }, [availability, handleTag]);

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
