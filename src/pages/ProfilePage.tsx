import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LogOut, Grid2x2, ChevronLeft, ChevronRight, MessagesSquare, Images, Loader2 } from 'lucide-react';
import type { FoodCircle, Post, ReactionType, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPostsByAuthor, reactToPost } from '../services/postService';
import { getUserFreeFoodCount, getUserCircleCount, getAllCircles, joinCircle } from '../services/circleService';
import {
  fetchPublicProfileById,
  updateUserProfile,
} from '../services/authService';
import { fetchSubjectFriendProfiles } from '../services/socialService';
import { compressImageFile } from '../utils/imageCompress';
import { PostGrid } from '../components/posts/PostGrid';
import { Avatar } from '../components/ui/Avatar';
import { ProfileIdentityTab } from '../components/profile/ProfileIdentityTab';
import { ProfileRelationshipButton } from '../components/profile/ProfileRelationshipButton';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import emptyNoPostsYetSimple from '../assets/nommi/empty_no_posts_yet_simple.png';
import { getPostIntentsForUser, togglePostIntent } from '../services/interactionService';
import { ShareToCircleModal } from '../components/community/ShareToCircleModal';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

export function ProfilePage() {
  const { profileUserId } = useParams<{ profileUserId: string }>();
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();

  const targetUserId = profileUserId ?? user?.id ?? null;
  const isOwnProfile = Boolean(user && targetUserId && user.id === targetUserId);

  const [subjectProfile, setSubjectProfile] = useState<UserProfile | null>(null);
  const [subjectLoadState, setSubjectLoadState] = useState<'idle' | 'loading' | 'notfound' | 'ready'>('idle');

  const [posts, setPosts] = useState<Post[]>([]);
  const [circles, setCircles] = useState<FoodCircle[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [freeFoodCount, setFreeFoodCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<'posts' | 'identity' | 'settings'>('posts');
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    show_friends_public: false,
  });
  const [publicFriends, setPublicFriends] = useState<UserProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('nommi-theme');
    setThemeMode(stored === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSubject() {
      if (!targetUserId) {
        setSubjectProfile(null);
        setSubjectLoadState('idle');
        return;
      }
      if (isOwnProfile) {
        if (profile) {
          setSubjectProfile(profile);
          setSubjectLoadState('ready');
          return;
        }
        setSubjectLoadState('loading');
        setSubjectProfile(null);
        return;
      }
      setSubjectLoadState('loading');
      const p = await fetchPublicProfileById(targetUserId);
      if (cancelled) return;
      if (!p) {
        setSubjectProfile(null);
        setSubjectLoadState('notfound');
        return;
      }
      setSubjectProfile(p);
      setSubjectLoadState('ready');
    }
    void loadSubject();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, isOwnProfile, profile]);

  useEffect(() => {
    if (!targetUserId) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }
    let cancelled = false;
    setLoadingPosts(true);
    (async () => {
      const viewerId = user?.id;
      const [p, ff, cc] = await Promise.all([
        getPostsByAuthor(targetUserId, viewerId),
        getUserFreeFoodCount(targetUserId),
        getUserCircleCount(targetUserId),
      ]);
      if (cancelled) return;
      setPosts(p);
      setFreeFoodCount(ff);
      setCircleCount(cc);

      if (isOwnProfile && user) {
        const [allCircles, intents] = await Promise.all([
          getAllCircles(user.id),
          getPostIntentsForUser(user.id),
        ]);
        if (cancelled) return;
        setCircles(allCircles);
        setSavedPostIds(new Set(intents.filter(i => i.intent_type === 'saved').map(i => i.post_id)));
        setSettingsForm({
          username: profile?.username ?? '',
          bio: profile?.bio ?? '',
          avatar_url: profile?.avatar_url ?? '',
          show_friends_public: Boolean(profile?.show_friends_public),
        });
      } else {
        if (cancelled) return;
        setCircles([]);
        setSavedPostIds(new Set());
      }
      if (cancelled) return;
      setLoadingPosts(false);
    })().catch(() => {
      if (!cancelled) setLoadingPosts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    targetUserId,
    user?.id,
    isOwnProfile,
    profile?.username,
    profile?.bio,
    profile?.avatar_url,
    profile?.show_friends_public,
  ]);

  const realtimeProfileRefresh = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const viewerId = user?.id;
      const [p, ff, cc] = await Promise.all([
        getPostsByAuthor(targetUserId, viewerId),
        getUserFreeFoodCount(targetUserId),
        getUserCircleCount(targetUserId),
      ]);
      setPosts(p);
      setFreeFoodCount(ff);
      setCircleCount(cc);
      if (isOwnProfile && user) {
        const [allCircles, intents] = await Promise.all([
          getAllCircles(user.id),
          getPostIntentsForUser(user.id),
        ]);
        setCircles(allCircles);
        setSavedPostIds(new Set(intents.filter(i => i.intent_type === 'saved').map(i => i.post_id)));
        await refreshProfile().catch(() => undefined);
      } else {
        const sp = await fetchPublicProfileById(targetUserId);
        if (sp) setSubjectProfile(sp);
      }
    } catch {
      //
    }
  }, [targetUserId, user?.id, isOwnProfile, user, refreshProfile]);

  const profileRealtimeSpecs = useMemo(
    () =>
      targetUserId
        ? [
            { table: 'profiles', filter: `id=eq.${targetUserId}` },
            { table: 'posts', filter: `author_id=eq.${targetUserId}` },
            { table: 'reactions' },
            { table: 'comments' },
          ]
        : [],
    [targetUserId],
  );

  useDebouncedRealtime({
    channelName: `profile-view-${targetUserId ?? 'off'}-${user?.id ?? 'guest'}`,
    specs: profileRealtimeSpecs,
    enabled: Boolean(targetUserId),
    debounceMs: 520,
    onEvent: () => void realtimeProfileRefresh(),
  });

  useEffect(() => {
    let cancelled = false;
    if (!targetUserId || isOwnProfile || !user?.id || !subjectProfile?.show_friends_public) {
      setPublicFriends([]);
      setFriendsLoading(false);
      return;
    }
    setFriendsLoading(true);
    void fetchSubjectFriendProfiles(targetUserId)
      .then(rows => {
        if (!cancelled) setPublicFriends(rows);
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUserId, isOwnProfile, user?.id, subjectProfile?.show_friends_public]);

  const refreshSavedIntents = useCallback(async () => {
    if (!user?.id) return;
    const intents = await getPostIntentsForUser(user.id);
    setSavedPostIds(new Set(intents.filter(i => i.intent_type === 'saved').map(i => i.post_id)));
  }, [user?.id]);

  const mergePostIntoProfileState = useCallback((updated: Post) => {
    setSelectedPost(prev => (prev?.id === updated.id ? updated : prev));
    setPosts(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
  }, []);

  async function handleCollectionLike(post: Post) {
    if (!user?.id) return;
    const vr = post.viewer_reactions ?? [];
    const had = vr.includes('like');
    const nextVr: ReactionType[] = had ? vr.filter((t) => t !== 'like') : [...vr, 'like'];
    const bump = (list: Post[]) =>
      list.map(p =>
        p.id !== post.id
          ? p
          : {
              ...p,
              viewer_reactions: nextVr,
              like_count: Math.max(0, (p.like_count ?? 0) + (had ? -1 : 1)),
            },
      );
    setPosts(prev => bump(prev));
    if (selectedPost?.id === post.id) {
      setSelectedPost(p =>
        p
          ? {
              ...p,
              viewer_reactions: nextVr,
              like_count: Math.max(0, (p.like_count ?? 0) + (had ? -1 : 1)),
            }
          : null,
      );
    }
    try {
      const result = await reactToPost(post.id, user.id, 'like');
      const apply = (p: Post): Post =>
        p.id !== post.id
          ? p
          : {
              ...p,
              like_count: result.like_count,
              still_there_count: result.still_there_count,
              viewer_reactions: result.viewer_reactions,
            };
      setPosts(prev => prev.map(apply));
      setSelectedPost(prev => (prev ? apply(prev) : null));
    } catch {
      void refreshSavedIntents();
    }
  }

  async function handleCollectionToggleSaved(post: Post) {
    if (!user?.id) return;
    const existed = savedPostIds.has(post.id);
    setSavedPostIds(prev => {
      const next = new Set(prev);
      if (existed) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    try {
      await togglePostIntent(user.id, post.id, 'saved');
      await refreshSavedIntents();
    } catch {
      setSavedPostIds(prev => {
        const next = new Set(prev);
        if (existed) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
    }
  }

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
      //
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

  if (!targetUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#faf9f5] px-6 text-center">
        <p className="text-sm text-[#6b7280] mb-3">Sign in to open your profile.</p>
        <Link
          to="/login"
          className="rounded-full px-5 py-2.5 text-sm font-black text-white bg-[#2f5fc4] shadow-[0_10px_24px_rgba(47,95,196,0.22)]"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (isOwnProfile && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (!isOwnProfile && subjectLoadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[40vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (!isOwnProfile && subjectLoadState === 'notfound') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#faf9f5] px-6 text-center gap-4">
        <p className="text-sm font-bold text-[#1a1a1a]">Profile not found</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-black text-[#2f5fc4] underline underline-offset-2"
        >
          Go back
        </button>
      </div>
    );
  }

  const displayProfile = subjectProfile;
  if (!displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  const STATS = [
    { label: 'Posts', value: posts.length },
    { label: 'Free Food', value: freeFoodCount },
    { label: 'Circles', value: circleCount },
  ];

  return (
    <div className="relative flex w-full flex-col bg-[#faf9f5] px-4">
      <div className="flex items-center justify-between pt-4 pb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isOwnProfile && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 text-[#2f5fc4] shadow-sm"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-3xl font-black text-[#2f5fc4] tracking-tight truncate">{isOwnProfile ? 'Profile' : 'Member'}</h1>
        </div>
        {isOwnProfile && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#e5e7eb] text-[#2f5fc4] text-xs font-bold shadow-[0_6px_16px_rgba(47,95,196,0.1)] hover:bg-[#eaf1ff]/50 transition-colors disabled:opacity-50 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        )}
      </div>

      <div className="mb-5">
        <div className="bg-white rounded-[28px] p-5 border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.10)]">
          <div className="flex items-start gap-4 mb-4">
            {displayProfile.avatar_url ? (
              <Avatar
                username={displayProfile.username}
                avatarUrl={displayProfile.avatar_url}
                size="xl"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-[#eaf1ff] border-2 border-[#e5e7eb] shadow-inner shrink-0"
                aria-hidden
              >
                🧋
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-black text-[#1a1a1a]">@{displayProfile.username}</h2>
              {displayProfile.food_personality && (
                <p className="text-sm text-[#2f5fc4] font-bold mt-0.5">{displayProfile.food_personality}</p>
              )}
              {displayProfile.bio && (
                <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">{displayProfile.bio}</p>
              )}
              {!isOwnProfile && user && targetUserId && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/chat?dm=${encodeURIComponent(targetUserId)}`)}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-[#115e59] bg-[#ccfbf1] border border-teal-200 shadow-[0_8px_20px_rgba(20,184,166,0.18)] hover:bg-teal-100"
                  >
                    <MessagesSquare className="w-4 h-4 shrink-0" aria-hidden /> Message
                  </button>
                  <ProfileRelationshipButton viewerId={user.id} targetId={targetUserId} />
                </div>
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

      {!isOwnProfile && user?.id && displayProfile.show_friends_public && (
        <section className="mb-5 bg-white rounded-[24px] p-4 border border-[#e5e7eb] shadow-[0_8px_24px_rgba(47,95,196,0.08)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-black text-[#6f90d8] uppercase tracking-widest">Friends on Nommi</h3>
            {friendsLoading && <Loader2 className="w-4 h-4 animate-spin text-[#2f5fc4]" aria-hidden />}
          </div>
          {!friendsLoading && publicFriends.length === 0 && (
            <p className="text-sm text-[#6b7280] leading-relaxed">No Nommi friendships to show yet.</p>
          )}
          {!friendsLoading && publicFriends.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {publicFriends.map(friend => (
                <li key={friend.id}>
                  <Link
                    to={`/app/profile/${friend.id}`}
                    className="inline-flex items-center gap-1.5 min-w-0 max-w-full rounded-full border border-[#e5e7eb] bg-[#fafbff] px-2.5 py-1 text-xs font-semibold text-[#1a1a1a] hover:border-[#2f5fc4]/40 hover:bg-white transition-colors"
                  >
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#e5e7eb]"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#eaf1ff] border border-[#e5e7eb] shrink-0 text-[10px] font-black text-[#2f5fc4] flex items-center justify-center">
                        {friend.username.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate max-w-[9rem]">@{friend.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-[#9ca3af] mt-2 leading-snug font-medium">
            Shown because this member chose to share their friends list — yours stays private unless you opt in too.
          </p>
        </section>
      )}

      {isOwnProfile ? (
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
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition-colors',
                tab === 'settings'
                  ? 'bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] text-white shadow-[0_8px_20px_rgba(47,95,196,0.25)]'
                  : 'text-[#6b7280] hover:text-[#2f5fc4]',
              ].join(' ')}
            >
              Settings
            </button>
          </div>
        </div>
      ) : (
        <h2 className="text-lg font-black text-[#1a1a1a] mb-3">Posts</h2>
      )}

      {(!isOwnProfile || tab === 'posts') ? (
        <div className="w-full">
          {isOwnProfile && user && (
            <Link
              to="/app/collections/saved"
              className="group mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#e8ecf4] bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(47,95,196,0.09)] transition-all duration-200 motion-safe:active:scale-[0.99] hover:border-[#2f5fc4]/25 hover:shadow-[0_12px_32px_rgba(47,95,196,0.12)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-[#2f5fc4]">My lists</p>
                <p className="text-[11px] text-[#6b7280] font-medium">Saved, liked, been there, favorites</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#9ca3af] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#2f5fc4]" strokeWidth={2.25} aria-hidden />
            </Link>
          )}
          <PostGrid
            posts={posts}
            loading={loadingPosts}
            onPostClick={setSelectedPost}
            onSharePost={isOwnProfile && user ? p => setShareTarget(p) : undefined}
            onLikePost={isOwnProfile && user ? handleCollectionLike : undefined}
            onToggleSavedPost={isOwnProfile && user ? handleCollectionToggleSaved : undefined}
            savedPostIds={isOwnProfile && user ? savedPostIds : undefined}
            emptyTitle="Nothing here yet"
            emptyDescription={isOwnProfile ? 'Your food memories will show up here.' : 'No posts from this member yet.'}
            emptyImageSrc={emptyNoPostsYetSimple}
            emptyImageAlt="Nommi illustration for profile with no posts yet"
            emptyImageClassName="w-36 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
          />
        </div>
      ) : tab === 'identity' ? (
        <ProfileIdentityTab
          posts={posts}
          freeFoodCount={freeFoodCount}
          circles={circles}
          joiningCircleId={joiningCircleId}
          onJoinCircle={handleJoinCircle}
        />
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-[#e5e7eb]">
            <h3 className="font-black text-[#2f5fc4] mb-3">Account settings</h3>
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm" value={settingsForm.username} onChange={e => setSettingsForm(s => ({ ...s, username: e.target.value }))} placeholder="Username" />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-stretch">
                  <input className="flex-1 min-w-[10rem] rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm" value={settingsForm.avatar_url} onChange={e => setSettingsForm(s => ({ ...s, avatar_url: e.target.value }))} placeholder="Avatar URL (optional)" />
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setSettingsMsg(null);
                      try {
                        const dataUrl = await compressImageFile(file);
                        setSettingsForm(s => ({ ...s, avatar_url: dataUrl }));
                      } catch (err) {
                        setSettingsMsg(err instanceof Error ? err.message : 'Could not use that photo');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-[#fafbff] px-3 py-2 text-xs font-bold text-[#2f5fc4] whitespace-nowrap"
                  >
                    <Images className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Photo library
                  </button>
                </div>
                <p className="text-[10px] text-[#9ca3af] font-medium leading-snug">
                  Pick a portrait from your device library — we shrink it automatically. You can still paste an HTTPS image URL instead.
                </p>
              </div>
              <textarea className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm" value={settingsForm.bio} onChange={e => setSettingsForm(s => ({ ...s, bio: e.target.value }))} placeholder="Bio" />
              <label className="flex items-start gap-2.5 text-sm text-[#374151] leading-snug cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-[#cbd5e1] text-[#2f5fc4] focus:ring-[#2f5fc4]"
                  checked={settingsForm.show_friends_public}
                  onChange={e => setSettingsForm(s => ({ ...s, show_friends_public: e.target.checked }))}
                />
                <span>
                  Let other signed-in Nommi members <span className="font-bold text-[#1a1a1a]">browse my Nommi friends</span> on my profile. Off by default.
                </span>
              </label>
              <button type="button" disabled={settingsSaving} className="rounded-full px-4 py-2 bg-[#2f5fc4] text-white text-sm font-bold disabled:opacity-50" onClick={async () => {
                if (!user) return;
                setSettingsSaving(true);
                setSettingsMsg(null);
                try {
                  await updateUserProfile(user.id, {
                    username: settingsForm.username,
                    bio: settingsForm.bio,
                    avatar_url: settingsForm.avatar_url,
                    show_friends_public: settingsForm.show_friends_public,
                  });
                  await refreshProfile();
                  setSettingsMsg('Profile updated');
                } catch (e) {
                  setSettingsMsg(e instanceof Error ? e.message : 'Could not update profile');
                } finally {
                  setSettingsSaving(false);
                }
              }}>Save profile</button>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 border border-[#e5e7eb]">
            <h3 className="font-black text-[#2f5fc4] mb-2">Appearance</h3>
            <p className="text-xs text-[#6b7280] mb-3 leading-relaxed">
              Choose your vibe. Dark mode is optimized for Nommi blues and boba accents.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('nommi-theme', 'light');
                  setThemeMode('light');
                  window.dispatchEvent(new CustomEvent('nommi-theme-change', { detail: { theme: 'light' } }));
                }}
                className={[
                  'rounded-full px-4 py-2 text-xs font-black border transition-colors',
                  themeMode === 'light'
                    ? 'bg-[#2f5fc4] text-white border-[#2f5fc4]'
                    : 'bg-white text-[#2f5fc4] border-[#e5e7eb]',
                ].join(' ')}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('nommi-theme', 'dark');
                  setThemeMode('dark');
                  window.dispatchEvent(new CustomEvent('nommi-theme-change', { detail: { theme: 'dark' } }));
                }}
                className={[
                  'rounded-full px-4 py-2 text-xs font-black border transition-colors',
                  themeMode === 'dark'
                    ? 'bg-[#111827] text-[#e5e7eb] border-[#111827]'
                    : 'bg-white text-[#111827] border-[#e5e7eb]',
                ].join(' ')}
              >
                Dark
              </button>
            </div>
          </div>
          {settingsMsg && <p className="text-sm text-[#2f5fc4] font-semibold">{settingsMsg}</p>}
        </div>
      )}

      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostChange={mergePostIntoProfileState}
            onPostDeleted={() => {
              const id = selectedPost.id;
              setPosts(prev => prev.filter(p => p.id !== id));
              setSelectedPost(null);
            }}
          />
        )}
      </Modal>

      {user && (
        <ShareToCircleModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          post={shareTarget}
          userId={user.id}
          onShared={() => {
            setShareTarget(null);
          }}
        />
      )}
    </div>
  );
}
