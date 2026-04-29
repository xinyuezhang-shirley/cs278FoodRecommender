import type { FoodCircle, Post, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { profileLiteFromRow } from './profileHelpers';
import { getPaginatedPosts } from './postService';

function enrichCircle(
  circle: FoodCircle,
  membershipsByCircle: Map<string, { circle_id: string; user_id: string }[]>,
  currentUserId?: string
): FoodCircle {
  const memberships = membershipsByCircle.get(circle.id) ?? [];
  const memberCount = memberships.length;
  const isMember = currentUserId
    ? memberships.some(m => m.user_id === currentUserId)
    : false;
  return { ...circle, member_count: memberCount, is_member: isMember };
}

function mapCircleRow(row: Record<string, unknown>): FoodCircle {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? '',
    icon_type: (row.icon_type as string | null) ?? '🍴',
    created_at: row.created_at as string,
  };
}

async function loadMembershipBuckets(): Promise<Map<string, { circle_id: string; user_id: string }[]>> {
  const { data: rows, error } = await supabase
    .from('circle_memberships')
    .select('circle_id, user_id');

  if (error) throw new Error(error.message);

  const buckets = new Map<string, { circle_id: string; user_id: string }[]>();
  for (const m of rows ?? []) {
    const cid = m.circle_id as string;
    const entry = { circle_id: cid, user_id: m.user_id as string };
    const list = buckets.get(cid);
    if (list) list.push(entry);
    else buckets.set(cid, [entry]);
  }
  return buckets;
}

export async function getAllCircles(currentUserId?: string): Promise<FoodCircle[]> {
  const [{ data: rows, error }, buckets] = await Promise.all([
    supabase.from('food_circles').select('*').order('name'),
    loadMembershipBuckets(),
  ]);

  if (error) throw new Error(error.message);
  const circles = (rows ?? []).map(r => mapCircleRow(r as Record<string, unknown>));
  return circles.map(c => enrichCircle(c, buckets, currentUserId));
}

export async function getCircleById(id: string, currentUserId?: string): Promise<FoodCircle | null> {
  const [{ data: row, error }, buckets] = await Promise.all([
    supabase.from('food_circles').select('*').eq('id', id).maybeSingle(),
    loadMembershipBuckets(),
  ]);

  if (error) throw new Error(error.message);
  if (!row) return null;
  const circle = mapCircleRow(row as Record<string, unknown>);
  return enrichCircle(circle, buckets, currentUserId);
}

export async function joinCircle(circleId: string, userId: string): Promise<FoodCircle> {
  const { data: circleRow, error: findErr } = await supabase
    .from('food_circles')
    .select('*')
    .eq('id', circleId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!circleRow) throw new Error('Circle not found');

  const { error } = await supabase
    .from('circle_memberships')
    .insert({ circle_id: circleId, user_id: userId });

  if (error) {
    if (error.code === '23505') throw new Error('Already a member');
    throw new Error(error.message);
  }

  const buckets = await loadMembershipBuckets();
  return enrichCircle(mapCircleRow(circleRow as Record<string, unknown>), buckets, userId);
}

export async function leaveCircle(circleId: string, userId: string): Promise<FoodCircle> {
  const { data: circleRow, error: cErr } = await supabase
    .from('food_circles')
    .select('*')
    .eq('id', circleId)
    .maybeSingle();

  if (cErr) throw new Error(cErr.message);
  if (!circleRow) throw new Error('Circle not found');

  const { data: deleted, error } = await supabase
    .from('circle_memberships')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .select('circle_id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!deleted) throw new Error('Not a member');

  const buckets = await loadMembershipBuckets();
  return enrichCircle(mapCircleRow(circleRow as Record<string, unknown>), buckets, userId);
}

export async function getCirclePosts(circleId: string, currentUserId?: string): Promise<Post[]> {
  return getPaginatedPosts({ circleId }, currentUserId);
}

export async function getTopContributors(limit = 5) {
  const { data: rows, error } = await supabase.from('posts').select('author_id');
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const p of rows ?? []) {
    const uid = (p as { author_id: string }).author_id;
    counts[uid] = (counts[uid] ?? 0) + 1;
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return [];

  const userIds = ranked.map(([id]) => id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', userIds);

  if (pErr) throw new Error(pErr.message);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, profileLiteFromRow(p)]));

  return ranked
    .map(([userId, count]) => ({
      profile: profileMap.get(userId) as UserProfile | undefined,
      post_count: count,
    }))
    .filter(c => c.profile != null);
}

export async function getUserCircleCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('circle_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getUserFreeFoodCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('is_free_food', true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
