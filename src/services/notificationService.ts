import { supabase } from '../lib/supabase';

export interface ActivityNotification {
  id: string;
  user_id: string;
  actor_id: string;
  kind: 'like' | 'comment' | 'friend_request' | 'saved' | 'system';
  entity_id?: string;
  read_at?: string | null;
  created_at: string;
}

export async function listNotifications(userId: string): Promise<ActivityNotification[]> {
  const { data, error } = await supabase
    .from('activity_notifications')
    .select('id, user_id, actor_id, kind, entity_id, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as ActivityNotification[];
}
