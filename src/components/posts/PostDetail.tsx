import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart, CheckCircle, MapPin, Clock, Trash2, Edit3,
  Send, ChevronLeft, AlertTriangle, Share2, Share, Bookmark, Flag, Star,
  ExternalLink, Globe, MessageCircle,
} from 'lucide-react';
import type { Post, Comment, IntentType, ReactionType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { reactToPost, deletePost, getPostById } from '../../services/postService';
import { getCommentsForPost, addComment, deleteComment } from '../../services/commentService';
import {
  timeAgo, timeRemaining, isExpired, formatDate, isPostOwner, encodeReturnQuery,
} from '../../utils/helpers';
import { ANONYMOUS_HANDLE, getPostAuthorDisplay } from '../../utils/postAuthorPresentation';
import { Avatar } from '../ui/Avatar';
import { Tag, PostTypeBadge } from '../ui/Tag';
import { PageLoader } from '../ui/LoadingSpinner';
import { ShareToCircleModal } from '../community/ShareToCircleModal';
import { getPostIntentsForUser, togglePostIntent } from '../../services/interactionService';
import { sharePostExternal } from '../../utils/sharePost';
import { PostAuthorAvatar } from './PostAuthorAvatar';
import { supabase } from '../../lib/supabase';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
  onPostDeleted?: () => void;
  /** Notify parent after share-to-circle succeeds (circle detail / community refreshes). */
  onActivityMayChange?: () => void;
  onPostChange?: (post: Post) => void;
}

