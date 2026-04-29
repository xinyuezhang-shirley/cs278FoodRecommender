import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, AuthUser, SignUpData, SignInData } from '../types';
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword, validateUsername } from '../utils/sanitize';

export interface AuthResult {
  user: AuthUser;
  profile: UserProfile;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  food_personality: string | null;
  created_at: string;
}

function profileRowToUserProfile(row: ProfileRow, email: string): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email,
    avatar_url: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    food_personality: row.food_personality ?? undefined,
    created_at: row.created_at,
  };
}

async function fetchRequiredProfile(userId: string, emailFallback: string): Promise<UserProfile> {
  const { data: row, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Profile not found');

  return profileRowToUserProfile(row as ProfileRow, emailFallback);
}

/** Hydrate app user + profile from a Supabase session (used by AuthContext subscriber). */
export async function getAuthSnapshotFromSession(session: Session | null): Promise<AuthResult | null> {
  const u = session?.user;
  if (!u) return null;

  const email = u.email ?? '';
  const { data: row, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .eq('id', u.id)
    .maybeSingle();

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
    const profile = await fetchRequiredProfile(userObj.id, resolvedEmail);
    return {
      user: { id: userObj.id, email: resolvedEmail },
      profile,
    };
  } catch {
    await supabase.auth.signOut();
    throw new Error('Could not load your profile after sign up. Please try again.');
  }
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

export async function updateUserProfile(
  userId: string,
  update: Partial<Pick<UserProfile, 'username' | 'bio' | 'food_personality' | 'avatar_url'>>
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

  const { data: row, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .single();

  if (error) throw new Error(error.message);

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? '';

  return profileRowToUserProfile(row as ProfileRow, email);
}
