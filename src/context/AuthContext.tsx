import React, {
  createContext, useContext, useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser, UserProfile } from '../types';
import {
  getAuthSnapshotFromSession,
  getCurrentSession,
  signIn,
  signOut,
  signUp as registerAccountWithSupabase,
  type SignUpOutcome,
} from '../services/authService';
import { supabase } from '../lib/supabase';
import type { SignInData, SignUpData } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<SignUpOutcome>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialBootstrapDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSession(session: Session | null) {
      const showSplash = !initialBootstrapDone.current;
      try {
        if (showSplash) setLoading(true);
        const snap = await getAuthSnapshotFromSession(session);
        if (cancelled) return;
        if (snap) {
          setUser(snap.user);
          setProfile(snap.profile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          if (showSplash) {
            initialBootstrapDone.current = true;
            setLoading(false);
          }
        }
      }
    }

    /** Restore session immediately (fixes flash + missed INITIAL_SESSION races). */
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) void hydrateFromSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateFromSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(async (data: SignInData) => {
    const snap = await signIn(data);
    setUser(snap.user);
    setProfile(snap.profile);
    setLoading(false);
  }, []);

  const handleSignUp = useCallback(async (data: SignUpData): Promise<SignUpOutcome> => {
    const outcome = await registerAccountWithSupabase(data);
    if (outcome.status === 'signed_in') {
      setUser(outcome.auth.user);
      setProfile(outcome.auth.profile);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
    return outcome;
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const snap = await getCurrentSession();
      if (snap) {
        setUser(snap.user);
        setProfile(snap.profile);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      refreshProfile,
    }),
    [user, profile, loading, handleSignIn, handleSignUp, handleSignOut, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with Provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
