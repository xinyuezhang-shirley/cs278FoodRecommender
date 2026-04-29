import { useState, useCallback, useMemo } from 'react';

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error'; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'Geolocation not supported' });
      return;
    }
    setState({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      pos => setState({ status: 'success', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        const msg =
          err.code === err.PERMISSION_DENIED ? 'Location access denied'
          : err.code === err.TIMEOUT ? 'Location request timed out'
          : 'Unable to get location';
        setState({ status: 'error', message: msg });
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  // Memoize the tuple so its reference is stable between renders — prevents
  // downstream useEffects from firing on every re-render when coords haven't changed.
  const userLocation = useMemo<[number, number] | null>(() => {
    if (state.status !== 'success') return null;
    return [state.lat, state.lng];
  }, [state]); // state ref only changes when setState is called

  return { state, request, userLocation };
}
