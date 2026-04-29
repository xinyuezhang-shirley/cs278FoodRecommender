import { Navigation } from 'lucide-react';
import type { GeolocationState } from '../../hooks/useGeolocation';

interface Props {
  geoState: GeolocationState;
  userLocation: [number, number] | null;
  onLocate: () => void;
}

export function LocateMeButton({ geoState, userLocation, onLocate }: Props) {
  const loading = geoState.status === 'loading';

  return (
    <button
      onClick={onLocate}
      disabled={loading}
      className="absolute bottom-20 right-3 z-[1000] w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{
        background: userLocation ? '#6366f1' : 'rgba(255,255,255,0.95)',
        color: userLocation ? 'white' : '#6b7280',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        border: userLocation ? 'none' : '1px solid rgba(0,0,0,0.06)',
      }}
      aria-label="Locate me"
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin inline-block" />
      ) : (
        <Navigation className="w-4 h-4" />
      )}
    </button>
  );
}
