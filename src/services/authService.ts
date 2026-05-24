import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, AuthUser, SignUpData, SignInData } from '../types';
import { supabase, getPersistedGoTrueStorageKey } from '../lib/supabase';
import { validateEmail, validatePassword, validateUsername } from '../utils/sanitize';

export interface AuthResult {
  user: AuthUser;
  profile: UserProfile;
}

export interface EmailVerificationStatus {
  verified: boolean;
  email: string;
}

/** After signup: either a full session (confirm-email disabled) or awaiting inbox verification. */
export type SignUpOutcome =
  | { status: 'pending_email_verification'; email: string }
  | { status: 'signed_in'; auth: AuthResult };

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  food_personality: string | null;
  show_friends_public?: boolean | null;
  created_at: string;
}

const PROFILE_SELECT_WITH_PRIVACY =
  'id, username, avatar_url, bio, food_personality, show_friends_public, created_at';
const PROFILE_SELECT_BASE =
  'id, username, avatar_url, bio, food_personality, created_at';

function missingOptionalProfileColumn(error: { message?: string; code?: string } | null): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  if (!msg && !error?.code) return false;
  if (error?.code === 'PGRST204' || error?.code === '42703') return true;
  return (
    msg.includes('show_friends_public')
    || (msg.includes('schema cache') && msg.includes('column'))
    || (msg.includes('column') && msg.includes('does not exist'))
  );
}

async function fetchProfileRowById(userId: string): Promise<{ row: ProfileRow | null; error: Error | null }> {
  const primary = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_WITH_PRIVACY)
    .eq('id', userId)
    .maybeSingle();

  if (!primary.error) {
    return { row: (primary.data ?? null) as ProfileRow | null, error: null };
  }

  if (missingOptionalProfileColumn(primary.error)) {
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_BASE)
      .eq('id', userId)
      .maybeSingle();
    if (!fallback.error) {
      return { row: (fallback.data ?? null) as ProfileRow | null, error: null };
    }
    return { row: null, error: new Error(fallback.error.message) };
  }

  return { row: null, error: new Error(primary.error.message) };
}

/** Short wait for Postgres trigger (`handle_new_user`) after `auth.users` insert (hosted latency). */
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Friendlier UX when Supabase GoTrue hits SMTP/IP or per-email send caps (signup confirm, magic link,
 * reset, resend). Project owners can raise limits or add custom SMTP under Dashboard → Auth.
 */
export function prettifySupabaseEmailAuthError(raw: string): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const msg = trimmed.toLowerCase();

  const isThrottle =
    msg.includes('rate limit')
    || msg.includes('too many emails')
    || msg.includes('email rate limit exceeded')
    || msg.includes('over_email_send_rate_limit');

  if (isThrottle) {
    return (
      'Too many signup or verification emails were sent to this inbox or from your network '
      + '(Supabase caps how fast auth emails go out).\n'
      + 'Wait 5–60 minutes before trying again, or sign in if the account already exists. '
      + 'If this is a demo, ask the project owner to adjust Auth → Rate limits / SMTP.'
    );
  }

  return trimmed || 'Something went wrong.';
}

function profileRowToUserProfile(row: ProfileRow, email: string): UserProfile {
  const showFriends = row.show_friends_public;
  return {
    id: row.id,
    username: row.username,
    email,
    avatar_url: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    food_personality: row.food_personality ?? undefined,
    show_friends_public: typeof showFriends === 'boolean' ? showFriends : Boolean(showFriends),
    created_at: row.created_at,
  };
}

async function fetchRequiredProfile(userId: string, emailFallback: string): Promise<UserProfile> {
  const { row, error } = await fetchProfileRowById(userId);
  if (error) throw error;
  if (!row) throw new Error('Profile not found');

  return profileRowToUserProfile(row as ProfileRow, emailFallback);
}

