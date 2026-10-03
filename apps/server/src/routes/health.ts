import { Router } from 'express';
import { voiceDescription } from '../services/agora.js';

export const healthRouter = Router();

// "ok" means this server is up. It does NOT prove Agora or the AI provider is reachable.
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: 'mvp',
    provider: null, // POST /api/explain not implemented yet
    voice: { enabled: true, tts: voiceDescription },
  });
});
