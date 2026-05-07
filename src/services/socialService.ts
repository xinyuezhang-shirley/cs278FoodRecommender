import type { DirectMessage, DirectMessageThread, Friendship, FriendRequest, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/helpers';

const FRIEND_REQUESTS_KEY = 'nommi_friend_requests_v1';
const FRIENDSHIPS_KEY = 'nommi_friendships_v1';
const DM_THREADS_KEY = 'nommi_dm_threads_v1';
const DM_MESSAGES_KEY = 'nommi_dm_messages_v1';

function sortParticipantIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => (a > b ? 1 : -1));
}

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export async function listFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_a_id, user_b_id, created_at')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  if (error) {
    return readLocal<Friendship>(FRIENDSHIPS_KEY).filter(f => f.user_a_id === userId || f.user_b_id === userId);
  }
  const rows = (data ?? []) as Friendship[];
  return rows.length > 0 ? rows : readLocal<Friendship>(FRIENDSHIPS_KEY).filter(f => f.user_a_id === userId || f.user_b_id === userId);
}

/**
 * Friends of `subjectId` for signed-in viewers only, when that member enabled
 * {@link UserProfile.show_friends_public} (see `get_friend_profiles_for_subject` migration).
 */
export async function fetchSubjectFriendProfiles(subjectId: string): Promise<UserProfile[]> {
  type Row = {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    food_personality: string | null;
    created_at: string;
  };

  const { data, error } = await supabase.rpc('get_friend_profiles_for_subject', {
    p_subject: subjectId,
  });

  if (error) {
    console.error(error);
    return [];
  }

  return ((data ?? []) as Row[]).map(r => ({
    id: r.id,
    username: r.username,
    email: '',
    avatar_url: r.avatar_url ?? undefined,
    bio: r.bio ?? undefined,
    food_personality: r.food_personality ?? undefined,
    created_at: r.created_at,
  }));
}

export interface ListFriendRequestsResult {
  requests: FriendRequest[];
  /** True when Postgres could not answer and cached local rows were used. */
  fromCache: boolean;
  error?: string;
}

function humanizeFriendRequestError(err: { message?: string; code?: string } | null): string {
  if (!err?.message && !err?.code) return 'Could not load friend requests.';
  const m = `${err.code ?? ''} ${err.message ?? ''}`.toLowerCase();
  if (
    err.code === 'PGRST205'
    || m.includes('schema cache')
    || m.includes('could not find the table')
    || m.includes('42p01')
    || m.includes('does not exist')
  ) {
    return 'The friend_requests table is not available to the API. Apply pending SQL from `supabase/migrations/` in order (friend_requests starts in `003_social_and_interactions.sql`). Use the Supabase SQL editor or `supabase db push`, then Dashboard → Settings → API → Reload schema if errors persist.';
  }
  if (m.includes('jwt') || m.includes('permission') || m.includes('policy') || err.code === '42501') {
    return 'Not allowed to read friend requests — check migrations and RLS policies.';
  }
  return err.message ?? 'Could not load friend requests.';
}

function humanizeWithdrawError(err: { message?: string; code?: string } | null): string {
  if (!err?.message && !err?.code) return 'Could not withdraw request.';
  const m = `${err.code ?? ''} ${err.message ?? ''}`.toLowerCase();
  if (err.code === '42501' || m.includes('policy')) return 'Can’t withdraw that request (permission).';
  return err.message ?? 'Could not withdraw request.';
}

/** Remove one of your outgoing pending invitations (DB + local cache). */
export async function withdrawFriendRequest(senderId: string, requestId: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = requestId.trim();
  if (!trimmedId) return { ok: false, error: 'Missing request' };

  const localAll = readLocal<FriendRequest>(FRIEND_REQUESTS_KEY);

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', trimmedId)
    .eq('sender_id', senderId);

  if (error) {
    const m = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (
      error.code === 'PGRST205'
      || m.includes('schema cache')
      || m.includes('could not find the table')
      || m.includes('42p01')
    ) {
      writeLocal(FRIEND_REQUESTS_KEY, localAll.filter(r => r.id !== trimmedId));
      return { ok: true };
    }
    return { ok: false, error: humanizeWithdrawError(error) };
  }

  writeLocal(FRIEND_REQUESTS_KEY, localAll.filter(r => r.id !== trimmedId));
  return { ok: true };
}

export async function listFriendRequestsDetailed(userId: string): Promise<ListFriendRequestsResult> {
  const localCombined = readLocal<FriendRequest>(FRIEND_REQUESTS_KEY).filter(
    r => r.receiver_id === userId || r.sender_id === userId,
  );

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at')
    .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!error) {
    return {
      requests: (data ?? []) as FriendRequest[],
      fromCache: false,
    };
  }

  return {
    requests: localCombined,
    fromCache: true,
    error: humanizeFriendRequestError(error),
  };
}