/** Hydrate app user + profile from a Supabase session (used by AuthContext subscriber). */
export async function getAuthSnapshotFromSession(session: Session | null): Promise<AuthResult | null> {
  const u = session?.user;
  if (!u) return null;

  const email = u.email ?? '';
  const { row, error: profileError } = await fetchProfileRowById(u.id);

  if (profileError) {
    console.error(profileError);
    return null;
  }
  if (!row) return null;

  return {
    user: { id: u.id, email },
    profile: profileRowToUserProfile(row as ProfileRow, email),
  };
}

export async function signUp(data: SignUpData): Promise<SignUpOutcome> {
  const { email, password, username } = data;

  if (!validateEmail(email)) throw new Error('Invalid email address');
  const pwErr = validatePassword(password);
  if (pwErr) throw new Error(pwErr);
  const unErr = validateUsername(username);
  if (unErr) throw new Error(unErr);

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) throw new Error(prettifySupabaseEmailAuthError(error.message ?? 'Sign up failed'));
  const userObj = authData.user as User | null;
  if (!userObj?.id) throw new Error('Sign up failed');

  const resolvedEmail = (userObj.email ?? email).trim();

  const session = authData.session;
  const hasJwt = !!(session?.access_token && session.user?.id);

  if (!hasJwt) {
    await supabase.auth.signOut();
    return { status: 'pending_email_verification', email: resolvedEmail };
  }

  try {
    const profile = await ensureProfileRowWhenSessionActive(
      userObj.id,
      resolvedEmail,
      username.trim(),
    );
    return {
      status: 'signed_in',
      auth: {
        user: { id: userObj.id, email: resolvedEmail },
        profile,
      },
    };
  } catch (err) {
    console.error('[signUp] profile hydration failed:', err);
    await supabase.auth.signOut();
    const hint = err instanceof Error && err.message
      ? ` (${err.message})`
      : '';
    throw new Error(
      `Could not load your profile after sign up.${hint} Try again or check your inbox for a verification link.`,
      { cause: err },
    );
  }
}

/** With an active JWT (confirm-email disabled), wait for DB trigger profile row or upsert from the client session. Never password-sign-in after signup. */
async function ensureProfileRowWhenSessionActive(
  userId: string,
  emailFallback: string,
  chosenUsername: string,
): Promise<UserProfile> {
  let lastErr: unknown;
  const maxAttempts = 12;

  for (let i = 0; i < maxAttempts; i++) {
    const { row, error } = await fetchProfileRowById(userId);
    lastErr = error;
    if (error) throw error;
    if (row) return profileRowToUserProfile(row as ProfileRow, emailFallback);
    await sleep(90 + i * 60);
  }

  const { error: upErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, username: chosenUsername }, { onConflict: 'id' });

  if (upErr) {
    console.error('[signUp] profile upsert failed:', upErr);
    throw new Error(upErr.message);
  }

  for (let j = 0; j < 6; j++) {
    const { row: r2, error: e2 } = await fetchProfileRowById(userId);
    if (e2) throw new Error(e2.message);
    if (r2) return profileRowToUserProfile(r2 as ProfileRow, emailFallback);
    await sleep(120);
  }

  console.error('[signUp] profile still missing after upsert retries; last=', lastErr);
  throw new Error('No profile row could be loaded. Reload and sign in once your account is verified.');
}

export async function signIn(data: SignInData): Promise<AuthResult> {
  const { email, password } = data;

  if (!email || !password) throw new Error('Email and password are required');

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(prettifySignInWithPasswordError(error));

  const userObj = authData.user as User | null;
  if (!userObj) throw new Error('Sign in failed');

  const resolvedEmail = userObj.email ?? email;
  const profile = await fetchRequiredProfile(userObj.id, resolvedEmail);

  return {
    user: { id: userObj.id, email: resolvedEmail },
    profile,
  };
}

function prettifySignInWithPasswordError(error: { message: string; code?: string }): string {
  const raw = typeof error.message === 'string' ? error.message : '';
  const code = typeof error.code === 'string' ? error.code : '';
  const lcMsg = raw.toLowerCase();
  const lcCode = code.toLowerCase();

  if (
    lcCode === 'email_not_confirmed'
    || lcMsg.includes('email not confirmed')
    || lcMsg.includes('email address not confirmed')
  ) {
    return (
      'This email hasn\'t been verified yet. Use the confirmation link Supabase emailed you (check spam), '
      + 'then sign in.'
    );
  }

  return raw === 'Invalid login credentials' ? 'Invalid email or password.' : raw;
}

