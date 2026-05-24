import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Post } from '../types';
import { getPaginatedPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/map/MapView';
import { groupPostsByLocation, type PlaceGroup } from '../utils/groupPostsByLocation';
import { MapSearchBar } from '../components/map/MapSearchBar';
import { LocateMeButton } from '../components/map/LocateMeButton';
import { MapPinExploreSheet } from '../components/map/MapPinExploreSheet';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { FailStateArt, PageLoader } from '../components/ui/LoadingSpinner';
import type { MapAdvancedFiltersPatch } from '../types/mapFilters';
import { useNommiFilters, useNommiFilteredPosts } from '../hooks/useNommiFilters';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';
import { FoodCategorySheet } from '../components/feed/FoodCategorySheet';
import { FeedAdvancedFiltersSheet } from '../components/feed/FeedAdvancedFiltersSheet';
import { FeedPrimaryFilterRow } from '../components/feed/FeedPrimaryFilterRow';
import { FeedActiveFilterChips } from '../components/feed/FeedActiveFilterChips';
import { FeedCompactSortButton } from '../components/feed/FeedCompactSortButton';
import {
  countActiveNommiFilters,
  isRecentFreeFood,
} from '../utils/filterPostsWithMapFilters';

const DEFAULT_CENTER: [number, number] = [37.4290, -122.1685];
const DEFAULT_ZOOM = 14;
const PLACE_FOCUS_ZOOM = 16;

export function MapPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceGroup | null>(null);
  const [foodCatOpen, setFoodCatOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasFlownRef = useRef(false);
  const loadSeqRef = useRef(0);

  const { state: geoState, request: requestLocation, userLocation } = useGeolocation();

  useEffect(() => {
    if (userLocation && !hasFlownRef.current) {
      hasFlownRef.current = true;
      setMapCenter(userLocation);
    }
  }, [userLocation]);

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
  /** Same Nommi chips/search/distance/expiry semantics as Feed, before map-only recent-free-food narrowing. */
  const nominalFilteredPosts = useNommiFilteredPosts(allPosts, userLocation);

  const recentFreeVisibleSubset = useMemo(
    () => nominalFilteredPosts.filter(isRecentFreeFood),
    [nominalFilteredPosts],
  );

  /** Pins, sheets, and detail handoffs must use this single list — never diverge counters from `groupPostsByLocation(this)`. */
  const visibleMapPosts = useMemo(() => (
    filters.post_kind === 'free_food' ? recentFreeVisibleSubset : nominalFilteredPosts
  ), [filters.post_kind, nominalFilteredPosts, recentFreeVisibleSubset]);

  useEffect(() => {
    if (!import.meta.env.DEV || filters.post_kind !== 'free_food') return;
    // Temporary diagnostics — remove when map free-food regressions settle.
    // eslint-disable-next-line no-console -- intentional debug instrumentation
    console.log('free food now count', visibleMapPosts.length);
    // eslint-disable-next-line no-console -- intentional debug instrumentation
    console.log(visibleMapPosts.map(p => ({ title: p.title, created_at: p.created_at })));
  }, [filters.post_kind, visibleMapPosts]);

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

  const clearPinnedPlace = useCallback(() => {
    setSelectedPlace(null);
  }, []);

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

  const patchAdvancedForMap = useCallback((patch: Partial<MapAdvancedFiltersPatch>) => {
    patchAdvancedFilters(patch);
    clearPinnedPlace();
  }, [clearPinnedPlace, patchAdvancedFilters]);

  const resetAdvancedForMap = useCallback(() => {
    resetAdvancedFilters();
    clearPinnedPlace();
  }, [clearPinnedPlace, resetAdvancedFilters]);

  const loadPosts = useCallback(async (silent?: boolean) => {
    const reqSeq = ++loadSeqRef.current;
    if (!silent) setLoading(true);
    try {
      const posts = await getPaginatedPosts({}, user?.id);
      if (reqSeq !== loadSeqRef.current) return;
      setAllPosts(posts.filter(p => p.latitude != null && p.longitude != null));
    } finally {
      if (!silent && reqSeq === loadSeqRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const mapRealtimeSpecs = useMemo(
    () => [
      { table: 'posts' },
      { table: 'reactions' },
      { table: 'comments' },
      ...(user?.id ? [{ table: 'post_intents' as const, filter: `user_id=eq.${user.id}` }] : []),
    ],
    [user?.id],
  );

  useDebouncedRealtime({
    channelName: 'map-realtime-global',
    specs: mapRealtimeSpecs,
    onEvent: () => void loadPosts(true),
  });

  const placeGroups = useMemo(() => groupPostsByLocation(visibleMapPosts), [visibleMapPosts]);
  const freeActiveCount = recentFreeVisibleSubset.length;

  useEffect(() => {
    setSelectedPlace(prev => {
      if (!prev) return null;
      const next = placeGroups.find(g => g.id === prev.id);
      return next ?? null;
    });
  }, [placeGroups]);

  useEffect(() => {
    const id = selectedPlace?.id;
    if (!selectedPlace || !id) {
      setMapZoom(DEFAULT_ZOOM);
      return;
    }
    setMapCenter([selectedPlace.lat, selectedPlace.lng]);
    setMapZoom(PLACE_FOCUS_ZOOM);
  }, [selectedPlace?.id, selectedPlace?.lat, selectedPlace?.lng]);

  function handlePlaceClick(place: PlaceGroup) {
    setSelectedPlace(prev => (prev?.id === place.id ? null : place));
  }

  function handleLocateMe() {
    if (userLocation) {
      setMapCenter([userLocation[0], userLocation[1]]);
    } else {
      requestLocation();
    }
  }

  function handleMapTap() {
    setSelectedPlace(null);
  }

  const freeFilterOn = filters.post_kind === 'free_food';

  return (
    <div className="relative flex w-full flex-col bg-[#faf9f5] px-3">

      <div className="sticky top-0 z-[500] shrink-0 bg-[#faf9f5]/92 backdrop-blur-md pt-2 pb-2 space-y-2 border-b border-[#e5e7eb]/50">
        <MapSearchBar
          value={filters.search}
          onChange={v => {
            setSearch(v);
            clearPinnedPlace();
          }}
        />

        <FeedPrimaryFilterRow
          postKind={filters.post_kind}
          onPostKind={setPostKind}
          foodCategoryActive={filters.food_categories.length > 0}
          foodSheetOpen={foodCatOpen}
          onOpenFoodCategories={() => setFoodCatOpen(true)}
          advancedFilterCount={advancedFilterCount}
          onOpenAdvancedFilters={() => setAdvancedOpen(true)}
          onFilterInteraction={clearPinnedPlace}
        />

        <FeedActiveFilterChips
          filters={filters}
          setFoodCategories={v => {
            setFoodCategories(v);
            clearPinnedPlace();
          }}
          setDietary={v => {
            setDietary(v);
            clearPinnedPlace();
          }}
          setDistance={v => {
            setDistance(v);
            clearPinnedPlace();
          }}
          setOpenNow={v => {
            setOpenNow(v);
            clearPinnedPlace();
          }}
          setRating={v => {
            setRating(v);
            clearPinnedPlace();
          }}
          setPhotosOnly={v => {
            setPhotosOnly(v);
            clearPinnedPlace();
          }}
          setCampusOnly={v => {
            setCampusOnly(v);
            clearPinnedPlace();
          }}
          setSortBy={v => {
            setSortBy(v);
            clearPinnedPlace();
          }}
        />
      </div>

      <FoodCategorySheet
        open={foodCatOpen}
        onClose={() => setFoodCatOpen(false)}
        posts={allPosts}
        selected={filters.food_categories}
        onApply={v => {
          setFoodCategories(v);
          clearPinnedPlace();
        }}
      />

      <FeedAdvancedFiltersSheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        filters={filters}
        hasLocation={!!userLocation}
        supportsOpenNow={supportsOpenNow}
        supportsRating={supportsRating}
        onRequestLocation={requestLocation}
        patchAdvancedFilters={patchAdvancedForMap}
        resetAdvancedFilters={resetAdvancedForMap}
      />

      <div className="flex justify-between items-center gap-2 pt-3 pb-2 px-0.5">
        <span className="text-xs font-semibold text-[#6b7280]">
          {placeGroups.length} pin{placeGroups.length !== 1 ? 's' : ''}
        </span>
        <FeedCompactSortButton
          sortBy={filters.sortBy}
          onChange={v => {
            setSortBy(v);
            clearPinnedPlace();
          }}
        />
      </div>

      {freeActiveCount > 0 && (
        <div className="relative z-[450] flex justify-center pb-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setPostKind(filters.post_kind === 'free_food' ? '' : 'free_food');
              clearPinnedPlace();
            }}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black shadow-[0_8px_24px_rgba(47,95,196,0.18)] border transition-all min-h-[40px]',
              freeFilterOn
                ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] ring-2 ring-[#2f5fc4]/25'
                : 'bg-white/95 text-[#2f5fc4] border-[#eaf1ff] backdrop-blur-sm',
            ].join(' ')}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${freeFilterOn ? 'bg-[#fff3dc]' : 'bg-[#2f5fc4]'} animate-pulse`} />
            {freeActiveCount} free food now
          </button>
        </div>
      )}

      <div
        className={[
          'relative mx-auto w-full mt-1 isolate',
          'h-[min(560px,calc(100dvh-13rem))] min-h-[300px]',
          'overflow-hidden rounded-[24px] border border-[#e5e7eb]/80',
          'shadow-[0_10px_32px_rgba(47,95,196,0.1)]',
        ].join(' ')}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full bg-[#eaf1ff]/50">
            <PageLoader />
          </div>
        ) : (
          <MapView
            placeGroups={placeGroups}
            center={mapCenter}
            zoom={mapZoom}
            onPlaceClick={handlePlaceClick}
            onMapTap={handleMapTap}
            userLocation={userLocation}
          />
        )}

        {!loading && placeGroups.length === 0 && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-[#faf9f5]/93 backdrop-blur-[3px] px-6 text-center pointer-events-none">
            <FailStateArt compact />
            <p className="text-base font-black text-[#2f5fc4] tracking-tight">
              No food here yet 👀
            </p>
            <p className="text-sm text-[#6b7280] mt-2 max-w-[240px] leading-relaxed">
              {activeFilterCount > 0
                ? 'Try clearing your filters.'
                : 'Be the first to drop something'}
            </p>
          </div>
        )}

        {!loading && (
          <LocateMeButton
            geoState={geoState}
            userLocation={userLocation}
            onLocate={handleLocateMe}
          />
        )}
      </div>

      {!loading && placeGroups.length > 0 && (
        <p className="text-center text-[11px] font-semibold text-[#9ca3af] tracking-wide pt-3 pb-1">
          Tap a place to see what&apos;s happening there
        </p>
      )}

      <MapPinExploreSheet
        group={selectedPlace}
        onClose={() => {
          setSelectedPlace(null);
        }}
        onOpenPostDetail={post => {
          setSelectedPost(post);
          setSelectedPlace(null);
        }}
      />

      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              setAllPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              setSelectedPost(null);
            }}
            onActivityMayChange={() => loadPosts()}
          />
        )}
      </Modal>
    </div>
  );
}
