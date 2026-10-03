import { Router } from 'express';
import { env } from '../lib/env.js';
import { voiceDescription } from '../services/agora.js';
import { fetchTutor } from './explain.js';

export const healthRouter = Router();

// "ok" means this server is up. The tutor's own health is included, but neither
// proves Agora or the AI provider will answer the next request.
healthRouter.get('/', async (_req, res) => {
  let tutor: Record<string, unknown> = { configured: false };
  let provider: unknown = null;
  if (env.TUTOR_UPSTREAM_URL) {
    try {
      const upstream = await fetchTutor('/api/health');
      const body = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
      provider = body.provider ?? null;
      tutor = { configured: true, reachable: true, status: body.status ?? upstream.status, error: body.error };
    } catch {
      tutor = { configured: true, reachable: false };
    }
  }
  // Like Jed's server: 503 when answers can't be produced, so the app's
  // connection dot doesn't show green while /api/explain would fail.
  const tutorReady = tutor.configured === true && tutor.reachable === true && tutor.status === 'ok';
  res.status(tutorReady ? 200 : 503).json({
    status: tutorReady ? 'ok' : 'unavailable',
    version: 'mvp',
    provider, // reported by the tutor (Jed's server); null if not configured/reachable
    tutor,
    voice: { enabled: true, tts: voiceDescription },
  });
});
