import type { Post } from '../types';
import type { MapFilters } from '../types/mapFilters';
import { haversineDistanceMiles, DISTANCE_MAX_MILES, isExpired } from './helpers';

/** Map “Free food now” cutoff — aligns with nominal `created_at` window only (map applies this separately from Feed). */
export const MAP_FREE_FOOD_CREATED_WITHIN_HOURS = 48;

function cuisineHasFreeFoodCue(tags: string[] | undefined): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.some(t => {
    const x = String(t).trim().toLowerCase();
    return x === 'free-food' || x === 'free food';
  });
}

/**
 * Nommi map “recent free food” — single source used for badge count, pins, sheets, detail handoff.
 * Uses DB `created_at` only (`Date.parse` / `getTime`; ISO `timestamptz` from Postgres is fine).
 */
export function isRecentFreeFood(post: Post, nowMs = Date.now()): boolean {
  if (isExpired(post.expires_at)) return false;

  const createdAt = new Date(post.created_at).getTime();
  const cutoff =
    nowMs - MAP_FREE_FOOD_CREATED_WITHIN_HOURS * 60 * 60 * 1000;

  const isFreeFood =
    post.type === 'free_food'
    || post.is_free_food
    || cuisineHasFreeFoodCue(post.cuisine_tags);

  return (
    isFreeFood
    && Number.isFinite(createdAt)
    && createdAt <= nowMs
    && createdAt >= cutoff
  );
}

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

/**
 * Applies the same Nommi filters on any post list (Feed = all posts, Map = geo-tagged subset).
 * Distance constrains only when `userLocation` is set (otherwise the option is ineffective; UI should disable picks).
 *
 * Note: Feed keeps historical free-food rows when 🎁 is selected — map narrows recent free-food with {@link isRecentFreeFood}.
 */
export function filterAndSortPosts(
  allPosts: Post[],
  filters: MapFilters,
  userLocation: [number, number] | null,
): Post[] {
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

    if (filters.post_kind === 'free_food') {
      if (!post.is_free_food) return false;
    } else if (filters.post_kind === 'recommendation' || filters.post_kind === 'event') {
      if (post.type !== filters.post_kind) return false;
    }

    if (filters.food_categories.length > 0) {
      const any = filters.food_categories.some(tag => cuisineTags.includes(tag));
      if (!any) return false;
    }

    if (filters.dietary.length) {
      if (!filters.dietary.every(d => dietaryTags.includes(d))) return false;
    }

    if (maxMiles !== null && userLocation && post.latitude != null && post.longitude != null) {
      const dist = haversineDistanceMiles(userLocation, [post.latitude, post.longitude]);
      if (dist > maxMiles) return false;
    }

    if (filters.openNow) {
      if (post.mock_is_open !== true) return false;
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
}

export function countActiveNommiFilters(
  filters: MapFilters,
  /** Match filter behavior: distance only counts when location is known. */
  userLocation?: [number, number] | null,
): number {
  let n = 0;
  if (filters.post_kind) n++;
  if (filters.food_categories.length) n++;
  if (filters.dietary.length) n++;
  const hasLoc = !!userLocation;
  if (filters.distance && hasLoc) n++;
  if (filters.openNow) n++;
  if (filters.rating) n++;
  if (filters.photosOnly) n++;
  if (filters.campusOnly) n++;
  return n;
}
