import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Send,
  UserPlus,
  MessagesSquare,
  ChevronLeft,
  X,
  Users,
  Check,
  Search as SearchIcon,
  RefreshCw,
  Undo2,
  ImagePlus,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../utils/helpers';
import type { DirectMessage, DirectMessageThread, Friendship, FriendRequest } from '../../types';
import {
  sendFriendRequest,
  withdrawFriendRequest,
  listFriendRequestsDetailed,
  listFriendships,
  respondToFriendRequest,
  createDmThread,
  listDmThreads,
  listThreadMessages,
  sendThreadMessage,
  sendThreadImage,
  openOrCreateDirectThread,
  fetchLatestDmPreviewByThread,
  markDmThreadRead,
} from '../../services/socialService';
import { compressImageFile } from '../../utils/imageCompress';
import { supabase } from '../../lib/supabase';
import {
  loadProfilesForIds,
  resolveFriendTarget,
  searchProfilesByUsernamePrefix,
  type FriendSearchRow,
} from '../../services/friendDiscoveryService';
import { useChatUnread } from '../../context/ChatUnreadContext';

type Tab = 'people' | 'chats';

function normalizeRequestStatus(raw: FriendRequest['status'] | undefined): string {
  return String(raw ?? '').trim().toLowerCase();
}

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(' ');
}

