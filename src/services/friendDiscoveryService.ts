import { supabase } from '../lib/supabase';

export interface FriendSearchRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_LIKE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Resolve @username, email, exact UUID, plus DB RPC when migration is applied. */
export async function resolveFriendTarget(query: string): Promise<FriendSearchRow | null> {
  const raw = query.trim();
  if (!raw) return null;

  if (UUID_RE.test(raw)) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', raw)
      .maybeSingle();
    if (error || !profile) return null;
    return {
      user_id: profile.id,
      username: profile.username as string,
      avatar_url: (profile.avatar_url as string | null) ?? null,
    };
  }

  const { data: rpcRows, error: rpcErr } = await supabase.rpc('find_users_for_friend_search', {
    p_query: raw,
  });

  const rpcFnMissing =
    !!rpcErr
    && (/function .* does not exist|schema cache/i.test(String(rpcErr.message)) || rpcErr.code === '42883');

  if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const r = rpcRows[0] as { user_id: string; username: string; avatar_url: string | null };
    return {
      user_id: r.user_id,
      username: r.username,
      avatar_url: r.avatar_url,
    };
  }

  if (!rpcFnMissing && EMAIL_LIKE.test(raw)) return null;

  if (!EMAIL_LIKE.test(raw)) {
    const stripped = raw.replace(/^@/, '').trim();
    if (stripped.length > 0) {
      const { data: candidates } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', stripped)
        .limit(10);

      const hit =
        candidates?.find(c => String(c.username).toLowerCase() === stripped.toLowerCase()) ?? candidates?.[0];

      if (hit) {
        return {
          user_id: hit.id as string,
          username: hit.username as string,
          avatar_url: (hit.avatar_url as string | null) ?? null,
        };
      }
    }
  }

  return null;
}

/** Lightweight search for autocomplete (username prefix); full email resolves via Resolve button / RPC. */
export async function searchProfilesByUsernamePrefix(prefix: string, limit = 8): Promise<FriendSearchRow[]> {
  const p = prefix.replace(/^@/, '').trim().toLowerCase();
  if (p.length < 1) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `${p}%`)
    .order('username')
    .limit(limit);
  if (error || !data?.length) return [];
  return data.map(row => ({
    user_id: row.id as string,
    username: row.username as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
  }));
}

export async function loadProfilesForIds(ids: string[]): Promise<Map<string, FriendSearchRow>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', unique);

  const map = new Map<string, FriendSearchRow>();
  if (error || !data) return map;
  for (const row of data) {
    map.set(row.id as string, {
      user_id: row.id as string,
      username: row.username as string,
      avatar_url: (row.avatar_url as string | null) ?? null,
    });
  }
  return map;
}
