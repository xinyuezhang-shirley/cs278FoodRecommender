import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Bookmark, Heart } from 'lucide-react';
import type { Post, ReactionType } from '../types';
import { getPaginatedPosts } from '../services/postService';
import { reactToPost } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { PostGrid } from '../components/posts/PostGrid';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { ShareToCircleModal } from '../components/community/ShareToCircleModal';
import { CuisineChipRow } from '../components/map/CuisineChipRow';
import { DietaryFilterDropdown } from '../components/map/DietaryFilterDropdown';
import { DistanceFilterDropdown } from '../components/map/DistanceFilterDropdown';
import { OpenNowDropdown } from '../components/map/OpenNowDropdown';
import { RatingDropdown } from '../components/map/RatingDropdown';
import { SortByDropdown } from '../components/map/SortByDropdown';
import { QuickPostFilterToggles } from '../components/map/QuickPostFilterToggles';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapFilters } from '../hooks/useMapFilters';
import emptyNoPostsYetTagline from '../assets/nommi/empty_no_posts_yet_tagline.png';
import emptyNoPostFound from '../assets/nommi/empty_no_post_found.png';
import emptyNoResultsSideways from '../assets/nommi/empty_no_results_sideways.png';
import { getPostIntentsForUser, togglePostIntent } from '../services/interactionService';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

