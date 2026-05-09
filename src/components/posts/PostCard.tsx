import type { MouseEvent, ReactNode } from 'react';
import { Heart, MessageCircle, Clock, MapPin, CheckCircle, Bookmark, Share, Edit3, Users } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import type { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { sharePostExternal } from '../../utils/sharePost';
import { timeAgo, timeRemaining, isExpired, isPostOwner, encodeReturnQuery } from '../../utils/helpers';
import { PostTypeBadge } from '../ui/Tag';

const PLACEHOLDER_COLORS = [
  '#eaf1ff', '#fff3dc', '#f0f4ff', '#fefce8', '#fdeef3',
];

/** Fixed media band height so feed cards align regardless of image aspect ratio. */
const POST_CARD_MEDIA_HEIGHT_PX = 220;

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
}

/** Minimal IG/Twitter-style action control */
function SlimAction(props: {
  label: string;
  active?: boolean;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
  accent?: 'neutral' | 'rose' | 'blue';
}) {
  const { label, active, onClick, children, accent = 'neutral' } = props;
  const tone =
    accent === 'rose' && active
      ? 'text-rose-600'
      : accent === 'blue' && active
        ? 'text-[#2f5fc4]'
        : 'text-[#64748b]';
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={accent !== 'neutral' ? active : undefined}
      title={label}
      onClick={onClick}
      className={[
        'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5',
        'text-[11px] font-semibold transition-colors hover:bg-black/[0.035] motion-safe:active:scale-[0.98]',
        tone,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function PostCard({
  post,
  onClick,
  onShareToCircle,
  onLike,
  onToggleSaved,
  saved,
  staggerIndex,
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

  const showActionRow = !!(onLike || onToggleSaved || onShareToCircle || onClick);

  const main = (
    <>
      <div
        className="w-full overflow-hidden rounded-t-[26px] relative shrink-0"
        style={{
          height: POST_CARD_MEDIA_HEIGHT_PX,
          backgroundColor: getPlaceholderColor(post.id),
        }}
      >
        {post.image_url ? (
          isVideoUrl(post.image_url) ? (
            <video
              src={post.image_url}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
            />
          ) : (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="lazy"
              style={{ display: 'block' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-70">
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

        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[13px] font-bold text-[#1a1a1a] line-clamp-2 leading-snug flex-1 min-w-0 pr-1">
            {post.title}
          </p>
          {isOwner && (
            <Link
              to={editHref}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0_2px_8px_rgba(47,95,196,0.06)] hover:border-[#2f5fc4]/35 hover:text-[#2f5fc4] motion-safe:active:scale-[0.97] transition-colors"
              onClick={e => e.stopPropagation()}
              aria-label="Edit post"
              title="Edit post"
            >
              <Edit3 className="w-4 h-4" strokeWidth={2} aria-hidden />
            </Link>
          )}
        </div>

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

      {showActionRow && (
        <div
          className="border-t border-[#eef0f5] rounded-b-[28px] bg-linear-to-b from-white to-[#fafbff]/95 px-1 pb-1"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-[#9ca3af] tabular-nums">
            <span>{timeAgo(post.created_at)}</span>
            {post.is_free_food ? (
              <span className="inline-flex items-center gap-1 text-[#6f90d8]">
                <CheckCircle className="w-3 h-3" aria-hidden />
                {post.still_there_count ?? 0} still here
              </span>
            ) : (
              <span />
            )}
          </div>
          <div className="flex items-stretch gap-0">
            {onLike ? (
              <SlimAction
                label={liked ? 'Unlike' : 'Like'}
                active={liked}
                accent="rose"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLike();
                }}
              >
                <Heart
                  className={[
                    'w-[22px] h-[22px]',
                    liked ? 'fill-rose-500 text-rose-500' : '',
                  ].join(' ')}
                  strokeWidth={liked ? 0 : 2}
                  aria-hidden
                />
                <span>{post.like_count ?? 0}</span>
              </SlimAction>
            ) : null}
            <SlimAction
              label="Open post & comments"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
              }}
            >
              <MessageCircle className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden />
              <span>{post.comment_count ?? 0}</span>
            </SlimAction>
            {onToggleSaved ? (
              <SlimAction
                label={saved ? 'Remove from saved' : 'Save'}
                active={saved}
                accent="blue"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSaved();
                }}
              >
                <Bookmark
                  className={[
                    'w-[22px] h-[22px]',
                    saved ? 'fill-[#2f5fc4] text-[#2f5fc4]' : '',
                  ].join(' ')}
                  strokeWidth={saved ? 0 : 2}
                  aria-hidden
                />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </SlimAction>
            ) : null}
            <SlimAction
              label="Share via other apps"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                void sharePostExternal(post);
              }}
            >
              <Share className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden />
              <span>Share</span>
            </SlimAction>
            {onShareToCircle ? (
              <SlimAction
                label="Share to circle"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShareToCircle();
                }}
              >
                <Users className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden />
                <span>Circle</span>
              </SlimAction>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
