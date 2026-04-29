import { Heart, MessageCircle, Clock, MapPin, CheckCircle } from 'lucide-react';
import type { Post } from '../../types';
import { timeAgo, timeRemaining, isExpired } from '../../utils/helpers';
import { PostTypeBadge } from '../ui/Tag';

const PLACEHOLDER_COLORS = [
  '#fce7f3', '#e0f2fe', '#f0fdf4', '#fefce8', '#f5f3ff',
];

function getPlaceholderColor(postId: string): string {
  const idx = postId.charCodeAt(postId.length - 1) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[idx];
}

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="bg-white rounded-xl overflow-hidden cursor-pointer press-active transition-shadow hover:shadow-md"
      aria-label={post.title}
    >
      {/* Image */}
      <div
        className="w-full overflow-hidden"
        style={{ backgroundColor: getPlaceholderColor(post.id) }}
      >
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full object-cover"
            loading="lazy"
            style={{ display: 'block' }}
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-28 flex items-center justify-center text-3xl opacity-40">
            {post.type === 'free_food' ? '🍕' : post.type === 'event' ? '🎉' : '⭐'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <div className="flex items-center gap-1 mb-1.5">
          <PostTypeBadge type={post.type} />
          {expired && post.is_free_food && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f3f4f6] text-[#9ca3af]">
              Expired
            </span>
          )}
        </div>

        <p className="text-[13px] font-semibold text-[#1a1a1a] line-clamp-2 leading-snug mb-1.5">
          {post.title}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mb-2">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="line-clamp-1">{post.location_name}</span>
        </div>

        {/* Tags */}
        {post.cuisine_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.cuisine_tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-[#f3f4f6] text-[#4b5563] rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Time remaining */}
        {remaining && (
          <div className="flex items-center gap-1 text-[11px] text-[#16a34a] font-medium mb-2">
            <Clock className="w-2.5 h-2.5" />
            {remaining}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-[#9ca3af]">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.comment_count ?? 0}
          </span>
          {post.is_free_food && (
            <span className="flex items-center gap-1 text-[#16a34a]">
              <CheckCircle className="w-3 h-3" />
              {post.still_there_count ?? 0}
            </span>
          )}
          <span className="ml-auto text-[10px]">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
