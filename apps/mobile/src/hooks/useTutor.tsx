import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { useProfiles } from '../profiles/ProfileProvider';
import { appendTurn, contextMessages, type ConversationTurn } from '../conversation/history';
import { loadConversation, saveConversation } from '../conversation/storage';
import { COPY, type Copy, type UiLang } from '../i18n/copy';
import {
  INITIAL_DRAFT,
  buildExplainRequest,
  draftReducer,
  parseCardCode,
  type CardAction,
  type DraftAction,
  type LearningDraft,
} from '../nfc/cardReducer';
import { explain, TutorError } from '../services/api';
import { DEFAULT_UI_LANG } from '../services/config';
import { TEXT_SCALES } from '../theme/tokens';
import type { Difficulty, ExplainRequest, ExplainResponse, Language, TeachingStyle } from '../types/tutor';

export type TutorStatus = 'idle' | 'loading' | 'success' | 'error';

type RequestState = {
  status: TutorStatus;
  response: ExplainResponse | null;
  error: TutorError | null;
  /** The request currently loading, or the last one sent. */
  lastRequest: ExplainRequest | null;
  /** The request that produced `response` (differs from lastRequest while re-asking). */
  answeredRequest: ExplainRequest | null;
};

/** What happened when a card (physical or on-screen) was applied. */
export type CardOutcome =
  | { kind: 'applied'; action: CardAction }
  | { kind: 'submitted' }
  | { kind: 'needs_question' }
  | { kind: 'needs_answer' }
  | { kind: 'unknown' };

type TutorContextValue = RequestState & {
  draft: LearningDraft;
  conversation: ConversationTurn[];
  conversationReady: boolean;
  newConversation: () => void;
  followUp: (question: string) => boolean;
  update: (action: DraftAction) => void;
  /** Builds the request from the draft and starts it. False if there is no question yet. */
  submit: () => boolean;
  explainDifferently: () => boolean;
  /** Re-ask the last question with new settings (from the answer screen). */
  reaskWith: (change: { difficulty?: Difficulty; style?: TeachingStyle; language?: Language }) => void;
  retry: () => void;
  cancel: () => void;
  /** Single entry point for NFC tags, the card simulator and deep links. */
  applyCard: (rawCode: string) => CardOutcome;

  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
  t: Copy;
  textScale: number;
  stepTextScale: (direction: 1 | -1) => void;
};

const TutorContext = createContext<TutorContextValue | null>(null);

const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};

