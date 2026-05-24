import type {
  Post, PostFilter, CreatePostData, ReactionType, PostType,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { profileLiteFromRow } from './profileHelpers';
import { sanitizeText, sanitizeTags } from '../utils/sanitize';
import { isPostOwner } from '../utils/helpers';
import { SEED_COMMENTS, SEED_POSTS, SEED_PROFILES, SEED_REACTIONS } from './mockData';
import { ensureAuthUidAndProfileRow, getAuthUidForWrite } from './authService';

function viewerReactionsForUser(
  reactions: { user_id: string; type: string }[],
  viewerId?: string,
): ReactionType[] {
  if (!viewerId) return [];
  return [
    ...new Set(
      reactions
        .filter((r) => String(r.user_id) === String(viewerId))
        .map((r) => r.type as ReactionType),
    ),
  ];
}

/** PostgREST caps result rows (~1000 by default); paginate so feeds do not truncate reaction/comment aggregates. */
const ENRICH_PAGE_SIZE = 900;

async function fetchAllReactionRowsForPosts(
  postIds: string[],
): Promise<Array<{ id: string; post_id: string; user_id: string; type: string }>> {
  if (postIds.length === 0) return [];
  const aggregated: Array<{ id: string; post_id: string; user_id: string; type: string }> = [];
  let from = 0;
  for (;;) {
    const { data: chunk, error } = await supabase
      .from('reactions')
      .select('id, post_id, user_id, type')
      .in('post_id', postIds)
      .order('id', { ascending: true })
      .range(from, from + ENRICH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (chunk ?? []) as Array<{ id: string; post_id: string; user_id: string; type: string }>;
    if (rows.length === 0) break;
    aggregated.push(...rows);
    if (rows.length < ENRICH_PAGE_SIZE) break;
    from += rows.length;
  }
  return aggregated;
}

async function fetchAllCommentsForPosts(
  postIds: string[],
): Promise<Array<{ id: string; post_id: string }>> {
  if (postIds.length === 0) return [];
  const aggregated: Array<{ id: string; post_id: string }> = [];
  let from = 0;
  for (;;) {
    const { data: chunk, error } = await supabase
      .from('comments')
      .select('id, post_id')
      .in('post_id', postIds)
      .order('id', { ascending: true })
      .range(from, from + ENRICH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (chunk ?? []) as Array<{ id: string; post_id: string }>;
    if (rows.length === 0) break;
    aggregated.push(...rows);
    if (rows.length < ENRICH_PAGE_SIZE) break;
    from += rows.length;
  }
  return aggregated;
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** When `posts.place_website_url` / `google_maps_url` are not migrated yet (PostgREST schema cache errors). */
const POST_URL_COLUMNS_MIGRATION_HINT =
  'Posts are missing optional map/website columns. In Supabase, run `supabase/migrations/008_post_place_urls.sql` '
  + '(Dashboard → SQL, or CLI `supabase db push`). Then Dashboard → Settings → API → Reload schema.';

function isPostsUrlColumnMissingError(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('google_maps_url')
    || msg.includes('place_website_url')
  ) && (msg.includes('schema cache') || msg.includes('could not find') || msg.includes('column'));
}

function isPostsAnonymousColumnMissingError(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  if (!msg) return false;
  return msg.includes('is_anonymous') && (msg.includes('schema cache') || msg.includes('could not find') || msg.includes('column'));
}

/** Normalize DB / JSON boolean quirks (PostgREST / drivers). */
function rowBool(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 't' || s === '1' || s === 'yes';
  }
  return Boolean(v);
}

/** Raw column from PostgREST (snake_case) or occasional camelCase transforms. */
function rowAnonymousRaw(row: Record<string, unknown>): unknown {
  if ('is_anonymous' in row) return row.is_anonymous;
  const r = row as { isAnonymous?: unknown };
  return r.isAnonymous;
}

/** Prefer stored value when present; otherwise use creation-time intent (handles stale schema cache omitting the column). */
function pickAnonymousFromRow(row: Record<string, unknown>, requestedAtCreate: boolean): boolean {
  const v = rowAnonymousRaw(row);
  if (v !== undefined && v !== null) return rowBool(v);
  return requestedAtCreate;
}

function formatPostsWriteRlsRejected(message: string, code?: string): Error {
  const low = message.toLowerCase();
  const rls = code === '42501' || low.includes('row-level security');
  if (!rls) return new Error(message);
  return new Error(
    `${message}\n\n`
      + 'Post writes require JWT `auth.uid()` to match `posts.author_id` (`profiles.id`). '
      + 'Apply migrations `021_posts_rls_auth_uid_and_profiles_trigger.sql` and '
      + '`022_profiles_rls_authenticated_uid.sql`, then sign out/in.',
  );
}

async function insertPostPayload(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  let insert = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase.from('posts').insert(insert).select('*').single();
    if (!error && data) return data as Record<string, unknown>;

    const errMsg = error?.message ?? 'Could not create post.';
    if (!isPostsUrlColumnMissingError(error) && !isPostsAnonymousColumnMissingError(error)) {
      throw formatPostsWriteRlsRejected(errMsg, error?.code);
    }

    if (isPostsAnonymousColumnMissingError(error) && 'is_anonymous' in insert) {
      throw new Error(
        'Cannot save anonymous preference: PostgREST does not see `posts.is_anonymous` yet. '
        + 'Apply migration `019_posts_is_anonymous.sql`, then Supabase Dashboard → Settings → API → Reload schema '
        + '(or run `NOTIFY pgrst, \'reload schema\';`). '
        + `(${errMsg})`,
      );
    }

    if ('google_maps_url' in insert) {
      insert = { ...insert };
      delete insert.google_maps_url;
      continue;
    }
    if ('place_website_url' in insert) {
      insert = { ...insert };
      delete insert.place_website_url;
      continue;
    }
    throw new Error(POST_URL_COLUMNS_MIGRATION_HINT);
  }
  throw new Error(POST_URL_COLUMNS_MIGRATION_HINT);
}

async function updatePostPayload(id: string, authorId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  let patchToSend = { ...patch };

  for (let attempt = 0; attempt < 8; attempt++) {
    if (Object.keys(patchToSend).length === 0) {
      throw new Error(POST_URL_COLUMNS_MIGRATION_HINT);
    }
    const { data: row, error } = await supabase
      .from('posts')
      .update(patchToSend)
      .eq('id', id)
      .eq('author_id', authorId)
      .select('*')
      .maybeSingle();

    if (!error) {
      if (!row) throw new Error('Post not found or not authorized to edit this post');
      return row as Record<string, unknown>;
    }

    const errMsg = error?.message ?? 'Could not update post.';
    if (!isPostsUrlColumnMissingError(error)) {
      throw formatPostsWriteRlsRejected(errMsg, error?.code);
    }

    if ('google_maps_url' in patchToSend) {
      patchToSend = { ...patchToSend };
      delete patchToSend.google_maps_url;
      continue;
    }
    if ('place_website_url' in patchToSend) {
      patchToSend = { ...patchToSend };
      delete patchToSend.place_website_url;
      continue;
    }
    throw new Error(POST_URL_COLUMNS_MIGRATION_HINT);
  }
  throw new Error(POST_URL_COLUMNS_MIGRATION_HINT);
}

function sanitizeHttpUrl(raw: string | undefined, maxLen: number): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.href.length > maxLen ? u.href.slice(0, maxLen) : u.href;
  } catch {
    return undefined;
  }
}

