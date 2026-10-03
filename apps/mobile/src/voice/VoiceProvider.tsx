import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform } from 'react-native';

import { useTutor, type CardOutcome } from '../hooks/useTutor';
import { useProfiles } from '../profiles/ProfileProvider';
import { parseCardCode } from '../nfc/cardReducer';
import { CAPTIONS_DEFAULT } from '../services/config';
import type { Provider } from '../types/tutor';
import { cardToVoiceControl, simplerThan } from './controls';
import { createVoiceAgent, type VoiceNotice } from './createVoiceAgent';
import { setLabelsMuted } from './deviceSpeech';
import type { Caption, VoiceAgent, VoiceAgentKind, VoiceContext, VoiceControl, VoiceErrorKind, VoicePhase } from './types';

type CallState = {
  active: boolean;
  phase: VoicePhase;
  captions: Caption[];
  muted: boolean;
  error: VoiceErrorKind | null;
  kind: VoiceAgentKind | null;
  canHear: boolean;
  notice: VoiceNotice;
  provider: Provider | 'unknown' | null;
  /** Which engine is speaking right now. */
  voice: 'agora' | 'phone' | null;
};

type VoiceContextValue = CallState & {
  /** Start (or restart) a call about the current draft, optionally overriding parts of it. */
  startCall: (override?: Partial<VoiceContext>) => void;
  endCall: () => void;
  control: (command: VoiceControl) => void;
  toggleMute: () => void;
  /** NFC / on-screen card tapped while a call is active. */
  applyCardInCall: (rawCode: string) => CardOutcome;
  showCaptions: boolean;
  setShowCaptions: (show: boolean) => void;
  /** 0..1 loudness, driven without re-rendering React (for the avatar animation). */
  agentLevel: Animated.Value;
  studentLevel: Animated.Value;
};

const VoiceCtx = createContext<VoiceContextValue | null>(null);

const IDLE: CallState = {
  active: false,
  phase: 'idle',
  captions: [],
  muted: false,
  error: null,
  kind: null,
  canHear: false,
  notice: null,
  provider: null,
  voice: null,
};

const MAX_CAPTIONS = 30;
/** Speaking longer than this = the tutor actually explained something. */
const MIN_LESSON_SPEECH_MS = 5000;

