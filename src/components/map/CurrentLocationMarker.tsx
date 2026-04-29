import { CircleMarker, Circle } from 'react-leaflet';

interface Props {
  position: [number, number];
  radiusMeters?: number;
}

export function CurrentLocationMarker({ position, radiusMeters = 150 }: Props) {
  return (
    <>
      <Circle
        center={position}
        radius={radiusMeters}
        pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.08, weight: 1, opacity: 0.3 }}
      />
      <CircleMarker
        center={position}
        radius={9}
        pathOptions={{ color: 'white', fillColor: '#6366f1', fillOpacity: 1, weight: 2.5 }}
      />
    </>
  );
}
