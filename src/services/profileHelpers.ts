import type { UserProfile } from '../types';

/** Public profile projection (email not stored on `profiles` in Supabase). */
export function profileLiteFromRow(row: {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  food_personality?: string | null;
  created_at: string;
}): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: '',
    avatar_url: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    food_personality: row.food_personality ?? undefined,
    created_at: row.created_at,
  };
}
