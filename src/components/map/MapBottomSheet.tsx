import { useState } from 'react';
import { Clock, ChevronRight, X } from 'lucide-react';
import type { Post } from '../../types';
import type { PinGroup } from '../../utils/groupPostsByLocation';
import { timeAgo, timeRemaining, isExpired } from '../../utils/helpers';
import { PostTypeBadge, Tag } from '../ui/Tag';
import { Modal } from '../ui/Modal';
import { PostDetail } from '../posts/PostDetail';

interface MapBottomSheetProps {
  group: PinGroup | null;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
}

const VARIANT_COLORS = {
  free_food:      { dot: '#16a34a', label: 'Free Food' },
  recommendation: { dot: '#d97706', label: 'Spot'      },
  event:          { dot: '#7c3aed', label: 'Event'     },
  expired:        { dot: '#9ca3af', label: 'Expired'   },
};

export function MapBottomSheet({ group, onClose, onPostDeleted }: MapBottomSheetProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (!group) return null;

  const { dot, label } = VARIANT_COLORS[group.variant];

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[100]"
        style={{ pointerEvents: 'none' }}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[200] rounded-t-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12), 0 -1px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#d1d5db] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-1 pb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dot }}
              />
              <span className="text-xs font-semibold" style={{ color: dot }}>
                {label}
              </span>
              <span className="text-xs text-[#9ca3af]">
                · {group.posts.length} post{group.posts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#1a1a1a] leading-snug truncate">
              {group.locationName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-0.5 w-7 h-7 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Post cards — horizontal scroll */}
        <div
          className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-5"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {group.posts.map(post => (
            <PostMiniCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>
      </div>

      {/* Full post detail */}
      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              onPostDeleted?.(selectedPost.id);
              setSelectedPost(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function PostMiniCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[200px] text-left rounded-2xl overflow-hidden border border-[#f0f0f0] bg-white active:scale-[0.97] transition-transform"
      style={{ scrollSnapAlign: 'start' }}
    >
      {post.image_url ? (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-28 object-cover bg-[#f3f4f6]"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className="w-full h-28 flex items-center justify-center text-3xl"
          style={{ background: post.type === 'free_food' ? '#f0fdf4' : post.type === 'event' ? '#faf5ff' : '#fffbeb' }}
        >
          {post.type === 'free_food' ? '🍕' : post.type === 'event' ? '🎉' : '⭐'}
        </div>
      )}

      <div className="p-3">
        <div className="mb-1.5">
          <PostTypeBadge type={post.type} />
        </div>
        <p className="text-[13px] font-semibold text-[#1a1a1a] line-clamp-2 leading-snug mb-1.5">
          {post.title}
        </p>

        {remaining && (
          <div className="flex items-center gap-1 text-[11px] text-[#16a34a] font-semibold mb-1">
            <Clock className="w-3 h-3" />
            {remaining}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af]">
          {post.cuisine_tags.slice(0, 2).map(t => (
            <Tag key={t} label={t} size="xs" />
          ))}
          <span className="ml-auto">{timeAgo(post.created_at)}</span>
        </div>

        <div className="flex items-center justify-end mt-2 text-[#f43f5e] text-[11px] font-semibold">
          View post <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
}
