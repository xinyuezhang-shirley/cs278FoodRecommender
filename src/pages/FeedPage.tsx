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
import { FoodCategorySheet } from '../components/feed/FoodCategorySheet';
import { FeedAdvancedFiltersSheet } from '../components/feed/FeedAdvancedFiltersSheet';
import { FeedPrimaryFilterRow } from '../components/feed/FeedPrimaryFilterRow';
import { FeedActiveFilterChips } from '../components/feed/FeedActiveFilterChips';
import { FeedCompactSortButton } from '../components/feed/FeedCompactSortButton';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNommiFilters, useNommiFilteredPosts } from '../hooks/useNommiFilters';
import emptyNoPostsYetTagline from '../assets/nommi/empty_no_posts_yet_tagline.png';
import emptyNoPostFound from '../assets/nommi/empty_no_post_found.png';
import emptyNoResultsSideways from '../assets/nommi/empty_no_results_sideways.png';
import { getPostIntentsForUser, togglePostIntent } from '../services/interactionService';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';
import { countActiveNommiFilters } from '../utils/filterPostsWithMapFilters';

export function FeedPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [foodCatOpen, setFoodCatOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const loadSeqRef = useRef(0);
  /** Shown when `reactToPost` fails (RLS, stale session, or missing migration `015`). */
  const [likeNotice, setLikeNotice] = useState<string | null>(null);

  const { request: requestLocation, userLocation } = useGeolocation();

  const {
    filters,
    setSearch,
    setPostKind,
    setFoodCategories,
    setDietary,
    setDistance,
    setOpenNow,
    setRating,
    setSortBy,
    setPhotosOnly,
    setCampusOnly,
    patchAdvancedFilters,
    resetAdvancedFilters,
  } = useNommiFilters();
  const filteredPosts = useNommiFilteredPosts(allPosts, userLocation);

  const activeFilterCount = useMemo(
    () => countActiveNommiFilters(filters, userLocation ?? null),
    [filters, userLocation],
  );

  const supportsOpenNow = useMemo(
    () => allPosts.some(p => typeof p.mock_is_open === 'boolean'),
    [allPosts],
  );
  const supportsRating = useMemo(
    () => allPosts.some(p => typeof p.mock_rating === 'number'),
    [allPosts],
  );

  /** Advanced badge: ignore distance unless location is active (otherwise it does nothing). */
  const advancedFilterCount = useMemo(() => {
    let n = filters.dietary.length;
    if (filters.distance && userLocation) n++;
    if (filters.openNow) n++;
    if (filters.rating) n++;
    if (filters.photosOnly) n++;
    if (filters.campusOnly) n++;
    return n;
  }, [
    filters.campusOnly,
    filters.dietary,
    filters.distance,
    filters.openNow,
    filters.photosOnly,
    filters.rating,
    userLocation,
  ]);

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
    } catch (e: unknown) {
      console.error('[Nommi] Feed loadPosts failed:', e);
      if (!silent && reqSeq === loadSeqRef.current) setError('Failed to load posts. Please try again.');
      // Silent refresh (e.g. realtime): keep previous posts so truncation bugs do not flicker counters.
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
      setLikeNotice(null);
      setAllPosts(prev => prev.map(p => (p.id !== post.id ? p : { ...p, ...result })));
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'Could not save like. Try signing out/in, then check the browser console.';
      console.error('[Nommi] reactToPost(like) failed:', e);
      setAllPosts(prev => prev.map(p => (p.id !== post.id ? p : post)));
      setLikeNotice(msg);
      window.setTimeout(() => setLikeNotice(null), 14000);
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
    <div className="flex w-full flex-col bg-[#faf9f5] px-4">

      <div className="sticky top-0 z-[500] bg-white/82 backdrop-blur-md px-4 pt-4 pb-3 space-y-2.5 border-b border-[#e5e7eb]/55">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
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

        {likeNotice && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-red-900 whitespace-pre-wrap"
          >
            {likeNotice}
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f90d8] pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search food, places…"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e5e7eb] rounded-full text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4] shadow-[0_4px_16px_rgba(47,95,196,0.06)] min-h-[44px]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#2f5fc4] rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </form>

        <FeedPrimaryFilterRow
          postKind={filters.post_kind}
          onPostKind={setPostKind}
          foodCategoryActive={filters.food_categories.length > 0}
          foodSheetOpen={foodCatOpen}
          onOpenFoodCategories={() => setFoodCatOpen(true)}
          advancedFilterCount={advancedFilterCount}
          onOpenAdvancedFilters={() => setAdvancedOpen(true)}
        />

        <FeedActiveFilterChips
          filters={filters}
          setFoodCategories={setFoodCategories}
          setDietary={setDietary}
          setDistance={setDistance}
          setOpenNow={setOpenNow}
          setRating={setRating}
          setPhotosOnly={setPhotosOnly}
          setCampusOnly={setCampusOnly}
          setSortBy={setSortBy}
        />
      </div>

      <FoodCategorySheet
        open={foodCatOpen}
        onClose={() => setFoodCatOpen(false)}
        posts={allPosts}
        selected={filters.food_categories}
        onApply={setFoodCategories}
      />

      <FeedAdvancedFiltersSheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        filters={filters}
        hasLocation={!!userLocation}
        supportsOpenNow={supportsOpenNow}
        supportsRating={supportsRating}
        onRequestLocation={requestLocation}
        patchAdvancedFilters={patchAdvancedFilters}
        resetAdvancedFilters={resetAdvancedFilters}
      />

      {filters.search && (
        <div className="py-2 flex items-center gap-2 px-4">
          <span className="text-xs text-[#6b7280]">
            Results for &quot;<span className="text-[#1a1a1a] font-semibold">{filters.search}</span>&quot;
          </span>
          <button type="button" onClick={clearSearch} className="text-xs font-bold text-[#2f5fc4] hover:underline">
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 mx-4 px-3 py-2.5 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void loadPosts()} className="text-xs font-bold text-red-700 ml-2 underline">Retry</button>
        </div>
      )}

      <div className="pt-3 pb-2 px-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[#6b7280] font-semibold">
          {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
        </p>
        <FeedCompactSortButton sortBy={filters.sortBy} onChange={setSortBy} />
      </div>

      <div className="w-full px-4">
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
