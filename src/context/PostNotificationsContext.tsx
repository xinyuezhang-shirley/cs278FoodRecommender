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
import { supabase } from '../lib/supabase';
import { countUnreadNotifications } from '../services/notificationService';

export type PostNotificationsContextValue = {
  /** Unread in-app notifications (post interactions). */
  unreadPostNotificationsCount: number;
  reloadUnreadPostNotifications: () => Promise<void>;
};

const PostNotificationsContext = createContext<PostNotificationsContextValue | null>(null);

const DEBOUNCE_MS = 200;

export function PostNotificationsProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [unreadPostNotificationsCount, setUnreadPostNotificationsCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadUnreadPostNotifications = useCallback(async () => {
    const n = await countUnreadNotifications(userId);
    setUnreadPostNotificationsCount(n);
  }, [userId]);

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void reloadUnreadPostNotifications();
    }, DEBOUNCE_MS);
  }, [reloadUnreadPostNotifications]);

  useEffect(() => void reloadUnreadPostNotifications(), [reloadUnreadPostNotifications]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const ch = supabase
      .channel(`nommi-post-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => scheduleReload(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void supabase.removeChannel(ch);
    };
  }, [userId, scheduleReload]);

  const value = useMemo(
    (): PostNotificationsContextValue => ({
      unreadPostNotificationsCount,
      reloadUnreadPostNotifications,
    }),
    [unreadPostNotificationsCount, reloadUnreadPostNotifications],
  );

  return (
    <PostNotificationsContext.Provider value={value}>{children}</PostNotificationsContext.Provider>
  );
}

export function usePostNotifications(): PostNotificationsContextValue {
  const ctx = useContext(PostNotificationsContext);
  if (!ctx) throw new Error('usePostNotifications must be used inside PostNotificationsProvider');
  return ctx;
}

export function usePostNotificationsOptional(): PostNotificationsContextValue | null {
  return useContext(PostNotificationsContext);
}
