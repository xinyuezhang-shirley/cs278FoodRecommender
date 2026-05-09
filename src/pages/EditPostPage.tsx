import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import type { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPostById } from '../services/postService';
import { CreatePostForm } from '../components/posts/CreatePostForm';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { isPostOwner, resolveAppReturnTarget } from '../utils/helpers';

export function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const goBack = useCallback(() => {
    const fallback = `/app/post/${postId ?? ''}`;
    const target = resolveAppReturnTarget(location.state, searchParams, fallback);
    navigate(target, { replace: true });
  }, [navigate, location.state, searchParams, postId]);

  useEffect(() => {
    if (!postId || !user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getPostById(postId, user.id)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  if (!postId || !user) {
    return <Navigate to="/app/feed" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (!post) {
    return <Navigate to="/app/feed" replace />;
  }

  if (!isPostOwner(user.id, profile?.id, post.author_id, post.author?.id)) {
    return <Navigate to={`/app/post/${postId}`} replace />;
  }

  return (
    <div className="flex w-full flex-col bg-white">
      <CreatePostForm
        editPost={post}
        onCancel={goBack}
        onSuccess={() => {
          const ret = searchParams.get('return');
          const qs = ret ? `?return=${encodeURIComponent(ret)}` : '';
          navigate(`/app/post/${post.id}${qs}`, { replace: true });
        }}
        onPostUpdated={setPost}
        onPostDeleted={goBack}
      />
    </div>
  );
}
