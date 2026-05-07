import type { IntentType, Post, PostIntent } from '../types';
import { supabase } from '../lib/supabase';
import { getPostsByIds, getLikedPostIdsForUser } from './postService';

const LS_KEY = 'nommi_post_intents_v1';

function readLocalIntents(): PostIntent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PostIntent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalIntents(items: PostIntent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // ignore local storage failure
  }
}

function makeIntentId(userId: string, postId: string, intentType: IntentType): string {
  return `${userId}:${postId}:${intentType}`;
}

function isTableMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || (err.message ?? '').toLowerCase().includes('does not exist');
}

export async function getPostIntentsForUser(userId: string): Promise<PostIntent[]> {
  const fallback = readLocalIntents().filter(i => i.user_id === userId);
  const { data, error } = await supabase
    .from('post_intents')
    .select('id, user_id, post_id, intent_type, created_at')
    .eq('user_id', userId);

  if (error) {
    return fallback;
  }
  const rows = (data ?? []) as PostIntent[];
  return rows.length > 0 ? rows : fallback;
}

export async function togglePostIntent(
  userId: string,
  postId: string,
  intentType: IntentType,
): Promise<boolean> {
  const local = readLocalIntents();
  const id = makeIntentId(userId, postId, intentType);
  const existing = local.find(i => i.id === id);
  const nextLocal = existing
    ? local.filter(i => i.id !== id)
    : [...local, { id, user_id: userId, post_id: postId, intent_type: intentType, created_at: new Date().toISOString() }];
  writeLocalIntents(nextLocal);

  const { data: current, error: fetchErr } = await supabase
    .from('post_intents')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .eq('intent_type', intentType)
    .maybeSingle();

  if (fetchErr && !isTableMissing(fetchErr)) {
    return !existing;
  }
  if (isTableMissing(fetchErr)) {
    return !existing;
  }

  if (current) {
    await supabase.from('post_intents').delete().eq('id', current.id);
    return false;
  }

  await supabase.from('post_intents').insert({
    id,
    user_id: userId,
    post_id: postId,
    intent_type: intentType,
  });
  return true;
}

export async function getIntentBuckets(
  userId: string,
  posts: Post[],
): Promise<Record<IntentType, Post[]>> {
  const intents = await getPostIntentsForUser(userId);
  const byId = new Map(posts.map(p => [p.id, p]));
  return {
    saved: intents.filter(i => i.intent_type === 'saved').map(i => byId.get(i.post_id)).filter((p): p is Post => !!p),
    been_there: intents.filter(i => i.intent_type === 'been_there').map(i => byId.get(i.post_id)).filter((p): p is Post => !!p),
    want_to_go: intents.filter(i => i.intent_type === 'want_to_go').map(i => byId.get(i.post_id)).filter((p): p is Post => !!p),
    favorite: intents.filter(i => i.intent_type === 'favorite').map(i => byId.get(i.post_id)).filter((p): p is Post => !!p),
  };
}

export interface UserPostCollections {
  saved: Post[];
  liked: Post[];
  been_there: Post[];
  want_to_go: Post[];
  favorite: Post[];
}

/** Full post rows for saved / liked / intents — always commentable via PostDetail. */
export async function loadUserPostCollections(
  userId: string,
  viewerId?: string,
): Promise<UserPostCollections> {
  const empty: UserPostCollections = {
    saved: [],
    liked: [],
    been_there: [],
    want_to_go: [],
    favorite: [],
  };

  const intents = await getPostIntentsForUser(userId);
  const likedIds = await getLikedPostIdsForUser(userId);
  const intentIds = [...new Set(intents.map(i => i.post_id))];
  const allIds = [...new Set([...intentIds, ...likedIds])];
  if (allIds.length === 0) return empty;

  const viewer = viewerId ?? userId;
  const posts = await getPostsByIds(allIds, viewer);
  const byId = new Map(posts.map(p => [p.id, p]));

  const likedPosts = likedIds.map(id => byId.get(id)).filter((p): p is Post => p != null);

  return {
    saved: intents.filter(i => i.intent_type === 'saved').map(i => byId.get(i.post_id)).filter((p): p is Post => p != null),
    liked: likedPosts,
    been_there: intents.filter(i => i.intent_type === 'been_there').map(i => byId.get(i.post_id)).filter((p): p is Post => p != null),
    want_to_go: intents.filter(i => i.intent_type === 'want_to_go').map(i => byId.get(i.post_id)).filter((p): p is Post => p != null),
    favorite: intents.filter(i => i.intent_type === 'favorite').map(i => byId.get(i.post_id)).filter((p): p is Post => p != null),
  };
}