export function PostDetail({
  post: initialPost,
  onClose,
  onPostDeleted,
  onActivityMayChange,
  onPostChange,
}: PostDetailProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [activeIntents, setActiveIntents] = useState<Set<IntentType>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const isOwner = isPostOwner(user?.id, profile?.id, post.author_id, post.author?.id);
  const authorDisplay = getPostAuthorDisplay(post);
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;
  const isVideo = !!post.image_url && (/\.(mp4|webm|ogg)(\?.*)?$/i.test(post.image_url) || post.image_url.includes('youtube.com') || post.image_url.includes('youtu.be'));

  const loadComments = useCallback(async () => {
    try {
      const c = await getCommentsForPost(post.id);
      setComments(c);
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => setPost(initialPost), [initialPost]);

  useEffect(() => {
    if (!user?.id) {
      setActiveIntents(new Set());
      return;
    }
    let cancelled = false;
    void getPostIntentsForUser(user.id).then(rows => {
      if (cancelled) return;
      const forPost = rows.filter(r => r.post_id === initialPost.id).map(r => r.intent_type);
      setActiveIntents(new Set(forPost));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, initialPost.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`post-detail-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `id=eq.${post.id}` }, () => {
        void getPostById(post.id, user?.id).then((fresh) => {
          if (!fresh) {
            onPostDeleted?.();
            return;
          }
          setPost(p => ({ ...p, ...fresh }));
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => {
        void loadComments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `post_id=eq.${post.id}` }, () => {
        void getPostById(post.id, user?.id).then((fresh) => {
          if (fresh) setPost(p => ({ ...p, ...fresh }));
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadComments, onPostDeleted, post.id, user?.id]);

  async function handleReact(type: 'like' | 'still_there') {
    if (!user) return;
    const previous = { ...post };
    const vr = post.viewer_reactions ?? [];
    const had = vr.includes(type);
    const nextVr: ReactionType[] = had ? vr.filter((t) => t !== type) : [...vr, type];
    const likeAdj = type === 'like' ? (had ? -1 : 1) : 0;
    const stillAdj = type === 'still_there' ? (had ? -1 : 1) : 0;
    setPost((p) => ({
      ...p,
      viewer_reactions: nextVr,
      like_count: Math.max(0, (p.like_count ?? 0) + likeAdj),
      still_there_count: Math.max(0, (p.still_there_count ?? 0) + stillAdj),
    }));
    setReacting(true);
    try {
      const result = await reactToPost(post.id, user.id, type);
      setPost((p) => {
        const next = { ...p, ...result };
        onPostChange?.(next);
        return next;
      });
    } catch {
      setPost(previous);
      setError('Failed to react. Please try again.');
    } finally {
      setReacting(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newComment = await addComment(post.id, commentText, user.id);
      setComments(prev => [...prev, newComment]);
      setPost((p) => {
        const next = { ...p, comment_count: (p.comment_count ?? 0) + 1 };
        onPostChange?.(next);
        return next;
      });
      setCommentText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!user) return;
    try {
      await deleteComment(commentId, user.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost((p) => {
        const next = { ...p, comment_count: Math.max(0, (p.comment_count ?? 0) - 1) };
        onPostChange?.(next);
        return next;
      });
    } catch {
      setError('Failed to delete comment');
    }
  }

  async function handleIntent(intent: IntentType) {
    if (!user) return;
    const before = new Set(activeIntents);
    setError(null);
    try {
      const nowOn = await togglePostIntent(user.id, post.id, intent);
      setActiveIntents(prev => {
        const next = new Set(prev);
        if (nowOn) next.add(intent);
        else next.delete(intent);
        return next;
      });
    } catch {
      setActiveIntents(before);
      setError('Could not save your preference right now');
    }
  }

  async function handleShareExternal() {
    setShareToast(null);
    const r = await sharePostExternal(post);
    if (r === 'copied') {
      setShareToast('Copied to clipboard');
      window.setTimeout(() => setShareToast(null), 2200);
      return;
    }
    if (r === 'shared') {
      setShareToast('Shared');
      window.setTimeout(() => setShareToast(null), 1800);
    }
  }

  async function handleDeletePost() {
    if (!user || !isOwner) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deletePost(post.id, user.id);
      onPostDeleted?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-[#faf9f5]">
      {/* Header — two rows so actions are never clipped on narrow screens */}
      <div className="shrink-0 bg-white border-b border-[#e5e7eb] z-10 shadow-[0_4px_20px_rgba(47,95,196,0.06)]">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280] shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <PostTypeBadge type={post.type} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 pb-3 pt-0.5">
          <button
            type="button"
            onClick={() => void handleShareExternal()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#0f766e] hover:bg-teal-50 shrink-0"
            aria-label="Share to other apps"
            title="Messages, Mail, Snapchat…"
          >
            <Share className="w-3.5 h-3.5" />
            Apps
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#2f5fc4] hover:bg-[#f5f7ff] shrink-0"
              aria-label="Share to circle"
              title="Share to circle"
            >
              <Share2 className="w-3.5 h-3.5" />
              Circle
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 shrink-0 disabled:opacity-50"
              aria-label="Delete post"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {shareToast && (
        <div className="px-4 pb-2 -mt-1">
          <p className="text-center text-xs font-black text-teal-900 bg-teal-50 py-2 rounded-xl border border-teal-100">
            {shareToast}
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
        {/* Image */}
        {post.image_url && (
          isVideo ? (
            <video
              src={post.image_url}
              controls
              className="w-full object-cover"
              style={{ maxHeight: '320px' }}
            />
          ) : (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full object-cover"
              style={{ maxHeight: '320px' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )
        )}

        <div className="px-4 py-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
          {post.circle_share && (
            <div className="mb-3 px-3 py-2 rounded-2xl border border-[#e5e7eb] bg-[#f5f7ff] text-xs text-[#6b7280] leading-relaxed">
              <span className="font-black text-[#2f5fc4]">{post.circle_share.circle_name}</span>
              {' · '}
              <span className="font-semibold text-[#1a1a1a]">
                Original by{' '}
                {authorDisplay.showProfileLink && authorDisplay.profileUserId ? (
                  <Link
                    to={`/app/profile/${authorDisplay.profileUserId}`}
                    className="text-[#2f5fc4] hover:underline"
                  >
                    {authorDisplay.handleLine}
                  </Link>
                ) : (
                  authorDisplay.handleLine
                )}
              </span>
              {' · '}
              <span>
                Shared by{' '}
                <span className="font-semibold text-[#2f5fc4]">@{post.circle_share.shared_by?.username ?? '…'}</span>
              </span>
              {post.circle_share.note && (
                <p className="mt-2 text-[#374151] font-medium italic">&quot;{post.circle_share.note}&quot;</p>
              )}
            </div>
          )}
          {/* Title + edit (inline, next to the post content) */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-3">
            <h1 className="text-xl font-semibold text-[#1a1a1a] min-w-0 flex-1 leading-snug">{post.title}</h1>
            {isOwner && (
              <Link
                to={`/app/post/${post.id}/edit?${encodeReturnQuery(`${location.pathname}${location.search}`)}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch sm:self-start rounded-xl bg-[#2f5fc4] px-5 py-3 text-sm font-black text-white shadow-[0_10px_28px_rgba(47,95,196,0.35)] hover:bg-[#2856b0] motion-safe:active:scale-[0.98]"
              >
                <Edit3 className="w-5 h-5" strokeWidth={2.25} aria-hidden />
                Edit post
              </Link>
            )}
          </div>

          {/* Author row */}
          <div className="mb-3 flex items-center gap-2">
            {!authorDisplay.showProfileLink ? (
              <>
                <PostAuthorAvatar post={post} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">{authorDisplay.handleLine}</p>
                  {isOwner && post.is_anonymous ? (
                    <p className="text-[11px] font-semibold text-[#9ca3af]">
                      Others only see {ANONYMOUS_HANDLE}.
                    </p>
                  ) : null}
                  <p className="text-xs text-[#6b7280]">{formatDate(post.created_at)}</p>
                </div>
              </>
            ) : post.author ? (
              <Link
                to={`/app/profile/${authorDisplay.profileUserId}`}
                className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2f5fc4]/35"
              >
                <PostAuthorAvatar post={post} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">{authorDisplay.handleLine}</p>
                  <p className="text-xs text-[#6b7280]">{formatDate(post.created_at)}</p>
                </div>
              </Link>
            ) : null}
          </div>

          {/* Location & time */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 text-sm text-[#6b7280]">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{post.location_name}</span>
            </span>
            {post.google_maps_url && (
              <a
                href={post.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#2f5fc4] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                {post.google_maps_url.includes('openstreetmap.org') ? 'OpenStreetMap' : 'Google Maps'}
              </a>
            )}
            {post.place_website_url && (
              <a
                href={post.place_website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#2f5fc4] hover:underline"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden /> Website
              </a>
            )}
            {remaining && (
              <span className="flex items-center gap-1 text-[#16a34a] font-medium">
                <Clock className="w-3.5 h-3.5" />
                {remaining}
              </span>
            )}
            {expired && post.expires_at && (
              <span className="flex items-center gap-1 text-[#9ca3af]">
                <AlertTriangle className="w-3.5 h-3.5" />
                Expired
              </span>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-sm text-[#374151] leading-relaxed mb-4">{post.description}</p>
          )}

          {/* Tags */}
          {(post.cuisine_tags.length > 0 || post.dietary_tags.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.cuisine_tags.map(t => <Tag key={t} label={t} />)}
              {post.dietary_tags.map(t => <Tag key={t} label={t} variant="matcha" />)}
            </div>
          )}

          {/* Reaction buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleReact('like')}
              disabled={reacting || !user}
              aria-pressed={!!post.viewer_reactions?.includes('like')}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2',
                post.viewer_reactions?.includes('like')
                  ? 'border-rose-400 bg-linear-to-br from-rose-50 to-pink-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-2 ring-rose-200/90'
                  : 'border-transparent bg-[#f3f4f6] text-[#6b7280] hover:border-rose-200 hover:bg-[#fff1f2] hover:text-rose-600',
              ].join(' ')}
            >
              <Heart className={['w-4 h-4', post.viewer_reactions?.includes('like') ? 'fill-rose-500 text-rose-600' : ''].join(' ')} />
              <span>{post.like_count ?? 0}</span>
            </button>

            {post.is_free_food && (
              <button
                onClick={() => handleReact('still_there')}
                disabled={reacting || !user}
                aria-pressed={!!post.viewer_reactions?.includes('still_there')}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2',
                  post.viewer_reactions?.includes('still_there')
                    ? 'border-emerald-500 bg-linear-to-br from-emerald-50 to-green-50 text-emerald-800 ring-2 ring-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
                    : 'border-transparent bg-[#f3f4f6] text-[#6b7280] hover:border-emerald-200 hover:bg-[#f0fdf4] hover:text-emerald-700',
                ].join(' ')}
              >
                <CheckCircle className={['w-4 h-4', post.viewer_reactions?.includes('still_there') ? 'fill-emerald-600 text-emerald-700' : ''].join(' ')} />
                Still there · {post.still_there_count ?? 0}
              </button>
            )}
          </div>
          {user && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => void handleIntent('saved')}
                aria-pressed={activeIntents.has('saved')}
                className={[
                  'px-3 py-1.5 rounded-full border-2 text-xs font-black transition-colors',
                  activeIntents.has('saved')
                    ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-200/90 shadow-sm'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:border-amber-200 hover:bg-amber-50/50',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1"><Bookmark className={['w-3 h-3', activeIntents.has('saved') ? 'fill-amber-700 text-amber-800' : ''].join(' ')} />Save</span>
              </button>
              <button
                type="button"
                onClick={() => void handleIntent('been_there')}
                aria-pressed={activeIntents.has('been_there')}
                className={[
                  'px-3 py-1.5 rounded-full border-2 text-xs font-black transition-colors',
                  activeIntents.has('been_there')
                    ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-200/90 shadow-sm'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:border-teal-200 hover:bg-teal-50/60',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1"><CheckCircle className={['w-3 h-3', activeIntents.has('been_there') ? 'fill-teal-600 text-teal-800' : ''].join(' ')} />Been there</span>
              </button>
              <button
                type="button"
                onClick={() => void handleIntent('want_to_go')}
                aria-pressed={activeIntents.has('want_to_go')}
                className={[
                  'px-3 py-1.5 rounded-full border-2 text-xs font-black transition-colors',
                  activeIntents.has('want_to_go')
                    ? 'border-violet-500 bg-violet-50 text-violet-950 ring-2 ring-violet-200/90 shadow-sm'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:border-violet-200 hover:bg-violet-50/60',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1"><Flag className={['w-3 h-3', activeIntents.has('want_to_go') ? 'fill-violet-600 text-violet-800' : ''].join(' ')} />Want to go</span>
              </button>
              <button
                type="button"
                onClick={() => void handleIntent('favorite')}
                aria-pressed={activeIntents.has('favorite')}
                className={[
                  'px-3 py-1.5 rounded-full border-2 text-xs font-black transition-colors',
                  activeIntents.has('favorite')
                    ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 ring-2 ring-fuchsia-200/90 shadow-sm'
                    : 'border-[#e5e7eb] bg-white text-[#2f5fc4] hover:border-fuchsia-200 hover:bg-fuchsia-50/60',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1"><Star className={['w-3 h-3', activeIntents.has('favorite') ? 'fill-fuchsia-600 text-fuchsia-800' : ''].join(' ')} />Favorite</span>
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Comments */}
          <div className="mt-2 rounded-[22px] border border-[#e8ecf4] bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1a1a1a] mb-3">
              <MessageCircle className="w-4 h-4 text-[#2f5fc4]" aria-hidden />
              Comments
              <span className="ml-auto tabular-nums text-xs font-bold text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded-full">
                {post.comment_count ?? 0}
              </span>
            </h3>

            {commentsLoading ? (
              <PageLoader compact />
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-5 text-center rounded-xl bg-[#faf9f5] border border-dashed border-[#e5e7eb]">
                No comments yet — say something nice about this spot.
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.author && (
                      <Avatar
                        username={comment.author.username}
                        avatarUrl={comment.author.avatar_url}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl border border-[#eef2f6] bg-linear-to-b from-[#fafbff] to-white px-3.5 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-black text-[#2f5fc4] truncate">
                            @{comment.author?.username ?? 'unknown'}
                          </span>
                          {user?.id === comment.author_id && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment.id)}
                              className="text-[#d1d5db] hover:text-red-500 p-1 rounded-lg hover:bg-red-50 shrink-0"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-[#374151] leading-relaxed">{comment.content}</p>
                      </div>
                      <p className="text-[10px] text-[#9ca3af] mt-1.5 px-1 font-medium">{timeAgo(comment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            {user ? (
              <form onSubmit={handleComment} className="flex gap-2 mt-2 pt-3 border-t border-[#f0f4ff]">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={280}
                  className="flex-1 min-w-0 px-4 py-3 bg-[#f8fafc] rounded-2xl text-sm text-[#1a1a1a] placeholder-[#94a3b8] outline-none border border-[#e5e7eb] focus:border-[#2f5fc4]/40 focus:ring-2 focus:ring-[#2f5fc4]/15"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="shrink-0 px-4 py-3 rounded-2xl bg-[#f43f5e] text-white font-bold text-sm disabled:opacity-40 shadow-[0_8px_20px_rgba(244,63,94,0.25)]"
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#6b7280] text-center py-3 rounded-xl bg-[#faf9f5]">Sign in to comment</p>
            )}
          </div>
        </div>
      </div>

      {user && (
        <ShareToCircleModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          post={post}
          userId={user.id}
          onShared={() => {
            setShareOpen(false);
            onActivityMayChange?.();
          }}
        />
      )}
    </div>
  );
}
