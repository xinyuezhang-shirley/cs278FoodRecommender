import { supabase } from '../lib/supabase';

/** Matches public.notifications.type (DB check constraint). */
export type PostInteractionNotificationType =
  | 'like'
  | 'comment'
  | 'save'
  | 'favorite'
  | 'want_to_go'
  | 'been_there';

export interface PostNotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  post_id: string;
  type: PostInteractionNotificationType;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PostNotificationWithActor extends PostNotificationRow {
  actor_username?: string | null;
}

export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);

  if (error) {
    console.warn('[notifications] unread count:', error.message);
    return 0;
  }
  return count ?? 0;
}

const NOTIFICATION_LIMIT = 80;

export async function listPostNotifications(recipientId: string): Promise<PostNotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT);

  if (error) {
    console.warn('[notifications] list:', error.message);
    return [];
  }
  return (data ?? []) as PostNotificationRow[];
}

export async function fetchActorUsernames(actorIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(actorIds.filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', uniq);
  if (error || !data) return new Map();
  return new Map((data as { id: string; username: string }[]).map((r) => [r.id, r.username]));
}

export function formatNotificationLine(
  n: Pick<PostNotificationRow, 'type' | 'message'>,
  actorUsername: string,
): string {
  const who = actorUsername.trim() || 'Someone';
  if (n.message?.trim()) return n.message!.trim();

  switch (n.type) {
    case 'comment':
      return `${who} commented on your post`;
    case 'like':
      return `${who} liked your post`;
    case 'save':
      return `${who} saved your recommendation`;
    case 'favorite':
      return `${who} favorited your post`;
    case 'want_to_go':
      return `${who} wants to try your spot`;
    case 'been_there':
      return `${who} marked they have been to your spot`;
    default:
      return `${who} interacted with your post`;
  }
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.warn('[notifications] mark read:', error.message);
    return false;
  }
  return true;
}
