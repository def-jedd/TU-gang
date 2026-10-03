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
  res.json({
    status: 'ok',
    version: 'mvp',
    provider, // reported by the tutor (Jed's server); null if not configured/reachable
    tutor,
    voice: { enabled: true, tts: voiceDescription },
  });
});