function buzz(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { draft, update } = useTutor();
  const { markLessonDone } = useProfiles();
  const markDoneRef = useRef(markLessonDone);
  useEffect(() => {
    markDoneRef.current = markLessonDone;
  }, [markLessonDone]);
  const [call, setCall] = useState<CallState>(IDLE);
  const [showCaptions, setShowCaptions] = useState(CAPTIONS_DEFAULT);
  const agentRef = useRef<VoiceAgent | null>(null);
  const [agentLevel] = useState(() => new Animated.Value(0));
  const [studentLevel] = useState(() => new Animated.Value(0));

  // Latest draft for callbacks without re-creating them each keystroke.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const mutedRef = useRef(false);

  const endCall = useCallback(() => {
    const agent = agentRef.current;
    agentRef.current = null;
    agent?.stop();
    setLabelsMuted(false);
    agentLevel.setValue(0);
    studentLevel.setValue(0);
    setCall((prev) => ({ ...prev, active: false, phase: prev.phase === 'error' ? 'error' : 'ended' }));
  }, [agentLevel, studentLevel]);

  const startCall = useCallback(
    (override?: Partial<VoiceContext>) => {
      agentRef.current?.stop();
      const d = draftRef.current;
      const context: VoiceContext = {
        lesson: null,
        topic: d.topic,
        question: d.question.trim() || null,
        language: d.language,
        difficulty: d.difficulty,
        style: d.style,
        ...override,
      };
      launch(false);

      function launch(liveFailed: boolean) {
        const { agent, notice } = createVoiceAgent(liveFailed);
        agentRef.current = agent;
        mutedRef.current = false;
        setLabelsMuted(true);
        setCall({ ...IDLE, active: true, phase: 'connecting', kind: agent.kind, canHear: agent.canHear, notice });

        // Every callback checks it still belongs to the current call.
        const mine = () => agentRef.current === agent;
        let lastPhase: VoicePhase = 'connecting';
        let speakingSince = 0;
        agent.start(context, {
          onPhase(phase) {
            if (!mine()) return;
            // The tutor finished explaining a topic = one lesson done for this student.
            // A real explanation takes a while; a short greeting doesn't count.
            if (phase === 'speaking' && lastPhase !== 'speaking') speakingSince = Date.now();
            const explained = Date.now() - speakingSince > MIN_LESSON_SPEECH_MS;
            if (lastPhase === 'speaking' && phase === 'listening' && explained && draftRef.current.topic) {
              markDoneRef.current(draftRef.current.topic);
            }
            lastPhase = phase;
            // "Your turn" is felt, not just seen: a buzz when the tutor stops talking.
            if (phase === 'listening' && agent.canHear) buzz(Haptics.ImpactFeedbackStyle.Medium);
            setCall((prev) => ({ ...prev, phase }));
          },
          onCaption(caption) {
            if (!mine()) return;
            setCall((prev) => {
              const rest = prev.captions.filter((c) => c.id !== caption.id);
              return { ...prev, captions: [...rest, caption].slice(-MAX_CAPTIONS) };
            });
          },
          onLevel(who, level) {
            if (!mine()) return;
            (who === 'agent' ? agentLevel : studentLevel).setValue(level);
          },
          onProvider(provider) {
            if (mine()) setCall((prev) => ({ ...prev, provider }));
          },
          onVoice(voice) {
            if (mine()) setCall((prev) => ({ ...prev, voice }));
          },
          onError(kind) {
            if (!mine()) return;
            agentRef.current = null;
            agent.stop();
            // Server down / no key / Agora refused: keep the lesson going with the
            // practice voice (the screen says so) instead of an error screen.
            if (kind === 'session' && agent.kind === 'agora') {
              launch(true);
              return;
            }
            setLabelsMuted(false);
            setCall((prev) => ({ ...prev, active: false, phase: 'error', error: kind }));
          },
        });
      }
    },
    [agentLevel, studentLevel],
  );

  const control = useCallback(
    (command: VoiceControl) => {
      // Mirror into the draft so selectors show what the tutor is now doing.
      if (command.action === 'set_topic') update({ type: 'TOPIC', value: command.value });
      if (command.action === 'set_difficulty') update({ type: 'DIFFICULTY', value: command.value });
      if (command.action === 'set_style') update({ type: 'STYLE', value: command.value });
      if (command.action === 'set_language') update({ type: 'LANGUAGE', value: command.value });
      if (command.action === 'simpler') {
        update({ type: 'DIFFICULTY', value: simplerThan(draftRef.current.difficulty) });
      }
      agentRef.current?.control(command);
    },
    [update],
  );

  const toggleMute = useCallback(() => {
    const muted = !mutedRef.current;
    mutedRef.current = muted;
    agentRef.current?.setMuted(muted);
    setCall((prev) => ({ ...prev, muted }));
  }, []);

  const applyCardInCall = useCallback(
    (rawCode: string): CardOutcome => {
      const action = parseCardCode(rawCode);
      if (!action) return { kind: 'unknown' };
      const mapped = cardToVoiceControl(action);
      if (mapped.kind === 'end_call') endCall();
      if (mapped.kind === 'control') control(mapped.control);
      buzz(Haptics.ImpactFeedbackStyle.Light);
      return { kind: 'applied', action };
    },
    [control, endCall],
  );

  const value = useMemo<VoiceContextValue>(
    () => ({
      ...call,
      startCall,
      endCall,
      control,
      toggleMute,
      applyCardInCall,
      showCaptions,
      setShowCaptions,
      agentLevel,
      studentLevel,
    }),
    [call, startCall, endCall, control, toggleMute, applyCardInCall, showCaptions, agentLevel, studentLevel],
  );

  return <VoiceCtx.Provider value={value}>{children}</VoiceCtx.Provider>;
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceCtx);
  if (!ctx) throw new Error('useVoice must be used inside <VoiceProvider>');
  return ctx;
}
