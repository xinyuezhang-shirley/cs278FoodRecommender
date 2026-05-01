import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Post, PostType } from '../../types';
import { isExpired } from '../../utils/helpers';
import { createPlaceBobaIcon, type MarkerVariant } from './BobaMapMarker';
import { CurrentLocationMarker } from './CurrentLocationMarker';

/** Rounded precision for geo-only grouping (~11m). */
const GEO_DECIMALS = 4;

export interface PlaceGroup {
  id: string;
  /** Same as id; kept for callers that still use `key`. */
  key: string;
  locationName: string;
  lat: number;
  lng: number;
  posts: Post[];
  variant: MarkerVariant;
}

/** @deprecated prefer PlaceGroup — same shape */
export type PinGroup = PlaceGroup;
/**
 * One pin per place. Key = `name:` + normalized location_name if set,
 * else `geo:` + lat/lng rounded to GEO_DECIMALS (posts without a name still map by coordinates).
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

function MapTapHandler({ onTap }: { onTap: () => void }) {
  useMapEvents({ click: onTap });
  return null;
}

function RecenterOnChange({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function MapInvalidateSizes() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    invalidate();
    const raf = requestAnimationFrame(invalidate);
    const t = window.setTimeout(invalidate, 120);
    window.addEventListener('resize', invalidate);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);
  return null;
}

interface MapViewProps {
  placeGroups: PlaceGroup[];
  center: [number, number];
  zoom: number;
  onPlaceClick: (place: PlaceGroup) => void;
  onMapTap: () => void;
  userLocation?: [number, number] | null;
}

export function MapView({
  placeGroups,
  center,
  zoom,
  onPlaceClick,
  onMapTap,
  userLocation,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', minHeight: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapInvalidateSizes />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      <MapTapHandler onTap={onMapTap} />
      <RecenterOnChange center={center} zoom={zoom} />

      {userLocation && <CurrentLocationMarker position={userLocation} />}

      {placeGroups.map(place => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={createPlaceBobaIcon(place.variant, place.posts.length)}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e as unknown as Event);
              onPlaceClick(place);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
