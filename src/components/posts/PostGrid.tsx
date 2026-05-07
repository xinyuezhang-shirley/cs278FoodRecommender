import React from 'react';
import type { Post } from '../../types';
import { PostCard } from './PostCard';
import { SkeletonCard } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface PostGridProps {
  posts: Post[];
  loading?: boolean;
  onPostClick: (post: Post) => void;
  onSharePost?: (post: Post) => void;
  onLikePost?: (post: Post) => void;
  onToggleSavedPost?: (post: Post) => void;
  savedPostIds?: Set<string>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  /** Nommi empty-state illustration */
  emptyImageSrc?: string;
  emptyImageAlt?: string;
  emptyImageClassName?: string;
  emptyAction?: React.ReactNode;
  /** Override grid container classes (e.g. `grid gap-3 mt-0` for nested sections). */
  gridClassName?: string;
  /** Extra “Open full post (new tab)” control on Saved/Liked-type grids). */
  showProminentOpen?: boolean;
}

export function PostGrid({
  posts,
  loading = false,
  onPostClick,
  onSharePost,
  onLikePost,
  onToggleSavedPost,
  savedPostIds,
  emptyTitle = 'No posts yet',
  emptyDescription,
  emptyIcon,
  emptyImageSrc,
  emptyImageAlt,
  emptyImageClassName,
  emptyAction,
  gridClassName,
  showProminentOpen,
}: PostGridProps) {
  const gridCn = gridClassName ?? 'grid gap-4 mt-3';

  if (loading) {
    return (
      <div className={gridCn}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? '🍜'}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        imageSrc={emptyImageSrc}
        imageAlt={emptyImageAlt}
        imageClassName={emptyImageClassName}
      />
    );
  }

  return (
    <div className={gridCn}>
      {posts.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          staggerIndex={i}
          showProminentOpen={showProminentOpen}
          onClick={() => onPostClick(post)}
          onShareToCircle={onSharePost ? () => onSharePost(post) : undefined}
          onLike={onLikePost ? () => onLikePost(post) : undefined}
          onToggleSaved={onToggleSavedPost ? () => onToggleSavedPost(post) : undefined}
          saved={savedPostIds?.has(post.id)}
        />
      ))}
    </div>
  );
}
