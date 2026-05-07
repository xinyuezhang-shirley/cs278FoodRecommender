import type { UserProfile, Post, FoodCircle, Comment, Reaction, CircleMembership } from '../types';

const NOW = Date.now();
const HOUR = 3600_000;

export const SEED_PROFILES: UserProfile[] = [
  {
    id: 'user-demo',
    username: 'nommi278',
    email: 'nommi278@nommi.stanford.demo',
    avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=nommi278',
    bio: 'CS278 demo — always hunting for the best bites around campus 🍜',
    food_personality: 'Adventurous Night Owl 🌙🌶️',
    created_at: new Date(NOW - 30 * 24 * HOUR).toISOString(),
  },
  {
    id: 'user-2',
    username: 'foodiefrosh',
    email: 'frosh@stanford.edu',
    avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=foodiefrosh',
    bio: 'First year discovering all the hidden food spots 🥟',
    food_personality: 'Curious Explorer 🗺️',
    created_at: new Date(NOW - 60 * 24 * HOUR).toISOString(),
  },
  {
    id: 'user-3',
    username: 'snacksensei',
    email: 'snacks@stanford.edu',
    avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=snacksensei',
    bio: 'Free food radar: always on 🔍',
    food_personality: 'Free Food Pro 🧋',
    created_at: new Date(NOW - 90 * 24 * HOUR).toISOString(),
  },
];

/** Empty in production paths — real data comes from Supabase. Avoids placeholder posts in the UI. */
export const SEED_POSTS: Post[] = [];

export const SEED_CIRCLES: FoodCircle[] = [];

export const SEED_COMMENTS: Comment[] = [];

export const SEED_REACTIONS: Reaction[] = [];

export const SEED_MEMBERSHIPS: CircleMembership[] = [];
