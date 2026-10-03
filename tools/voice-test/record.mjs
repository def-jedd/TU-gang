// Pronunciation test for Agora Conversational AI TTS on Bikol text.
//
// For each candidate voice: starts an Agora agent (managed mode, no vendor keys),
// joins the same RTC channel with a headless browser listener, has the agent
// read each sample via the speak API, and records what a student would hear.
// Output: out/<voice>__<sample>.mp3 for native-speaker review.
//
// Usage (from this folder):  npm install && npx playwright install chromium && npm run record
// Reads AGORA_APP_ID / AGORA_APP_CERTIFICATE from ../../.env.local
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import pkg from 'agora-token';
import {
  AgoraClient, Agent, Area, AresSTT, ExpiresIn, MiniMaxTTS, OpenAI, OpenAITTS,
} from 'agora-agents';

const { RtcTokenBuilder, RtcRole } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(here, '../../.env.local') });

const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;
if (!appId || !appCertificate) throw new Error('AGORA_APP_ID / AGORA_APP_CERTIFICATE missing');

const LISTENER_UID = 1001;
const AGENT_UID = '2001';
const SPEAK_LIMIT_BYTES = 500; // Agora speak API max is 512 bytes per call.

function withExtraParams(tts, extra) {
  const base = tts.toConfig.bind(tts);
  tts.toConfig = () => {
    const config = base();
    config.params = { ...config.params, ...extra };
    return config;
  };
  return tts;
}

const VOICES = {
  'openai-tts1-nova': () => new OpenAITTS({ model: 'tts-1', voice: 'nova' }),
  'minimax-2.8-english': () =>
    new MiniMaxTTS({ model: 'speech-2.8-turbo', voiceId: 'English_captivating_female1' }),
  'minimax-2.8-filipino-boost': () =>
    withExtraParams(
      new MiniMaxTTS({ model: 'speech-2.8-turbo', voiceId: 'English_captivating_female1' }),
      { language_boost: 'Filipino' },
    ),
};

// Split at sentence ends so each speak call stays under the byte limit.
export function chunkForSpeak(text, limit = SPEAK_LIMIT_BYTES) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const next = current + sentence;
    if (Buffer.byteLength(next) > limit && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function recordOne(browser, voiceName, makeTts, sample) {
  const channel = `bikol-tts-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const listenerToken = RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channel, LISTENER_UID, RtcRole.PUBLISHER, 3600, 3600,
  );

  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('  [page]', e.message));
  await page.goto('file://' + join(here, 'listener.html'));
  await page.waitForFunction(() => typeof window.AgoraRTC !== 'undefined', null, { timeout: 30000 });
  await page.evaluate((args) => window.listen(args), {
    appId, channel, token: listenerToken, uid: LISTENER_UID,
  });

  const client = new AgoraClient({ area: Area.AP, appId, appCertificate });
  const agent = new Agent({ client, turnDetection: { language: 'en-US' } })
    .withStt(new AresSTT({}))
    .withLlm(new OpenAI({
      model: 'gpt-4o-mini',
      systemMessages: [{ role: 'system', content: 'Never respond. Stay silent.' }],
      maxHistory: 1,
    }))
    .withTts(makeTts());
  const session = agent.createSession({
    name: channel,
    channel,
    agentUid: AGENT_UID,
    remoteUids: [String(LISTENER_UID)],
    idleTimeout: 30,
    expiresIn: ExpiresIn.hours(1),
  });

  try {
    await session.start();
    await sleep(3000);
    for (const chunk of chunkForSpeak(sample.text)) {
      for (let attempt = 1; ; attempt++) {
        try {
          await session.say(chunk, { priority: 'APPEND', interruptable: false });
          break;
        } catch (error) {
          if (attempt >= 3) throw error;
          await sleep(1500);
        }
      }
    }

    // Wait for speech to start, then for 3 s of silence (max 90 s).
    const started = Date.now();
    while (Date.now() - started < 90000) {
      const s = await page.evaluate(() => window.state);
      if (s.firstLoudAt && Date.now() - s.lastLoudAt > 3000) break;
      if (!s.agentAudio && Date.now() - started > 25000) throw new Error('agent never published audio');
      await sleep(500);
    }
  } finally {
    await session.stop().catch(() => {});
  }

  const b64 = await page.evaluate(() => window.finish());
  await page.close();
  if (!b64) throw new Error('no audio recorded');

  const base = join(here, 'out', `${voiceName}__${sample.id}`);
  writeFileSync(base + '.webm', Buffer.from(b64, 'base64'));
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', base + '.webm', '-ac', '1', '-b:a', '64k', base + '.mp3']);
  return base + '.mp3';
}

async function main() {
  const only = process.argv[2];
  const samples = JSON.parse(readFileSync(join(here, 'samples.json'), 'utf8'));
  mkdirSync(join(here, 'out'), { recursive: true });
  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'],
  });
  const results = [];
  try {
    for (const [voiceName, makeTts] of Object.entries(VOICES)) {
      if (only && voiceName !== only) continue;
      for (const sample of samples) {
        process.stdout.write(`${voiceName} / ${sample.id} ... `);
        try {
          const file = await recordOne(browser, voiceName, makeTts, sample);
          console.log('ok');
          results.push({ voice: voiceName, sample: sample.id, file, ok: true });
        } catch (error) {
          console.log('FAILED:', error.message);
          results.push({ voice: voiceName, sample: sample.id, ok: false, error: error.message });
        }
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(here, 'out', 'results.json'), JSON.stringify(results, null, 2));
}

main();
