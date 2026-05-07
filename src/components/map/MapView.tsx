import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { createPlaceBobaIcon } from './BobaMapMarker';
import { CurrentLocationMarker } from './CurrentLocationMarker';
import type { PlaceGroup } from '../../utils/groupPostsByLocation';

export type { PlaceGroup, PinGroup } from '../../utils/groupPostsByLocation';

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
