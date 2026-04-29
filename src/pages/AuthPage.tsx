import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

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
    setEmail('demo@stanford.edu');
    setPassword('demo1234');
  }

  return (
    <div className="min-h-dvh bg-[#fafaf9] flex flex-col items-center justify-center px-5 py-8">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🧋</div>
        <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">nommi</h1>
        <p className="text-[#6b7280] text-sm mt-1">Stanford food, discovered together</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-6">
        <h2 className="text-xl font-semibold text-[#1a1a1a] mb-5">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 text-red-600 text-sm rounded-xl" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#f43f5e]/30 focus:border-[#f43f5e]"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#f43f5e]/30 focus:border-[#f43f5e]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#f43f5e]/30 focus:border-[#f43f5e]"
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
            className="w-full mt-2 py-2 text-xs text-[#6b7280] hover:text-[#374151] transition-colors"
          >
            Use demo account →
          </button>
        )}

        <div className="mt-5 pt-5 border-t border-[#f3f4f6] text-center text-sm text-[#6b7280]">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <Link to="/signup" className="text-[#f43f5e] font-medium hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have one?{' '}
              <Link to="/login" className="text-[#f43f5e] font-medium hover:underline">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-[#9ca3af] text-center max-w-xs">
        Stanford student community · mock backend · no real data stored
      </p>
    </div>
  );
}
