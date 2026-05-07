import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Post } from '../types';
import { getPaginatedPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { isExpired } from '../utils/helpers';
import { MapView } from '../components/map/MapView';
import { groupPostsByLocation, type PlaceGroup } from '../utils/groupPostsByLocation';
import { MapSearchBar } from '../components/map/MapSearchBar';
import { CuisineChipRow } from '../components/map/CuisineChipRow';
import { DietaryFilterDropdown } from '../components/map/DietaryFilterDropdown';
import { DistanceFilterDropdown } from '../components/map/DistanceFilterDropdown';
import { OpenNowDropdown } from '../components/map/OpenNowDropdown';
import { RatingDropdown } from '../components/map/RatingDropdown';
import { SortByDropdown } from '../components/map/SortByDropdown';
import { QuickPostFilterToggles } from '../components/map/QuickPostFilterToggles';
import { LocateMeButton } from '../components/map/LocateMeButton';
import { MapPinExploreSheet } from '../components/map/MapPinExploreSheet';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import emptyNoPostFound from '../assets/nommi/empty_no_post_found.png';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapFilters } from '../hooks/useMapFilters';
import { useDebouncedRealtime } from '../hooks/useDebouncedRealtime';

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
  const hasFlownRef = useRef(false);

  const { state: geoState, request: requestLocation, userLocation } = useGeolocation();

  useEffect(() => {
    if (userLocation && !hasFlownRef.current) {
      hasFlownRef.current = true;
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  const {
    filters,
    setSearch, setCuisine, setDietary, setDistance,
    setOpenNow, setRating, setSortBy, setPhotosOnly, setCampusOnly,
    filteredPosts,
    activeFilterCount,
  } = useMapFilters(allPosts, userLocation);

  const loadPosts = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      const posts = await getPaginatedPosts({}, user?.id);
      setAllPosts(posts.filter(p => p.latitude != null && p.longitude != null));
    } finally {
      if (!silent) setLoading(false);
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

  const placeGroups = useMemo(() => groupPostsByLocation(filteredPosts), [filteredPosts]);
  const freeActiveCount = allPosts.filter(p => p.is_free_food && !isExpired(p.expires_at)).length;

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

  function handleCuisineChange(v: string) {
    setCuisine(v);
    setSelectedPlace(null);
  }

  function handleMapTap() {
    setSelectedPlace(null);
  }

  const freeFilterOn = filters.cuisine === 'free_food';

  return (
    <div className="flex flex-col min-h-full bg-[#faf9f5] px-3 pb-24">

      <div className="sticky top-0 z-[500] shrink-0 bg-[#faf9f5]/92 backdrop-blur-md pt-2 pb-2 space-y-2 border-b border-[#e5e7eb]/50">
        <MapSearchBar
          value={filters.search}
          onChange={v => { setSearch(v); setSelectedPlace(null); }}
        />
        <CuisineChipRow active={filters.cuisine} onChange={handleCuisineChange} />
        <QuickPostFilterToggles
          photosOnly={filters.photosOnly}
          campusOnly={filters.campusOnly}
          onPhotosOnly={v => { setPhotosOnly(v); setSelectedPlace(null); }}
          onCampusOnly={v => { setCampusOnly(v); setSelectedPlace(null); }}
        />
        <div className="flex gap-1.5 flex-wrap items-center">
          <DietaryFilterDropdown selected={filters.dietary} onChange={setDietary} />
          <DistanceFilterDropdown
            value={filters.distance}
            onChange={setDistance}
            hasLocation={!!userLocation}
            onRequestLocation={requestLocation}
          />
          <OpenNowDropdown value={filters.openNow} onChange={setOpenNow} />
          <RatingDropdown value={filters.rating} onChange={setRating} />
          <div className="ml-auto">
            <SortByDropdown value={filters.sortBy} onChange={setSortBy} />
          </div>
        </div>
        {activeFilterCount > 0 && (
          <p className="text-[10px] font-semibold text-[#9ca3af]">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active · pins update live
          </p>
        )}
      </div>

      {freeActiveCount > 0 && (
        <div className="relative z-[600] flex justify-center pt-2 pb-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => handleCuisineChange(filters.cuisine === 'free_food' ? '' : 'free_food')}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black shadow-[0_8px_24px_rgba(47,95,196,0.18)] border transition-all',
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
          'h-[min(560px,calc(100dvh-11rem))] min-h-[300px]',
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
            <img
              src={emptyNoPostFound}
              alt="Nommi empty cup illustration — no food pins nearby yet"
              className="w-36 sm:w-40 max-w-[10rem] h-auto object-contain mb-4 drop-shadow-[0_4px_12px_rgba(47,95,196,0.12)]"
            />
            <p className="text-base font-black text-[#2f5fc4] tracking-tight">No food here yet 👀</p>
            <p className="text-sm text-[#6b7280] mt-2 max-w-[240px] leading-relaxed">
              Be the first to drop something
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
