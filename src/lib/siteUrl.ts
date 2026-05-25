/**
 * Public site origin for auth email links (signup confirm, magic link).
 * Prefer VITE_SITE_URL on Vercel when you want a stable production URL (avoids mismatched previews).
 * Otherwise falls back to the current browser origin (works for signup from the deployed app).
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
 * Absolute redirect URL embedded in Supabase confirmation emails (must appear under
 * Dashboard → Authentication → Redirect URLs).
 */
export function getAuthEmailRedirectUrl(): string | undefined {
  const origin = getSiteOrigin();
  if (!origin) return undefined;

  const pathRaw = (import.meta.env.VITE_AUTH_EMAIL_REDIRECT_PATH ?? '/login').trim() || '/login';
  const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;

  return `${origin}${path}`;
}
