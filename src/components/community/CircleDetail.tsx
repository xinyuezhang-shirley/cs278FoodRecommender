import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import type { FoodCircle, Post } from '../../types';
import { getCirclePosts, joinCircle, leaveCircle } from '../../services/circleService';
import { useAuth } from '../../context/AuthContext';
import { PostGrid } from '../posts/PostGrid';
import { Modal } from '../ui/Modal';
import { PostDetail } from '../posts/PostDetail';
import { ShareToCircleModal } from './ShareToCircleModal';
import emptyNoPostsYetSimple from '../../assets/nommi/empty_no_posts_yet_simple.png';
import emptyNoPostFound from '../../assets/nommi/empty_no_post_found.png';

interface CircleDetailProps {
  circle: FoodCircle;
  onBack: () => void;
  onCircleUpdate: (circle: FoodCircle) => void;
  /** Parent can refresh Community “activity” feed after shares. */
  onActivityMayChange?: () => void;
}

export function CircleDetail({
  circle,
  onBack,
  onCircleUpdate,
  onActivityMayChange,
}: CircleDetailProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [joining, setJoining] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getCirclePosts(circle.id, user?.id);
      setPosts(p);
    } finally {
      setLoading(false);
    }
  }, [circle.id, user?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleToggleMembership() {
    if (!user) return;
    setJoining(true);
    try {
      let updated: FoodCircle;
      if (circle.is_member) {
        updated = await leaveCircle(circle.id, user.id);
      } else {
        updated = await joinCircle(circle.id, user.id);
      }
      onCircleUpdate(updated);
      await loadPosts();
    } catch {
      //
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#faf9f5]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-white/85 backdrop-blur-md sticky top-0 z-10 shadow-[0_6px_20px_rgba(47,95,196,0.06)]">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-white border border-transparent hover:border-[#e5e7eb] text-[#6b7280]"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-[#2f5fc4]" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-[#2f5fc4] truncate">{circle.name}</h2>
        </div>
        {user && (
          <button
            type="button"
            onClick={handleToggleMembership}
            disabled={joining}
            className={[
              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-black border transition-all',
              circle.is_member
                ? 'bg-white text-[#2f5fc4] border-[#e5e7eb] shadow-[0_4px_12px_rgba(47,95,196,0.08)]'
                : 'bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white border-transparent shadow-[0_10px_24px_rgba(47,95,196,0.28)]',
            ].join(' ')}
          >
            {circle.is_member ? 'Joined' : 'Join'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-5">
          <div className="bg-white rounded-[28px] border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.10)] p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf1ff] border border-[#e5e7eb] flex items-center justify-center text-3xl shadow-inner">
                {circle.icon_type}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-[#2f5fc4] truncate">{circle.name}</h1>
                <div className="flex items-center gap-1 text-sm text-[#6b7280] mt-0.5 font-semibold">
                  <Users className="w-3.5 h-3.5 text-[#6f90d8] shrink-0" aria-hidden />
                  {circle.member_count?.toLocaleString()} members
                </div>
              </div>
            </div>
            <p className="text-sm text-[#1a1a1a] leading-relaxed">{circle.description}</p>
            {circle.tags && circle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {circle.tags.map(t => (
                  <span
                    key={t}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f5f7ff] text-[#2f5fc4] border border-[#e5e7eb]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {user && !circle.is_member && (
            <div className="mb-4 rounded-2xl border border-[#e5e7eb] bg-[#f5f7ff] px-4 py-3 text-sm text-[#1a1a1a]">
              <span className="font-black text-[#2f5fc4]">Join this circle</span>
              {' '}
              to see posts others have curated here — the main feed stays public everywhere else.
            </div>
          )}

          <h3 className="text-xs font-black text-[#6f90d8] uppercase tracking-widest mb-1">Posts shared here</h3>
          <p className="text-xs text-[#6b7280] mb-3 font-semibold leading-relaxed">
            Original authors stay credited. Use{' '}
            <span className="text-[#2f5fc4] font-bold">Share to circle</span> on any post.
          </p>
        </div>

        <div className="-mt-4 px-1">
          <PostGrid
            posts={posts}
            loading={loading}
            onPostClick={setSelectedPost}
            onSharePost={user?.id ? p => setShareTarget(p) : undefined}
            emptyTitle={circle.is_member ? 'Nothing shared yet' : 'Join to see curated posts'}
            emptyDescription={
              circle.is_member
                ? 'Open any post elsewhere and tap “Share to circle” to surface it here.'
                : 'Members only see curated posts shared into this circle.'
            }
            emptyImageSrc={circle.is_member ? emptyNoPostsYetSimple : emptyNoPostFound}
            emptyImageAlt={
              circle.is_member
                ? 'Nommi illustration for circle feed with nothing shared yet'
                : 'Nommi empty cup illustration — join circle to see curated posts'
            }
            emptyImageClassName="w-36 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
          />
        </div>
      </div>

      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onActivityMayChange={() => {
              loadPosts();
              onActivityMayChange?.();
            }}
            onPostDeleted={() => {
              setPosts(prev => prev.filter(p => p.id !== selectedPost?.id));
              setSelectedPost(null);
              onActivityMayChange?.();
            }}
          />
        )}
      </Modal>

      {user && (
        <ShareToCircleModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          post={shareTarget}
          userId={user.id}
          onShared={() => {
            loadPosts();
            onActivityMayChange?.();
          }}
        />
      )}
    </div>
  );
}
