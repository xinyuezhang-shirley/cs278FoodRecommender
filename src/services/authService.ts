import type { UserProfile, AuthUser, SignUpData, SignInData } from '../types';
import {
  getUsers, saveUsers, saveSession, clearSession, getSession, getProfileById,
} from './storageService';
import { validateEmail, validatePassword, validateUsername } from '../utils/sanitize';
import { generateId } from '../utils/helpers';

export interface AuthResult {
  user: AuthUser;
  profile: UserProfile;
}

export async function signUp(data: SignUpData): Promise<AuthResult> {
  const { email, password, username } = data;

  if (!validateEmail(email)) throw new Error('Invalid email address');
  const pwErr = validatePassword(password);
  if (pwErr) throw new Error(pwErr);
  const unErr = validateUsername(username);
  if (unErr) throw new Error(unErr);

  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists');
  }
  if (users.find(u => u.profile.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username is already taken');
  }

  const id = generateId();
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id,
    username,
    email,
    avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
    bio: '',
    food_personality: 'Food Explorer 🍴',
    created_at: now,
  };

  users.push({ id, email, password, profile });
  saveUsers(users);

  const token = generateId();
  saveSession(id, token);

  return { user: { id, email }, profile };
}

export async function signIn(data: SignInData): Promise<AuthResult> {
  const { email, password } = data;

  if (!email || !password) throw new Error('Email and password are required');

  const users = getUsers();
  const stored = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!stored || stored.password !== password) {
    throw new Error('Invalid email or password');
  }

  const token = generateId();
  saveSession(stored.id, token);

  return { user: { id: stored.id, email: stored.email }, profile: stored.profile };
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  const session = getSession();
  if (!session) return null;

  const profile = getProfileById(session.userId);
  if (!profile) {
    clearSession();
    return null;
  }

  const users = getUsers();
  const stored = users.find(u => u.id === session.userId);
  if (!stored) {
    clearSession();
    return null;
  }

  return {
    user: { id: stored.id, email: stored.email },
    profile,
  };
}

export async function updateUserProfile(
  userId: string,
  update: Partial<Pick<UserProfile, 'username' | 'bio' | 'food_personality' | 'avatar_url'>>
): Promise<UserProfile> {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('User not found');

  if (update.username) {
    const unErr = validateUsername(update.username);
    if (unErr) throw new Error(unErr);
    const taken = users.some(u => u.id !== userId && u.profile.username === update.username);
    if (taken) throw new Error('Username is already taken');
  }

  users[idx].profile = { ...users[idx].profile, ...update };
  saveUsers(users);
  return users[idx].profile;
}