/** Stored GoTrue tokens (defaults to sb-<project-ref>-auth-token on this client). */
function forceRemovePersistedGoTrueTokens(): void {
  const key = getPersistedGoTrueStorageKey();
  if (typeof localStorage === 'undefined' || !key) return;
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-code-verifier`);
  } catch {
    //
  }
}

/**
 * If GoTrue rejects POST /logout (some accounts or JWT states), auth-js skips clearing local storage,
 * leaves the UI "still signed in", and callers that rethrow surface confusing messages like "Email not confirmed".
 * Strip persistence and call signOut again so SIGNED_OUT always wins client-side.
 */
export async function signOut(): Promise<void> {
  const first = await supabase.auth.signOut();
  if (first.error) {
    console.warn('[auth] signOut server/revoke step failed; clearing persisted session:', first.error.message);
    forceRemovePersistedGoTrueTokens();
    const second = await supabase.auth.signOut();
    if (second.error) {
      console.warn('[auth] signOut retry still reported:', second.error.message);
    }
  }
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return getAuthSnapshotFromSession(session);
}

function isSessionMissingAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string };
  if (e.name === 'AuthSessionMissingError') return true;
  return (e.message ?? '').toLowerCase().includes('session missing');
}

/**
 * `getUser()` requires a usable access token. If it's missing GoTrue reports "Auth session missing!"
 * even when a refresh token can still mint a new JWT (common after idle tabs). One refresh restores
 * the header PostgREST uses for RLS.
 */
async function resolveAuthUserForWrite(): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (data.user?.id && !error) {
    return data.user as User;
  }

  const tryRefresh = isSessionMissingAuthError(error) || (!data.user?.id && !error);
  if (error && !tryRefresh) {
    throw new Error(error.message);
  }

  const { data: ref, error: refErr } = await supabase.auth.refreshSession();
  if (refErr || !ref.user?.id) {
    if (isSessionMissingAuthError(refErr) || isSessionMissingAuthError(error)) {
      throw new Error('Your session expired. Please sign in again.');
    }
    throw new Error(refErr?.message ?? error?.message ?? 'Your session expired. Please sign in again.');
  }

  return ref.user as User;
}

/**
 * Canonical user id + guaranteed `profiles` row for FK/RLS (`posts.author_id` references `profiles.id`).
 * Resolves the user via `getUser()` (with a single refresh retry) so JWT `sub` matches PostgREST policies.
 */
export async function ensureAuthUidAndProfileRow(feature?: string): Promise<string> {
  const prefix = feature ? `[${feature}] ` : '';

  let user: User;
  try {
    user = await resolveAuthUserForWrite();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${prefix}${msg}`);
  }

  let { row, error: rowErr } = await fetchProfileRowById(user.id);
  if (rowErr) throw new Error(`${prefix}${rowErr.message}`);
  if (row) return user.id;

  const candidates = buildProfileUsernameCandidates(user);
  let lastInsertMsg = '';

  for (const username of candidates) {
    const { error: insErr } = await supabase
      .from('profiles')
      .insert({ id: user.id, username });
    if (!insErr) {
      ({ row } = await fetchProfileRowById(user.id));
      if (row) return user.id;
      break;
    }
    lastInsertMsg = insErr.message ?? '';
    if (insErr.code !== '23505') {
      throw new Error(`${prefix}${lastInsertMsg}`);
    }
  }

  ({ row } = await fetchProfileRowById(user.id));
  if (row) return user.id;

  throw new Error(
    `${prefix}No profile row exists and one could not be created (${lastInsertMsg || 'try again'}). `,
  );
}

