import type {
  CircleActivityItem,
  CreateCircleInput,
  FoodCircle,
  Post,
  UserProfile,
} from '../types';
import { supabase } from '../lib/supabase';
import { profileLiteFromRow } from './profileHelpers';
import { enrichPosts } from './postService';
import { SEED_CIRCLES, SEED_MEMBERSHIPS, SEED_POSTS, SEED_PROFILES } from './mockData';

function enrichCircle(
  circle: FoodCircle,
  membershipsByCircle: Map<string, { circle_id: string; user_id: string }[]>,
  currentUserId?: string,
): FoodCircle {
  const memberships = membershipsByCircle.get(circle.id) ?? [];
  const memberCount = memberships.length;
  const isMember = currentUserId
    ? memberships.some(m => m.user_id === currentUserId)
    : false;
  return { ...circle, member_count: memberCount, is_member: isMember };
}

function mapCircleRow(row: Record<string, unknown>): FoodCircle {
  const tagsRaw = row.tags;
  const tags = Array.isArray(tagsRaw)
    ? (tagsRaw as string[]).filter(t => typeof t === 'string' && t.trim().length > 0)
    : [];

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? '',
    icon_type: (row.icon_type as string | null) ?? '🍴',
    created_at: row.created_at as string,
    tags: tags.length > 0 ? tags : undefined,
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
  try {
    const { data: rows, error } = await supabase.from('food_circles').select('*').order('name');
    if (error) throw new Error(error.message);
    if (!rows?.length) {
      const fallbackBuckets = new Map<string, { circle_id: string; user_id: string }[]>();
      for (const m of SEED_MEMBERSHIPS) {
        const list = fallbackBuckets.get(m.circle_id) ?? [];
        list.push(m);
        fallbackBuckets.set(m.circle_id, list);
      }
      return SEED_CIRCLES.map(c => enrichCircle(c, fallbackBuckets, currentUserId));
    }
    const buckets = await loadMembershipBuckets();
    const circles = (rows ?? []).map(r => mapCircleRow(r as Record<string, unknown>));
    return circles.map(c => enrichCircle(c, buckets, currentUserId));
  } catch {
    const fallbackBuckets = new Map<string, { circle_id: string; user_id: string }[]>();
    for (const m of SEED_MEMBERSHIPS) {
      const list = fallbackBuckets.get(m.circle_id) ?? [];
      list.push(m);
      fallbackBuckets.set(m.circle_id, list);
    }
    return SEED_CIRCLES.map(c => enrichCircle(c, fallbackBuckets, currentUserId));
  }
}

/** Public profiles for users in this circle (`circle_memberships` is readable app-wide per RLS). */
export async function getCircleMembers(circleId: string): Promise<UserProfile[]> {
  const { data: memRows, error: mErr } = await supabase
    .from('circle_memberships')
    .select('user_id, joined_at')
    .eq('circle_id', circleId)
    .order('joined_at', { ascending: true });

  if (mErr) throw new Error(mErr.message);
  const orderedUserIds = [...new Set((memRows ?? []).map(m => m.user_id as string))];
  if (orderedUserIds.length === 0) return [];

  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', orderedUserIds);

  if (pErr) throw new Error(pErr.message);
  const profMap = new Map((profs ?? []).map(p => [p.id, profileLiteFromRow(p)]));
  return orderedUserIds.map(id => profMap.get(id)).filter((p): p is UserProfile => p != null);
}

export async function getCircleById(id: string, currentUserId?: string): Promise<FoodCircle | null> {
  const { data: row, error } = await supabase.from('food_circles').select('*').eq('id', id).maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;
  const buckets = await loadMembershipBuckets();
  return enrichCircle(mapCircleRow(row as Record<string, unknown>), buckets, currentUserId);
}

