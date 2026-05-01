import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import nommiLogoTagline from '../assets/nommi/nommi_logo_tagline.png';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, username });
      }
      navigate('/app/feed', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('alice@nommi.stanford.demo');
    setPassword('NommiDemo1!');
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

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 text-red-600 text-sm rounded-2xl" role="alert">
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

        {mode === 'login' && (
          <button
            type="button"
            onClick={fillDemo}
            className="w-full mt-3 py-2 text-xs text-[#6f90d8] font-semibold hover:underline transition-colors"
          >
            Use demo account →
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
