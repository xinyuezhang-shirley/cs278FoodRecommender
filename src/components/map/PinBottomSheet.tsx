import { MapPin, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import type { Post } from '../../types';
import { timeAgo, timeRemaining, isExpired } from '../../utils/helpers';
import { Tag, PostTypeBadge } from '../ui/Tag';
import { BottomSheet } from '../ui/Modal';

interface PinBottomSheetProps {
  post: Post | null;
  onClose: () => void;
  onOpenPost: (post: Post) => void;
}

export function PinBottomSheet({ post, onClose, onOpenPost }: PinBottomSheetProps) {
  if (!post) return null;

  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

  return (
    <BottomSheet open={!!post} onClose={onClose}>
      <div className="px-4 pb-6">
        {post.image_url && (
          <div className="mb-3 rounded-xl overflow-hidden">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-36 object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PostTypeBadge type={post.type} />
            </div>
            <h3 className="text-base font-semibold text-[#1a1a1a] leading-snug">{post.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-[#6b7280] mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{post.location_name}</span>
          <span className="mx-1.5 text-[#d1d5db]">·</span>
          <span className="text-xs">{timeAgo(post.created_at)}</span>
        </div>

        {remaining && (
          <div className="flex items-center gap-1 text-sm text-[#16a34a] font-medium mb-3">
            <Clock className="w-3.5 h-3.5" />
            {remaining}
          </div>
        )}
        {expired && post.expires_at && (
          <div className="text-sm text-[#9ca3af] mb-3">Expired</div>
        )}

        {(post.cuisine_tags.length > 0 || post.dietary_tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.cuisine_tags.slice(0, 3).map(t => <Tag key={t} label={t} size="sm" />)}
            {post.dietary_tags.slice(0, 2).map(t => <Tag key={t} label={t} variant="matcha" size="sm" />)}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 text-sm text-[#9ca3af]">
          {post.is_free_food && (
            <span className="flex items-center gap-1 text-[#16a34a]">
              <CheckCircle className="w-4 h-4" />
              {post.still_there_count ?? 0} confirmed
            </span>
          )}
        </div>

        <button
          onClick={() => { onOpenPost(post); onClose(); }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a1a1a] text-white text-sm font-semibold rounded-xl active:bg-[#374151]"
        >
          View full post
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </BottomSheet>
  );
}
