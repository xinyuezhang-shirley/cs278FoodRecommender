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
      type="button"
      onClick={onLocate}
      disabled={loading}
      className={[
        'absolute bottom-4 right-3 z-[1000] w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border shadow-[0_8px_20px_rgba(47,95,196,0.22)]',
        userLocation
          ? 'bg-[#2f5fc4] text-white border-[#2f5fc4]'
          : 'bg-white/95 text-[#6b7280] border-[#e5e7eb] backdrop-blur-sm',
      ].join(' ')}
      aria-label="Locate me"
      style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
    >
      {loading ? (
        <span
          className={[
            'w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block',
            userLocation ? 'border-white' : 'border-[#2f5fc4]',
          ].join(' ')}
        />
      ) : (
        <Navigation className="w-4 h-4" aria-hidden />
      )}
    </button>
  );
}
