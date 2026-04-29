import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser, UserProfile } from '../types';
import {
  getAuthSnapshotFromSession,
  getCurrentSession,
  signIn,
  signOut,
  signUp,
} from '../services/authService';
import { supabase } from '../lib/supabase';
import type { SignInData, SignUpData } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSession(session: Session | null) {
      try {
        setLoading(true);
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
        if (!cancelled) setLoading(false);
      }
    }

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
    await signIn(data);
  }, []);

  const handleSignUp = useCallback(async (data: SignUpData) => {
    await signUp(data);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
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

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
