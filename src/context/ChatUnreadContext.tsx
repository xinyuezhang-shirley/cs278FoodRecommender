import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchDmUnreadCountsByThread } from '../services/socialService';
import { supabase } from '../lib/supabase';

type ChatUnreadContextValue = {
  /** Sum of unread inbound messages across all threads (other senders only). */
  chatUnreadTotal: number;
  /** Latest known unread count per thread id (RPC snapshot + optimistic patches). */
  dmUnreadByThreadId: Record<string, number>;
  /** Full reload from Postgres (calls RPC). */
  reloadDmUnreadCounts: () => Promise<void>;
  /** Optimistically zero (or adjust) unread for UI + badge before server ACK. */
  patchDmThreadUnread: (threadId: string, unread: number) => void;
  /** Debounced reload after realtime bursts (single listener). */
  scheduleDmUnreadReload: () => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

const DM_UNREAD_DEBOUNCE_MS = 180;

export function ChatUnreadProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [dmUnreadByThreadId, setDmUnreadByThreadId] = useState<Record<string, number>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const chatUnreadTotal = useMemo(() => {
    let n = 0;
    Object.values(dmUnreadByThreadId).forEach(v => {
      const k = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(k) && k > 0) n += k;
    });
    return n;
  }, [dmUnreadByThreadId]);

  const reloadDmUnreadCounts = useCallback(async () => {
    const map = await fetchDmUnreadCountsByThread(userId);
    const next: Record<string, number> = {};
    map.forEach((count, tid) => {
      if (count > 0) next[tid] = count;
    });
    setDmUnreadByThreadId(next);
  }, [userId]);

  const patchDmThreadUnread = useCallback((threadId: string, unread: number) => {
    setDmUnreadByThreadId(prev => {
      const next = { ...prev };
      const u = Math.max(0, Math.floor(Number(unread) || 0));
      if (u <= 0) delete next[threadId];
      else next[threadId] = u;
      return next;
    });
  }, []);

  const scheduleDmUnreadReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void reloadDmUnreadCounts();
    }, DM_UNREAD_DEBOUNCE_MS);
  }, [reloadDmUnreadCounts]);

  useEffect(() => {
    void reloadDmUnreadCounts();
  }, [reloadDmUnreadCounts]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const ch = supabase
      .channel(`nommi-dm-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_messages' },
        () => {
          scheduleDmUnreadReload();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_thread_reads',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          scheduleDmUnreadReload();
        },
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      channelRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [userId, scheduleDmUnreadReload]);

  const value = useMemo(
    (): ChatUnreadContextValue => ({
      chatUnreadTotal,
      dmUnreadByThreadId,
      reloadDmUnreadCounts,
      patchDmThreadUnread,
      scheduleDmUnreadReload,
    }),
    [
      chatUnreadTotal,
      dmUnreadByThreadId,
      reloadDmUnreadCounts,
      patchDmThreadUnread,
      scheduleDmUnreadReload,
    ],
  );

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

/** Used by Chat + unread-dependent UI mounted under ChatUnreadProvider. */
export function useChatUnread(): ChatUnreadContextValue {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) {
    throw new Error('useChatUnread must be used inside ChatUnreadProvider');
  }
  return ctx;
}

/** Bottom nav renders near provider but keep safe if reused elsewhere. */
export function useChatUnreadOptional(): ChatUnreadContextValue | null {
  return useContext(ChatUnreadContext);
}
