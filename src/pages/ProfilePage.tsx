import { useState, useEffect } from 'react';
import { LogOut, Grid2x2 } from 'lucide-react';
import type { FoodCircle, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPostsByAuthor } from '../services/postService';
import { getUserFreeFoodCount, getUserCircleCount, getAllCircles, joinCircle } from '../services/circleService';
import { PostGrid } from '../components/posts/PostGrid';
import { Avatar } from '../components/ui/Avatar';
import { ProfileIdentityTab } from '../components/profile/ProfileIdentityTab';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import emptyNoPostsYetSimple from '../assets/nommi/empty_no_posts_yet_simple.png';

export function ProfilePage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [freeFoodCount, setFreeFoodCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<'posts' | 'identity'>('posts');
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getPostsByAuthor(user.id, user.id),
      getUserFreeFoodCount(user.id),
      getUserCircleCount(user.id),
      getAllCircles(user.id),
    ]).then(([p, ff, cc, allCircles]) => {
      setPosts(p);
      setFreeFoodCount(ff);
      setCircleCount(cc);
      setCircles(allCircles);
      setLoadingPosts(false);
    });
  }, [user]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleJoinCircle(circleId: string) {
    if (!user) return;
    setJoiningCircleId(circleId);
    try {
      await joinCircle(circleId, user.id);
    } catch {
      // e.g. duplicate join — refresh lists
    } finally {
      try {
        const [fresh, cc] = await Promise.all([getAllCircles(user.id), getUserCircleCount(user.id)]);
        setCircles(fresh);
        setCircleCount(cc);
      } finally {
        setJoiningCircleId(null);
      }
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }
  if (!profile || !user) return null;

  const STATS = [
    { label: 'Posts', value: posts.length },
    { label: 'Free Food', value: freeFoodCount },
    { label: 'Circles', value: circleCount },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#faf9f5] px-4 pb-24">
      <div className="flex items-center justify-between pt-4 pb-3">
        <h1 className="text-3xl font-black text-[#2f5fc4] tracking-tight">Profile</h1>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#e5e7eb] text-[#2f5fc4] text-xs font-bold shadow-[0_6px_16px_rgba(47,95,196,0.1)] hover:bg-[#eaf1ff]/50 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <div className="mb-5">
        <div className="bg-white rounded-[28px] p-5 border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.10)]">
          <div className="flex items-start gap-4 mb-4">
            {profile.avatar_url ? (
              <Avatar
                username={profile.username}
                avatarUrl={profile.avatar_url}
                size="xl"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-[#eaf1ff] border-2 border-[#e5e7eb] shadow-inner flex-shrink-0"
                aria-hidden
              >
                🧋
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-black text-[#1a1a1a]">@{profile.username}</h2>
              {profile.food_personality && (
                <p className="text-sm text-[#2f5fc4] font-bold mt-0.5">{profile.food_personality}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {STATS.map(s => (
              <div
                key={s.label}
                className="flex flex-col items-center py-2.5 rounded-full bg-[#faf9f5] border border-[#e5e7eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
              >
                <span className="text-xl font-black text-[#2f5fc4]">{s.value}</span>
                <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex bg-white rounded-full p-1 gap-1 border border-[#e5e7eb] shadow-[0_6px_16px_rgba(47,95,196,0.08)]">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition-colors',
              tab === 'posts'
                ? 'bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white shadow-[0_8px_20px_rgba(47,95,196,0.25)]'
                : 'text-[#6b7280] hover:text-[#2f5fc4]',
            ].join(' ')}
          >
            <Grid2x2 className="w-3.5 h-3.5" aria-hidden />
            Posts
          </button>
          <button
            type="button"
            onClick={() => setTab('identity')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition-colors',
              tab === 'identity'
                ? 'bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white shadow-[0_8px_20px_rgba(47,95,196,0.25)]'
                : 'text-[#6b7280] hover:text-[#2f5fc4]',
            ].join(' ')}
          >
            <span aria-hidden>🧋</span>
            Identity
          </button>
        </div>
      </div>

      {tab === 'posts' ? (
        <div className="flex-1">
          <PostGrid
            posts={posts}
            loading={loadingPosts}
            onPostClick={setSelectedPost}
            emptyTitle="Nothing here yet"
            emptyDescription="Your food memories will show up here."
            emptyImageSrc={emptyNoPostsYetSimple}
            emptyImageAlt="Nommi illustration for profile with no posts yet"
            emptyImageClassName="w-36 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
          />
        </div>
      ) : (
        <ProfileIdentityTab
          posts={posts}
          freeFoodCount={freeFoodCount}
          circleCount={circleCount}
          circles={circles}
          joiningCircleId={joiningCircleId}
          onJoinCircle={handleJoinCircle}
        />
      )}

      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              setPosts(prev => prev.filter(p => p.id !== selectedPost?.id));
              setSelectedPost(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
