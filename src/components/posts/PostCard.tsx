import { Heart, MessageCircle, Clock, MapPin, CheckCircle } from 'lucide-react';
import type { Post } from '../../types';
import { timeAgo, timeRemaining, isExpired } from '../../utils/helpers';
import { PostTypeBadge } from '../ui/Tag';

const PLACEHOLDER_COLORS = [
  '#eaf1ff', '#fff3dc', '#f0f4ff', '#fefce8', '#fdeef3',
];

function getPlaceholderColor(postId: string): string {
  const idx = postId.charCodeAt(postId.length - 1) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[idx];
}

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onShareToCircle?: () => void;
}

export function PostCard({ post, onClick, onShareToCircle }: PostCardProps) {
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

  const main = (
    <>
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
          <div className="w-full h-28 flex items-center justify-center text-4xl opacity-70">
            {post.type === 'free_food' ? '🍕' : post.type === 'event' ? '🎉' : '🧋'}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          <PostTypeBadge type={post.type} />
          {expired && post.is_free_food && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f3ef] text-[#6b7280] border border-[#e5e7eb]">
              Expired
            </span>
          )}
        </div>

        {post.circle_share && (
          <p className="text-[10px] text-[#6b7280] font-semibold leading-snug mb-1.5">
            Original by <span className="text-[#1a1a1a]">@{post.author?.username ?? '…'}</span>
            {' · '}
            Shared by <span className="text-[#2f5fc4]">@{post.circle_share.shared_by?.username ?? '…'}</span>
          </p>
        )}

        <p className="text-[13px] font-bold text-[#1a1a1a] line-clamp-2 leading-snug mb-1.5">
          {post.title}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mb-2">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-[#6f90d8]" aria-hidden />
          <span className="line-clamp-1">{post.location_name}</span>
        </div>

        {post.cuisine_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.cuisine_tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="text-[9px] px-2 py-0.5 bg-[#f5f7ff] text-[#2f5fc4] rounded-full font-bold border border-[#e5e7eb]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {remaining && (
          <div className="flex items-center gap-1 text-[11px] text-[#2f5fc4] font-bold mb-2">
            <Clock className="w-2.5 h-2.5" aria-hidden />
            {remaining}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-[#9ca3af]">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-[#6f90d8]" aria-hidden />
            {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3 text-[#6f90d8]" aria-hidden />
            {post.comment_count ?? 0}
          </span>
          {post.is_free_food && (
            <span className="flex items-center gap-1 text-[#2f5fc4] font-semibold">
              <CheckCircle className="w-3 h-3" aria-hidden />
              {post.still_there_count ?? 0}
            </span>
          )}
          <span className="ml-auto text-[10px] text-[#6b7280]">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-[28px] shadow-[0_10px_25px_rgba(47,95,196,0.08)] border border-[#e5e7eb] overflow-hidden transition-shadow hover:shadow-[0_14px_32px_rgba(47,95,196,0.12)]">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        className="w-full cursor-pointer text-left"
        aria-label={post.title}
      >
        {main}
      </div>
      {onShareToCircle && (
        <div className="px-4 pb-3 pt-2 border-t border-[#e5e7eb] bg-[#faf9f5]/60">
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onShareToCircle();
            }}
            className="text-xs font-black text-[#2f5fc4] underline-offset-2 hover:underline rounded-full px-3 py-1.5 border border-transparent hover:bg-white hover:border-[#e5e7eb]"
          >
            Share to circle
          </button>
        </div>
      )}
    </div>
  );
}
