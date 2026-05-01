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
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  /** Nommi empty-state illustration */
  emptyImageSrc?: string;
  emptyImageAlt?: string;
  emptyImageClassName?: string;
  emptyAction?: React.ReactNode;
}

export function PostGrid({
  posts,
  loading = false,
  onPostClick,
  onSharePost,
  emptyTitle = 'No posts yet',
  emptyDescription,
  emptyIcon,
  emptyImageSrc,
  emptyImageAlt,
  emptyImageClassName,
  emptyAction,
}: PostGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 mt-3">
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
    <div className="grid gap-4 mt-3">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onClick={() => onPostClick(post)}
          onShareToCircle={onSharePost ? () => onSharePost(post) : undefined}
        />
      ))}
    </div>
  );
}
