import type { Post } from '../../types';
import { PostCard } from './PostCard';
import { SkeletonCard } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface PostGridProps {
  posts: Post[];
  loading?: boolean;
  onPostClick: (post: Post) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

import React from 'react';

export function PostGrid({
  posts,
  loading = false,
  onPostClick,
  emptyTitle = 'No posts yet',
  emptyDescription,
  emptyAction,
}: PostGridProps) {
  if (loading) {
    return (
      <div className="masonry-grid mt-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="masonry-item">
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="🍜"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="masonry-grid mt-3">
      {posts.map(post => (
        <div key={post.id} className="masonry-item">
          <PostCard post={post} onClick={() => onPostClick(post)} />
        </div>
      ))}
    </div>
  );
}
