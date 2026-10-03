import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: [join(serverRoot, '.env.local'), join(serverRoot, '.env')], quiet: true });

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  AGORA_APP_ID: z.string().regex(/^[0-9a-f]{32}$/i, 'must be the 32-char Agora App ID'),
  AGORA_APP_CERTIFICATE: z.string().regex(/^[0-9a-f]{32}$/i, 'must be the 32-char App Certificate'),
  VOICE_TTS: z.enum(['minimax-english', 'minimax-filipino-boost']).default('minimax-english'),
  // Jed's Python tutor (apps/bikol-rag-cli/server.py). /api/explain is forwarded there.
  TUTOR_UPSTREAM_URL: z
    .url()
    .optional()
    .transform((v) => v?.replace(/\/+$/, '')),
  TUTOR_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  ENABLE_VOICE_TEST_PAGE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment (see apps/server/.env.example):\n${problems}`);
}

export const env = parsed.data;
export const publicDir = join(serverRoot, 'public');
