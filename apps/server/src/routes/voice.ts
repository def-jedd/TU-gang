import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../lib/env.js';
import { supabase } from '../lib/supabase.js';
import { getAnswer, saveAnswer } from '../services/answerStore.js';
import { answerToSpeech } from '../services/speechText.js';
import {
  activeListenCount, speakListen, startListen, stopListen, VoiceError,
} from '../services/agora.js';
import { callHistory, controlCall, startCall, stopCall } from '../services/conversation.js';

export const voiceRouter = Router();

// Each Listen tap starts a billable Agora agent; cap concurrent sessions.
const MAX_CONCURRENT_SESSIONS = 5;

// The app never sends free text to speak: it references a stored answer
// (request_id from /api/explain) or a dataset example (example_id).
const startSchema = z.union([
  z.object({ request_id: z.string().min(1).max(100) }).strict(),
  z.object({ example_id: z.string().min(1).max(100) }).strict(),
]);

async function textForExample(exampleId: string): Promise<string> {
  const { data, error } = await supabase
    .from('tutoring_examples')
    .select('bikol_explanation, bikol_example')
    .eq('id', exampleId)
    .maybeSingle();
  if (error) throw new VoiceError(502, `Supabase: ${error.message}`);
  if (!data?.bikol_explanation) throw new VoiceError(404, 'Example not found or has no Bikol text');
  return answerToSpeech({ explanation: data.bikol_explanation, example: data.bikol_example ?? '', key_points: [] });
}

voiceRouter.post('/start', async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Send either { "request_id": "..." } or { "example_id": "..." }' });
    return;
  }
  if (activeListenCount() >= MAX_CONCURRENT_SESSIONS) {
    res.status(429).json({ error: 'Too many voice sessions right now; try again shortly' });
    return;
  }

  let text: string;
  if ('request_id' in parsed.data) {
    const answer = getAnswer(parsed.data.request_id);
    if (!answer) {
      res.status(404).json({ error: 'Answer not found or expired; ask the question again' });
      return;
    }
    text = answerToSpeech(answer);
  } else {
    text = await textForExample(parsed.data.example_id);
  }

  res.json(await startListen(text));
});

// ---- Live calls (two-way conversation). Contract: apps/mobile/VOICE_CONTRACT.md

const language = z.enum(['bikol_daet', 'tagalog', 'english']);
const difficulty = z.enum(['very_simple', 'simple', 'normal']);
const style = z.enum(['teacher', 'friend', 'ate_kuya']);
const topic = z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_ -]+$/);

const callSchema = z.object({
  topic: topic.nullable().default(null),
  question: z.string().trim().min(1).max(300).nullable().default(null),
  language: language.default('bikol_daet'),
  difficulty: difficulty.default('simple'),
  style: style.default('ate_kuya'),
});

const controlSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ready') }),
  z.object({ action: z.literal('simpler') }),
  z.object({ action: z.literal('repeat') }),
  z.object({ action: z.literal('explain_differently') }),
  z.object({ action: z.literal('set_topic'), value: topic }),
  z.object({ action: z.literal('set_difficulty'), value: difficulty }),
  z.object({ action: z.literal('set_style'), value: style }),
  z.object({ action: z.literal('set_language'), value: language }),
]);

voiceRouter.post('/sessions', async (req, res) => {
  const parsed = callSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Send { topic, question, language, difficulty, style }' });
    return;
  }
  res.json(await startCall(parsed.data));
});

voiceRouter.post('/sessions/:sessionId/control', async (req, res) => {
  const parsed = controlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Unknown control action' });
    return;
  }
  await controlCall(req.params.sessionId, parsed.data);
  res.json({ ok: true });
});

voiceRouter.get('/sessions/:sessionId/history', async (req, res) => {
  if (!env.ENABLE_VOICE_TEST_PAGE) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(await callHistory(req.params.sessionId));
});

voiceRouter.delete('/sessions/:sessionId', async (req, res) => {
  res.json({ stopped: await stopCall(req.params.sessionId) });
});

// ---- Listen (one stored answer read aloud)

voiceRouter.post('/:sessionId/speak', async (req, res) => {
  res.json(await speakListen(req.params.sessionId));
});

voiceRouter.post('/:sessionId/stop', async (req, res) => {
  res.json({ stopped: await stopListen(req.params.sessionId) });
});

// Dev-only: store a hand-written answer (labeled provider "mock") so the
// request_id Listen path can be tested before POST /api/explain exists.
const testAnswerSchema = z.object({
  explanation: z.string().min(1).max(4000),
  example: z.string().max(2000).default(''),
  key_points: z.array(z.string().max(500)).max(5).default([]),
  topic: z.string().max(100).nullable().default(null),
});

voiceRouter.post('/test-answer', (req, res) => {
  if (!env.ENABLE_VOICE_TEST_PAGE) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const parsed = testAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Send { explanation, example?, key_points?, topic? }' });
    return;
  }
  const answer = {
    request_id: `test-${randomUUID()}`,
    language: 'bikol_daet' as const,
    source_ids: [],
    provider: 'mock' as const,
    ...parsed.data,
  };
  saveAnswer(answer);
  res.json(answer);
});

// Dev-only helper for public/voice-test.html.
voiceRouter.get('/test-examples', async (_req, res) => {
  if (!env.ENABLE_VOICE_TEST_PAGE) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { data, error } = await supabase
    .from('tutoring_examples')
    .select('id, topic, review_status, bikol_explanation')
    .not('bikol_explanation', 'is', null)
    .order('id');
  if (error) throw new VoiceError(502, `Supabase: ${error.message}`);
  res.json(
    (data ?? []).map((row) => ({
      id: row.id,
      topic: row.topic,
      review_status: row.review_status,
      preview: (row.bikol_explanation ?? '').slice(0, 80),
    })),
  );
});
