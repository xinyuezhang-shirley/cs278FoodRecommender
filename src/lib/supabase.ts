import { createClient } from '@supabase/supabase-js';

/**
 * Env may include `/rest/v1/` by mistake; Supabase expects the project root URL only.
 */
function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
