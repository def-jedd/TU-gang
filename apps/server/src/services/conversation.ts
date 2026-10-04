import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Agent, AgentSession, AresSTT, ExpiresIn, OpenAI } from 'agora-agents';
import agoraToken from 'agora-token';
import { env, publicDir } from '../lib/env.js';
import type { Language } from '../types/tutor.js';
import { client, makeTts, VoiceError } from './agora.js';
import { bikolExamples } from './bikolExamples.js';
import { curriculumEntry } from './lessons.js';

/**
 * Live voice CALLS (two-way): the student talks, Agora's agent hears them
 * (ASR + turn detection = hands-free "voice activation"), Gemini answers, and
 * MiniMax speaks the answer. Contract: apps/mobile/VOICE_CONTRACT.md.
 *
 * Different from Listen (agora.ts), which only reads one stored answer aloud.
 */

const { RtcTokenBuilder, RtcRole } = agoraToken;

export type Difficulty = 'very_simple' | 'simple' | 'normal';
export type Style = 'teacher' | 'friend' | 'ate_kuya';

export type CallContext = {
  /** DepEd lesson id (data/curriculum): the call becomes a guided ILAW lesson. */
  lesson: string | null;
  topic: string | null;
  question: string | null;
  language: Language;
  difficulty: Difficulty;
  style: Style;
};

export type CallControl =
  | { action: 'ready' }
  | { action: 'simpler' }
  | { action: 'repeat' }
  | { action: 'explain_differently' }
  | { action: 'set_topic'; value: string }
  | { action: 'set_difficulty'; value: Difficulty }
  | { action: 'set_style'; value: Style }
  | { action: 'set_language'; value: Language };

const AGENT_UID = 9002; // Listen uses 9001; different channels anyway, but easier to read in logs
const TOKEN_TTL_SECONDS = 20 * 60;
const MAX_CALL_MS = 10 * 60 * 1000; // hard stop so a forgotten call can't burn credits
const MAX_CONCURRENT_CALLS = 3;

// prompts/ sits at the repo root, next to Michael's tutor_system.txt.
const PROMPT_PATH = join(publicDir, '../../../prompts/voice_tutor_system.txt');

const LANGUAGE_RULE: Record<Language, string> = {
  bikol_daet:
    'natural Bikol, written the way the speaker-reviewed Bikol examples below are written (they use some ' +
    'forms also found in Tagalog, like ang and ning, next to Bikol words; follow them, but never switch to ' +
    'plain Tagalog sentences). ' +
    "The exact regional variety is not confirmed, so do not claim any town's dialect.",
  tagalog: 'natural, simple Tagalog. Taglish is fine for technical terms.',
  english: 'simple, clear English.',
};

// Same greetings as the practice voice (Bikol strings are drafts pending native review).
const GREETING: Record<Language, string> = {
  bikol_daet: 'Kumusta, tugang! Ano an gusto mong maaraman?',
  tagalog: 'Kumusta! Ano ang gusto mong matutuhan?',
  english: 'Hello! What would you like to learn?',
};
const HELLO: Record<Language, string> = {
  bikol_daet: 'Kumusta, tugang!',
  tagalog: 'Kumusta!',
  english: 'Hello!',
};

// Agora ASR has no Bikol; Filipino ASR hears Bikol and Tagalog best.
const ASR_LANGUAGE: Record<Language, 'fil-PH' | 'en-US'> = {
  bikol_daet: 'fil-PH',
  tagalog: 'fil-PH',
  english: 'en-US',
};

const SIMPLER: Record<Difficulty, Difficulty> = { normal: 'simple', simple: 'very_simple', very_simple: 'very_simple' };

const topicName = (topic: string) => topic.replace(/^TOPIC_/i, '').replace(/[_-]+/g, ' ').toLowerCase();

