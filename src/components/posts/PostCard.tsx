import { Heart, MessageCircle, Clock, MapPin, CheckCircle, Bookmark, Share, Edit3, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import type { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { sharePostExternal } from '../../utils/sharePost';
import { timeAgo, timeRemaining, isExpired, isPostOwner, encodeReturnQuery } from '../../utils/helpers';
import { PostTypeBadge } from '../ui/Tag';

const PLACEHOLDER_COLORS = [
  '#eaf1ff', '#fff3dc', '#f0f4ff', '#fefce8', '#fdeef3',
];

function getPlaceholderColor(postId: string): string {
  const id = typeof postId === 'string' && postId.length > 0 ? postId : '0';
  const idx = id.charCodeAt(id.length - 1) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[idx];
}

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be');
}

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onShareToCircle?: () => void;
  onLike?: () => void;
  onToggleSaved?: () => void;
  saved?: boolean;
  /** Staggered list entrance; omit for no animation. */
  staggerIndex?: number;
  /** Saved/Liked lists: big “open” control + clear new-tab behavior in parent `onClick`. */
  showProminentOpen?: boolean;
}

export function PostCard({
  post,
  onClick,
  onShareToCircle,
  onLike,
  onToggleSaved,
  saved,
  staggerIndex,
  showProminentOpen,
}: PostCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const isOwner = isPostOwner(user?.id, profile?.id, post.author_id, post.author?.id);
  const liked = Boolean(post.viewer_reactions?.includes('like'));
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

  const returnPathCurrent = `${location.pathname}${location.search}`;
  const editHref = `/app/post/${post.id}/edit?${encodeReturnQuery(returnPathCurrent)}`;

  const main = (
    <>
      <div
        className="w-full overflow-hidden rounded-t-[26px]"
        style={{ backgroundColor: getPlaceholderColor(post.id) }}
      >
        {post.image_url ? (
          isVideoUrl(post.image_url) ? (
            <video
              src={post.image_url}
              className="w-full object-cover"
              controls
              preload="metadata"
            />
          ) : (
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
          )
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
            Original by{' '}
            {post.author_id ? (
              <button
                type="button"
                className="text-[#1a1a1a] underline-offset-2 hover:underline"
                onClick={e => {
                  e.stopPropagation();
                  navigate(`/app/profile/${post.author_id}`);
                }}
              >
                @{post.author?.username ?? '…'}
              </button>
            ) : (
              <span className="text-[#1a1a1a]">@{post.author?.username ?? '…'}</span>
            )}
            {' · '}
            Shared by{' '}
            <button
              type="button"
              disabled={!post.circle_share?.shared_by_id}
              className="text-[#2f5fc4] underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
              onClick={e => {
                e.stopPropagation();
                if (post.circle_share?.shared_by_id) navigate(`/app/profile/${post.circle_share.shared_by_id}`);
              }}
            >
              @{post.circle_share.shared_by?.username ?? '…'}
            </button>
          </p>
        )}

        <p className="text-[13px] font-bold text-[#1a1a1a] line-clamp-2 leading-snug mb-2">
          {post.title}
        </p>

        {isOwner && (
          <div className="mb-3" onClick={e => e.stopPropagation()}>
            <Link
              to={editHref}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f5fc4] px-3 py-3.5 text-sm font-black text-white shadow-[0_10px_28px_rgba(47,95,196,0.38)] ring-2 ring-white/30"
              onClick={e => e.stopPropagation()}
            >
              <Edit3 className="w-5 h-5 shrink-0" strokeWidth={2.5} aria-hidden />
              Edit your post
            </Link>
          </div>
        )}

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

        <div className="flex items-center gap-3 text-[11px] text-[#9ca3af] mb-1">
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

        {showProminentOpen && (
          <div className="mt-3" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#2f5fc4] bg-[#f5f7ff] px-3 py-3.5 text-sm font-black text-[#2f5fc4] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] hover:bg-[#eaf1ff] active:scale-[0.99] transition-transform"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
              }}
            >
              <ExternalLink className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Open full post (new tab)
            </button>
            <p className="mt-1.5 text-center text-[10px] font-semibold text-[#6b7280] leading-snug">
              Or tap anywhere on the preview above
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={[
        'bg-white rounded-[28px] shadow-[0_10px_25px_rgba(47,95,196,0.08)] border border-[#e5e7eb]',
        'transition-shadow duration-300 ease-out motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
        'hover:shadow-[0_14px_32px_rgba(47,95,196,0.12)]',
        staggerIndex != null ? 'nommi-card-enter' : '',
      ].filter(Boolean).join(' ')}
      style={staggerIndex != null ? { animationDelay: `${Math.min(staggerIndex, 12) * 45}ms` } : undefined}
    >
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
        <div className="px-3 sm:px-4 pb-3 pt-2.5 border-t border-[#e5e7eb] rounded-b-[28px] bg-linear-to-b from-white to-[#faf9f5]/95">
          <div className="flex items-stretch gap-2 flex-wrap sm:flex-nowrap">
            {onLike && (
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLike();
                }}
                className={[
                  'text-xs font-black rounded-full px-3 py-2 border transition-colors shrink-0 min-h-[40px]',
                  liked
                    ? 'border-rose-400 bg-linear-to-br from-rose-50 to-pink-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-2 ring-rose-200/80'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:bg-[#fef2f4] hover:border-rose-200 hover:text-rose-600',
                ].join(' ')}
                aria-pressed={liked}
              >
                <span className="inline-flex items-center gap-1">
                  <Heart className={['w-3 h-3', liked ? 'fill-rose-500 text-rose-600' : ''].join(' ')} aria-hidden />
                  {liked ? 'Liked' : 'Like'}
                </span>
              </button>
            )}
            {onToggleSaved && (
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSaved();
                }}
                className={[
                  'text-xs font-black rounded-full px-3 py-2 border transition-colors shrink-0 min-h-[40px]',
                  saved
                    ? 'border-amber-500 bg-linear-to-br from-amber-50 to-yellow-50 text-amber-900 ring-2 ring-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:bg-amber-50/80 hover:border-amber-200',
                ].join(' ')}
                aria-pressed={saved}
              >
                <span className="inline-flex items-center gap-1">
                  <Bookmark className={['w-3 h-3', saved ? 'fill-amber-600 text-amber-700' : ''].join(' ')} aria-hidden />
                  {saved ? 'Saved' : 'Save'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                void sharePostExternal(post);
              }}
              className="text-xs font-black text-[#0f766e] rounded-full px-3 py-2 border border-transparent bg-teal-50 hover:bg-teal-100 hover:border-teal-200 shrink-0 min-h-[40px]"
              aria-label="Share to other apps"
              title="Share via Messages, email, etc."
            >
              <span className="inline-flex items-center gap-1">
                <Share className="w-3 h-3" aria-hidden />
                Apps
              </span>
            </button>
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onShareToCircle();
              }}
              className="text-xs font-black text-[#2f5fc4] underline-offset-2 hover:underline rounded-full px-3 py-2 border border-[#e5e7eb]/80 bg-white/90 hover:bg-white shrink-0 min-h-[40px]"
            >
              Circle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
