import { useState, useEffect, useCallback, useMemo, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, Heart, MessageCircle, Sparkles, TrendingUp, ChevronRight, Plus, Users,
} from 'lucide-react';
import type { CircleActivityItem, FoodCircle, UserProfile } from '../types';
import {
  getAllCircles,
  joinCircle,
  getActivityInJoinedCircles,
  getTopContributorsInMyCircles,
  type ContributorTimeWindow,
} from '../services/circleService';
import { useAuth } from '../context/AuthContext';
import { CircleCard } from '../components/community/CircleCard';
import { CircleDetail } from '../components/community/CircleDetail';
import { CreateCircleModal } from '../components/community/CreateCircleModal';
import { Avatar } from '../components/ui/Avatar';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { timeAgo } from '../utils/helpers';
import { PostTypeBadge } from '../components/ui/Tag';
import emptyNoPostsYetSimple from '../assets/nommi/empty_no_posts_yet_simple.png';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

const ACTIVITY_COLLAPSED = 8;
const ACTIVITY_FETCH_LIMIT = 60;
const SUGGEST_VISIBLE = 3;

const PLAYFUL_TITLES: { emoji: string; title: string }[] = [
  { emoji: '🐐', title: 'Campus Grazing Goat' },
  { emoji: '🌙', title: 'Late Night Legend' },
  { emoji: '🗺️', title: 'First-Year Boba Mapper' },
  { emoji: '🍜', title: 'Noodle Network Node' },
  { emoji: '✨', title: 'Snack Signal Booster' },
  { emoji: '🥐', title: 'Pastry Pathfinder' },
  { emoji: '🌿', title: 'Quad Picnic Whisperer' },
  { emoji: '🎟️', title: 'Food Drop Spotter' },
];

/** Stable index from profile id string (no crypto). */
function titleIndex(profileId: string, rank: number): number {
  let h = 0;
  for (let i = 0; i < profileId.length; i++) h = ((h << 5) - h) + profileId.charCodeAt(i);
  const u = Math.abs(h) + rank * 17;
  return u % PLAYFUL_TITLES.length;
}

function playfulTitleFor(profileId: string, rank: number): { emoji: string; title: string } {
  return PLAYFUL_TITLES[titleIndex(profileId, rank)]!;
}

function sharingSparkStreak(postCount: number): number {
  return Math.max(0, Math.min(12, postCount));
}

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 1e9;
  return (Date.now() - t) / 36e5;
}

function weekImpactFromActivity(activity: CircleActivityItem[], userId: string | undefined) {
  if (!userId) return { shares: 0, circleIds: new Set<string>() };
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = activity.filter((a) => {
    if (a.sharer.id !== userId) return false;
    return new Date(a.shared_at).getTime() >= cutoff;
  });
  const circleIds = new Set(rows.map(r => r.circle.id));
  return { shares: rows.length, circleIds };
}

function openGlobalCreateModal() {
  window.dispatchEvent(new CustomEvent('nommi-open-create-post'));
}

interface ActivityRowProps {
  row: CircleActivityItem;
  navigate: ReturnType<typeof useNavigate>;
  onOpenCircle: (circleId: string) => void;
  isFresh: boolean;
}

