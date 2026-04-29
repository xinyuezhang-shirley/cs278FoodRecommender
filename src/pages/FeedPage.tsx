import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import type { Post } from '../types';
import { getPaginatedPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { PostGrid } from '../components/posts/PostGrid';
import { PostDetail } from '../components/posts/PostDetail';
import { Modal } from '../components/ui/Modal';
import { CuisineChipRow } from '../components/map/CuisineChipRow';
import { DietaryFilterDropdown } from '../components/map/DietaryFilterDropdown';
import { DistanceFilterDropdown } from '../components/map/DistanceFilterDropdown';
import { OpenNowDropdown } from '../components/map/OpenNowDropdown';
import { RatingDropdown } from '../components/map/RatingDropdown';
import { SortByDropdown } from '../components/map/SortByDropdown';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapFilters } from '../hooks/useMapFilters';

export function FeedPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { request: requestLocation, userLocation } = useGeolocation();

  const {
    filters,
    setSearch, setCuisine, setDietary, setDistance,
    setOpenNow, setRating, setSortBy,
    activeFilterCount,
    filteredPosts,
  } = useMapFilters(allPosts, userLocation);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all posts; filtering is done client-side via useMapFilters
      const posts = await getPaginatedPosts({}, user?.id);
      setAllPosts(posts);
    } catch {
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  function handleSearchSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky header ── */}
      <div className="px-4 pt-4 pb-2 bg-[#fafaf9] sticky top-0 z-20 space-y-2">
        <div className="mb-1">
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">nommi</h1>
          <p className="text-xs text-[#6b7280]">Food discovery around you</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search food, places…"
            className="w-full pl-8 pr-8 py-2 bg-white border border-[#e5e7eb] rounded-full text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e]"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Chips */}
        <CuisineChipRow active={filters.cuisine} onChange={v => { setCuisine(v); }} />

        {/* Dropdowns — no overflow-x-auto so menus aren't clipped */}
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

      {/* Active search label */}
      {filters.search && (
        <div className="px-4 py-1.5 flex items-center gap-2">
          <span className="text-xs text-[#6b7280]">
            Results for "<span className="text-[#1a1a1a] font-medium">{filters.search}</span>"
          </span>
          <button onClick={clearSearch} className="text-xs text-[#f43f5e]">Clear</button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadPosts} className="text-xs font-medium ml-2">Retry</button>
        </div>
      )}

      {/* Post count + sort row */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <span className="text-xs text-[#6b7280]">
          {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''}`}
        </span>
        <SortByDropdown value={filters.sortBy} onChange={setSortBy} />
      </div>

      <div className="flex-1 pb-4">
        <PostGrid
          posts={filteredPosts}
          loading={loading}
          onPostClick={setSelectedPost}
          emptyTitle={filters.search ? 'No results found' : 'No posts yet'}
          emptyDescription={
            filters.search ? 'Try a different search or filter' : 'Tap the + button below to share food!'
          }
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
          />
        )}
      </Modal>
    </div>
  );
}