export async function listFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { requests } = await listFriendRequestsDetailed(userId);
  return requests;
}

export async function listDmThreads(userId: string): Promise<DirectMessageThread[]> {
  const { data, error } = await supabase
    .from('dm_threads')
    .select('id, participant_ids, last_message_at')
    .contains('participant_ids', [userId]);

  const localCombined = readLocal<DirectMessageThread>(DM_THREADS_KEY).filter(t => t.participant_ids.includes(userId));

  if (error) return localCombined.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  const rows = (data ?? []) as DirectMessageThread[];
  const list = rows.length > 0 ? rows : localCombined;
  return [...list].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

interface SendFriendResult {
  ok: boolean;
  error?: string;
}

function humanizeSendFriendRequestError(err: { message?: string; code?: string } | null): string {
  if (!err?.message && !err?.code) return 'Could not send friend request.';
  const m = `${err.code ?? ''} ${err.message ?? ''}`.toLowerCase();
  if (m.includes('42p01') || m.includes('does not exist')) return 'Friends feature not installed — run migrations 003+.';
  if (m.includes('violates foreign key')) return 'That person’s account isn’t provisioned yet (profile missing).';
  if (m.includes('jwt') || m.includes('permission') || m.includes('policy') || err.code === '42501') {
    return 'You can’t send requests right now (RLS/policy). Confirm you’re signed in and migrations are applied.';
  }
  if (err.code === '23505') return 'A request already exists.';
  return err.message ?? 'Could not send friend request.';
}

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<SendFriendResult> {
  if (!receiverId || senderId === receiverId) {
    return { ok: false, error: 'Choose someone other than yourself' };
  }

  const existingFriends = await listFriendships(senderId);
  const alreadyFriends = existingFriends.some(
    f =>
      (f.user_a_id === senderId && f.user_b_id === receiverId) ||
      (f.user_a_id === receiverId && f.user_b_id === senderId),
  );
  if (alreadyFriends) {
    return { ok: false, error: 'Already friends' };
  }

  const reqs = await listFriendRequests(senderId);
  const pendingDup = reqs.some(
    r =>
      r.status === 'pending'
      && ((r.sender_id === senderId && r.receiver_id === receiverId)
        || (r.sender_id === receiverId && r.receiver_id === senderId)),
  );
  if (pendingDup) {
    return { ok: false, error: 'A request is already pending' };
  }

  const { data: inserted, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
    .select('id, sender_id, receiver_id, status, created_at')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'A request already exists' };
    return { ok: false, error: humanizeSendFriendRequestError(error) };
  }

  if (inserted) {
    writeLocal(FRIEND_REQUESTS_KEY, [
      inserted as FriendRequest,
      ...readLocal<FriendRequest>(FRIEND_REQUESTS_KEY).filter(
        r => !(r.sender_id === senderId && r.receiver_id === receiverId),
      ),
    ]);
  }

  return { ok: true };
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  const localReq = readLocal<FriendRequest>(FRIEND_REQUESTS_KEY);
  const localFriends = readLocal<Friendship>(FRIENDSHIPS_KEY);
  let target = localReq.find(r => r.id === requestId);

  if (!target) {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .maybeSingle();
    if (data) target = data as FriendRequest;
  }

  if (!target) return { ok: false, error: 'Request not found' };

  const nextStatus: FriendRequest['status'] = accept ? 'accepted' : 'declined';
  writeLocal(FRIEND_REQUESTS_KEY, localReq.map(r => (r.id === requestId ? { ...r, status: nextStatus } : r)));
  let optimisticFriendshipId: string | null = null;
  if (accept) {
    const friendship: Friendship = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : generateId(),
      user_a_id: target.sender_id,
      user_b_id: target.receiver_id,
      created_at: new Date().toISOString(),
    };
    optimisticFriendshipId = friendship.id;
    writeLocal(FRIENDSHIPS_KEY, [friendship, ...readLocal<Friendship>(FRIENDSHIPS_KEY)]);
  }

  const { error } = await supabase.from('friend_requests').update({ status: nextStatus }).eq('id', requestId);
  if (error) {
    writeLocal(FRIEND_REQUESTS_KEY, localReq);
    if (optimisticFriendshipId) writeLocal(FRIENDSHIPS_KEY, localFriends);
    return { ok: false, error: error.message };
  }

  if (accept) {
    const ins = await supabase.from('friendships').insert({
      user_a_id: target.sender_id,
      user_b_id: target.receiver_id,
    });
    if (ins.error && ins.error.code !== '23505' && ins.error.code !== '42P01') {
      writeLocal(FRIEND_REQUESTS_KEY, localReq);
      writeLocal(FRIENDSHIPS_KEY, localFriends);
      return { ok: false, error: ins.error.message };
    }
  }

  return { ok: true };
}