export function FeedPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const loadSeqRef = useRef(0);

  const { request: requestLocation, userLocation } = useGeolocation();

  const {
    filters,
    setSearch, setCuisine, setDietary, setDistance,
    setOpenNow, setRating, setSortBy, setPhotosOnly, setCampusOnly,
    activeFilterCount,
    filteredPosts,
  } = useMapFilters(allPosts, userLocation);

  const loadPosts = useCallback(async (silent?: boolean) => {
    const reqSeq = ++loadSeqRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const posts = await getPaginatedPosts({}, user?.id);
      if (reqSeq !== loadSeqRef.current) return;
      setAllPosts(posts);
      if (user?.id) {
        const intents = await getPostIntentsForUser(user.id);
        if (reqSeq !== loadSeqRef.current) return;
        setSavedPostIds(new Set(intents.filter(i => i.intent_type === 'saved').map(i => i.post_id)));
      } else {
        if (reqSeq !== loadSeqRef.current) return;
        setSavedPostIds(new Set());
      }
    } catch {
      if (!silent && reqSeq === loadSeqRef.current) setError('Failed to load posts. Please try again.');
    } finally {
      if (!silent && reqSeq === loadSeqRef.current) setLoading(false);
    }
  }, [user?.id]);
  async function handleLikeFromFeed(post: Post) {
    if (!user?.id) return;
    const vr = post.viewer_reactions ?? [];
    const had = vr.includes('like');
    const nextVr: ReactionType[] = had ? vr.filter((t) => t !== 'like') : [...vr, 'like'];
    setAllPosts(prev => prev.map(p => (p.id !== post.id ? p : {
      ...p,
      viewer_reactions: nextVr,
      like_count: Math.max(0, (p.like_count ?? 0) + (had ? -1 : 1)),
    })));
    try {
      const result = await reactToPost(post.id, user.id, 'like');
      setAllPosts(prev => prev.map(p => (p.id !== post.id ? p : { ...p, ...result })));
    } catch {
      setAllPosts(prev => prev.map(p => (p.id !== post.id ? p : post)));
    }
  }

  async function handleToggleSaved(post: Post) {
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
    } catch {
      setSavedPostIds(prev => {
        const next = new Set(prev);
        if (existed) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
    }
  }


  useEffect(() => { loadPosts(); }, [loadPosts]);

  const feedRealtimeSpecs = useMemo(
    () => [
      { table: 'posts' },
      { table: 'reactions' },
      { table: 'comments' },
      ...(user?.id ? [{ table: 'post_intents' as const, filter: `user_id=eq.${user.id}` }] : []),
    ],
    [user?.id],
  );

  useDebouncedRealtime({
    channelName: 'feed-realtime-global',
    specs: feedRealtimeSpecs,
    onEvent: () => void loadPosts(true),
  });

  const feedEmptyImage =
    filteredPosts.length > 0
      ? undefined
      : filters.search
        ? {
          src: emptyNoPostFound,
          alt: 'Nommi empty cup illustration for no matching food results',
          className: 'w-36 sm:w-40 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]',
        }
        : activeFilterCount > 0
          ? {
            src: emptyNoResultsSideways,
            alt: 'Nommi illustration for no food matching your filters',
            className: 'w-36 sm:w-40 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]',
          }
          : {
            src: emptyNoPostsYetTagline,
            alt: 'Nommi illustration for empty food feed — no posts yet',
            className: 'w-36 sm:w-40 max-w-[10rem] h-auto mx-auto mb-4 object-contain drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]',
          };

  function handleSearchSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
  }

  return (
    <div className="flex flex-col min-h-full bg-[#faf9f5] px-4 pb-24">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-[500] bg-white/80 backdrop-blur-md px-4 pt-4 pb-3 space-y-3 border-b border-[#e5e7eb]/60">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="brand text-3xl font-black text-[#2f5fc4] tracking-wide">Food feed</h1>
            <p className="text-sm text-[#6b7280]">See what people are sharing around campus.</p>
          </div>
          {user && (
            <div className="shrink-0 flex flex-col gap-1.5 items-end">
              <Link
                to="/app/collections/saved"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-black text-[#2f5fc4] shadow-[0_4px_14px_rgba(47,95,196,0.1)] transition-all duration-200 motion-safe:active:scale-95 hover:border-[#2f5fc4]/30"
              >
                <Bookmark className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                Saved
              </Link>
              <Link
                to="/app/collections/liked"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-black text-[#f43f5e] shadow-[0_4px_14px_rgba(244,63,94,0.08)] transition-all duration-200 motion-safe:active:scale-95 hover:border-rose-200"
              >
                <Heart className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                Liked
              </Link>
            </div>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f90d8] pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search food, places…"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e5e7eb] rounded-full text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4] shadow-[0_4px_16px_rgba(47,95,196,0.08)]"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#2f5fc4] rounded-full">
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </form>

        <CuisineChipRow active={filters.cuisine} onChange={v => { setCuisine(v); }} />

        <QuickPostFilterToggles
          photosOnly={filters.photosOnly}
          campusOnly={filters.campusOnly}
          onPhotosOnly={setPhotosOnly}
          onCampusOnly={setCampusOnly}
        />

        <div className="flex gap-2 flex-wrap pb-1">
          <DietaryFilterDropdown selected={filters.dietary} onChange={setDietary} />
          <DistanceFilterDropdown
            value={filters.distance}
            onChange={setDistance}
            hasLocation={!!userLocation}
            onRequestLocation={requestLocation}
          />
          <OpenNowDropdown value={filters.openNow} onChange={setOpenNow} />
          <RatingDropdown value={filters.rating} onChange={setRating} />
        </div>
      </div>

      {filters.search && (
        <div className="py-2 flex items-center gap-2">
          <span className="text-xs text-[#6b7280]">
            Results for &quot;<span className="text-[#1a1a1a] font-semibold">{filters.search}</span>&quot;
          </span>
          <button type="button" onClick={clearSearch} className="text-xs font-bold text-[#2f5fc4] hover:underline">
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 px-3 py-2.5 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void loadPosts()} className="text-xs font-bold text-red-700 ml-2 underline">Retry</button>
        </div>
      )}

      <div className="pt-2 pb-1 flex items-center justify-between">
        <span className="text-xs text-[#6b7280] font-semibold">
          {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''}`}
        </span>
        <SortByDropdown value={filters.sortBy} onChange={setSortBy} />
      </div>

      <div className="flex-1">
        <PostGrid
          posts={filteredPosts}
          loading={loading}
          onPostClick={setSelectedPost}
          onSharePost={user?.id ? p => setShareTarget(p) : undefined}
          onLikePost={user?.id ? handleLikeFromFeed : undefined}
          onToggleSavedPost={user?.id ? handleToggleSaved : undefined}
          savedPostIds={savedPostIds}
          emptyTitle={filters.search ? 'No results found' : 'No bites yet'}
          emptyDescription={
            filters.search
              ? 'Try adjusting your filters or search something else.'
              : 'Be the first to share a food spot.'
          }
          emptyImageSrc={feedEmptyImage?.src}
          emptyImageAlt={feedEmptyImage?.alt}
          emptyImageClassName={feedEmptyImage?.className}
        />
      </div>

      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              setAllPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              setSelectedPost(null);
            }}
            onActivityMayChange={() => void loadPosts()}
            onPostChange={(updated) => {
              setSelectedPost(updated);
              setAllPosts(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
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
          onShared={() => void loadPosts()}
        />
      )}
    </div>
  );
}