function getFallbackPosts(filter: PostFilter = {}, currentUserId?: string): Post[] {
  const profileMap = new Map(SEED_PROFILES.map(p => [p.id, p]));
  const reactionByPost = new Map<string, typeof SEED_REACTIONS>();
  for (const r of SEED_REACTIONS) {
    const list = reactionByPost.get(r.post_id) ?? [];
    list.push(r);
    reactionByPost.set(r.post_id, list);
  }
  const commentsByPost = new Map<string, number>();
  for (const c of SEED_COMMENTS) commentsByPost.set(c.post_id, (commentsByPost.get(c.post_id) ?? 0) + 1);

  return SEED_POSTS
    .filter((p) => (filter.type && filter.type !== 'all' ? p.type === filter.type : true))
    .filter((p) => (filter.dietary ? p.dietary_tags.includes(filter.dietary) : true))
    .filter((p) => (filter.cuisine ? p.cuisine_tags.includes(filter.cuisine) : true))
    .filter((p) => (filter.circleId ? p.circle_id === filter.circleId : true))
    .filter((p) => {
      if (!filter.searchQuery?.trim()) return true;
      const q = filter.searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.location_name.toLowerCase().includes(q);
    })
    .map((p) => {
      const reactions = reactionByPost.get(p.id) ?? [];
      return {
        ...p,
        author: profileMap.get(p.author_id),
        like_count: reactions.filter(r => r.type === 'like').length,
        still_there_count: reactions.filter(r => r.type === 'still_there').length,
        comment_count: commentsByPost.get(p.id) ?? 0,
        viewer_reactions: viewerReactionsForUser(reactions, currentUserId),
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function mapRowToPost(
  row: Record<string, unknown>,
  overrides: Partial<Pick<Post,
    | 'author'
    | 'like_count'
    | 'still_there_count'
    | 'comment_count'
    | 'viewer_reactions'
  >> & { mock_rating?: number; mock_is_open?: boolean },
): Post {
  const cuisine_tags = Array.isArray(row.cuisine_tags) ? row.cuisine_tags as string[] : [];
  const dietary_tags = Array.isArray(row.dietary_tags) ? row.dietary_tags as string[] : [];
  const desc = typeof row.description === 'string' ? row.description : '';

  const place_website_url = typeof row.place_website_url === 'string' ? row.place_website_url : undefined;
  const google_maps_url = typeof row.google_maps_url === 'string' ? row.google_maps_url : undefined;

  const base: Post = {
    id: row.id as string,
    author_id: row.author_id as string,
    type: row.type as PostType,
    title: row.title as string,
    description: desc ?? '',
    image_url: typeof row.image_url === 'string' ? row.image_url : undefined,
    location_name: row.location_name as string,
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    place_website_url,
    google_maps_url,
    cuisine_tags,
    dietary_tags,
    is_free_food: Boolean(row.is_free_food),
    expires_at: typeof row.expires_at === 'string' ? row.expires_at : undefined,
    circle_id: typeof row.circle_id === 'string' ? row.circle_id : undefined,
    is_anonymous: rowBool(rowAnonymousRaw(row)),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };

  const merged = { ...base, ...overrides };

  const mock_rating = typeof row.mock_rating === 'number' ? row.mock_rating : undefined;
  const mock_is_open = typeof row.mock_is_open === 'boolean' ? row.mock_is_open : undefined;
  const out = { ...merged };
  if (mock_rating !== undefined) out.mock_rating = mock_rating;
  if (mock_is_open !== undefined) out.mock_is_open = mock_is_open;
  return out;
}

export async function enrichPosts(rows: Record<string, unknown>[], currentUserId?: string): Promise<Post[]> {
  if (rows.length === 0) return [];

  const postIds = rows.map(r => r.id as string);
  const authorIds = [...new Set(rows.map(r => r.author_id as string))];

  const [reactionRows, commentRows, profilesResult] = await Promise.all([
    fetchAllReactionRowsForPosts(postIds),
    fetchAllCommentsForPosts(postIds),
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, food_personality, created_at')
      .in('id', authorIds),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  const profileRows = profilesResult.data ?? [];

  const profileMap = new Map(profileRows.map(p => [p.id, profileLiteFromRow(p)]));
  const commentCountByPost = new Map<string, number>();
  for (const c of commentRows) {
    const pid = c.post_id as string;
    commentCountByPost.set(pid, (commentCountByPost.get(pid) ?? 0) + 1);
  }

  return rows.map((row) => {
    const id = row.id as string;
    const reactions = reactionRows.filter(r => r.post_id === id);
    return mapRowToPost(row, {
      author: profileMap.get(row.author_id as string),
      like_count: reactions.filter(r => r.type === 'like').length,
      still_there_count: reactions.filter(r => r.type === 'still_there').length,
      comment_count: commentCountByPost.get(id) ?? 0,
      viewer_reactions: viewerReactionsForUser(reactions, currentUserId),
    });
  });
}

export async function getPaginatedPosts(
  filter: PostFilter = {},
  currentUserId?: string
): Promise<Post[]> {
  if (!isSupabaseConfigured) {
    return getFallbackPosts(filter, currentUserId);
  }

  try {
  if (filter.circleId) {
    const { data: cpRows, error: cpErr } = await supabase
      .from('circle_posts')
      .select('post_id')
      .eq('circle_id', filter.circleId)
      .order('created_at', { ascending: false });
    if (cpErr) throw new Error(cpErr.message);

    const orderedIds = (cpRows ?? []).map(r => r.post_id as string);
    if (orderedIds.length === 0) return getFallbackPosts(filter, currentUserId);

    let q = supabase.from('posts').select('*').in('id', [...new Set(orderedIds)]);

    if (filter.type && filter.type !== 'all') {
      q = q.eq('type', filter.type);
    }
    if (filter.dietary) {
      q = q.contains('dietary_tags', [filter.dietary]);
    }
    if (filter.cuisine) {
      q = q.contains('cuisine_tags', [filter.cuisine]);
    }
    if (filter.searchQuery?.trim()) {
      const term = escapeIlike(filter.searchQuery.trim());
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,location_name.ilike.%${term}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if ((rows ?? []).length === 0) return getFallbackPosts(filter, currentUserId);
    const enriched = await enrichPosts((rows ?? []) as Record<string, unknown>[], currentUserId);
    const map = new Map(enriched.map(p => [p.id, p]));
    const ordered = orderedIds.map(id => map.get(id)).filter((p): p is Post => p != null);
    return ordered.length > 0 ? ordered : getFallbackPosts(filter, currentUserId);
  }

  let q = supabase.from('posts').select('*');

  if (filter.type && filter.type !== 'all') {
    q = q.eq('type', filter.type);
  }
  if (filter.dietary) {
    q = q.contains('dietary_tags', [filter.dietary]);
  }
  if (filter.cuisine) {
    q = q.contains('cuisine_tags', [filter.cuisine]);
  }
  if (filter.searchQuery?.trim()) {
    const term = escapeIlike(filter.searchQuery.trim());
    q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,location_name.ilike.%${term}%`);
  }

  q = q.order('created_at', { ascending: false });

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  if ((rows ?? []).length === 0) return getFallbackPosts(filter, currentUserId);
  return enrichPosts((rows ?? []) as Record<string, unknown>[], currentUserId);
  } catch (e) {
    console.error('[Nommi] getPaginatedPosts failed:', e);
    throw e;
  }
}

export async function getPostById(id: string, currentUserId?: string): Promise<Post | null> {
  const { data: row, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const [enriched] = await enrichPosts([row as Record<string, unknown>], currentUserId);
  return enriched ?? null;
}

/** Batch fetch + enrich (profile collections, intents, liked list). Preserves first-seen id order. */
export async function getPostsByIds(ids: string[], currentUserId?: string): Promise<Post[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const { data: rows, error } = await supabase.from('posts').select('*').in('id', unique);
  if (error || !rows?.length) return [];

  const enriched = await enrichPosts(rows as Record<string, unknown>[], currentUserId);
  const rank = new Map(unique.map((id, i) => [id, i]));
  return [...enriched].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

export async function getLikedPostIdsForUser(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('reactions')
      .select('post_id')
      .eq('user_id', userId)
      .eq('type', 'like');
    if (error) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of data ?? []) {
      const pid = r.post_id as string;
      if (!seen.has(pid)) {
        seen.add(pid);
        out.push(pid);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Avatar grid / authored posts list for a profile.
 * Anonymous posts (`is_anonymous`) are hidden when viewing anyone except the owner (creator still sees theirs).
 */
export async function getPostsByAuthor(
  authorId: string,
  viewerUserId?: string | null,
  viewerProfileId?: string | null,
): Promise<Post[]> {
  const showAnonymous = isPostOwner(viewerUserId, viewerProfileId, authorId);

  let q = supabase
    .from('posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (!showAnonymous) {
    q = q.eq('is_anonymous', false);
  }

  const { data: rows, error } = await q;

  if (error) {
    return getFallbackPosts({}, viewerUserId ?? undefined).filter((p) => {
      if (p.author_id !== authorId) return false;
      if (!showAnonymous && p.is_anonymous) return false;
      return true;
    });
  }
  if ((rows ?? []).length === 0) {
    return getFallbackPosts({}, viewerUserId ?? undefined).filter((p) => {
      if (p.author_id !== authorId) return false;
      if (!showAnonymous && p.is_anonymous) return false;
      return true;
    });
  }
  return enrichPosts((rows ?? []) as Record<string, unknown>[], viewerUserId ?? undefined);
}

export async function createPost(data: CreatePostData): Promise<Post> {
  if (!data.title.trim()) throw new Error('Title is required');
  if (!data.location_name.trim()) throw new Error('Location is required');
  if (data.is_free_food && !data.expires_at) throw new Error('Expiration time is required for free food posts');
  if (data.description && data.description.length > 500) throw new Error('Description must be 500 characters or less');

  const authorId = await ensureAuthUidAndProfileRow('create post');

  const insert = {
    author_id: authorId,
    type: data.type,
    title: sanitizeText(data.title, 100),
    description: sanitizeText(data.description, 500) || null,
    image_url: data.image_url?.trim() || null,
    location_name: sanitizeText(data.location_name, 100),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    place_website_url: sanitizeHttpUrl(data.place_website_url, 2000) ?? null,
    google_maps_url: sanitizeHttpUrl(data.google_maps_url, 2000) ?? null,
    cuisine_tags: sanitizeTags(data.cuisine_tags),
    dietary_tags: sanitizeTags(data.dietary_tags),
    is_free_food: data.is_free_food,
    expires_at: data.expires_at ?? null,
    circle_id: data.circle_id ?? null,
    is_anonymous: data.is_anonymous === true,
  };

  if (import.meta.env.DEV) {
    console.log('[postService createPost] insert payload keys', {
      is_anonymous: insert.is_anonymous,
      fromData: data.is_anonymous,
    });
  }

  const row = await insertPostPayload(insert);
  const raw = { ...(row as Record<string, unknown>) };
  raw.is_anonymous = pickAnonymousFromRow(raw, data.is_anonymous === true);

  const [enriched] = await enrichPosts([raw], authorId);
  if (!enriched) throw new Error('Could not load new post');
  return enriched;
}

export async function updatePost(
  id: string,
  data: Partial<CreatePostData>,
): Promise<Post> {
  const currentUserId = await getAuthUidForWrite('update post');

  const patch: Record<string, unknown> = {};

  if (data.type !== undefined) patch.type = data.type;
  if (data.title !== undefined) patch.title = sanitizeText(data.title, 100);
  if (data.description !== undefined) patch.description = sanitizeText(data.description, 500) || null;
  if (data.image_url !== undefined) patch.image_url = data.image_url?.trim() || null;
  if (data.location_name !== undefined) patch.location_name = sanitizeText(data.location_name, 100);
  if (data.latitude !== undefined) patch.latitude = data.latitude ?? null;
  if (data.longitude !== undefined) patch.longitude = data.longitude ?? null;
  if (data.place_website_url !== undefined) {
    patch.place_website_url = sanitizeHttpUrl(data.place_website_url, 2000) ?? null;
  }
  if (data.google_maps_url !== undefined) {
    patch.google_maps_url = sanitizeHttpUrl(data.google_maps_url, 2000) ?? null;
  }
  if (data.cuisine_tags !== undefined) patch.cuisine_tags = sanitizeTags(data.cuisine_tags);
  if (data.dietary_tags !== undefined) patch.dietary_tags = sanitizeTags(data.dietary_tags);
  if (data.is_free_food !== undefined) patch.is_free_food = data.is_free_food;
  if (data.expires_at !== undefined) patch.expires_at = data.expires_at ?? null;
  if (data.circle_id !== undefined) patch.circle_id = data.circle_id ?? null;

  const row = await updatePostPayload(id, currentUserId, patch);

  const [enriched] = await enrichPosts([row as Record<string, unknown>], currentUserId);
  if (!enriched) throw new Error('Could not load updated post');
  return enriched;
}

export async function deletePost(id: string): Promise<void> {
  const currentUserId = await getAuthUidForWrite('delete post');
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('author_id', currentUserId)
    .select('id')
    .maybeSingle();

  if (error) throw formatPostsWriteRlsRejected(error.message, error.code);
  if (!data) throw new Error('Post not found or not authorized to delete this post');
}

/** Turn PostgREST/Postgres failures into actionable messages (migration / auth hints). */
function reactionWriteError(insErr: { message?: string; code?: string }): Error {
  const msg = insErr.message ?? 'Reaction failed.';
  const code = insErr.code ?? '';
  const low = msg.toLowerCase();

  if (code === '42501' || low.includes('row-level security')) {
    return new Error(`${msg} Likes require a signed-in session (same JWT as saves). Try signing out and back in.`);
  }
  if (
    code === '23505'
    || low.includes('duplicate key')
    || msg.includes('reactions_post_id_user_id_key')
    || msg.includes('reactions_post_user_type_key')
  ) {
    return new Error(
      `${msg}\n\n`
      + 'Likes failed because Postgres only allows ONE reaction row per account per post (often after you tapped “still there”). '
      + 'Run `supabase/migrations/015_reactions_per_type_unique.sql` in the Supabase SQL Editor (drops `reactions_post_id_user_id_key`, '
      + 'adds unique on `post_id, user_id, type` so Like and Still there can both exist).\n'
      + 'Reload the app afterward.',
    );
  }
  return new Error(msg);
}

export async function reactToPost(
  postId: string,
  userId: string,
  type: ReactionType
): Promise<{ like_count: number; still_there_count: number; viewer_reactions: ReactionType[] }> {
  const { data: mineRows, error: mineErr } = await supabase
    .from('reactions')
    .select('id, type')
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (mineErr) {
    if (!isSupabaseConfigured) {
      const reactions = SEED_REACTIONS.filter(r => r.post_id === postId);
      const has = reactions.some(r => String(r.user_id) === userId && r.type === type);
      let nextRows = [...reactions];
      if (has) {
        nextRows = nextRows.filter(r => !(String(r.user_id) === userId && r.type === type));
      } else {
        nextRows = [...nextRows, { id: 'local', post_id: postId, user_id: userId, type }];
      }
      const mine = viewerReactionsForUser(nextRows, userId);
      return {
        like_count: Math.max(0, nextRows.filter(r => r.type === 'like').length),
        still_there_count: Math.max(0, nextRows.filter(r => r.type === 'still_there').length),
        viewer_reactions: mine,
      };
    }
    throw new Error(mineErr.message);
  }

  const mine = mineRows ?? [];
  const hit = mine.find(r => r.type === type);

  if (hit) {
    const { error: delErr } = await supabase.from('reactions').delete().eq('id', hit.id);
    if (delErr) throw reactionWriteError(delErr);
  } else {
    const { error: insErr } = await supabase
      .from('reactions')
      .insert({ post_id: postId, user_id: userId, type });
    if (insErr) throw reactionWriteError(insErr);
  }

  const { data: all, error } = await supabase
    .from('reactions')
    .select('user_id, type')
    .eq('post_id', postId);

  if (error) throw new Error(error.message);
  const list = all ?? [];

  return {
    like_count: list.filter(r => r.type === 'like').length,
    still_there_count: list.filter(r => r.type === 'still_there').length,
    viewer_reactions: viewerReactionsForUser(list, userId),
  };
}