export function FriendsAndMessagesPanel({
  userId,
  myUsernameHint,
  bootstrapDmWithUserId,
  onBootstrapDmConsumed,
  onConversationOpenChange,
  className,
}: {
  userId: string;
  myUsernameHint?: string;
  /** When set (e.g. `?dm=` query), opens a 1:1 thread once — no friendship required. */
  bootstrapDmWithUserId?: string | null;
  onBootstrapDmConsumed?: () => void;
  /** Fires when a thread view is opened (true) vs list (false); use to hide outer page chrome. */
  onConversationOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const {
    dmUnreadByThreadId,
    reloadDmUnreadCounts,
    patchDmThreadUnread,
    scheduleDmUnreadReload,
  } = useChatUnread();

  const [tab, setTab] = useState<Tab>('people');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, FriendSearchRow>>(new Map());

  const [friendSearch, setFriendSearch] = useState('');
  const [debouncedFriendSearch, setDebouncedFriendSearch] = useState('');
  const [suggestions, setSuggestions] = useState<FriendSearchRow[]>([]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [activeThread, setActiveThread] = useState<DirectMessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [sendingImage, setSendingImage] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [messageSendError, setMessageSendError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /** Message preview snippets for chat list rows (loaded with threads). */
  const [threadPreviewById, setThreadPreviewById] = useState<
    Record<string, { preview: string; at: string }>
  >({});

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [extraParticipants, setExtraParticipants] = useState<string[]>([]);

  const [friendRequestBanner, setFriendRequestBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const activeThreadIdRef = useRef<string | null>(null);
  const messageLoadSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const frsPromise = listFriendships(userId);
      const frqPromise = listFriendRequestsDetailed(userId);
      const thPromise = listDmThreads(userId);

      const [frs, frq, th] = await Promise.all([
        frsPromise,
        frqPromise,
        thPromise,
      ]);

      setFriendships(frs);
      setFriendRequests(frq.requests);
      setFriendRequestBanner(
        frq.fromCache
          ? (frq.error ?? 'Could not sync with Supabase — showing cached invitations only.')
          : null,
      );
      setThreads(th);
      const previews = await fetchLatestDmPreviewByThread(th.map((t) => t.id));
      const nextPv: Record<string, { preview: string; at: string }> = {};
      previews.forEach((val, tid) => {
        nextPv[tid] = val;
      });
      setThreadPreviewById(nextPv);

      const ids = new Set<string>();
      frs.forEach(f => {
        ids.add(f.user_a_id);
        ids.add(f.user_b_id);
      });
      frq.requests.forEach(r => {
        ids.add(r.sender_id);
        ids.add(r.receiver_id);
      });
      th.forEach(t => t.participant_ids.forEach(p => ids.add(p)));
      setProfileMap(await loadProfilesForIds([...ids]));
      await reloadDmUnreadCounts();
    } finally {
      setRefreshing(false);
    }
  }, [userId, reloadDmUnreadCounts]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?.id ?? null;
  }, [activeThread?.id]);

  useEffect(() => {
    onConversationOpenChange?.(Boolean(activeThread));
  }, [activeThread, onConversationOpenChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeThread?.id]);

  const guardedLoadMessages = useCallback(
    async (threadId: string) => {
      const seq = ++messageLoadSeqRef.current;
      const rows = await listThreadMessages(threadId);
      if (seq !== messageLoadSeqRef.current) return;
      if (activeThreadIdRef.current !== threadId) return;
      setMessages(rows);

      const marked = await markDmThreadRead(userId, threadId);

      if (seq !== messageLoadSeqRef.current) return;
      if (activeThreadIdRef.current !== threadId) return;

      if (marked.ok) patchDmThreadUnread(threadId, 0);
      scheduleDmUnreadReload();
    },
    [userId, patchDmThreadUnread, scheduleDmUnreadReload],
  );

  /** Open DM with anyone on Nommi — friendship not required (RLS: you include yourself). */
  const startDmWithUser = useCallback(async (remoteUserId: string) => {
    const trimmed = remoteUserId.trim();
    if (!trimmed || trimmed === userId) return;
    try {
      const thread = await openOrCreateDirectThread(userId, trimmed);
      setActiveThread(thread);
      activeThreadIdRef.current = thread.id;
      await guardedLoadMessages(thread.id);
      setTab('chats');
      await refreshRef.current();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not open that chat.');
      window.setTimeout(() => setToast(null), 3200);
    }
  }, [guardedLoadMessages, userId]);

  useEffect(() => {
    const raw = bootstrapDmWithUserId?.trim() ?? '';
    if (!raw || raw === userId) {
      if (raw === userId) onBootstrapDmConsumed?.();
      return;
    }
    void (async () => {
      try {
        await startDmWithUser(raw);
      } finally {
        onBootstrapDmConsumed?.();
      }
    })();
  }, [bootstrapDmWithUserId, userId, startDmWithUser, onBootstrapDmConsumed]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel(`friends-dms-meta-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
        () => refreshRef.current().catch(() => undefined),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
        () => refreshRef.current().catch(() => undefined),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_a_id=eq.${userId}` },
        () => refreshRef.current().catch(() => undefined),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_b_id=eq.${userId}` },
        () => refreshRef.current().catch(() => undefined),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_threads' },
        () => refreshRef.current().catch(() => undefined),
      )
      .subscribe();
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        refreshRef.current().catch(() => undefined);
        void reloadDmUnreadCounts();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void supabase.removeChannel(ch);
    };
  }, [userId, reloadDmUnreadCounts]);

  useEffect(() => {
    const tid = activeThread?.id?.trim();
    if (!tid) return undefined;
    const ch = supabase
      .channel(`dm-msg-${tid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_messages',
          filter: `thread_id=eq.${tid}`,
        },
        () => {
          void guardedLoadMessages(tid).catch(() => undefined);
          void refreshRef.current().catch(() => undefined);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [activeThread?.id, guardedLoadMessages]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFriendSearch(friendSearch.trim()), 320);
    return () => window.clearTimeout(t);
  }, [friendSearch]);

  useEffect(() => {
    if (debouncedFriendSearch.length === 0) {
      setSuggestions([]);
      return;
    }
    if (debouncedFriendSearch.includes('@') && debouncedFriendSearch.includes('.')) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    void searchProfilesByUsernamePrefix(debouncedFriendSearch).then(rows => {
      if (!cancelled) setSuggestions(rows.filter(r => r.user_id !== userId));
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedFriendSearch, userId]);

  const incoming = friendRequests.filter(r => normalizeRequestStatus(r.status) === 'pending' && r.receiver_id === userId);
  const outgoing = friendRequests.filter(r => normalizeRequestStatus(r.status) === 'pending' && r.sender_id === userId);

  const resolvedFriends = useMemo(() => friendships.map((f) => ({
    friendship: f,
    otherId: f.user_a_id === userId ? f.user_b_id : f.user_a_id,
  })), [friendships, userId]);

  const sortedThreads = useMemo(() => {
    const list = [...threads];
    list.sort((a, b) => {
      const ua = dmUnreadByThreadId[a.id] ?? 0;
      const ub = dmUnreadByThreadId[b.id] ?? 0;
      const hasA = ua > 0;
      const hasB = ub > 0;
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (ua !== ub) return ub - ua;
      return b.last_message_at.localeCompare(a.last_message_at);
    });
    return list;
  }, [threads, dmUnreadByThreadId]);

  function displayFor(id: string) {
    return profileMap.get(id)?.username ? `@${profileMap.get(id)!.username}` : id.slice(0, 8);
  }

  function avatarProps(id: string) {
    const p = profileMap.get(id);
    return { username: p?.username ?? id, avatarUrl: p?.avatar_url ?? undefined } as const;
  }

  async function handleSendInviteToRow(row?: FriendSearchRow) {
    if (!row) return;
    if (row.user_id === userId) {
      setToast('You can’t friend yourself.');
      window.setTimeout(() => setToast(null), 2400);
      return;
    }
    const result = await sendFriendRequest(userId, row.user_id);
    if (!result.ok) {
      setToast(result.error ?? 'Could not send invite');
      window.setTimeout(() => setToast(null), 2600);
      return;
    }
    setToast(`Friend request sent to @${row.username}`);
    window.setTimeout(() => setToast(null), 2600);
    setFriendSearch('');
    setSuggestions([]);
    await refresh();
  }

  async function handleInviteFromQuery() {
    const q = friendSearch.trim();
    if (!q) return;
    setResolveBusy(true);
    try {
      const row = await resolveFriendTarget(q);
      if (!row) {
        setToast('No one matches that username or email yet.');
        window.setTimeout(() => setToast(null), 2600);
        return;
      }
      await handleSendInviteToRow(row);
    } finally {
      setResolveBusy(false);
    }
  }

  async function handleChatFromQuery() {
    const q = friendSearch.trim();
    if (!q) return;
    setResolveBusy(true);
    try {
      const row = await resolveFriendTarget(q);
      if (!row) {
        setToast('No one matches that username or email yet.');
        window.setTimeout(() => setToast(null), 2600);
        return;
      }
      if (row.user_id === userId) {
        setToast('Pick someone other than yourself.');
        window.setTimeout(() => setToast(null), 2200);
        return;
      }
      await startDmWithUser(row.user_id);
      setFriendSearch('');
      setSuggestions([]);
    } finally {
      setResolveBusy(false);
    }
  }

  async function handleChatWithSearchRow(row: FriendSearchRow) {
    if (row.user_id === userId) {
      setToast('You can’t message yourself.');
      window.setTimeout(() => setToast(null), 2400);
      return;
    }
    await startDmWithUser(row.user_id);
    setFriendSearch('');
    setSuggestions([]);
  }

  async function openThread(thread: DirectMessageThread) {
    setMessageSendError(null);
    patchDmThreadUnread(thread.id, 0);
    setActiveThread(thread);
    activeThreadIdRef.current = thread.id;
    await guardedLoadMessages(thread.id);
    await reloadDmUnreadCounts();
  }

  async function handleSendComposer() {
    if (!activeThread || !composer.trim() || messageSending) return;
    const threadId = activeThread.id;
    setMessageSendError(null);
    setMessageSending(true);
    try {
      await sendThreadMessage(threadId, userId, composer);
      setComposer('');
      await guardedLoadMessages(threadId);
      await refresh();
    } catch (err) {
      setMessageSendError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setMessageSending(false);
    }
  }

  async function handleSendImageFile(file: File) {
    if (!activeThread) return;
    const threadId = activeThread.id;
    setSendingImage(true);
    try {
      const compressed = await compressImageFile(file, 1280, 0.84);
      await sendThreadImage(threadId, userId, compressed);
      await guardedLoadMessages(threadId);
      await refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not send image');
      window.setTimeout(() => setToast(null), 2600);
    } finally {
      setSendingImage(false);
    }
  }

  /** Human-readable DM title excluding current user. */
  function threadTitle(t: DirectMessageThread) {
    const others = t.participant_ids.filter(p => p !== userId).map(displayFor);
    if (others.length === 0) return 'Personal';
    return others.slice(0, 3).join(', ') + (others.length > 3 ? ` +${others.length - 3}` : '');
  }

  /** Start group from selected friends + optional lookups. */
  async function composeNewConversation() {
    const resolved = [...extraParticipants];
    if (newChatQuery.trim()) {
      const parsed = await resolveFriendTarget(newChatQuery.trim());
      if (parsed) resolved.push(parsed.user_id);
      else if (resolved.length === 0) {
        setToast('Could not find anyone with that @username or email.');
        window.setTimeout(() => setToast(null), 2800);
        return;
      }
    }
    if (resolved.length === 0) {
      setToast('Pick someone to message.');
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    const uniq = [...new Set([userId, ...resolved])];
    try {
      const thread = await createDmThread(uniq);
      setNewChatOpen(false);
      setNewChatQuery('');
      setExtraParticipants([]);
      await openThread(thread);
      setTab('chats');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not start conversation.');
      window.setTimeout(() => setToast(null), 3400);
    }
  }

  if (activeThread) {
    const chatPeerIds = activeThread.participant_ids.filter((p) => p !== userId);
    const primaryPeerId = chatPeerIds[0];

    return (
      <section className={cx('flex w-full flex-col', activeThread ? 'min-h-[calc(100dvh-10.25rem)]' : '', className)}>
        <header className="flex shrink-0 items-center gap-3 pb-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setMessageSendError(null);
              setActiveThread(null);
            }}
            className="flex shrink-0 items-center gap-1 text-sm font-black text-[#2f5fc4]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden /> Back
          </button>
          {primaryPeerId ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Avatar {...avatarProps(primaryPeerId)} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-base font-black text-[#1a1a1a]" title={threadTitle(activeThread)}>
                  {chatPeerIds.length > 1 ? threadTitle(activeThread) : displayFor(primaryPeerId)}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                  {chatPeerIds.length > 1 ? `${chatPeerIds.length + 1} people` : 'Direct message'}
                </p>
              </div>
            </div>
          ) : (
            <span className="truncate font-black text-[#1a1a1a]" title={threadTitle(activeThread)}>
              {threadTitle(activeThread)}
            </span>
          )}
        </header>

        <div
          className={cx(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#e5e7eb]',
            'bg-white shadow-[0_12px_32px_rgba(47,95,196,0.08)]',
            'sm:max-h-none',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#faf9f5] px-4 py-3">
            <div className="space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={cx(
                        'max-w-[min(85%,420px)] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        mine
                          ? 'rounded-br-md bg-[#2f5fc4] text-white shadow-sm'
                          : 'rounded-bl-md border border-[#e5e7eb] bg-white text-[#1a1a1a]',
                      )}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-[10px] font-bold text-[#6f90d8]">{displayFor(m.sender_id)}</p>
                      )}
                      {m.message_type === 'image' && m.image_url ? (
                        <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={m.image_url}
                            alt="Shared in chat"
                            className="mt-1 max-h-56 w-auto max-w-full rounded-xl border border-black/10"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{m.body}</span>
                      )}
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-[#9ca3af]'}`}>
                        {timeAgo(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="py-10 text-center text-sm text-[#9ca3af]">
                  Say hi 👋 Shared food discoveries start here.
                </p>
              )}
              <div ref={messagesEndRef} aria-hidden className="h-px w-full shrink-0" />
            </div>
          </div>

          <div className="shrink-0 border-t border-[#f3f4f6] bg-white px-3 py-2.5 sm:rounded-b-[24px]">
            {messageSendError && (
              <p className="mb-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-xs font-semibold text-[#b91c1c]">
                {messageSendError}
              </p>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void handleSendImageFile(file);
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={sendingImage || messageSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] text-[#2f5fc4] disabled:opacity-40"
                aria-label="Attach image"
                title="Attach image"
              >
                {sendingImage ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              </button>
              <textarea
                value={composer}
                disabled={messageSending}
                onChange={(e) => setComposer(e.target.value)}
                placeholder={messageSending ? 'Sending…' : 'Message…'}
                rows={1}
                className={cx(
                  'min-h-[44px] max-h-[120px] flex-1 resize-none rounded-[22px] border border-[#e5e7eb]',
                  'px-4 py-2.5 text-sm leading-snug outline-none focus:ring-2 focus:ring-[#2f5fc4]/25',
                  'disabled:bg-[#f9fafb]',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendComposer();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleSendComposer()}
                disabled={!composer.trim() || sendingImage || messageSending}
                className={cx(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-opacity',
                  composer.trim() && !messageSending && !sendingImage
                    ? 'bg-[#2f5fc4]'
                    : 'bg-[#2f5fc4]/35',
                )}
                aria-label="Send message"
              >
                {messageSending ? <Loader2 className="h-4 w-4 animate-spin text-white/90" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] font-semibold text-[#cbd5e1]">Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cx('mb-10 flex w-full flex-col', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black text-[#2f5fc4] tracking-tight">Friends & messages</h2>
          <p className="text-xs text-[#6b7280] font-semibold mt-1 max-w-[22rem]">
            Message anyone by lookup —{' '}
            <span className="text-[#1a1a1a]">friends optional</span>. Add by{' '}
            <span className="text-[#1a1a1a]">@username</span> or email, or group chat from your friends list.
          </p>
          {myUsernameHint && (
            <p className="text-[10px] text-[#9ca3af] mt-1">Your username: @{myUsernameHint}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={refreshing ? 'Refreshing' : 'Refresh invitations'}
            onClick={() => void refresh()}
            className="rounded-full w-11 h-11 border border-[#e5e7eb] bg-white text-[#2f5fc4] shadow-sm flex items-center justify-center hover:bg-[#fafbff]"
          >
            <RefreshCw className={`w-[18px] h-[18px] ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            className="rounded-full px-4 py-2 text-xs font-black text-white bg-linear-to-r from-[#ff4f73] to-[#ff8aa0] shadow-[0_10px_24px_rgba(255,79,115,0.28)] whitespace-nowrap"
          >
            New chat
          </button>
        </div>
      </div>

      {friendRequestBanner && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed flex gap-2 items-start">
          <span className="font-black shrink-0">!</span>
          <span>{friendRequestBanner}</span>
        </div>
      )}

      <div className="flex rounded-full bg-white border border-[#e5e7eb] p-1 mb-4 shadow-inner">
        <button
          type="button"
          onClick={() => setTab('people')}
          className={[
            'relative flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-black transition-colors',
            tab === 'people' ? 'bg-[#2f5fc4] text-white shadow-md' : 'text-[#6b7280] hover:text-[#2f5fc4]',
          ].join(' ')}
        >
          <UserPlus className="w-4 h-4" aria-hidden /> People
          {incoming.length > 0 ? (
            <span className="absolute right-5 top-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff4f73] text-[10px] font-black leading-[18px] text-white shadow-sm">
              {incoming.length > 9 ? '9+' : incoming.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('chats')}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-black transition-colors',
            tab === 'chats' ? 'bg-[#2f5fc4] text-white shadow-md' : 'text-[#6b7280] hover:text-[#2f5fc4]',
          ].join(' ')}
        >
          <MessagesSquare className="w-4 h-4" aria-hidden /> Chats ({threads.length})
        </button>
      </div>

      {toast && (
        <div className="mb-3 px-3 py-2 rounded-2xl bg-[#eaf1ff] text-[#2f5fc4] text-xs font-bold border border-[#cfdcf6]">
          {toast}
        </div>
      )}

      {tab === 'people' ? (
        <div className="space-y-4">
          {/* Add friend */}
          <div className="bg-white rounded-[24px] border border-[#e5e7eb] shadow-[0_10px_28px_rgba(47,95,196,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f3f4f6]">
              <p className="text-xs font-black text-[#2f5fc4] uppercase tracking-wide">Find people</p>
              <p className="text-[10px] text-[#9ca3af] font-semibold mt-1">Invite to friends or start a DM — either works.</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" aria-hidden />
                <input
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  placeholder="@username · friend@school.edu · or paste user ID"
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-[#e5e7eb] text-sm outline-none focus:ring-2 focus:ring-[#2f5fc4]/25"
                  autoComplete="off"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="rounded-2xl border border-[#eaf1ff] divide-y divide-[#f3f4f6] max-h-52 overflow-y-auto">
                  {suggestions.map(row => (
                    <div
                      key={row.user_id}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#fafbff]"
                    >
                      <Avatar {...avatarProps(row.user_id)} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1a1a1a] truncate">@{row.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleChatWithSearchRow(row)}
                          className="rounded-full px-2.5 py-1 text-[10px] font-black bg-[#ccfbf1] text-[#115e59] border border-teal-200 hover:bg-teal-100"
                        >
                          Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSendInviteToRow(row)}
                          className="rounded-full px-2.5 py-1 text-[10px] font-black bg-[#eaf1ff] text-[#2f5fc4] border border-[#cfdcf6]"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={resolveBusy || !friendSearch.trim()}
                  onClick={() => void handleChatFromQuery()}
                  className="w-full py-3 rounded-2xl text-sm font-black text-[#115e59] bg-[#ccfbf1] border border-teal-200 shadow-sm disabled:opacity-40 inline-flex justify-center gap-2"
                >
                  {resolveBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} Message
                </button>
                <button
                  type="button"
                  disabled={resolveBusy || !friendSearch.trim()}
                  onClick={() => void handleInviteFromQuery()}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white bg-[#2f5fc4] shadow-lg disabled:opacity-40 inline-flex justify-center gap-2"
                >
                  {resolveBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} Friend request
                </button>
              </div>
            </div>
          </div>

          {/* Incoming */}
          <div className="bg-white rounded-[24px] border border-[#e5e7eb] shadow-[0_10px_28px_rgba(47,95,196,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#ff4f73]" aria-hidden />
              <span className="text-sm font-black text-[#1a1a1a]">
                Incoming requests{' '}
                {incoming.length > 0 ? <span className="text-[#ff4f73] ml-1">({incoming.length})</span> : null}
              </span>
            </div>
            {incoming.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-[#9ca3af]">You are all caught up.</div>
            ) : (
              <ul className="divide-y divide-[#f3f4f6]">
                {incoming.map(r => {
                  const peer = avatarProps(r.sender_id);
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar {...peer} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1a1a1a] text-sm truncate">{displayFor(r.sender_id)}</p>
                        <p className="text-[10px] text-[#9ca3af]">Wants to be friends · {timeAgo(r.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end shrink-0 max-w-[11rem] sm:max-w-none">
                        <button
                          type="button"
                          onClick={() => void startDmWithUser(r.sender_id)}
                          className="rounded-full px-2.5 py-1 text-[10px] font-black border border-teal-200 bg-[#ccfbf1] text-[#115e59]"
                        >
                          Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => void (async () => {
                            const res = await respondToFriendRequest(r.id, false);
                            if (!res.ok) {
                              setToast(res.error ?? 'Could not decline invitation.');
                              window.setTimeout(() => setToast(null), 2600);
                              return;
                            }
                            await refresh();
                          })()}
                          className="rounded-full px-2.5 py-1 text-xs font-bold border border-[#e5e7eb] text-[#6b7280]"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => void (async () => {
                            const res = await respondToFriendRequest(r.id, true);
                            if (!res.ok) {
                              setToast(res.error ?? 'Could not accept invitation.');
                              window.setTimeout(() => setToast(null), 2600);
                              return;
                            }
                            await refresh();
                          })()}
                          className="rounded-full px-2.5 py-1 text-xs font-black bg-[#2f5fc4] text-white inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 shrink-0" aria-hidden /> Accept
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div className="bg-white rounded-[24px] border border-[#e5e7eb] shadow-[0_8px_20px_rgba(47,95,196,0.05)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center gap-2">
                <Undo2 className="w-4 h-4 text-[#6b7280]" aria-hidden />
                <span className="text-sm font-black text-[#1a1a1a]">Outgoing invitations</span>
              </div>
              <ul className="divide-y divide-[#f3f4f6]">
                {outgoing.map(r => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar {...avatarProps(r.receiver_id)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1a1a1a] text-sm truncate">{displayFor(r.receiver_id)}</p>
                      <p className="text-[10px] text-[#9ca3af]">{timeAgo(r.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={withdrawingRequestId === r.id}
                      onClick={() => void (async () => {
                        setWithdrawingRequestId(r.id);
                        const res = await withdrawFriendRequest(userId, r.id);
                        setWithdrawingRequestId(null);
                        if (!res.ok) {
                          setToast(res.error ?? 'Could not withdraw invite');
                          window.setTimeout(() => setToast(null), 2600);
                          return;
                        }
                        await refresh();
                        setToast('Invitation withdrawn.');
                        window.setTimeout(() => setToast(null), 2200);
                      })()}
                      className="rounded-full px-3 py-1 text-xs font-bold border border-[#fca5a5]/80 text-[#b91c1c] bg-[#fff1f2] shrink-0 inline-flex items-center gap-1 disabled:opacity-45"
                    >
                      {withdrawingRequestId === r.id && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Friends */}
          <div className="bg-white rounded-[24px] border border-[#e5e7eb] shadow-[0_10px_28px_rgba(47,95,196,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f3f4f6]">
              <p className="text-sm font-black text-[#1a1a1a]">Friends · {resolvedFriends.length}</p>
            </div>
            {resolvedFriends.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-[#9ca3af]">Find food people with Invite above.</p>
            ) : (
              <ul className="divide-y divide-[#f3f4f6]">
                {resolvedFriends.map(({ friendship: f, otherId }) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafbff]/80 transition-colors">
                    <Avatar {...avatarProps(otherId)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1a1a1a] text-sm">{displayFor(otherId)}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-black text-teal-700 bg-[#ccfbf1] px-3 py-1 rounded-full border border-teal-200 hover:bg-teal-100"
                      onClick={() => void startDmWithUser(otherId)}
                    >
                      Chat
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_10px_28px_rgba(47,95,196,0.06)] overflow-hidden">
          {threads.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#9ca3af]">
              No conversations yet · start something delicious with <span className="font-semibold text-[#2f5fc4]">New chat</span>.
            </div>
          ) : (
            <ul className="divide-y divide-[#f3f4f6]">
              {sortedThreads.map((t) => {
                const uCount = dmUnreadByThreadId[t.id] ?? 0;
                const unread = uCount > 0;
                const badgeLabel = uCount > 99 ? '99+' : String(uCount);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(t)}
                      className={cx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left',
                        unread ? 'bg-[#fff5f9]/80 hover:bg-[#fff0f4]' : 'hover:bg-[#fafbff]',
                      )}
                      aria-label={
                        unread
                          ? `${threadTitle(t)}, ${badgeLabel} unread`
                          : `Open conversation with ${threadTitle(t)}`
                      }
                    >
                      <div className="flex shrink-0 -space-x-2 pt-0.5">
                        {t.participant_ids.filter((p) => p !== userId).slice(0, 3).map((pid) => (
                          <Avatar key={pid} {...avatarProps(pid)} size="xs" />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cx(
                              'truncate text-sm leading-tight text-[#1a1a1a]',
                              unread ? 'font-black' : 'font-bold',
                            )}
                          >
                            {threadTitle(t)}
                          </p>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {unread ? (
                              <span className="flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#ff4f73] px-1 text-[9px] font-black tabular-nums leading-none text-white shadow-sm ring-2 ring-white">
                                {badgeLabel}
                              </span>
                            ) : null}
                            <span className="text-[10px] font-semibold text-[#9ca3af]">
                              {timeAgo(threadPreviewById[t.id]?.at ?? t.last_message_at)}
                            </span>
                          </div>
                        </div>
                        <p
                          className={cx(
                            'mt-1 line-clamp-2 text-xs text-[#6b7280]',
                            unread ? 'font-bold text-[#1a1a1a]' : 'font-medium',
                          )}
                        >
                          {threadPreviewById[t.id]?.preview || 'Say hi 👋 · no messages yet'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {newChatOpen && (
        <div className="fixed inset-0 z-[700] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" role="presentation">
          <div className="bg-white rounded-[28px] w-full max-w-md max-h-[80vh] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[#e5e7eb] animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6]">
              <div>
                <p className="text-sm font-black text-[#1a1a1a]">New chat</p>
                <p className="text-[10px] font-semibold text-[#9ca3af] mt-0.5">No friend request needed — add anyone below.</p>
              </div>
              <button type="button" onClick={() => setNewChatOpen(false)} className="rounded-full p-1.5 hover:bg-[#f3f4f6]" aria-label="Close">
                <X className="w-5 h-5 text-[#6b7280]" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(80vh-4rem)] overflow-y-auto">
              <input
                value={newChatQuery}
                onChange={e => setNewChatQuery(e.target.value)}
                placeholder="@username · email · UUID"
                className="w-full rounded-2xl border border-[#e5e7eb] px-4 py-2.5 text-sm outline-none"
              />
              <div>
                <p className="text-[11px] font-black text-[#6b7280] uppercase mb-2">Or invite friends ({extraParticipants.length} selected)</p>
                <div className="max-h-44 overflow-y-auto space-y-1 rounded-2xl border border-[#f3f4f6] p-2">
                  {resolvedFriends.map(({ friendship: f, otherId }) => {
                    const sel = extraParticipants.includes(otherId);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setExtraParticipants(prev => (sel ? prev.filter(x => x !== otherId) : [...prev, otherId]));
                        }}
                        className={[
                          'w-full rounded-xl px-3 py-2 flex items-center gap-2 border text-sm font-semibold',
                          sel ? 'border-[#2f5fc4] bg-[#eaf1ff]' : 'border-transparent bg-[#faf9f5]',
                        ].join(' ')}
                      >
                        <Avatar {...avatarProps(otherId)} size="xs" />
                        <span className="truncate">{displayFor(otherId)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => void composeNewConversation()}
                  className="w-full mt-3 py-3 rounded-2xl text-sm font-black text-white bg-[#ff4f73]"
                >
                  Start conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
