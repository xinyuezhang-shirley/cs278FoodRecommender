import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type EmailCallbackExchangeResult =
  | { ok: true; session: Session | null }
  | { ok: false; error: unknown };

/** Dedupe PKCE exchange per code (React Strict Mode remounts must not consume the code twice). */
const inflightByCode = new Map<string, Promise<EmailCallbackExchangeResult>>();

export function exchangeEmailCallbackCodeOnce(code: string): Promise<EmailCallbackExchangeResult> {
  const trimmed = code.trim();
  const existing = inflightByCode.get(trimmed);
  if (existing) return existing;

  const promise = supabase.auth
    .exchangeCodeForSession(trimmed)
    .then(({ data, error }) => {
      if (error) return { ok: false as const, error };
      return { ok: true as const, session: data.session ?? null };
    })
    .finally(() => {
      inflightByCode.delete(trimmed);
    });

  inflightByCode.set(trimmed, promise);
  return promise;
}

const CALLBACK_CODE_KEY = 'nommi:auth-callback-code';

/** Read PKCE `code` from the URL, with a short-lived backup if the URL was already scrubbed. */
export function readEmailCallbackCodeFromLocation(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('code')?.trim() ?? '';
  if (fromUrl) {
    try {
      sessionStorage.setItem(CALLBACK_CODE_KEY, fromUrl);
    } catch {
      /* private mode */
    }
    return fromUrl;
  }
  try {
    return sessionStorage.getItem(CALLBACK_CODE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearEmailCallbackCodeBackup(): void {
  try {
    sessionStorage.removeItem(CALLBACK_CODE_KEY);
  } catch {
    //
  }
}

export function stripAuthCallbackSearchFromUrl(): void {
  window.history.replaceState({}, document.title, window.location.pathname);
}
