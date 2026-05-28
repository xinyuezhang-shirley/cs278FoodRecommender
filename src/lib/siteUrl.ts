/**
 * Public site origin for auth email links.
 * Prefer VITE_SITE_URL on Vercel for a stable production URL.
 * Falls back to window.location.origin when signup runs in the browser.
 */
export function getSiteOrigin(): string {
  const trimmed = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');
  if (trimmed) return trimmed;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
}

/**
 * PKCE confirmation link target: `{origin}/auth/callback`.
 * In the browser, uses `window.location.origin`; otherwise `import.meta.env.VITE_SITE_URL`.
 */
export function resolveAuthEmailCallbackUrl(): string | undefined {
  const envOrigin = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');

  // Production builds: always use the deployed origin so emails match Supabase allow-list.
  if (import.meta.env.PROD && envOrigin) {
    return `${envOrigin}/auth/callback`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/auth/callback`;
  }

  if (envOrigin) {
    return `${envOrigin}/auth/callback`;
  }

  return undefined;
}

/**
 * @deprecated use resolveAuthEmailCallbackUrl — kept for clarity in exports if imported elsewhere.
 */
export function getAuthEmailConfirmationRedirectUrl(): string | undefined {
  return resolveAuthEmailCallbackUrl();
}