function ActivityRowCard({ row, navigate, onOpenCircle, isFresh }: ActivityRowProps) {
  const sharerHandle = `@${row.sharer.username}`;
  const post = row.post;
  const sharerHref = `/app/profile/${row.sharer.id}`;
  const postHref = `/app/post/${post.id}`;
  const thumb = row.post.image_url;
  const likes = row.post.like_count ?? 0;
  const comments = row.post.comment_count ?? 0;

  function openPost() {
    navigate(postHref);
  }

  function onCardClick(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest('[data-stop-post-nav]')) return;
    openPost();
  }

  return (
    <article
      onClick={onCardClick}
      aria-label={`Open post: ${post.title}`}
      className={[
        'cursor-pointer rounded-[22px] border bg-white/95 px-3.5 py-3 shadow-[0_10px_28px_rgba(47,95,196,0.09)] backdrop-blur-sm',
        'border-[#e8ecf4] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-[#c7d7f5] hover:shadow-[0_16px_40px_rgba(47,95,196,0.14)]',
        'active:scale-[0.99] motion-safe:active:translate-y-0',
        isFresh ? 'ring-1 ring-[#fcd4dc]/70 border-[#fcd4dc]' : '',
      ].join(' ')}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <button
            type="button"
            data-stop-post-nav
            onClick={(e) => {
              e.stopPropagation();
              navigate(sharerHref);
            }}
            className="relative z-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fc4]/35"
            aria-label={`View ${sharerHandle}`}
          >
            <Avatar username={row.sharer.username} avatarUrl={row.sharer.avatar_url} size="sm" />
          </button>
          {isFresh ? (
            <span
              className="absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f43f5e] shadow-sm"
              title="Recent"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-[#1a1a1a]">
            <button
              type="button"
              data-stop-post-nav
              onClick={(e) => {
                e.stopPropagation();
                navigate(sharerHref);
              }}
              className="font-black text-[#2f5fc4] underline-offset-2 hover:underline"
            >
              {sharerHandle}
            </button>
            {' '}
            <span className="font-semibold text-[#64748b]">shared to</span>
            {' '}
            <button
              type="button"
              data-stop-post-nav
              onClick={(e) => {
                e.stopPropagation();
                onOpenCircle(row.circle.id);
              }}
              className="inline font-black text-[#1a1a1a] underline-offset-2 hover:underline"
              title="Open circle"
            >
              {row.circle.name}
            </button>
          </p>
          <p className="mt-1 text-xs font-semibold leading-snug text-[#475569] line-clamp-2">
            “{post.title.trim()}”
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PostTypeBadge type={post.type} />
            <span className="text-[11px] font-bold text-[#94a3b8]">{timeAgo(row.shared_at)}</span>
            {(likes > 0 || comments > 0) && (
              <span className="flex items-center gap-2 text-[10px] font-bold text-[#9ca3af]">
                {likes > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
                    <Heart className="h-3 w-3" aria-hidden />
                    {likes}
                  </span>
                )}
                {comments > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[#64748b]">
                    <MessageCircle className="h-3 w-3" aria-hidden />
                    {comments}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="pointer-events-none relative shrink-0">
          {thumb ? (
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
              <img
                src={thumb}
                alt=""
                className="h-14 w-14 object-cover bg-[#eaf1ff]"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#eef2ff] bg-[#f8fafc] text-lg opacity-75" aria-hidden>
              {post.type === 'free_food' ? '🎁' : post.type === 'event' ? '🎉' : '⭐'}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [activity, setActivity] = useState<CircleActivityItem[]>([]);
  const [topContributors, setTopContributors] = useState<{ profile: UserProfile; post_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<FoodCircle | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [contributorWindow, setContributorWindow] = useState<ContributorTimeWindow>('all_time');

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCircles([]);
      setActivity([]);
      setTopContributors([]);
      setLoading(false);
      return;
    }
    const [c, act, contrib] = await Promise.all([
      getAllCircles(user.id),
      getActivityInJoinedCircles(user.id, user.id, ACTIVITY_FETCH_LIMIT),
      getTopContributorsInMyCircles(user.id, 8, contributorWindow),
    ]);
    setCircles(c);
    setActivity(act);
    setTopContributors(contrib as { profile: UserProfile; post_count: number }[]);
  }, [user?.id, contributorWindow]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const communityRealtimeSpecs = useMemo(
    () =>
      user?.id
        ? [
            { table: 'circle_memberships', filter: `user_id=eq.${user.id}` },
            { table: 'circle_posts' },
            { table: 'posts' },
            { table: 'food_circles' },
          ]
        : [],
    [user?.id],
  );

  useDebouncedRealtime({
    channelName: user?.id ? `community-${user.id}` : 'community-guest-off',
    specs: communityRealtimeSpecs,
    enabled: Boolean(user?.id),
    onEvent: () => {
      refresh().catch(() => undefined);
    },
  });

  const joinedCircles = useMemo(() => circles.filter(c => c.is_member), [circles]);
  const discoverCircles = useMemo(() => circles.filter(c => !c.is_member), [circles]);
  const suggestedCircles = useMemo(
    () => (showAllSuggested ? discoverCircles : discoverCircles.slice(0, SUGGEST_VISIBLE)),
    [discoverCircles, showAllSuggested],
  );
  const suggestReason = useCallback(
    (i: number): string => {
      if (i === 0) return 'Popular near Stanford';
      if (i === 1 && joinedCircles[0]?.name) return `Because you’re in ${joinedCircles[0].name}`;
      if (i === 2) return 'Friends often join next';
      return 'Picked for you';
    },
    [joinedCircles],
  );

  const weekImpact = useMemo(
    () => weekImpactFromActivity(activity, user?.id),
    [activity, user?.id],
  );

  const visibleActivity = useMemo(() => {
    if (activityExpanded) return activity;
    return activity.slice(0, ACTIVITY_COLLAPSED);
  }, [activity, activityExpanded]);

  const hasMoreActivity = activity.length > ACTIVITY_COLLAPSED;

  const openCircleDetail = useCallback((circleId: string) => {
    const match = circles.find(cc => cc.id === circleId);
    if (match) setSelectedCircle(match);
  }, [circles]);

  async function handleJoin(circleId: string) {
    if (!user) return;
    setJoiningId(circleId);
    try {
      const updated = await joinCircle(circleId, user.id);
      setCircles(prev => prev.map(c => c.id === circleId ? updated : c));
      await refresh();
    } catch {
      //
    } finally {
      setJoiningId(null);
    }
  }

  if (selectedCircle) {
    return (
      <CircleDetail
        circle={selectedCircle}
        onBack={() => setSelectedCircle(null)}
        onCircleUpdate={updated => {
          setCircles(prev => prev.map(c => c.id === updated.id ? updated : c));
          setSelectedCircle(updated);
        }}
        onActivityMayChange={() => { refresh(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#faf9f5] px-4">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col bg-[#faf9f5] px-4 pb-28">

      {/* —— Header —— */}
      <div className="relative z-[1] flex flex-col gap-3 pb-5 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2f5fc4]">Food circles</h1>
          <p className="mt-1 text-sm leading-relaxed text-[#6b7280]">
            People here are actively sharing finds — plug in where you belong.
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="self-start whitespace-nowrap rounded-full bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(47,95,196,0.22)]"
          >
            + Create circle
          </button>
        )}
      </div>

      {/* —— 1 · Activity primary —— */}
      {user ? (
        <section className="relative z-[1] mb-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#2f5fc4]">
                Activity in your circles
              </h2>
              <p className="mt-1 max-w-md text-xs font-semibold text-[#6b7280]">
                New posts in circles you&apos;re part of — tap a card to open the full post.
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 rounded-[22px] border border-[#e5e7eb]/80 bg-white/75 px-3 py-2.5 shadow-[0_6px_20px_rgba(47,95,196,0.06)]">
            <button
              type="button"
              onClick={() => navigate('/app/feed')}
              className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-1.5 rounded-full bg-[#f43f5e]/10 px-3 py-2 text-xs font-black text-[#be123c] ring-1 ring-[#fecdd3] transition-colors hover:bg-[#f43f5e]/15"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              New posts in your circles
              <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </button>
            <button
              type="button"
              onClick={openGlobalCreateModal}
              className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-1 rounded-full bg-[#2f5fc4]/90 px-3 py-2 text-xs font-black text-white shadow-[0_6px_16px_rgba(47,95,196,0.22)] transition-all hover:bg-[#2f5fc4]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Post something
            </button>
          </div>

          {joinedCircles.length === 0 ? (
            <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-5 py-6 shadow-[0_12px_32px_rgba(47,95,196,0.08)]">
              <EmptyState
                imageSrc={emptyNoPostsYetSimple}
                imageAlt=""
                imageClassName="mx-auto mb-4 h-auto w-28 max-w-[8rem] object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
                title="Join a circle to see activity"
                description="Hop into a circle below — then shares and pings from friends show up here first."
              />
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#cfd8f8] bg-linear-to-br from-white to-[#f5f7ff] px-4 py-6 text-center shadow-inner">
              <p className="text-sm font-bold text-[#1a1a1a]">Quiet moment — break the silence?</p>
              <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-[#64748b]">
                Share a spot your circle would love — activity shows up here for everyone following along.
              </p>
              <button
                type="button"
                onClick={openGlobalCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2f5fc4] px-5 py-2.5 text-sm font-black text-white shadow-[0_8px_22px_rgba(47,95,196,0.35)] motion-safe:active:scale-[0.98]"
              >
                Post something tasty
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleActivity.map((row, idx) => {
                const hs = hoursSince(row.shared_at);
                const fresh = hs < 6;
                return (
                  <ActivityRowCard
                    key={row.share_id}
                    row={row}
                    navigate={navigate}
                    onOpenCircle={openCircleDetail}
                    isFresh={fresh && idx < 4}
                  />
                );
              })}
            </div>
          )}

          {activity.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {hasMoreActivity ? (
                <button
                  type="button"
                  onClick={() => setActivityExpanded(e => !e)}
                  className="text-xs font-black text-[#2f5fc4] underline-offset-4 hover:underline"
                >
                  {activityExpanded ? 'Show less' : 'See all activity'}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-[#9ca3af]">{activity.length} update{activity.length === 1 ? '' : 's'}</span>
              )}
              <button
                type="button"
                onClick={() => navigate('/app/feed')}
                className="text-[11px] font-black text-[#94a3b8] underline-offset-2 hover:text-[#2f5fc4] hover:underline"
              >
                Browse full feed →
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* Nudge */}
      {user && joinedCircles.length > 0 ? (
        <div className="relative z-[1] mb-7 rounded-[22px] border border-[#fde2e7]/90 bg-linear-to-r from-[#fff1f5]/90 via-white/90 to-[#eff6ff]/90 px-4 py-3.5 shadow-[0_10px_28px_rgba(244,63,94,0.06)]">
          <p className="text-[13px] font-bold text-[#374151]">
            Your circles could use your recent finds 👀
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#6b7280]">
            Share something tasty — it keeps the community warm and buzzing.
          </p>
          <button
            type="button"
            onClick={openGlobalCreateModal}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-black text-[#2f5fc4] shadow-sm transition-colors hover:bg-[#fafbff]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Post something
          </button>
        </div>
      ) : null}

      {/* —— 2 · Top contributors —— */}
      {user && joinedCircles.length > 0 ? (
        <section className="relative z-[1] mb-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black tracking-tight text-[#2f5fc4]">
                Circle cheer squad
              </h2>
              <p className="mt-1 max-w-lg text-xs font-semibold text-[#6b7280]">
                Original authors ranked by how often their posts show up in your circles (each share counts).
              </p>
            </div>
            <div
              className="flex shrink-0 rounded-[14px] bg-[#eef2f6]/90 p-1 shadow-inner ring-1 ring-[#e5e7eb]"
              role="tablist"
              aria-label="Contributor time range"
            >
              <button
                type="button"
                role="tab"
                aria-selected={contributorWindow === 'all_time'}
                onClick={() => setContributorWindow('all_time')}
                className={[
                  'rounded-xl px-3 py-1.5 text-[11px] font-black transition-all',
                  contributorWindow === 'all_time'
                    ? 'bg-white text-[#2f5fc4] shadow-[0_4px_14px_rgba(47,95,196,0.18)]'
                    : 'text-[#64748b] hover:text-[#1e293b]',
                ].join(' ')}
              >
                All time
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contributorWindow === 'this_week'}
                onClick={() => setContributorWindow('this_week')}
                className={[
                  'rounded-xl px-3 py-1.5 text-[11px] font-black transition-all',
                  contributorWindow === 'this_week'
                    ? 'bg-white text-[#2f5fc4] shadow-[0_4px_14px_rgba(47,95,196,0.18)]'
                    : 'text-[#64748b] hover:text-[#1e293b]',
                ].join(' ')}
              >
                This week
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[#dbe4ff]/80 bg-white/95 p-4 shadow-[0_10px_26px_rgba(47,95,196,0.1)] sm:col-span-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#6f90d8]">Your impact</p>
              <p className="mt-2 text-lg font-black text-[#1a1a1a]">
                You shared{' '}
                <span className="text-[#2f5fc4]">{weekImpact.shares}</span>
                {' '}
                {weekImpact.shares === 1 ? 'time' : 'times'} this week
              </p>
              <p className="mt-1 text-xs font-semibold text-[#64748b]">
                {weekImpact.circleIds.size === 0
                  ? 'Your circles haven’t heard from you yet — they’re hungry for it.'
                  : `${weekImpact.circleIds.size} circle${weekImpact.circleIds.size === 1 ? '' : 's'} saw your posts.`}
              </p>
              <button
                type="button"
                onClick={openGlobalCreateModal}
                className="mt-3 text-xs font-black text-[#f43f5e] underline-offset-4 hover:underline"
              >
                Keep the streak going →
              </button>
            </div>
          </div>

          {topContributors.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#e5e7eb] bg-white/80 px-4 py-8 text-center shadow-inner">
              <p className="text-sm font-black text-[#475569]">
                {contributorWindow === 'this_week'
                  ? 'No circle shares yet this week'
                  : 'No shared posts in your circles yet'}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs font-medium text-[#94a3b8]">
                {contributorWindow === 'this_week'
                  ? 'When people share posts into circles you’re in, standout authors will appear here.'
                  : 'Join activity above — rankings fill in as your circles get lively.'}
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {topContributors.map((c, i) => {
                const { emoji, title } = playfulTitleFor(c.profile.id, i);
                const streak = sharingSparkStreak(c.post_count);
                return (
                  <button
                    key={c.profile.id}
                    type="button"
                    onClick={() => navigate(`/app/profile/${c.profile.id}`)}
                    className="relative w-[10.75rem] shrink-0 overflow-hidden rounded-[26px] border border-[#e8ecf4] bg-linear-to-b from-white to-[#f8fafc] p-4 text-left shadow-[0_12px_32px_rgba(47,95,196,0.1)] transition-all duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_18px_40px_rgba(47,95,196,0.14)] motion-safe:active:scale-[0.98]"
                  >
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#2f5fc4] text-[11px] font-black text-white shadow-md">
                      {i + 1}
                    </span>
                    <div className="mb-3 flex justify-center pt-1">
                      <Avatar username={c.profile.username} avatarUrl={c.profile.avatar_url} size="lg" />
                    </div>
                    <p className="truncate text-center text-sm font-black text-[#1a1a1a]">
                      @{c.profile.username}
                    </p>
                    <p className="mx-auto mt-1 line-clamp-2 text-center text-[11px] font-black leading-snug text-[#475569]">
                      {emoji} {title}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-[#94a3b8]">
                      <TrendingUp className="h-3.5 w-3.5 text-[#2f5fc4]" aria-hidden />
                      <span>{c.post_count} shares in circles</span>
                    </div>
                    {streak >= 2 ? (
                      <div className="mt-2 flex justify-center gap-1 text-[11px] font-black text-orange-600">
                        <Flame className="h-3.5 w-3.5 motion-safe:animate-pulse" aria-hidden />
                        spark ×{Math.min(streak, 12)}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Secondary nudge */}
      {user && activity.length >= 4 ? (
        <p className="relative z-[1] mb-6 text-center text-xs font-semibold italic text-[#9ca3af]">
          Momentum builds when everyone drops one good rec — yours could be next.
        </p>
      ) : null}

      {/* —— 3 · Suggested circles (max 3) —— */}
      <section className="relative z-[1] mb-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#2f5fc4]">Suggested for you</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#6b7280]">A handful of invitations — jump in without the scroll marathon.</p>
          </div>
        </div>
        {discoverCircles.length === 0 ? (
          <p className="rounded-2xl border border-[#eef2ff] bg-white/80 px-4 py-3 text-sm font-medium text-[#6b7280] shadow-sm">
            You&apos;re already in every circle here. Invite friends or spin up something new ✨
          </p>
        ) : (
          <div className="space-y-4">
            {suggestedCircles.map((circle, idx) => (
              <div key={circle.id} className="space-y-1.5">
                <p className="px-1 text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">
                  {suggestReason(idx)}
                </p>
                <CircleCard
                  circle={circle}
                  variant="discover"
                  onOpen={() => setSelectedCircle(circle)}
                  onJoin={() => handleJoin(circle.id)}
                  loading={joiningId === circle.id}
                />
              </div>
            ))}
            {discoverCircles.length > SUGGEST_VISIBLE ? (
              <button
                type="button"
                onClick={() => setShowAllSuggested(s => !s)}
                className="flex w-full items-center justify-center gap-1 rounded-full border border-[#e5e7eb] bg-white/90 py-3 text-xs font-black text-[#2f5fc4] shadow-sm transition-colors hover:bg-[#fafbff]"
              >
                {showAllSuggested ? 'Show fewer' : 'See more circles'}
                <ChevronRight className={`h-4 w-4 transition-transform ${showAllSuggested ? 'rotate-90' : ''}`} aria-hidden />
              </button>
            ) : null}
          </div>
        )}
      </section>

      {/* —— 4 · Your circles (compact strip) —— */}
      <section className="relative z-[1] mb-12">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#6f90d8]" aria-hidden />
          <h2 className="text-lg font-black tracking-tight text-[#2f5fc4]">Your circles</h2>
        </div>
        <p className="mb-4 text-xs font-semibold text-[#6b7280]">
          Quick access — open a space anytime.
        </p>
        {joinedCircles.length === 0 ? (
          <div className="rounded-[24px] border border-[#e5e7eb] bg-white/90 px-4 py-5 shadow-inner">
            <p className="text-sm font-bold text-[#374151]">No memberships yet</p>
            <p className="mt-1 text-xs text-[#6b7280]">Grab a suggestion above or launch your own with Create circle.</p>
          </div>
        ) : (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {joinedCircles.map(circle => (
                <button
                  key={circle.id}
                  type="button"
                  onClick={() => setSelectedCircle(circle)}
                  className="group flex min-w-[7.75rem] max-w-[11rem] shrink-0 flex-col gap-2 rounded-[22px] border border-[#e5e7eb] bg-white/95 px-3.5 py-3 text-left shadow-[0_8px_24px_rgba(47,95,196,0.08)] transition-all hover:border-[#bfdbfe] hover:shadow-[0_10px_28px_rgba(47,95,196,0.12)] active:scale-[0.98]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf1ff] text-xl shadow-inner ring-1 ring-white">
                    {circle.icon_type}
                  </span>
                  <span className="line-clamp-2 text-xs font-black leading-snug text-[#1a1a1a] group-hover:text-[#2f5fc4]">
                    {circle.name}
                  </span>
                  {circle.member_count != null ? (
                    <span className="text-[10px] font-bold text-[#94a3b8]">{circle.member_count} members</span>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {user && (
        <CreateCircleModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          userId={user.id}
          onCreated={c => {
            setCircles(prev => {
              const rest = prev.filter(x => x.id !== c.id);
              return [...rest, c].sort((a, b) => a.name.localeCompare(b.name));
            });
            refresh().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