export function buildSystemPrompt(ctx: CallContext, template = readFileSync(PROMPT_PATH, 'utf8')): string {
  const lesson = ctx.lesson ? curriculumEntry(ctx.lesson) : null;
  const topicRule = lesson
    ? [
        `This call is a LESSON. You are a tutor, not a search engine. The DepEd Grade ${lesson.grade} ` +
          `${lesson.subject.replace(/_/g, ' ')} competency to teach is:`,
        `"${lesson.competency}"`,
        'Follow the ILAW steps, one short turn at a time:',
        '1. Intentions: in one sentence, say what the student will be able to do today.',
        '2. Learning: teach in two or three small steps. After EACH step, ask one short question and stop talking ' +
          'to wait for the answer. If it is right, praise briefly and go on. If it is wrong, explain kindly and ask an easier question.',
        '3. Assessment: when the steps are done, give an oral quiz of three questions, one at a time, waiting for ' +
          'each answer. Then say how many they got right.',
        '4. Ways forward: one-sentence recap and one small thing to practise at home.',
        'If the student asks about something else, answer briefly, then bring them back to the lesson.',
      ].join('\n')
    : ctx.topic
      ? `The student chose the topic "${topicName(ctx.topic)}". Teach it in small steps. After each step, ask one short ` +
        'question and wait for the answer before going on. Then answer any question they ask, even about other things.'
      : 'No topic yet. Let the student ask about anything a student should learn. After you explain something, ask one ' +
        'short question to check they understood, and wait for the answer.';
  return template
    .replaceAll('{{LANGUAGE_RULE}}', LANGUAGE_RULE[ctx.language])
    .replaceAll('{{EXAMPLES}}', ctx.language === 'bikol_daet' ? bikolExamples(ctx.topic ? topicName(ctx.topic) : null) : '')
    .replaceAll('{{TOPIC_RULE}}', topicRule)
    .replaceAll('{{DIFFICULTY}}', ctx.difficulty)
    .replaceAll('{{STYLE}}', ctx.style);
}

// Gemini through its OpenAI-compatible endpoint, using the SDK's OpenAI class in
// bring-your-own mode (url + key; the key travels in a header, not the URL).
// Tested live: CustomLLM (vendor "custom") failed every turn with Gemini.
const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const systemMessages = (ctx: CallContext) => [{ role: 'system', content: buildSystemPrompt(ctx) }];

/** What the tutor should say first once the student is in the call. */
export function openingInstruction(ctx: CallContext): string | null {
  if (ctx.lesson && curriculumEntry(ctx.lesson)) return 'Start the lesson now: say the Intentions, then teach step one and ask its question.';
  if (ctx.question) return `The student asks: "${ctx.question}". Answer it now.`;
  if (ctx.topic) return `Explain "${topicName(ctx.topic)}" to the student now.`;
  return null; // the greeting already asked what they want to learn
}

type Call = {
  id: string;
  ctx: CallContext;
  session: AgentSession;
  opened: boolean;
  stopTimer: NodeJS.Timeout;
};

const calls = new Map<string, Call>();

export type StartedCall = {
  session_id: string;
  app_id: string;
  channel: string;
  token: string;
  uid: number;
  agent_uid: number;
  provider: 'gemini';
};

export async function startCall(ctx: CallContext): Promise<StartedCall> {
  if (!env.GEMINI_API_KEY) {
    throw new VoiceError(503, 'Live voice needs GEMINI_API_KEY (apps/server/.env.local or apps/bikol-rag-cli/.env)');
  }
  if (calls.size >= MAX_CONCURRENT_CALLS) throw new VoiceError(429, 'Too many calls right now; try again shortly');

  const id = randomBytes(8).toString('hex');
  const channel = `call-${id}`;
  const studentUid = randomInt(100_000, 999_999);
  const opening = openingInstruction(ctx);

  const agent = new Agent({ client, turnDetection: { language: ASR_LANGUAGE[ctx.language] } })
    .withStt(new AresSTT({}))
    .withLlm(new OpenAI({
      url: GEMINI_OPENAI_URL,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemMessages: systemMessages(ctx),
      greetingMessage: opening ? HELLO[ctx.language] : GREETING[ctx.language],
      failureMessage: ctx.language === 'english' ? 'Sorry, can you say that again?' : 'Pasensya na, puwede mo bang ulitin?',
      maxHistory: 16,
      maxTokens: 400,
    }))
    .withTts(makeTts());

  const session = agent.createSession({
    name: channel,
    channel,
    agentUid: String(AGENT_UID),
    remoteUids: [String(studentUid)],
    idleTimeout: 60, // agent leaves a minute after the student does
    expiresIn: ExpiresIn.hours(1),
  });
  await session.start();

  const stopTimer = setTimeout(() => void stopCall(id), MAX_CALL_MS);
  calls.set(id, { id, ctx: { ...ctx }, session, opened: false, stopTimer });
  console.log(`[call] ${id} started (${ctx.language}, topic=${ctx.topic ?? '-'})`);

  // PUBLISHER: the student's microphone must reach the agent.
  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, channel, studentUid,
    RtcRole.PUBLISHER, TOKEN_TTL_SECONDS, TOKEN_TTL_SECONDS,
  );

  return {
    session_id: id,
    app_id: env.AGORA_APP_ID,
    channel,
    token,
    uid: studentUid,
    agent_uid: AGENT_UID,
    provider: 'gemini',
  };
}

