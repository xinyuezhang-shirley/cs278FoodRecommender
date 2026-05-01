import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart, CheckCircle, MapPin, Clock, Trash2, Edit3,
  Send, ChevronLeft, AlertTriangle, Share2,
} from 'lucide-react';
import type { Post, Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { reactToPost, deletePost } from '../../services/postService';
import { getCommentsForPost, addComment, deleteComment } from '../../services/commentService';
import { timeAgo, timeRemaining, isExpired, formatDate } from '../../utils/helpers';
import { Avatar } from '../ui/Avatar';
import { Tag, PostTypeBadge } from '../ui/Tag';
import { PageLoader } from '../ui/LoadingSpinner';
import { ShareToCircleModal } from '../community/ShareToCircleModal';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
  onPostDeleted?: () => void;
  onEditClick?: () => void;
  /** Notify parent after share-to-circle succeeds (circle detail / community refreshes). */
  onActivityMayChange?: () => void;
}

export function PostDetail({
  post: initialPost,
  onClose,
  onPostDeleted,
  onEditClick,
  onActivityMayChange,
}: PostDetailProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = user?.id === post.author_id;
  const expired = isExpired(post.expires_at);
  const remaining = post.expires_at && !expired ? timeRemaining(post.expires_at) : null;

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

  async function handleReact(type: 'like' | 'still_there') {
    if (!user) return;
    setReacting(true);
    try {
      const result = await reactToPost(post.id, user.id, type);
      setPost(p => ({ ...p, ...result }));
    } catch {
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
      setPost(p => ({ ...p, comment_count: (p.comment_count ?? 0) + 1 }));
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
      setPost(p => ({ ...p, comment_count: Math.max(0, (p.comment_count ?? 0) - 1) }));
    } catch {
      setError('Failed to delete comment');
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
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 sticky top-0 bg-white border-b border-[#e5e7eb] z-10">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280]"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <PostTypeBadge type={post.type} />
          </div>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="p-1.5 rounded-full hover:bg-[#f5f7ff] text-[#6b7280] hover:text-[#2f5fc4] border border-transparent hover:border-[#e5e7eb]"
            aria-label="Share to circle"
            title="Share to circle"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        {isOwner && (
          <div className="flex items-center gap-1">
            {onEditClick && (
              <button
                onClick={onEditClick}
                className="p-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280]"
                aria-label="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDeletePost}
              disabled={deleting}
              className="p-1.5 rounded-full hover:bg-red-50 text-[#9ca3af] hover:text-red-500"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full object-cover"
            style={{ maxHeight: '320px' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="px-4 py-4">
          {post.circle_share && (
            <div className="mb-3 px-3 py-2 rounded-2xl border border-[#e5e7eb] bg-[#f5f7ff] text-xs text-[#6b7280] leading-relaxed">
              <span className="font-black text-[#2f5fc4]">{post.circle_share.circle_name}</span>
              {' · '}
              <span className="font-semibold text-[#1a1a1a]">Original by @{post.author?.username ?? '…'}</span>
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
          {/* Title */}
          <h1 className="text-xl font-semibold text-[#1a1a1a] mb-3">{post.title}</h1>

          {/* Author row */}
          <div className="flex items-center gap-2 mb-3">
            {post.author && (
              <>
                <Avatar
                  username={post.author.username}
                  avatarUrl={post.author.avatar_url}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">@{post.author.username}</p>
                  <p className="text-xs text-[#6b7280]">{formatDate(post.created_at)}</p>
                </div>
              </>
            )}
          </div>

          {/* Location & time */}
          <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-[#6b7280]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {post.location_name}
            </span>
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
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleReact('like')}
              disabled={reacting || !user}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                post.user_reaction === 'like'
                  ? 'bg-[#fff1f2] text-[#f43f5e]'
                  : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#fce7f3] hover:text-[#f43f5e]',
              ].join(' ')}
            >
              <Heart className={['w-4 h-4', post.user_reaction === 'like' ? 'fill-current' : ''].join(' ')} />
              <span>{post.like_count ?? 0}</span>
            </button>

            {post.is_free_food && (
              <button
                onClick={() => handleReact('still_there')}
                disabled={reacting || !user}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  post.user_reaction === 'still_there'
                    ? 'bg-[#f0fdf4] text-[#16a34a]'
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#f0fdf4] hover:text-[#16a34a]',
                ].join(' ')}
              >
                <CheckCircle className="w-4 h-4" />
                Still there · {post.still_there_count ?? 0}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-3">
              Comments ({post.comment_count ?? 0})
            </h3>

            {commentsLoading ? (
              <PageLoader compact />
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-4">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2.5">
                    {comment.author && (
                      <Avatar
                        username={comment.author.username}
                        avatarUrl={comment.author.avatar_url}
                        size="xs"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#f9fafb] rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-[#1a1a1a]">
                            @{comment.author?.username ?? 'unknown'}
                          </span>
                          {user?.id === comment.author_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-[#d1d5db] hover:text-red-400 ml-2"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-[#374151]">{comment.content}</p>
                      </div>
                      <p className="text-[10px] text-[#9ca3af] mt-1 px-1">{timeAgo(comment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            {user ? (
              <form onSubmit={handleComment} className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  maxLength={280}
                  className="flex-1 px-3 py-2 bg-[#f3f4f6] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#f43f5e]/30"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="p-2 rounded-xl bg-[#f43f5e] text-white disabled:opacity-40"
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#6b7280] text-center py-2">Sign in to comment</p>
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
