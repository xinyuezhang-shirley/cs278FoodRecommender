import { useState, useEffect } from 'react';
import type { FoodCircle, Post } from '../types';
import { getAllCircles, joinCircle, leaveCircle, getTopContributors } from '../services/circleService';
import { getPaginatedPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { CircleCard } from '../components/community/CircleCard';
import { CircleDetail } from '../components/community/CircleDetail';
import { Avatar } from '../components/ui/Avatar';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { timeAgo } from '../utils/helpers';
import { PostTypeBadge } from '../components/ui/Tag';

export function CommunityPage() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [topContributors, setTopContributors] = useState<{ profile: any; post_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<FoodCircle | null>(null);

  useEffect(() => {
    Promise.all([
      getAllCircles(user?.id),
      getPaginatedPosts({}, user?.id),
      getTopContributors(5),
    ]).then(([c, posts, contributors]) => {
      setCircles(c);
      setRecentPosts(posts.slice(0, 6));
      setTopContributors(contributors);
      setLoading(false);
    });
  }, [user?.id]);

  async function handleJoin(circleId: string) {
    if (!user) return;
    setJoiningId(circleId);
    try {
      const updated = await joinCircle(circleId, user.id);
      setCircles(prev => prev.map(c => c.id === circleId ? updated : c));
    } catch {
      // already member — re-fetch
    } finally {
      setJoiningId(null);
    }
  }

  async function handleLeave(circleId: string) {
    if (!user) return;
    setJoiningId(circleId);
    try {
      const updated = await leaveCircle(circleId, user.id);
      setCircles(prev => prev.map(c => c.id === circleId ? updated : c));
    } catch {
      // ignore
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
      />
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Community</h1>
        <p className="text-sm text-[#6b7280]">Food circles & what's happening</p>
      </div>

      {/* Food Circles */}
      <section className="mb-6">
        <div className="px-4 mb-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Food Circles</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">Join groups that match your taste</p>
        </div>
        <div className="bg-white border-t border-[#f3f4f6]">
          {circles.map(circle => (
            <CircleCard
              key={circle.id}
              circle={circle}
              onJoin={() => handleJoin(circle.id)}
              onLeave={() => handleLeave(circle.id)}
              onClick={() => setSelectedCircle(circle)}
              loading={joiningId === circle.id}
            />
          ))}
        </div>
      </section>

      {/* Top Contributors */}
      {topContributors.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-3">
            Top contributors this week 🏆
          </h2>
          <div className="bg-white rounded-2xl divide-y divide-[#f3f4f6] border border-[#f3f4f6]">
            {topContributors.map((c, i) => (
              <div key={c.profile.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-5 text-sm font-bold text-[#9ca3af]">#{i + 1}</span>
                <Avatar
                  username={c.profile.username}
                  avatarUrl={c.profile.avatar_url}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">@{c.profile.username}</p>
                  {c.profile.food_personality && (
                    <p className="text-xs text-[#6b7280] truncate">{c.profile.food_personality}</p>
                  )}
                </div>
                <span className="text-xs text-[#9ca3af]">{c.post_count} posts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {recentPosts.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {recentPosts.map(post => (
              <div
                key={post.id}
                className="flex items-center gap-3 bg-white rounded-xl px-3 py-3 border border-[#f3f4f6]"
              >
                {post.author && (
                  <Avatar
                    username={post.author.username}
                    avatarUrl={post.author.avatar_url}
                    size="xs"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <PostTypeBadge type={post.type} />
                    <span className="text-[10px] text-[#9ca3af]">{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-xs font-medium text-[#1a1a1a] truncate">{post.title}</p>
                  <p className="text-[10px] text-[#6b7280] truncate">{post.location_name}</p>
                </div>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#f3f4f6]"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