/** Validates JWT with Supabase servers (recommended for mutations; single refresh if access token missing). */
export async function getAuthUidForWrite(feature?: string): Promise<string> {
  const prefix = feature ? `[${feature}] ` : '';
  try {
    const user = await resolveAuthUserForWrite();
    return user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${prefix}${msg}`);
  }
}

/** Same priorities as DB trigger `handle_new_user`: signup metadata → email slug → id-derived slug. */
function buildProfileUsernameCandidates(user: User): string[] {
  const out: string[] = [];
  const meta = user.user_metadata as { username?: string | undefined };
  const fromMeta = typeof meta?.username === 'string' ? meta.username.trim() : '';
  if (fromMeta.length > 0) {
    const norm = fromMeta.length > 30 ? fromMeta.slice(0, 30) : fromMeta;
    if (validateUsername(norm) === null) out.push(norm);
  }

  const rawEmail = typeof user.email === 'string' ? user.email.trim() : '';
  const emailLocalRaw = rawEmail.includes('@')
    ? rawEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
    : '';
  if (emailLocalRaw.length >= 2) {
    const normE = emailLocalRaw.length > 30 ? emailLocalRaw.slice(0, 30) : emailLocalRaw;
    if (validateUsername(normE) === null) out.push(normE);
  }

  const idDigits = user.id.replace(/-/g, '');
  const fallback = (`nommi_${idDigits}`).slice(0, 30);
  if (validateUsername(fallback) === null) {
    out.push(fallback);
  } else {
    out.push(('u_' + idDigits).slice(0, 30));
  }

  return [...new Set(out)].filter(Boolean);
}

/** Public profile row (email left blank — never exposed from `profiles`). */
export async function fetchPublicProfileById(userId: string): Promise<UserProfile | null> {
  const { row, error } = await fetchProfileRowById(userId);
  if (error) {
    console.error(error);
    return null;
  }
  if (!row) return null;
  return profileRowToUserProfile(row as ProfileRow, '');
}

export async function updateUserProfile(
  userId: string,
  update: Partial<Pick<UserProfile, 'username' | 'bio' | 'food_personality' | 'avatar_url' | 'show_friends_public'>>
): Promise<UserProfile> {
  if (update.username) {
    const unErr = validateUsername(update.username);
    if (unErr) throw new Error(unErr);
  }

  const payload: Record<string, unknown> = {};
  if (update.username !== undefined) payload.username = update.username;
  if (update.bio !== undefined) payload.bio = update.bio;
  if (update.food_personality !== undefined) payload.food_personality = update.food_personality;
  if (update.avatar_url !== undefined) payload.avatar_url = update.avatar_url;
  if (update.show_friends_public !== undefined) payload.show_friends_public = Boolean(update.show_friends_public);

  const { data: row, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, username, avatar_url, bio, food_personality, show_friends_public, created_at')
    .single();

  if (error) throw new Error(error.message);

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? '';

  return profileRowToUserProfile(row as ProfileRow, email);
}

export async function getEmailVerificationStatus(): Promise<EmailVerificationStatus> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  const email = data.user?.email ?? '';
  const verified = !!data.user?.email_confirmed_at;
  return { verified, email };
}

export async function resendVerificationEmail(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(prettifySupabaseEmailAuthError(error.message));
  const email = data.user?.email;
  if (!email) throw new Error('No email available');
  const result = await supabase.auth.resend({ type: 'signup', email });
  if (result.error) {
    throw new Error(prettifySupabaseEmailAuthError(result.error.message));
  }
}

export async function updateAuthEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw new Error(prettifySupabaseEmailAuthError(error.message));
}

/** Re-authenticates with the current password before applying a new one. */
export async function updateAuthPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword.trim()) {
    throw new Error('Enter your current password to confirm this change.');
  }
  const pwErr = validatePassword(newPassword);
  if (pwErr) throw new Error(pwErr);

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: currentPassword,
  });
  if (signErr) {
    throw new Error(
      signErr.message === 'Invalid login credentials'
        ? 'Current password is incorrect.'
        : prettifySignInWithPasswordError(signErr),
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
