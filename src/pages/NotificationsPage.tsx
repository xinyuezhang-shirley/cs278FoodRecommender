import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePostNotifications } from '../context/PostNotificationsContext';
import {
  fetchActorUsernames,
  formatNotificationLine,
  listPostNotifications,
  markNotificationRead,
  type PostNotificationRow,
} from '../services/notificationService';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { Avatar } from '../components/ui/Avatar';
import emptyNoPostsYetSimple from '../assets/nommi/empty_no_posts_yet_simple.png';
import { timeAgo } from '../utils/helpers';

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reloadUnreadPostNotifications } = usePostNotifications();
  const [rows, setRows] = useState<PostNotificationRow[]>([]);
  const [actors, setActors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await listPostNotifications(user.id);
      setRows(list);
      const names = await fetchActorUsernames(list.map((r) => r.actor_id));
      setActors(names);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenNotification = async (n: PostNotificationRow) => {
    void markNotificationRead(n.id);
    await reloadUnreadPostNotifications();
    setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, is_read: true } : r)));
    navigate(`/app/post/${n.post_id}`, { replace: false });
  };

  const title = (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#eef0f5] bg-[#faf9f5]/95 backdrop-blur-sm sticky top-0 z-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#2f5fc4] hover:bg-[#fff1f5] transition-colors motion-safe:active:scale-95"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Bell className="h-[22px] w-[22px] shrink-0 text-[#ff4f73]" strokeWidth={2.2} />
        <div className="min-w-0">
          <h1 className="text-lg font-black text-[#2f5fc4] tracking-tight truncate">Notifications</h1>
          <p className="text-[11px] font-semibold text-[#9ca3af] truncate">Comments, likes & saves on your posts</p>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex flex-col min-h-[50dvh]">
        {title}
        <EmptyState icon="🔐" title="Sign in" description={"Notifications show up once you're logged in."} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[50dvh] pb-24">
      {title}

      {loading ? (
        <div className="flex justify-center py-24">
          <PageLoader compact label="Loading…" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description={"When someone engages with your food posts, you'll see it here."}
          imageSrc={emptyNoPostsYetSimple}
          imageAlt=""
        />
      ) : (
        <ul className="divide-y divide-[#eef0f5] px-2">
          {rows.map((n) => {
            const username = actors.get(n.actor_id) ?? 'Someone';
            const line = formatNotificationLine(n, username);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onOpenNotification(n)}
                  className={[
                    'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left motion-safe:active:scale-[0.995] transition-colors',
                    n.is_read ? 'opacity-95' : 'bg-[#fff5f8]/95',
                  ].join(' ')}
                >
                  <Avatar username={username} size="md" avatarUrl={undefined} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-[#4b5563]' : 'font-bold text-[#1f2937]'}`}>
                      {line}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#9ca3af]">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read ? (
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff4f73] shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-2.5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
