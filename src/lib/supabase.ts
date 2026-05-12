import { createClient } from '@supabase/supabase-js';

/**
 * Env may include `/rest/v1/` by mistake; Supabase expects the project root URL only.
 */
function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const url = normalizeSupabaseUrl((import.meta.env.VITE_SUPABASE_URL ?? '').trim());
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Placeholders avoid crashing at import time when env is missing (e.g. Vercel preview without vars). */
const SUPABASE_URL_FALLBACK = 'https://env-not-set.invalid.supabase.co';
const SUPABASE_KEY_FALLBACK = 'sb-publishable-env-not-set-placeholder';

if (!isSupabaseConfigured) {
  console.warn(
    '[nommi] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vercel → Project → Settings → Environment Variables). Auth and data will not work until both are set.',
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? url : SUPABASE_URL_FALLBACK,
  isSupabaseConfigured ? anonKey : SUPABASE_KEY_FALLBACK,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
