import { useState, useMemo } from 'react';
import type { Post } from '../types';
import { haversineDistanceMiles, DISTANCE_MAX_MILES, isExpired } from '../utils/helpers';

/** Rough Stanford main campus + adjacent row — pins outside are hidden when campus filter is on. */
const CAMPUS_BOUNDS = {
  latMin: 37.415,
  latMax: 37.445,
  lngMin: -122.185,
  lngMax: -122.148,
};

function inCampusBounds(lat: number, lng: number): boolean {
  return lat >= CAMPUS_BOUNDS.latMin
    && lat <= CAMPUS_BOUNDS.latMax
    && lng >= CAMPUS_BOUNDS.lngMin
    && lng <= CAMPUS_BOUNDS.lngMax;
}

export interface MapFilters {
  search: string;
  cuisine: string;   // '' = all | 'free_food' | 'recommendation' | 'event' | cuisine tag
  dietary: string[];
  distance: string;
  openNow: string;
  rating: string;
  sortBy: 'recent' | 'popular';
  photosOnly: boolean;
  campusOnly: boolean;
}

const DEFAULT_FILTERS: MapFilters = {
  search: '',
  cuisine: '',
  dietary: [],
  distance: '',
  openNow: '',
  rating: '',
  sortBy: 'recent',
  photosOnly: false,
  campusOnly: false,
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
  function setPhotosOnly(photosOnly: boolean) { setFilters(f => ({ ...f, photosOnly })); }
  function setCampusOnly(campusOnly: boolean) { setFilters(f => ({ ...f, campusOnly })); }
  function clearAll() { setFilters(DEFAULT_FILTERS); }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.cuisine)        n++;
    if (filters.dietary.length) n++;
    if (filters.distance)       n++;
    if (filters.openNow)        n++;
    if (filters.rating)         n++;
    if (filters.photosOnly)     n++;
    if (filters.campusOnly)     n++;
    return n;
  }, [filters]);

  const filteredPosts = useMemo(() => {
    const q = String(filters.search ?? '').toLowerCase();
    const maxMiles = filters.distance ? DISTANCE_MAX_MILES[filters.distance] : null;
    const minRating = filters.rating ? parseFloat(filters.rating) : null;

    let result = allPosts.filter(post => {
      if (isExpired(post.expires_at)) return false;

      const cuisineTags = Array.isArray(post.cuisine_tags) ? post.cuisine_tags : [];
      const dietaryTags = Array.isArray(post.dietary_tags) ? post.dietary_tags : [];

      if (q) {
        const hay = [
          post.title ?? '',
          post.description ?? '',
          post.location_name ?? '',
          ...cuisineTags,
          ...dietaryTags,
        ]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // cuisine slot also carries type-based shortcuts (free_food / recommendation / event)
      if (filters.cuisine === 'free_food') {
        if (!post.is_free_food) return false;
      } else if (filters.cuisine === 'recommendation' || filters.cuisine === 'event') {
        if (post.type !== filters.cuisine) return false;
      } else if (filters.cuisine) {
        if (!cuisineTags.includes(filters.cuisine)) return false;
      }

      if (filters.dietary.length) {
        if (!filters.dietary.every(d => dietaryTags.includes(d))) return false;
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

      if (filters.photosOnly) {
        const url = post.image_url?.trim();
        if (!url) return false;
      }

      if (filters.campusOnly && post.latitude != null && post.longitude != null) {
        if (!inCampusBounds(post.latitude, post.longitude)) return false;
      } else if (filters.campusOnly) {
        return false;
      }

      return true;
    });

    const popularScore = (p: Post) =>
      (p.like_count ?? 0) + (p.comment_count ?? 0) + (p.still_there_count ?? 0);

    // Sort: free food first, then by user-selected order (recent / popular)
    result = [...result].sort((a, b) => {
      const fa = a.is_free_food ? 1 : 0;
      const fb = b.is_free_food ? 1 : 0;
      if (fb !== fa) return fb - fa;
      if (filters.sortBy === 'popular') {
        return popularScore(b) - popularScore(a);
      }
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

    return result;
  }, [allPosts, filters, userLocation]);

  return {
    filters,
    setSearch, setCuisine, setDietary, setDistance, setOpenNow, setRating, setSortBy,
    setPhotosOnly, setCampusOnly,
    clearAll,
    activeFilterCount,
    filteredPosts,
  };
}
