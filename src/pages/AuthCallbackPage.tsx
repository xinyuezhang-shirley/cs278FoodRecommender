import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthPKCECodeVerifierMissingError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearEmailCallbackCodeBackup,
  exchangeEmailCallbackCodeOnce,
  readEmailCallbackCodeFromLocation,
  stripAuthCallbackHashFromUrl,
  stripAuthCallbackSearchFromUrl,
  trySetSessionFromUrlHash,
} from '../lib/authCallbackExchange';
import { PageLoader } from '../components/ui/LoadingSpinner';

const PKCE_VERIFIER_MISSING_MESSAGE =
  'Open the confirmation link in the same browser and profile where you signed up—another device clears the security step. Request a fresh email if needed and complete it without clearing site storage.';

/** Map Supabase / PKCE failures to actionable copy before redirecting to login. */
function messageAfterCodeExchangeFailure(err: unknown, serverMessage?: string | null): string {
  if (isAuthPKCECodeVerifierMissingError(err)) return PKCE_VERIFIER_MISSING_MESSAGE;
  const raw = typeof serverMessage === 'string' ? serverMessage.trim() : '';
  if (/invalid|expired/i.test(raw)) {
    return (
      'That confirmation link was already used or has expired. On the login page, enter your email and tap '
      + '“Resend confirmation email”, then open the new link in the same browser where you signed up.'
    );
  }
  if (raw.length > 0) return raw;
  return 'Could not complete email verification. Try signing in with your password or request a new confirmation email.';
}

function readOAuthErrorFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromQuery =
    params.get('error_description')?.trim()
    ?? params.get('error')?.trim()
    ?? null;
  if (fromQuery) return fromQuery;

  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const hp = new URLSearchParams(hash);
  return hp.get('error_description')?.trim() ?? hp.get('error')?.trim() ?? null;
}

function finishCallbackUi(): void {
  clearEmailCallbackCodeBackup();
  stripAuthCallbackSearchFromUrl();
  stripAuthCallbackHashFromUrl();
}

/** PKCE / email confirmation: exchange `?code=` for a persisted session before any catch-all redirects strip query params. */
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const oauthErr = readOAuthErrorFromLocation();
    const code = readEmailCallbackCodeFromLocation();

    const goLogin = (authCallbackError: string) => {
      finishCallbackUi();
      navigate('/login', { replace: true, state: { authCallbackError } });
    };

    void (async () => {
      if (oauthErr) {
        console.error('[auth/callback] Supabase error in redirect query:', oauthErr);
        goLogin(oauthErr);
        return;
      }

      const hashOk = await trySetSessionFromUrlHash();
      if (hashOk) {
        finishCallbackUi();
        navigate('/app/feed', { replace: true });
        return;
      }

      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user?.email_confirmed_at) {
        finishCallbackUi();
        navigate('/app/feed', { replace: true });
        return;
      }

      if (!code) {
        console.warn('[auth/callback] Missing ?code= (PKCE / email verification callback).');
        goLogin(
          'Missing verification code. Enter your email on the login page and use “Resend confirmation email”, '
          + 'then open that link in the same browser where you signed up.',
        );
        return;
      }

      try {
        const result = await exchangeEmailCallbackCodeOnce(code);

        if (!result.ok) {
          const err = result.error;
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : undefined;
          console.error('[auth/callback] exchangeCodeForSession failed:', msg, err);
          goLogin(messageAfterCodeExchangeFailure(err, msg));
          return;
        }

        console.log('[auth/callback] exchangeCodeForSession ok, session:', Boolean(result.session));

        finishCallbackUi();
        navigate('/app/feed', { replace: true });
      } catch (err) {
        console.error('[auth/callback] Unexpected error exchanging code:', err);
        goLogin(
          messageAfterCodeExchangeFailure(
            err,
            err instanceof Error ? err.message : undefined,
          ),
        );
      }
    })();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-dvh bg-[#faf9f5] px-6">
      <PageLoader compact label="Finishing setup…" />
      <span className="sr-only">Finishing email verification</span>
    </div>
  );
}
