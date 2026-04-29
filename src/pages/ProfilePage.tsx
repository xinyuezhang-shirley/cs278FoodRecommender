import { useState, useEffect } from 'react';
import { LogOut, Grid2x2, MapPin } from 'lucide-react';
import type { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPostsByAuthor } from '../services/postService';
import { getUserFreeFoodCount, getUserCircleCount } from '../services/circleService';
import { PostGrid } from '../components/posts/PostGrid';
import { Avatar } from '../components/ui/Avatar';
import { BobaCollection } from '../components/profile/BobaCollection';
import { FoodIdentityGraph } from '../components/profile/FoodIdentityGraph';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';

export function ProfilePage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [freeFoodCount, setFreeFoodCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<'posts' | 'identity'>('posts');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getPostsByAuthor(user.id, user.id),
      getUserFreeFoodCount(user.id),
      getUserCircleCount(user.id),
    ]).then(([p, ff, cc]) => {
      setPosts(p);
      setFreeFoodCount(ff);
      setCircleCount(cc);
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

  if (authLoading) return <PageLoader />;
  if (!profile || !user) return null;

  const STATS = [
    { label: 'Posts', value: posts.length },
    { label: 'Free Food', value: freeFoodCount },
    { label: 'Circles', value: circleCount },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Profile</h1>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3f4f6] text-[#6b7280] text-xs font-medium hover:bg-[#e5e7eb] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      {/* Profile card */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-5 border border-[#f3f4f6]">
          <div className="flex items-start gap-4 mb-4">
            <Avatar
              username={profile.username}
              avatarUrl={profile.avatar_url}
              size="xl"
            />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-bold text-[#1a1a1a]">@{profile.username}</h2>
              {profile.food_personality && (
                <p className="text-sm text-[#9333ea] font-medium mt-0.5">{profile.food_personality}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center py-2 rounded-xl bg-[#fafaf9]">
                <span className="text-xl font-bold text-[#1a1a1a]">{s.value}</span>
                <span className="text-xs text-[#6b7280]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="px-4 mb-4">
        <div className="flex bg-[#f3f4f6] rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('posts')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === 'posts'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#6b7280]',
            ].join(' ')}
          >
            <Grid2x2 className="w-3.5 h-3.5" />
            Posts
          </button>
          <button
            onClick={() => setTab('identity')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === 'identity'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#6b7280]',
            ].join(' ')}
          >
            🧋
            Identity
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'posts' ? (
        <div className="flex-1">
          <PostGrid
            posts={posts}
            loading={loadingPosts}
            onPostClick={setSelectedPost}
            emptyTitle="No posts yet"
            emptyDescription="Start sharing food spots and free food you find on campus!"
          />
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-6">
          <BobaCollection
            postCount={posts.length}
            freeFoodCount={freeFoodCount}
            circleCount={circleCount}
          />
          <FoodIdentityGraph />

          {/* Favorite Places (from post locations) */}
          {posts.length > 0 && (
            <div className="bg-white rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Your spots</h3>
              <div className="space-y-2">
                {[...new Set(posts.map(p => p.location_name))].slice(0, 4).map(loc => (
                  <div key={loc} className="flex items-center gap-2 text-sm text-[#374151]">
                    <MapPin className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />
                    {loc}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post detail modal */}
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
