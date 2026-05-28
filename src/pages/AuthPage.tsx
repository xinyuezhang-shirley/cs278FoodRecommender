import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import nommiLogoTagline from '../assets/nommi/nommi_logo_tagline.png';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  readPendingVerifyEmail,
  rememberPendingVerifyEmail,
  resendSignupConfirmation,
} from '../services/authService';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

const OAUTH_ERROR_QUERY_KEYS = ['error', 'error_description', 'error_code'] as const;

function isVerificationRelatedMessage(message: string | null): boolean {
  if (!message?.trim()) return false;
  return /verified|verification|confirmation|confirm your email|expired|invalid.*link|pkce|token_hash/i.test(
    message,
  );
}

export function AuthPage({ mode }: AuthPageProps) {
  const { signIn, signUp, user, loading: authBootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const appliedAuthCallbackError = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);

  const storedPendingEmail = mode === 'login' ? readPendingVerifyEmail() : null;
  const showResendOnLogin =
    mode === 'login'
    && !user
    && (
      isVerificationRelatedMessage(error)
      || (!!storedPendingEmail
        && email.trim().toLowerCase() === storedPendingEmail.trim().toLowerCase())
    );

  useEffect(() => {
    setPendingVerifyEmail(null);
    setResendNotice(null);
    setError(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'login') return;
    const stored = readPendingVerifyEmail();
    if (stored) setEmail(stored);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'login') appliedAuthCallbackError.current = false;
  }, [mode]);

  /** Established session elsewhere (this tab or storage): skip stale errors & leave auth screens. */
  useEffect(() => {
    if (authBootstrapping || !user) return;
    setError(null);
    setPendingVerifyEmail(null);
    navigate('/app/feed', { replace: true });
  }, [authBootstrapping, user, navigate]);

  /** Consume OAuth/query error_* params (keeps RR and address bar aligned). */
  useEffect(() => {
    if (authBootstrapping || user) return;

    const qp = new URLSearchParams(location.search);
    const oauthMsg =
      qp.get('error_description')?.trim()
      ?? qp.get('error')?.trim()
      ?? null;
    const hadOAuth = OAUTH_ERROR_QUERY_KEYS.some(k => qp.has(k));
    if (hadOAuth) {
      const rest = new URLSearchParams(location.search);
      OAUTH_ERROR_QUERY_KEYS.forEach(k => rest.delete(k));
      const qs = rest.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`, { replace: true });
    }

    if (oauthMsg) setError(oauthMsg);
  }, [authBootstrapping, user, location.search, location.pathname, location.hash, navigate]);

  useEffect(() => {
    if (authBootstrapping || user) return;
    if (appliedAuthCallbackError.current || mode !== 'login') return;
    const state = location.state as { authCallbackError?: string } | null | undefined;
    const msg = state?.authCallbackError?.trim();
    if (!msg) return;

    appliedAuthCallbackError.current = true;
    console.warn('[login] Showing auth callback failure notice:', msg);
    setError(msg);
    navigate('.', { replace: true, state: null });
  }, [authBootstrapping, user, mode, location.state, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || authBootstrapping) return;
    setError(null);
    setPendingVerifyEmail(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
      } else {
        const outcome = await signUp({ email, password, username });
        if (outcome.status === 'pending_email_verification') {
          rememberPendingVerifyEmail(outcome.email);
          setPendingVerifyEmail(outcome.email);
          setPassword('');
          return;
        }
      }
      setError(null);
      setPendingVerifyEmail(null);
      navigate('/app/feed', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('nommi278@nommi.stanford.demo');
    setPassword('NommiDemo1!');
  }

  async function handleResendConfirmation() {
    const targetEmail = (pendingVerifyEmail ?? email).trim();
    if (!targetEmail || resendBusy) return;
    setResendBusy(true);
    setResendNotice(null);
    try {
      await resendSignupConfirmation(targetEmail);
      const notice =
        'New confirmation email sent. Open the link from that message on any device, then sign in.';
      if (mode === 'signup' && pendingVerifyEmail) {
        setResendNotice(notice);
        setError(null);
      } else {
        setError(notice);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend confirmation email');
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#faf9f5] flex flex-col items-center justify-center px-5 py-10">
      {/* Brand */}
      <div className="text-center mb-8">
        <img
          src={nommiLogoTagline}
          alt="Nommi — food tastes better together"
          className="w-[min(100%,260px)] h-auto mx-auto object-contain"
          decoding="async"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#e5e7eb] px-8 py-10">
        <h2 className="text-2xl font-black text-[#2f5fc4] mb-6 tracking-wide text-center uppercase">
          {mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}
        </h2>

        {!isSupabaseConfigured ? (
          <div
            className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-center text-[13px] leading-snug text-amber-950"
            role="status"
          >
            Supabase isn&apos;t configured for this deployment. Add{' '}
            <span className="font-mono text-[11px]">VITE_SUPABASE_URL</span> and{' '}
            <span className="font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</span> in Vercel → Environment Variables,
            then redeploy.
          </div>
        ) : null}

        {mode === 'signup' && pendingVerifyEmail && (
          <div
            className="mb-4 rounded-2xl border border-teal-200/90 bg-teal-50 px-3 py-3 text-[13px] leading-snug text-teal-950"
            role="status"
          >
            <p className="font-black text-[#115e59] mb-2">Almost there — confirm your email</p>
            {resendNotice ? (
              <p className="font-semibold text-[#0f766e] mb-3">{resendNotice}</p>
            ) : null}
            <p className="font-medium mb-3">
              We sent a verification link to{' '}
              <span className="font-semibold text-[#0f766e] break-all">{pendingVerifyEmail}</span>.
              Check your inbox and your spam / junk folder if you don&apos;t see it yet. Open the
              link on any device — Nommi confirms your email and sends you to the feed. After that,{' '}
              <Link to="/login" className="font-bold text-[#2f5fc4] underline underline-offset-2">
                sign in here
              </Link>{' '}
              with the password you chose.
            </p>
            <button
              type="button"
              disabled={resendBusy}
              onClick={() => void handleResendConfirmation()}
              className="mb-2 w-full rounded-xl border border-[#99f6e4] bg-white px-3 py-2 text-[13px] font-bold text-[#0f766e] transition-colors hover:bg-[#f0fdfa] disabled:opacity-50"
            >
              {resendBusy ? 'Sending…' : 'Resend confirmation email'}
            </button>
            <button
              type="button"
              className="text-xs font-bold text-[#64748b] hover:text-[#1e293b] underline underline-offset-2"
              onClick={() => {
                setPendingVerifyEmail(null);
                setUsername('');
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        {error && !user && (
          <div
            className="mb-4 px-3 py-2.5 bg-red-50 text-red-600 text-sm rounded-2xl whitespace-pre-line leading-snug"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-[#2f5fc4] mb-2 tracking-widest uppercase">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="stomachstanford"
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-2xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#2f5fc4] mb-2 tracking-widest uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@stanford.edu"
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-2xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-[#2f5fc4] mb-2 tracking-widest uppercase">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '••••••••' : 'At least 8 characters'}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-2xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
            />
          </div>

          <Button type="submit" fullWidth loading={loading} size="lg">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {showResendOnLogin ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={resendBusy || !email.trim()}
              onClick={() => void handleResendConfirmation()}
              className="w-full rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2.5 text-center text-[13px] font-bold text-[#2f5fc4] transition-colors hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendBusy ? 'Sending…' : 'Resend confirmation email'}
            </button>
            {!email.trim() ? (
              <p className="text-center text-[11px] font-medium text-[#9ca3af]">
                Enter your email above to resend
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === 'login' && (
          <button
            type="button"
            onClick={fillDemo}
            className="w-full mt-3 py-2 text-xs text-[#6f90d8] font-semibold hover:underline transition-colors"
          >
            Use @nommi278 demo →
          </button>
        )}

        <div className="mt-5 pt-5 border-t border-[#e5e7eb] text-center text-sm text-[#6b7280]">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <Link to="/signup" className="text-[#2f5fc4] font-bold hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have one?{' '}
              <Link to="/login" className="text-[#2f5fc4] font-bold hover:underline">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-[#6b7280] text-center max-w-xs">
        Stanford food, discovered together.
      </p>
    </div>
  );
}
