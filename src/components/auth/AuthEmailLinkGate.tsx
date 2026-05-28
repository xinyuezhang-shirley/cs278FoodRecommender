import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** True when the URL looks like a Supabase auth redirect (PKCE code, OAuth error, or hash tokens). */
export function locationHasAuthCallbackParams(search: string, hash: string): boolean {
  const q = new URLSearchParams(search);
  if (q.has('code') || q.has('token_hash') || q.has('error') || q.has('error_description')) return true;
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h) return false;
  const hp = new URLSearchParams(h);
  return (
    hp.has('access_token')
    || hp.has('token_hash')
    || hp.has('error')
    || hp.has('error_description')
  );
}

/**
 * Site URL in Supabase often points at `/` while `emailRedirectTo` should be `/auth/callback`.
 * If a link lands on `/` (or `/login`) with auth query/hash, forward before catch-all routes drop it.
 */
export function AuthEmailLinkGate({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();

  if (pathname !== '/auth/callback' && locationHasAuthCallbackParams(search, hash)) {
    return <Navigate to={`/auth/callback${search}${hash}`} replace />;
  }

  return <>{children}</>;
}
