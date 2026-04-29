import { useState, useMemo } from 'react';
import type { Post } from '../types';
import { haversineDistanceMiles, DISTANCE_MAX_MILES, isExpired } from '../utils/helpers';

export interface MapFilters {
  search: string;
  cuisine: string;   // '' = all | 'free_food' | 'recommendation' | 'event' | cuisine tag
  dietary: string[];
  distance: string;
  openNow: string;
  rating: string;
  sortBy: 'recent' | 'popular';
}

const DEFAULT_FILTERS: MapFilters = {
  search: '',
  cuisine: '',
  dietary: [],
  distance: '',
  openNow: '',
  rating: '',
  sortBy: 'recent',
};

export function useMapFilters(allPosts: Post[], userLocation: [number, number] | null) {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);

  function setSearch(search: string)      { setFilters(f => ({ ...f, search })); }
  function setCuisine(cuisine: string)    { setFilters(f => ({ ...f, cuisine })); }
  function setDietary(dietary: string[])  { setFilters(f => ({ ...f, dietary })); }
  function setDistance(distance: string)  { setFilters(f => ({ ...f, distance })); }
  function setOpenNow(openNow: string)    { setFilters(f => ({ ...f, openNow })); }
  function setRating(rating: string)      { setFilters(f => ({ ...f, rating })); }
  function setSortBy(sortBy: 'recent' | 'popular') { setFilters(f => ({ ...f, sortBy })); }
  function clearAll() { setFilters(DEFAULT_FILTERS); }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.cuisine)        n++;
    if (filters.dietary.length) n++;
    if (filters.distance)       n++;
    if (filters.openNow)        n++;
    if (filters.rating)         n++;
    return n;
  }, [filters]);

  const filteredPosts = useMemo(() => {
    const q = filters.search.toLowerCase();
    const maxMiles = filters.distance ? DISTANCE_MAX_MILES[filters.distance] : null;
    const minRating = filters.rating ? parseFloat(filters.rating) : null;

    let result = allPosts.filter(post => {
      if (isExpired(post.expires_at)) return false;

      if (q) {
        const hay = [post.title, post.description, post.location_name, ...post.cuisine_tags, ...post.dietary_tags]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // cuisine slot also carries type-based shortcuts (free_food / recommendation / event)
      if (filters.cuisine === 'free_food') {
        if (!post.is_free_food) return false;
      } else if (filters.cuisine === 'recommendation' || filters.cuisine === 'event') {
        if (post.type !== filters.cuisine) return false;
      } else if (filters.cuisine) {
        if (!post.cuisine_tags.includes(filters.cuisine)) return false;
      }

      if (filters.dietary.length) {
        if (!filters.dietary.every(d => post.dietary_tags.includes(d))) return false;
      }

      if (maxMiles !== null && userLocation && post.latitude != null && post.longitude != null) {
        const dist = haversineDistanceMiles(userLocation, [post.latitude, post.longitude]);
        if (dist > maxMiles) return false;
      }

      if (filters.openNow) {
        if (!post.mock_is_open) return false;
      }

      if (minRating !== null) {
        if (post.mock_rating == null || post.mock_rating < minRating) return false;
      }

      return true;
    });

    // Sort
    if (filters.sortBy === 'popular') {
      result = [...result].sort((a, b) =>
        ((b.like_count ?? 0) + (b.comment_count ?? 0) + (b.still_there_count ?? 0)) -
        ((a.like_count ?? 0) + (a.comment_count ?? 0) + (a.still_there_count ?? 0))
      );
    } else {
      result = [...result].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [allPosts, filters, userLocation]);

  return {
    filters,
    setSearch, setCuisine, setDietary, setDistance, setOpenNow, setRating, setSortBy,
    clearAll,
    activeFilterCount,
    filteredPosts,
  };
}