export function TutorProvider({ children }: { children: ReactNode }) {
  const { active, ready: profilesReady } = useProfiles();
  const studentKey=active?.id ?? 'guest';
  const [conversation,setConversation]=useState<ConversationTurn[]>([]);
  const conversationRef=useRef<ConversationTurn[]>([]);
  const [loadedStudent,setLoadedStudent]=useState<string | null>(null);
  const readyKey=useRef<string | null>(null);
  const [draft, setDraft] = useState<LearningDraft>(INITIAL_DRAFT);
  // Mirror of `draft` that is updated synchronously, so two quick card taps
  // (e.g. TOPIC then ACTION_EXPLAIN) never submit a stale draft.
  const draftRef = useRef<LearningDraft>(INITIAL_DRAFT);
  const [request, setRequest] = useState<RequestState>({
    status: 'idle',
    response: null,
    error: null,
    lastRequest: null,
    answeredRequest: null,
  });
  const lastRequestRef = useRef<ExplainRequest | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const [uiLang, setUiLang] = useState<UiLang>(DEFAULT_UI_LANG);
  const [scaleIndex, setScaleIndex] = useState(0);

  useEffect(()=>{
    if(!profilesReady)return;
    let cancelled=false;
    inflight.current?.abort(); inflight.current=null; readyKey.current=null;
    loadConversation(studentKey).then(turns=>{
      if(cancelled)return;
      conversationRef.current=turns;setConversation(turns);readyKey.current=studentKey;setLoadedStudent(studentKey);
      const last=turns.at(-1);
      lastRequestRef.current=last?.request ?? null;
      setRequest({status:last?'success':'idle',response:last?.response ?? null,error:null,lastRequest:last?.request ?? null,answeredRequest:last?.request ?? null});
      const next={...draftRef.current,...(last?{language:last.request.language,difficulty:last.request.difficulty,style:last.request.style}:{}),question:'',topic:null};draftRef.current=next;setDraft(next);
    });
    return()=>{cancelled=true;readyKey.current=null;inflight.current?.abort();inflight.current=null;};
  },[studentKey,profilesReady]);

  const newConversation=useCallback(()=>{
    if(readyKey.current!==studentKey)return;
    inflight.current?.abort();inflight.current=null;lastRequestRef.current=null;
    conversationRef.current=[];setConversation([]);saveConversation(studentKey,[]);
    setRequest({status:'idle',response:null,error:null,lastRequest:null,answeredRequest:null});
    const next={...draftRef.current,question:'',topic:null};draftRef.current=next;setDraft(next);
  },[studentKey]);

  const update = useCallback((action: DraftAction) => {
    const next = draftReducer(draftRef.current, action);
    draftRef.current = next;
    setDraft(next);
  }, []);

  const run = useCallback((input: ExplainRequest) => {
    const req={...input,history:contextMessages(conversationRef.current)};
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    lastRequestRef.current = req;
    setRequest((prev) => ({ ...prev, status: 'loading', error: null, lastRequest: req }));

    explain(req, controller.signal)
      .then((response) => {
        if (inflight.current !== controller) return; // a newer request replaced this one
        const turns=appendTurn(conversationRef.current,req,response);
        conversationRef.current=turns;setConversation(turns);saveConversation(studentKey,turns);
        setRequest({ status: 'success', response, error: null, lastRequest: req, answeredRequest: req });
        tap(Haptics.ImpactFeedbackStyle.Medium);
      })
      .catch((err: unknown) => {
        if (inflight.current !== controller) return;
        const error = err instanceof TutorError ? err : new TutorError('network', String(err));
        if (error.kind === 'cancelled') return;
        setRequest((prev) => ({ ...prev, status: 'error', error, lastRequest: req }));
      })
      .finally(() => {
        if (inflight.current === controller) inflight.current = null;
      });
  }, [studentKey]);

  const submit = useCallback(() => {
    if(readyKey.current!==studentKey)return false;
    const built = buildExplainRequest(draftRef.current);
    if (!built.ok) return false;
    run(built.request);
    return true;
  }, [run,studentKey]);

  const followUp=useCallback((question:string)=>{
    if(!question.trim() || readyKey.current!==studentKey || inflight.current)return false;
    update({type:'QUESTION',value:question});return submit();
  },[studentKey,update,submit]);

  const explainDifferently = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last) return false;
    run({ ...last, action: 'explain_differently' });
    return true;
  }, [run]);

  const reaskWith = useCallback(
    (change: { difficulty?: Difficulty; style?: TeachingStyle; language?: Language }) => {
      if (change.difficulty) update({ type: 'DIFFICULTY', value: change.difficulty });
      if (change.style) update({ type: 'STYLE', value: change.style });
      if (change.language) update({ type: 'LANGUAGE', value: change.language });
      const last = lastRequestRef.current;
      if (last) run({ ...last, ...change, action: 'explain' });
    },
    [run, update],
  );

  const retry = useCallback(() => {
    if (lastRequestRef.current) run(lastRequestRef.current);
  }, [run]);

  const cancel = useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
    // Go back to the previous answer (if any) AND the question that produced it.
    setRequest((prev) => {
      lastRequestRef.current = prev.answeredRequest;
      return {
        ...prev,
        status: prev.response ? 'success' : 'idle',
        error: null,
        lastRequest: prev.answeredRequest,
      };
    });
  }, []);

  const applyCard = useCallback(
    (rawCode: string): CardOutcome => {
      const action = parseCardCode(rawCode);
      if (!action) return { kind: 'unknown' };
      if (action.type === 'SUBMIT') {
        if (!submit()) return { kind: 'needs_question' };
        tap(Haptics.ImpactFeedbackStyle.Medium);
        return { kind: 'submitted' };
      }
      if (action.type === 'EXPLAIN_DIFFERENTLY') {
        if (!explainDifferently()) return { kind: 'needs_answer' };
        tap(Haptics.ImpactFeedbackStyle.Medium);
        return { kind: 'submitted' };
      }
      if(action.type==='RESET')newConversation();
      update(action);
      tap();
      return { kind: 'applied', action };
    },
    [explainDifferently, submit, update, newConversation],
  );

  const stepTextScale = useCallback((direction: 1 | -1) => {
    setScaleIndex((i) => Math.min(TEXT_SCALES.length - 1, Math.max(0, i + direction)));
  }, []);

  const value = useMemo<TutorContextValue>(
    () => ({
      ...(loadedStudent===studentKey ? request : {status:'idle' as const,response:null,error:null,lastRequest:null,answeredRequest:null}),
      draft,
      conversation: loadedStudent===studentKey ? conversation : [], conversationReady: loadedStudent===studentKey && profilesReady, newConversation, followUp,
      update,
      submit,
      explainDifferently,
      reaskWith,
      retry,
      cancel,
      applyCard,
      uiLang,
      setUiLang,
      t: COPY[uiLang],
      textScale: TEXT_SCALES[scaleIndex],
      stepTextScale,
    }),
    [request, draft, conversation, loadedStudent, profilesReady, studentKey, newConversation, followUp, update, submit, explainDifferently, reaskWith, retry, cancel, applyCard, uiLang, scaleIndex, stepTextScale],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor must be used inside <TutorProvider>');
  return ctx;
}


