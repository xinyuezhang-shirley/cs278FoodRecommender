import { useState, useEffect } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import type { FoodCircle, Post } from '../../types';
import { getCirclePosts, joinCircle, leaveCircle } from '../../services/circleService';
import { useAuth } from '../../context/AuthContext';
import { PostGrid } from '../posts/PostGrid';
import { Modal } from '../ui/Modal';
import { PostDetail } from '../posts/PostDetail';

interface CircleDetailProps {
  circle: FoodCircle;
  onBack: () => void;
  onCircleUpdate: (circle: FoodCircle) => void;
}

export function CircleDetail({ circle, onBack, onCircleUpdate }: CircleDetailProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getCirclePosts(circle.id, user?.id).then(p => {
      setPosts(p);
      setLoading(false);
    });
  }, [circle.id, user?.id]);

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
    } catch {
      // ignore
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[#1a1a1a] truncate">{circle.name}</h2>
        </div>
        {user && (
          <button
            onClick={handleToggleMembership}
            disabled={joining}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              circle.is_member
                ? 'bg-[#f3f4f6] text-[#6b7280]'
                : 'bg-[#1a1a1a] text-white',
            ].join(' ')}
          >
            {circle.is_member ? 'Joined' : 'Join'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Circle info */}
        <div className="px-4 py-4 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f4f6] flex items-center justify-center text-3xl">
              {circle.icon_type}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1a1a1a]">{circle.name}</h1>
              <div className="flex items-center gap-1 text-sm text-[#6b7280] mt-0.5">
                <Users className="w-3.5 h-3.5" />
                {circle.member_count?.toLocaleString()} members
              </div>
            </div>
          </div>
          <p className="text-sm text-[#374151]">{circle.description}</p>
        </div>

        {/* Posts */}
        <div className="pt-1">
          <PostGrid
            posts={posts}
            loading={loading}
            onPostClick={setSelectedPost}
            emptyTitle="No posts in this circle yet"
            emptyDescription="Be the first to post something!"
          />
        </div>
      </div>

      {/* Post detail modal */}
      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              setPosts(prev => prev.filter(p => p.id !== selectedPost?.id));
              setSelectedPost(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