/** Ask the tutor to say something now, as its own next turn (kept in its history). */
async function instruct(call: Call, text: string, interrupt: boolean) {
  await call.session.think(text, {
    on_listening_action: 'inject',
    on_thinking_action: interrupt ? 'interrupt' : 'append',
    on_speaking_action: interrupt ? 'interrupt' : 'append',
  });
}

async function updatePrompt(call: Call) {
  await call.session.update({ llm: { system_messages: systemMessages(call.ctx) } });
}

export async function controlCall(id: string, control: CallControl): Promise<void> {
  const call = calls.get(id);
  if (!call) throw new VoiceError(404, 'Call not found or already ended');
  const { ctx } = call;

  switch (control.action) {
    case 'ready': {
      // The phone is in the channel: now the opening explanation can't be lost.
      if (call.opened) return;
      call.opened = true;
      const opening = openingInstruction(ctx);
      if (opening) await instruct(call, opening, false);
      return;
    }
    case 'repeat': {
      const history = await call.session.getHistory();
      const last = history.contents?.filter((item) => item.role === 'assistant' && item.content).at(-1)?.content;
      if (last) await call.session.say(last.slice(0, 500), { priority: 'INTERRUPT', interruptable: true });
      return;
    }
    case 'explain_differently':
      await instruct(call, 'Explain your last answer again with a different angle and a different example. Same facts, new words.', true);
      return;
    case 'simpler':
      ctx.difficulty = SIMPLER[ctx.difficulty];
      await updatePrompt(call);
      await instruct(call, 'That was too hard for the student. Explain it again more simply, with a tiny everyday example.', true);
      return;
    case 'set_difficulty':
      ctx.difficulty = control.value;
      await updatePrompt(call);
      await instruct(call, `Explain your last answer again at the "${control.value}" level.`, true);
      return;
    case 'set_style':
      ctx.style = control.value;
      await updatePrompt(call);
      return; // tone changes from the next turn; no need to re-explain
    case 'set_topic':
      ctx.topic = control.value;
      ctx.question = null;
      ctx.lesson = null;
      await updatePrompt(call);
      await instruct(call, `The student picked a new topic card: "${topicName(control.value)}". Explain it now.`, true);
      return;
    case 'set_language':
      // ASR language is fixed per call; Filipino ASR still understands English words.
      ctx.language = control.value;
      await updatePrompt(call);
      await instruct(call, `From now on speak ${LANGUAGE_RULE[control.value]} Say your last answer again in that language.`, true);
      return;
  }
}

/** Dev-only (voice test page): what was said in a call so far. */
export async function callHistory(id: string) {
  const call = calls.get(id);
  if (!call) throw new VoiceError(404, 'Call not found or already ended');
  return (await call.session.getHistory()).contents ?? [];
}

export async function stopCall(id: string): Promise<boolean> {
  const call = calls.get(id);
  if (!call) return false;
  calls.delete(id);
  clearTimeout(call.stopTimer);
  await call.session.stop().catch((error: Error) => console.warn(`[call] stop ${id}: ${error.message}`));
  console.log(`[call] ${id} ended`);
  return true;
}

export async function stopAllCalls(): Promise<void> {
  if (calls.size) console.log(`[call] stopping ${calls.size} active call(s)`);
  await Promise.all([...calls.keys()].map(stopCall));
}
