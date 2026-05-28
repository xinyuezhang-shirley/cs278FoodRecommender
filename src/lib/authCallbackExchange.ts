import type { EmailOtpType, Session } from '@supabase/supabase-js';
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

/** Some Supabase / Site URL configs return tokens in the hash instead of `?code=` (implicit-style redirect). */
export async function trySetSessionFromUrlHash(): Promise<boolean> {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return false;

  const hp = new URLSearchParams(raw);
  const access_token = hp.get('access_token')?.trim();
  const refresh_token = hp.get('refresh_token')?.trim();
  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.error('[auth/callback] setSession from hash failed:', error.message);
    return false;
  }
  return true;
}

export function stripAuthCallbackHashFromUrl(): void {
  if (!window.location.hash) return;
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
}

export type EmailTokenHashPayload = {
  token_hash: string;
  type: string | null;
};

/** `token_hash` + `type` from the email template — works in any browser (no PKCE verifier). */
export function readEmailTokenHashFromLocation(): EmailTokenHashPayload | null {
  const params = new URLSearchParams(window.location.search);
  const token_hash = params.get('token_hash')?.trim() ?? '';
  if (token_hash) {
    return { token_hash, type: params.get('type')?.trim() ?? null };
  }

  const hash = window.location.hash.replace(/^#/, '').trim();
  if (!hash) return null;
  const hp = new URLSearchParams(hash);
  const fromHash = hp.get('token_hash')?.trim() ?? '';
  if (!fromHash) return null;
  return { token_hash: fromHash, type: hp.get('type')?.trim() ?? null };
}

function otpTypesToTry(preferred: string | null): EmailOtpType[] {
  const raw = (preferred ?? 'signup').trim().toLowerCase();
  const ordered: EmailOtpType[] = [];
  const add = (t: EmailOtpType) => {
    if (!ordered.includes(t)) ordered.push(t);
  };

  if (raw === 'signup') add('signup');
  if (raw === 'email') add('email');
  if (raw === 'invite') add('invite');
  if (raw === 'magiclink') add('magiclink');
  if (raw === 'recovery') add('recovery');
  if (raw === 'email_change') add('email_change');

  add('signup');
  add('email');

  return ordered;
}

export type EmailVerifyOtpResult =
  | { ok: true; session: Session | null }
  | { ok: false; error: unknown };

const inflightByTokenHash = new Map<string, Promise<EmailVerifyOtpResult>>();

/** Verify email using Supabase OTP token hash (cross-browser safe). */
export function verifyEmailTokenHashOnce(
  token_hash: string,
  type: string | null,
): Promise<EmailVerifyOtpResult> {
  const key = `${token_hash}:${type ?? 'signup'}`;
  const existing = inflightByTokenHash.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<EmailVerifyOtpResult> => {
    let lastError: unknown = null;
    for (const otpType of otpTypesToTry(type)) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: otpType });
      if (!error) {
        return { ok: true, session: data.session ?? null };
      }
      lastError = error;
    }
    return { ok: false, error: lastError };
  })().finally(() => {
    inflightByTokenHash.delete(key);
  });

  inflightByTokenHash.set(key, promise);
  return promise;
}
