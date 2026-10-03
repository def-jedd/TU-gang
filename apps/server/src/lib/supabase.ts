import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../supabase/types/database.types.js';
import { env } from './env.js';

// Server-only client: the secret key bypasses RLS. Never expose it to the app.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
