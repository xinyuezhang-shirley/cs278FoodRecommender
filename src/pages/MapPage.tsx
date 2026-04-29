import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import type { Post } from '../types';
import { getPaginatedPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { isExpired } from '../utils/helpers';
import { MapView, groupPostsByLocation, type PinGroup } from '../components/map/MapView';
import { MapSearchBar } from '../components/map/MapSearchBar';
import { CuisineChipRow } from '../components/map/CuisineChipRow';
import { DietaryFilterDropdown } from '../components/map/DietaryFilterDropdown';
import { DistanceFilterDropdown } from '../components/map/DistanceFilterDropdown';
import { OpenNowDropdown } from '../components/map/OpenNowDropdown';
import { RatingDropdown } from '../components/map/RatingDropdown';
import { SortByDropdown } from '../components/map/SortByDropdown';
import { LocateMeButton } from '../components/map/LocateMeButton';
import { PostGrid } from '../components/posts/PostGrid';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapFilters } from '../hooks/useMapFilters';

const DEFAULT_CENTER: [number, number] = [37.4290, -122.1685];
const DEFAULT_ZOOM = 14;

export function MapPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  // When a pin is tapped, narrow the post list to that location
  const [locationFilter, setLocationFilter] = useState<string>('');
  const hasFlownRef = useRef(false);

  const { state: geoState, request: requestLocation, userLocation } = useGeolocation();

  // Fly to user location only the first time it becomes available
  useEffect(() => {
    if (userLocation && !hasFlownRef.current) {
      hasFlownRef.current = true;
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  const {
    filters,
    setSearch, setCuisine, setDietary, setDistance,
    setOpenNow, setRating, setSortBy,
    filteredPosts,
    activeFilterCount,
  } = useMapFilters(allPosts, userLocation);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await getPaginatedPosts({}, user?.id);
      setAllPosts(posts.filter(p => p.latitude != null && p.longitude != null));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Posts shown in the list: further narrow by pin selection
  const displayPosts = useMemo(
    () => locationFilter
      ? filteredPosts.filter(p => p.location_name === locationFilter)
      : filteredPosts,
    [filteredPosts, locationFilter]
  );

  const pinGroups = useMemo(() => groupPostsByLocation(filteredPosts), [filteredPosts]);
  const freeActiveCount = allPosts.filter(p => p.is_free_food && !isExpired(p.expires_at)).length;

  function handlePinClick(group: PinGroup) {
    setLocationFilter(prev => prev === group.locationName ? '' : group.locationName);
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
    setLocationFilter('');
  }

  return (
    <div className="flex flex-col min-h-full bg-[#fafaf9]">

      {/* ── Sticky filter header ── */}
      <div className="sticky top-0 z-[500] bg-[#fafaf9]/96 backdrop-blur-sm px-3 pt-3 pb-2 space-y-1.5"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <MapSearchBar
          value={filters.search}
          onChange={v => { setSearch(v); setLocationFilter(''); }}
        />
        <CuisineChipRow active={filters.cuisine} onChange={handleCuisineChange} />
        {/* Filter dropdowns — no overflow-x-auto so menus aren't clipped */}
        <div className="flex gap-2 flex-wrap">
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

      {/* ── Map section (fixed height) ── */}
      <div className="relative w-full flex-shrink-0" style={{ height: '42vh', minHeight: '260px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full bg-[#f0f0ec]">
            <PageLoader />
          </div>
        ) : (
          <MapView
            pinGroups={pinGroups}
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            onPinClick={handlePinClick}
            onMapTap={() => setLocationFilter('')}
            userLocation={userLocation}
          />
        )}

        {/* Locate-me button — absolute overlay above Leaflet panes */}
        {!loading && (
          <LocateMeButton
            geoState={geoState}
            userLocation={userLocation}
            onLocate={handleLocateMe}
          />
        )}

        {/* Live free food badge */}
        {freeActiveCount > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
            <button
              onClick={() => handleCuisineChange(filters.cuisine === 'free_food' ? '' : 'free_food')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: filters.cuisine === 'free_food' ? '#16a34a' : 'rgba(255,255,255,0.94)',
                color: filters.cuisine === 'free_food' ? 'white' : '#16a34a',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 10px rgba(22,163,74,0.22)',
                border: `1px solid ${filters.cuisine === 'free_food' ? '#16a34a' : 'rgba(22,163,74,0.25)'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: filters.cuisine === 'free_food' ? 'white' : '#16a34a' }} />
              {freeActiveCount} free food now
            </button>
          </div>
        )}
      </div>

      {/* ── Posts section ── */}
      <div className="flex-1 px-3 pt-3 pb-6">

        {/* Row: post count + location filter chip + sort */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-[#6b7280] flex-shrink-0">
              {displayPosts.length} post{displayPosts.length !== 1 ? 's' : ''}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''}`}
            </span>
            {locationFilter && (
              <button
                onClick={() => setLocationFilter('')}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                style={{ background: '#1a1a1a', color: 'white' }}
              >
                {locationFilter}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <SortByDropdown value={filters.sortBy} onChange={setSortBy} />
        </div>

        <PostGrid
          posts={displayPosts}
          loading={loading}
          onPostClick={setSelectedPost}
          emptyTitle={locationFilter ? 'No posts at this pin' : 'No posts match'}
          emptyDescription={locationFilter ? 'Tap the pin again to clear' : 'Try adjusting your filters'}
        />
      </div>

      {/* Post detail modal */}
      <Modal open={!!selectedPost} onClose={() => setSelectedPost(null)} fullScreen>
        {selectedPost && (
          <PostDetail
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onPostDeleted={() => {
              setAllPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              setSelectedPost(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
