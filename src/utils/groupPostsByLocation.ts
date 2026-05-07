import type { Post, PostType } from '../types';
import { isExpired } from './helpers';
import type { MarkerVariant } from '../components/map/BobaMapMarker';

const GEO_DECIMALS = 4;

export interface PlaceGroup {
  id: string;
  key: string;
  locationName: string;
  lat: number;
  lng: number;
  posts: Post[];
  variant: MarkerVariant;
}

/** @deprecated prefer PlaceGroup */
export type PinGroup = PlaceGroup;

/**
 * One pin per place (name key or geo key).
 */
export function groupPostsByLocation(posts: Post[]): PlaceGroup[] {
  const buckets = new Map<string, Post[]>();

  for (const post of posts) {
    if (post.latitude == null || post.longitude == null) continue;

    const trimmedName = post.location_name?.trim() ?? '';
    const id = trimmedName
      ? `name:${trimmedName.toLowerCase()}`
      : `geo:${Number(post.latitude).toFixed(GEO_DECIMALS)},${Number(post.longitude).toFixed(GEO_DECIMALS)}`;

    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id)!.push(post);
  }

  return Array.from(buckets.entries()).map(([id, group]) => {
    const lat = group.reduce((s, p) => s + (p.latitude ?? 0), 0) / group.length;
    const lng = group.reduce((s, p) => s + (p.longitude ?? 0), 0) / group.length;

    const displayName =
      group.map(p => p.location_name?.trim()).find(Boolean)
      ?? (id.startsWith('geo:')
        ? (() => {
            const parts = id.slice(4).split(',');
            return parts.length === 2 ? `Near ${parts[0]}, ${parts[1]}` : 'Food spot';
          })()
        : 'Food spot');

    const activePosts = group.filter(p => !isExpired(p.expires_at));
    const variant: MarkerVariant =
      activePosts.length > 0 ? (activePosts[0].type as PostType) : 'expired';

    return {
      id,
      key: id,
      locationName: displayName,
      lat,
      lng,
      posts: group,
      variant,
    };
  });
}
