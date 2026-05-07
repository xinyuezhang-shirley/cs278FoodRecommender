import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, AuthUser, SignUpData, SignInData } from '../types';
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword, validateUsername } from '../utils/sanitize';

export interface AuthResult {
  user: AuthUser;
  profile: UserProfile;
}

export interface EmailVerificationStatus {
  verified: boolean;
  email: string;
}

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

export async function signUp(data: SignUpData): Promise<AuthResult> {
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

  if (error) throw new Error(error.message);
  const userObj = authData.user as User | null;
  if (!userObj) throw new Error('Sign up failed');

  const resolvedEmail = userObj.email ?? email;

  try {
    const profile = await ensureProfileReadyAfterSignup(
      userObj.id,
      resolvedEmail,
      username.trim(),
      email,
      password,
      authData.session,
    );
    return {
      user: { id: userObj.id, email: resolvedEmail },
      profile,
    };
  } catch (err) {
    console.error('[signUp] profile hydration failed:', err);
    await supabase.auth.signOut();
    const hint = err instanceof Error && err.message
      ? ` (${err.message})`
      : '';
    throw new Error(
      `Could not load your profile after sign up.${hint} Confirm your email if required, reload the API schema, or try again.`,
      { cause: err },
    );
  }
}

/** When signUp skips returning a JWT, sign in immediately so upsert satisfies `profiles_insert_own`. */
async function establishSessionAfterSignUp(
  email: string,
  password: string,
  signupSession: Session | null,
): Promise<boolean> {
  if (signupSession?.user?.id) return true;
  await sleep(120);
  const peek = await supabase.auth.getSession();
  if (peek.data.session?.user?.id) return true;

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return false;

  await sleep(40);
  const after = await supabase.auth.getSession();
  return !!after.data.session?.user?.id;
}

/** Retry select; if session exists upsert profile (covers missing/failed triggers). Reload schema if selects still error. */
async function ensureProfileReadyAfterSignup(
  userId: string,
  emailFallback: string,
  chosenUsername: string,
  signUpEmail: string,
  signUpPassword: string,
  signupSession: Session | null,
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

  const canUpsert = await establishSessionAfterSignUp(signUpEmail, signUpPassword, signupSession);

  if (canUpsert) {
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
  }

  console.error('[signUp] profile still missing after retries; last=', lastErr);
  throw new Error(
    'No profile row yet. If Supabase requires email confirmation, verify your inbox and sign in.',
  );
}

export async function signIn(data: SignInData): Promise<AuthResult> {
  const { email, password } = data;

  if (!email || !password) throw new Error('Email and password are required');

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message === 'Invalid login credentials'
    ? 'Invalid email or password'
    : error.message);

  const userObj = authData.user as User | null;
  if (!userObj) throw new Error('Sign in failed');

  const resolvedEmail = userObj.email ?? email;
  const profile = await fetchRequiredProfile(userObj.id, resolvedEmail);

  return {
    user: { id: userObj.id, email: resolvedEmail },
    profile,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return getAuthSnapshotFromSession(session);
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
  if (error) throw new Error(error.message);
  const email = data.user?.email;
  if (!email) throw new Error('No email available');
  const result = await supabase.auth.resend({ type: 'signup', email });
  if (result.error) throw new Error(result.error.message);
}

export async function updateAuthEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw new Error(error.message);
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
        : signErr.message,
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
