/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Production site origin for auth email confirmation links (e.g. https://your-app.vercel.app). Optional: falls back to window.location.origin in the browser. */
  readonly VITE_SITE_URL?: string;
  /** Path appended to site URL for confirmation emails (default /login). */
  readonly VITE_AUTH_EMAIL_REDIRECT_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