/** Reuse thread if identical participant set exists (canonical sort). */
async function findExistingThread(sortedIds: string[]): Promise<DirectMessageThread | null> {
  const normalizedKey = sortedIds.join(',');
  const { data, error } = await supabase.from('dm_threads').select('id, participant_ids, last_message_at');
  if (!error && data?.length) {
    for (const row of data) {
      const t = row as DirectMessageThread;
      if (participantSetKey(t.participant_ids) === normalizedKey) return t;
    }
  }
  const local = readLocal<DirectMessageThread>(DM_THREADS_KEY);
  for (const t of local) {
    if (participantSetKey(t.participant_ids) === normalizedKey) return t;
  }
  return null;
}

function participantSetKey(ids: string[] | undefined): string {
  return [...new Set(ids ?? [])].sort((a, b) => (a > b ? 1 : -1)).join(',');
}

export async function createDmThread(participantIds: string[]): Promise<DirectMessageThread> {
  const normalized = sortParticipantIds(participantIds);
  const existing = await findExistingThread(normalized);
  if (existing) return existing;

  const now = new Date().toISOString();
  const localThread: DirectMessageThread = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : generateId(),
    participant_ids: normalized,
    last_message_at: now,
  };
  writeLocal(DM_THREADS_KEY, [localThread, ...readLocal<DirectMessageThread>(DM_THREADS_KEY)]);

  const { data, error } = await supabase
    .from('dm_threads')
    .insert({ participant_ids: normalized })
    .select('id, participant_ids, last_message_at')
    .maybeSingle();

  if (!error && data) {
    const serverThread = data as DirectMessageThread;
    writeLocal(
      DM_THREADS_KEY,
      [serverThread, ...readLocal<DirectMessageThread>(DM_THREADS_KEY).filter(t => t.id !== localThread.id && !threadsSyncEqual(normalized, t))],
    );
    return serverThread;
  }
  return localThread;
}

function threadsSyncEqual(sortedIds: string[], t: DirectMessageThread): boolean {
  return participantSetKey(t.participant_ids) === sortedIds.join(',');
}

export async function listThreadMessages(threadId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('dm_messages')
    .select('id, thread_id, sender_id, body, message_type, image_url, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const localMsgs = readLocal<DirectMessage>(DM_MESSAGES_KEY).filter(m => m.thread_id === threadId);
  if (error || !data?.length) return localMsgs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const rows = (data ?? []) as DirectMessage[];
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function sendThreadMessage(threadId: string, senderId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const msg: DirectMessage = {
    id: generateId(),
    thread_id: threadId,
    sender_id: senderId,
    body: text,
    message_type: 'text',
    created_at: new Date().toISOString(),
  };
  writeLocal(DM_MESSAGES_KEY, [...readLocal<DirectMessage>(DM_MESSAGES_KEY), msg]);
  const { error } = await supabase.from('dm_messages').insert({
    thread_id: threadId,
    sender_id: senderId,
    body: text,
    message_type: 'text',
  });
  if (error) {
    writeLocal(
      DM_MESSAGES_KEY,
      readLocal<DirectMessage>(DM_MESSAGES_KEY).filter((m) => m.id !== msg.id),
    );
    throw new Error(error.message);
  }
  await supabase
    .from('dm_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId);
}

export async function sendThreadImage(
  threadId: string,
  senderId: string,
  imageDataUrl: string,
): Promise<void> {
  if (!imageDataUrl.startsWith('data:image/')) {
    throw new Error('Unsupported image format.');
  }
  const base64 = imageDataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid image data.');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${senderId}/${threadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('dm-images')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = supabase.storage.from('dm-images').getPublicUrl(path);
  const imageUrl = pub.publicUrl;
  if (!imageUrl) throw new Error('Could not create image URL.');

  const msg: DirectMessage = {
    id: generateId(),
    thread_id: threadId,
    sender_id: senderId,
    body: '',
    message_type: 'image',
    image_url: imageUrl,
    created_at: new Date().toISOString(),
  };
  writeLocal(DM_MESSAGES_KEY, [...readLocal<DirectMessage>(DM_MESSAGES_KEY), msg]);
  const { error: insertError } = await supabase.from('dm_messages').insert({
    thread_id: threadId,
    sender_id: senderId,
    body: '',
    message_type: 'image',
    image_url: imageUrl,
  });
  if (insertError) {
    writeLocal(
      DM_MESSAGES_KEY,
      readLocal<DirectMessage>(DM_MESSAGES_KEY).filter((m) => m.id !== msg.id),
    );
    throw new Error(insertError.message);
  }
  await supabase
    .from('dm_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId);
}

export async function openOrCreateDirectThread(meId: string, otherUserId: string): Promise<DirectMessageThread> {
  return createDmThread([meId, otherUserId]);
}
