import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPostById } from '../services/postService';
import { PostDetail } from '../components/posts/PostDetail';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { resolveAppReturnTarget } from '../utils/helpers';

export function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const goBackSafe = useCallback(() => {
    const target = resolveAppReturnTarget(
      location.state,
      searchParams,
      '/app/collections/saved',
    );
    navigate(target, { replace: true });
  }, [navigate, location.state, searchParams]);

  useEffect(() => {
    if (!postId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    void getPostById(postId, user?.id)
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setPost(null);
          setNotFound(true);
        } else {
          setPost(p);
          setNotFound(false);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 bg-[#faf9f5] gap-4 text-center">
        <p className="text-sm font-bold text-[#1a1a1a]">This post isn’t available.</p>
        <button
          type="button"
          onClick={goBackSafe}
          className="rounded-full px-5 py-2.5 text-sm font-black text-white bg-[#2f5fc4] shadow-[0_10px_24px_rgba(47,95,196,0.22)]"
        >
          Back to lists
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-full bg-[#faf9f5] pb-24">
      <PostDetail
        post={post}
        onClose={goBackSafe}
        onPostChange={setPost}
        onPostDeleted={goBackSafe}
      />
    </div>
  );
}
