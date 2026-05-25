import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthPKCECodeVerifierMissingError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PageLoader } from '../components/ui/LoadingSpinner';

const PKCE_VERIFIER_MISSING_MESSAGE =
  'Open the confirmation link in the same browser and profile where you signed up—another device clears the security step. Request a fresh email if needed and complete it without clearing site storage.';

/** Map Supabase / PKCE failures to actionable copy before redirecting to login. */
function messageAfterCodeExchangeFailure(err: unknown, serverMessage?: string | null): string {
  if (isAuthPKCECodeVerifierMissingError(err)) return PKCE_VERIFIER_MISSING_MESSAGE;
  const raw = typeof serverMessage === 'string' ? serverMessage.trim() : '';
  if (raw.length > 0) return raw;
  return 'Could not complete email verification. Try signing in with your password or request a new confirmation email.';
}

/** PKCE / email confirmation: exchange `?code=` for a persisted session before any catch-all redirects strip query params. */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthErr =
      params.get('error_description')?.trim()
      ?? params.get('error')?.trim()
      ?? null;

    if (oauthErr) {
      console.error('[auth/callback] Supabase error in redirect query:', oauthErr);
      navigate('/login', {
        replace: true,
        state: { authCallbackError: oauthErr },
      });
      return;
    }

    if (!code) {
      console.warn('[auth/callback] Missing ?code= (PKCE / email verification callback).');
      navigate('/login', {
        replace: true,
        state: {
          authCallbackError:
            'Missing verification code. Try the link in your email again, or sign in with your password.',
        },
      });
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error);
          navigate('/login', {
            replace: true,
            state: {
              authCallbackError:
                error.message?.trim()
                ?? 'Could not complete email verification. Try signing in with your password.',
            },
          });
          return;
        }

        console.log('[auth/callback] exchangeCodeForSession ok, session:', Boolean(data?.session));

        navigate('/app/feed', { replace: true });
      } catch (err) {
        console.error('[auth/callback] Unexpected error exchanging code:', err);
        navigate('/login', {
          replace: true,
          state: {
            authCallbackError:
              messageAfterCodeExchangeFailure(
                err,
                err instanceof Error ? err.message : undefined,
              ),
          },
        });
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
