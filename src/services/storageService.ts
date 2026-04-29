import type {
  UserProfile, Post, Comment, Reaction, FoodCircle,
  CircleMembership, StoredUser,
} from '../types';
import {
  SEED_PROFILES, SEED_POSTS, SEED_CIRCLES,
  SEED_COMMENTS, SEED_REACTIONS, SEED_MEMBERSHIPS,
} from './mockData';

const KEYS = {
  USERS: 'nommi_users',
  POSTS: 'nommi_posts',
  COMMENTS: 'nommi_comments',
  REACTIONS: 'nommi_reactions',
  CIRCLES: 'nommi_circles',
  MEMBERSHIPS: 'nommi_memberships',
  SESSION: 'nommi_session',
  SEEDED: 'nommi_seeded',
} as const;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage might be full; silently continue
  }
}

export function initStorage(): void {
  if (localStorage.getItem(KEYS.SEEDED)) return;

  // Seed demo user with known password
  const demoUser: StoredUser = {
    id: 'user-demo',
    email: 'demo@stanford.edu',
    password: 'demo1234',
    profile: SEED_PROFILES.find(p => p.id === 'user-demo')!,
  };
  const user2: StoredUser = {
    id: 'user-2',
    email: 'frosh@stanford.edu',
    password: 'demo1234',
    profile: SEED_PROFILES.find(p => p.id === 'user-2')!,
  };
  const user3: StoredUser = {
    id: 'user-3',
    email: 'snacks@stanford.edu',
    password: 'demo1234',
    profile: SEED_PROFILES.find(p => p.id === 'user-3')!,
  };

  write(KEYS.USERS, [demoUser, user2, user3]);
  write(KEYS.POSTS, SEED_POSTS);
  write(KEYS.CIRCLES, SEED_CIRCLES);
  write(KEYS.COMMENTS, SEED_COMMENTS);
  write(KEYS.REACTIONS, SEED_REACTIONS);
  write(KEYS.MEMBERSHIPS, SEED_MEMBERSHIPS);
  localStorage.setItem(KEYS.SEEDED, '1');
}

// Users
export function getUsers(): StoredUser[] { return read<StoredUser>(KEYS.USERS); }
export function saveUsers(users: StoredUser[]): void { write(KEYS.USERS, users); }
export function getUserById(id: string): StoredUser | undefined {
  return getUsers().find(u => u.id === id);
}
export function getProfileById(id: string): UserProfile | undefined {
  return getUserById(id)?.profile;
}
export function updateProfile(id: string, update: Partial<UserProfile>): UserProfile | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx].profile = { ...users[idx].profile, ...update };
  saveUsers(users);
  return users[idx].profile;
}

// Session
export function getSession(): { userId: string; token: string } | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveSession(userId: string, token: string): void {
  localStorage.setItem(KEYS.SESSION, JSON.stringify({ userId, token }));
}
export function clearSession(): void {
  localStorage.removeItem(KEYS.SESSION);
}

// Posts
export function getPosts(): Post[] { return read<Post>(KEYS.POSTS); }
export function savePosts(posts: Post[]): void { write(KEYS.POSTS, posts); }

// Comments
export function getComments(): Comment[] { return read<Comment>(KEYS.COMMENTS); }
export function saveComments(comments: Comment[]): void { write(KEYS.COMMENTS, comments); }

// Reactions
export function getReactions(): Reaction[] { return read<Reaction>(KEYS.REACTIONS); }
export function saveReactions(reactions: Reaction[]): void { write(KEYS.REACTIONS, reactions); }

// Circles
export function getCircles(): FoodCircle[] { return read<FoodCircle>(KEYS.CIRCLES); }
export function saveCircles(circles: FoodCircle[]): void { write(KEYS.CIRCLES, circles); }

// Memberships
export function getMemberships(): CircleMembership[] { return read<CircleMembership>(KEYS.MEMBERSHIPS); }
export function saveMemberships(memberships: CircleMembership[]): void {
  write(KEYS.MEMBERSHIPS, memberships);
}