export async function createCircle(input: CreateCircleInput, creatorUserId: string): Promise<FoodCircle> {
  const name = input.name.trim();
  if (!name) throw new Error('Circle name is required');

  const tags = (input.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean);
  const base: Record<string, unknown> = {
    name: name.slice(0, 120),
    description: (input.description ?? '').trim().slice(0, 500) || '',
    icon_type: input.icon_type?.trim() || '🍴',
  };
  /** omit tags if migration not deployed — try both */
  let ins = await supabase.from('food_circles').insert({ ...base, tags }).select('*').single();

  if (ins.error?.message?.toLowerCase().includes('tags') || ins.error?.code === '42703') {
    ins = await supabase.from('food_circles').insert(base).select('*').single();
  }

  if (ins.error) throw new Error(ins.error.message);

  const data = ins.data as Record<string, unknown> | null;
  if (!data) throw new Error('Could not create circle');

  await joinCircle(data.id as string, creatorUserId);

  const buckets = await loadMembershipBuckets();
  return enrichCircle(mapCircleRow(data), buckets, creatorUserId);
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

/** Posts shared into this circle (single post row; sharer ≠ author when others share). */
export async function getCirclePosts(circleId: string, currentUserId?: string): Promise<Post[]> {
  const { data: links, error } = await supabase
    .from('circle_posts')
    .select('id, post_id, shared_by, created_at, note')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });

  if (error || !links?.length) {
    const fallbackProfileMap = new Map(SEED_PROFILES.map(p => [p.id, p]));
    return SEED_POSTS
      .filter(p => p.circle_id === circleId)
      .map(p => ({ ...p, author: fallbackProfileMap.get(p.author_id) }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const { data: circleRow } = await supabase
    .from('food_circles')
    .select('name')
    .eq('id', circleId)
    .maybeSingle();
  const circleName = (circleRow?.name as string) ?? 'Circle';

  const postIds = links.map(l => l.post_id as string);
  const { data: postRows, error: pErr } = await supabase.from('posts').select('*').in('id', postIds);
  if (pErr) throw new Error(pErr.message);

  const enriched = await enrichPosts((postRows ?? []) as Record<string, unknown>[], currentUserId);
  const byId = new Map(enriched.map(p => [p.id, p]));

  const sharerIds = [...new Set(links.map(l => l.shared_by as string))];
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', sharerIds);

  const sharerMap = new Map((profs ?? []).map(p => [p.id, profileLiteFromRow(p)]));

  const ordered: Post[] = [];
  for (const link of links) {
    const p = byId.get(link.post_id as string);
    if (!p) continue;
    const sharer = sharerMap.get(link.shared_by as string);
    if (!sharer) continue;

    ordered.push({
      ...p,
      circle_share: {
        circle_id: circleId,
        circle_name: circleName,
        share_id: link.id as string,
        shared_at: link.created_at as string,
        shared_by_id: link.shared_by as string,
        shared_by: sharer,
        note: (link.note as string | null | undefined) ?? null,
      },
    });
  }
  return ordered;
}

export async function sharePostToCircle(
  postId: string,
  circleId: string,
  sharedByUserId: string,
  note?: string | null,
): Promise<void> {
  const trimmed = note?.trim() || null;
  const { error } = await supabase.from('circle_posts').insert({
    circle_id: circleId,
    post_id: postId,
    shared_by: sharedByUserId,
    note: trimmed?.slice(0, 280) ?? null,
  });

  if (error) {
    if (error.code === '23505' || (error.message ?? '').toLowerCase().includes('duplicate')) {
      throw new Error('already_shared');
    }
    throw new Error(error.message);
  }
}

/** Share post into multiple joined circles at once (ignores duplicates if already_shared). */
export async function sharePostToCircles(
  postId: string,
  circleIds: string[],
  sharedByUserId: string,
  note?: string | null,
): Promise<{ shared: number; skipped: number }> {
  let shared = 0;
  let skipped = 0;
  for (const cid of circleIds) {
    try {
      await sharePostToCircle(postId, cid, sharedByUserId, note);
      shared++;
    } catch (e) {
      if (e instanceof Error && e.message === 'already_shared') skipped++;
      else throw e;
    }
  }
  return { shared, skipped };
}

export async function getCircleIdsContainingPost(postId: string, candidateCircleIds: string[]): Promise<Set<string>> {
  if (candidateCircleIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('circle_posts')
    .select('circle_id')
    .eq('post_id', postId)
    .in('circle_id', candidateCircleIds);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map(r => r.circle_id as string));
}

/** Curated posts from circles this user belongs to (not app-wide feed). */
export async function getActivityInJoinedCircles(
  userId: string,
  currentUserId?: string,
  limit = 30,
): Promise<CircleActivityItem[]> {
  try {
  const { data: mems, error: mErr } = await supabase
    .from('circle_memberships')
    .select('circle_id')
    .eq('user_id', userId);

  if (mErr) throw new Error(mErr.message);
  const cids = [...new Set((mems ?? []).map(m => m.circle_id as string))];
  if (cids.length === 0) return [];

  const { data: links, error: lErr } = await supabase
    .from('circle_posts')
    .select('id, circle_id, post_id, shared_by, created_at, note')
    .in('circle_id', cids)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (lErr) throw new Error(lErr.message);
  if (!links?.length) return [];

  const { data: circles } = await supabase.from('food_circles').select('id, name').in('id', cids);
  const circleNameMap = new Map((circles ?? []).map(c => [c.id as string, c.name as string]));

  const postIds = [...new Set(links.map(l => l.post_id as string))];
  const { data: postRows } = await supabase.from('posts').select('*').in('id', postIds);

  const enrichedPosts = await enrichPosts((postRows ?? []) as Record<string, unknown>[], currentUserId);
  const postMap = new Map(enrichedPosts.map(p => [p.id, p]));

  const uidSet = new Set<string>();
  for (const l of links) {
    uidSet.add(l.shared_by as string);
    const post = postMap.get(l.post_id as string);
    if (post) uidSet.add(post.author_id);
  }

  const { data: profs } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', [...uidSet]);

  const profMap = new Map((profs ?? []).map(p => [p.id, profileLiteFromRow(p)]));

  const items: CircleActivityItem[] = [];
  for (const link of links) {
    const post = postMap.get(link.post_id as string);
    const sharer = profMap.get(link.shared_by as string);
    if (!post || !sharer) continue;
    const authorProfile = profMap.get(post.author_id);
    const postWithAuthor = authorProfile ? { ...post, author: authorProfile } : post;

    items.push({
      share_id: link.id as string,
      shared_at: link.created_at as string,
      circle: {
        id: link.circle_id as string,
        name: circleNameMap.get(link.circle_id as string) ?? 'Circle',
      },
      sharer,
      post: postWithAuthor,
      note: (link.note as string | null | undefined) ?? null,
    });
  }
  return items;
  } catch {
    const fallbackMemberships = SEED_MEMBERSHIPS.filter(m => m.user_id === userId).map(m => m.circle_id);
    if (fallbackMemberships.length === 0) return [];
    const profileMap = new Map(SEED_PROFILES.map(p => [p.id, p]));
    return SEED_POSTS
      .filter(p => p.circle_id && fallbackMemberships.includes(p.circle_id))
      .slice(0, limit)
      .map((p) => ({
        share_id: `fallback-${p.id}`,
        shared_at: p.created_at,
        circle: {
          id: p.circle_id!,
          name: SEED_CIRCLES.find(c => c.id === p.circle_id)?.name ?? 'Circle',
        },
        sharer: profileMap.get(p.author_id)!,
        post: { ...p, author: profileMap.get(p.author_id) },
        note: null,
      }));
  }
}

/** Original post authors weighted by appearances in circles the user belongs to. */
export async function getTopContributorsInMyCircles(userId: string, limit = 5) {
  const { data: mems } = await supabase.from('circle_memberships').select('circle_id').eq('user_id', userId);
  const cids = [...new Set((mems ?? []).map(m => m.circle_id as string))];
  if (cids.length === 0) return [];

  const { data: links } = await supabase.from('circle_posts').select('post_id').in('circle_id', cids);
  const postIds = [...new Set((links ?? []).map(l => l.post_id as string))];
  if (postIds.length === 0) return [];

  const { data: postsRows, error } = await supabase.from('posts').select('author_id').in('id', postIds);
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const p of postsRows ?? []) {
    const aid = (p as { author_id: string }).author_id;
    counts[aid] = (counts[aid] ?? 0) + 1;
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);

  const userIds = ranked.map(([id]) => id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, food_personality, created_at')
    .in('id', userIds);

  if (pErr) throw new Error(pErr.message);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, profileLiteFromRow(p)]));

  return ranked
    .map(([authorId, post_count]) => ({
      profile: profileMap.get(authorId) as UserProfile | undefined,
      post_count,
    }))
    .filter(c => c.profile != null);
}

/** @deprecated use getTopContributorsInMyCircles from Community scoped to memberships */
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
