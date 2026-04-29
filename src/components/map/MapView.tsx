import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Post, PostType } from '../../types';
import { isExpired } from '../../utils/helpers';
import { createBobaIcon, type MarkerVariant } from './BobaMapMarker';
import { CurrentLocationMarker } from './CurrentLocationMarker';

export interface PinGroup {
  key: string;
  locationName: string;
  lat: number;
  lng: number;
  posts: Post[];
  variant: MarkerVariant;
}

export function groupPostsByLocation(posts: Post[]): PinGroup[] {
  const map = new Map<string, Post[]>();

  for (const post of posts) {
    if (post.latitude == null || post.longitude == null) continue;
    const key = post.location_name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(post);
  }

  return Array.from(map.entries()).map(([key, group]) => {
    const latest = group[0];
    const lat = group.reduce((s, p) => s + (p.latitude ?? 0), 0) / group.length;
    const lng = group.reduce((s, p) => s + (p.longitude ?? 0), 0) / group.length;

    const activePosts = group.filter(p => !isExpired(p.expires_at));
    const variant: MarkerVariant =
      activePosts.length > 0 ? (activePosts[0].type as PostType) : 'expired';

    return { key, locationName: latest.location_name, lat, lng, posts: group, variant };
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

interface MapViewProps {
  pinGroups: PinGroup[];
  center: [number, number];
  zoom: number;
  onPinClick: (group: PinGroup) => void;
  onMapTap: () => void;
  userLocation?: [number, number] | null;
}

export function MapView({ pinGroups, center, zoom, onPinClick, onMapTap, userLocation }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      <MapTapHandler onTap={onMapTap} />
      <RecenterOnChange center={center} zoom={zoom} />

      {userLocation && <CurrentLocationMarker position={userLocation} />}

      {pinGroups.map(group => (
        <Marker
          key={group.key}
          position={[group.lat, group.lng]}
          icon={createBobaIcon(group.variant, group.posts.length)}
          eventHandlers={{
            click: (e) => {
              // Stop the click reaching the map — otherwise MapTapHandler immediately clears selectedGroup
              L.DomEvent.stopPropagation(e as unknown as Event);
              onPinClick(group);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
