import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { env, publicDir } from './lib/env.js';
import { healthRouter } from './routes/health.js';
import { voiceRouter } from './routes/voice.js';
import { stopAllListens, VoiceError } from './services/agora.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.use('/api/health', healthRouter);
app.use('/api/voice', voiceRouter);

if (env.ENABLE_VOICE_TEST_PAGE) {
  app.get('/voice-test', (_req, res) => res.sendFile('voice-test.html', { root: publicDir }));
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof VoiceError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Body must be valid JSON' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`Bikol tutor server on http://localhost:${env.PORT}`);
  if (env.ENABLE_VOICE_TEST_PAGE) console.log(`Voice test page: http://localhost:${env.PORT}/voice-test`);
});

// Stop any running Agora agents so they don't keep billing after shutdown.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await stopAllListens();
    server.close(() => process.exit(0));
  });
}
