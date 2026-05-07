import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CircleActivityItem, FoodCircle, UserProfile } from '../types';
import {
  getAllCircles,
  joinCircle,
  getActivityInJoinedCircles,
  getTopContributorsInMyCircles,
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
import { FriendsAndMessagesPanel } from '../components/community/FriendsAndMessagesPanel';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

export function CommunityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmBootstrap = searchParams.get('dm')?.trim() || undefined;
  const { user, profile } = useAuth();
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [activity, setActivity] = useState<CircleActivityItem[]>([]);
  const [topContributors, setTopContributors] = useState<{ profile: UserProfile; post_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<FoodCircle | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
      getActivityInJoinedCircles(user.id, user.id, 30),
      getTopContributorsInMyCircles(user.id, 5),
    ]);
    setCircles(c);
    setActivity(act);
    setTopContributors(contrib as { profile: UserProfile; post_count: number }[]);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => {
        /* keep empty lists */
      })
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

  const clearDmBootstrap = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('dm');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const joinedCircles = circles.filter(c => c.is_member);
  const discoverCircles = circles.filter(c => !c.is_member);

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
    <div className="relative flex flex-col min-h-full bg-[#faf9f5] px-4 pb-24">

      <div className="relative z-[1] pt-4 pb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2f5fc4] tracking-tight">Food circles</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Share food finds with people who crave the same things.
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-full px-5 py-2.5 text-sm font-black text-white bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] shadow-[0_10px_24px_rgba(47,95,196,0.22)] whitespace-nowrap self-start"
          >
            + Create circle
          </button>
        )}
      </div>

      {user && (
        <FriendsAndMessagesPanel
          userId={user.id}
          myUsernameHint={profile?.username}
          bootstrapDmWithUserId={dmBootstrap}
          onBootstrapDmConsumed={clearDmBootstrap}
        />
      )}

      <section className="relative z-[1] mb-8">
        <h2 className="text-lg font-black text-[#2f5fc4] mb-1 tracking-tight">Your circles</h2>
        <p className="text-xs text-[#6b7280] font-semibold mb-3">
          Spaces you’ve joined — open one to see what members have curated.
        </p>
        {joinedCircles.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-[#e5e7eb] shadow-[0_10px_25px_rgba(47,95,196,0.08)] px-5 py-6">
            <EmptyState
              imageSrc={emptyNoPostsYetSimple}
              imageAlt="Nommi illustration for joining your first food circle"
              imageClassName="w-32 max-w-[8rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
              title="No circles yet"
              description="Discover one below or create your own shared space."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {joinedCircles.map(circle => (
              <CircleCard
                key={circle.id}
                circle={circle}
                variant="joined"
                onOpen={() => setSelectedCircle(circle)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="relative z-[1] mb-8">
        <h2 className="text-lg font-black text-[#2f5fc4] mb-1 tracking-tight">Discover circles</h2>
        <p className="text-xs text-[#6b7280] font-semibold mb-3">Join when you’re ready to chip in favorites.</p>
        {discoverCircles.length === 0 ? (
          <p className="text-sm text-[#6b7280]">You’re already in every circle here. Nice!</p>
        ) : (
          <div className="space-y-3">
            {discoverCircles.map(circle => (
              <CircleCard
                key={circle.id}
                circle={circle}
                variant="discover"
                onOpen={() => setSelectedCircle(circle)}
                onJoin={() => handleJoin(circle.id)}
                loading={joiningId === circle.id}
              />
            ))}
          </div>
        )}
      </section>

      {!user ? null : activity.length === 0 && joinedCircles.length > 0 ? (
        <section className="relative z-[1] mb-8">
          <h2 className="text-lg font-black text-[#2f5fc4] mb-2 tracking-tight">Activity in your circles</h2>
          <p className="text-sm text-[#6b7280]">
            When someone (including you) shares a post to a circle you’re in, it will show here.
          </p>
        </section>
      ) : null}

      {user && activity.length > 0 && (
        <section className="relative z-[1] mb-8">
          <h2 className="text-lg font-black text-[#2f5fc4] mb-3 tracking-tight">Activity in your circles</h2>
          <div className="space-y-3">
            {activity.map(row => (
              <div
                key={row.share_id}
                className="bg-white rounded-[28px] px-4 py-3 border border-[#e5e7eb] shadow-[0_10px_25px_rgba(47,95,196,0.08)]"
              >
                <div className="flex items-start gap-3">
                  {row.post.author && row.post.author_id && (
                    <button
                      type="button"
                      className="shrink-0 rounded-full ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fc4]/40"
                      onClick={() => navigate(`/app/profile/${row.post.author_id}`)}
                      aria-label={`View @${row.post.author.username}'s profile`}
                    >
                      <Avatar username={row.post.author.username} avatarUrl={row.post.author.avatar_url} size="xs" />
                    </button>
                  )}
                  {row.post.author && !row.post.author_id && (
                    <Avatar username={row.post.author.username} avatarUrl={row.post.author.avatar_url} size="xs" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <PostTypeBadge type={row.post.type} />
                      <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wide">
                        {timeAgo(row.shared_at)}
                      </span>
                    </div>
                    <p className="text-sm font-black text-[#1a1a1a] leading-snug line-clamp-2">{row.post.title}</p>
                    <p className="text-xs text-[#6b7280] mt-1 leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-1">
                      <span>Original by</span>
                      <button
                        type="button"
                        disabled={!row.post.author_id}
                        onClick={() => row.post.author_id && navigate(`/app/profile/${row.post.author_id}`)}
                        className="font-bold text-[#1a1a1a] underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        @{row.post.author?.username ?? '…'}
                      </button>
                      <span aria-hidden>·</span>
                      <span>Shared by</span>
                      <button
                        type="button"
                        disabled={!row.sharer?.id}
                        onClick={() => row.sharer.id && navigate(`/app/profile/${row.sharer.id}`)}
                        className="font-bold text-[#2f5fc4] underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        @{row.sharer.username}
                      </button>
                      {' to '}
                      <span className="font-bold text-[#1a1a1a]">{row.circle.name}</span>
                    </p>
                  </div>
                  {row.post.image_url && (
                    <img
                      src={row.post.image_url}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 bg-[#eaf1ff] border border-[#e5e7eb]"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {user && topContributors.length > 0 && joinedCircles.length > 0 && (
        <section className="relative z-[1] mb-8">
          <h2 className="text-lg font-black text-[#2f5fc4] mb-3 tracking-tight">
            Top contributors in your circles
          </h2>
          <p className="text-xs text-[#6b7280] font-semibold mb-3">
            Original authors with the most posts appearing in circles you belong to.
          </p>
          <div className="bg-white rounded-[28px] divide-y divide-[#e5e7eb] border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.10)] overflow-hidden">
            {topContributors.map((c, i) => (
              <button
                key={c.profile.id}
                type="button"
                onClick={() => navigate(`/app/profile/${c.profile.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafbff] transition-colors"
              >
                <span className="w-6 text-sm font-black text-[#6f90d8]">#{i + 1}</span>
                <Avatar username={c.profile.username} avatarUrl={c.profile.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1a1a]">@{c.profile.username}</p>
                  {c.profile.food_personality && (
                    <p className="text-xs text-[#6b7280] truncate">{c.profile.food_personality}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-[#6f90d8] shrink-0">{c.post_count} in circles</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
            refresh();
          }}
        />
      )}
    </div>
  );
}
