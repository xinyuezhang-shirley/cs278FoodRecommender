import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let loadPromise: Promise<typeof google> | null = null;

function getMapsKey(): string {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof k === 'string' ? k.trim() : '';
}

export function isGoogleMapsConfigured(): boolean {
  return getMapsKey().length > 0;
}

export async function ensureGoogleMapsLoaded(): Promise<typeof google | null> {
  const apiKey = getMapsKey();
  if (!apiKey) return null;
  try {
    if (loadPromise == null) {
      loadPromise = (async () => {
        setOptions({ key: apiKey, v: 'weekly' });
        await importLibrary('places');
        if (typeof google === 'undefined') {
          throw new Error('Google Maps JS did not bootstrap');
        }
        return google;
      })();
    }
    return await loadPromise;
  } catch {
    loadPromise = null;
    return null;
  }
}

function mapsJsPredictions(
  service: google.maps.places.AutocompleteService,
  g: typeof google,
  trimmed: string,
  types: string[] | undefined,
): Promise<Array<{ description: string; placeId: string }>> {
  return new Promise(resolve => {
    service.getPlacePredictions(
      {
        input: trimmed,
        componentRestrictions: { country: ['us'] },
        ...(types?.length ? { types } : {}),
        locationBias: new g.maps.LatLngBounds(
          new g.maps.LatLng(37.41, -122.2),
          new g.maps.LatLng(37.46, -122.12),
        ),
      },
      (predictions, status) => {
        if (
          status !== g.maps.places.PlacesServiceStatus.OK
          && status !== g.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          resolve([]);
          return;
        }
        resolve(
          (predictions ?? []).slice(0, 10).map((p) => ({
            description: p.description,
            placeId: p.place_id,
          })),
        );
      },
    );
  });
}

/** Prefer food/business venues, then fall back to general place search for names & landmarks. */
export async function autocompleteWithMapsJs(
  input: string,
): Promise<Array<{ description: string; placeId: string }>> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];
  const g = await ensureGoogleMapsLoaded();
  if (!g) return [];

  const service = new g.maps.places.AutocompleteService();
  const venues = await mapsJsPredictions(service, g, trimmed, ['establishment']);
  if (venues.length > 0) return venues;
  return mapsJsPredictions(service, g, trimmed, undefined);
}

export interface MapsJsPlaceDetails {
  name: string;
  lat: number;
  lng: number;
  website?: string;
  /** Google Maps listing URL for this place. */
  googleMapsUrl?: string;
}

export async function fetchPlaceDetailsMapsJs(placeId: string): Promise<MapsJsPlaceDetails | null> {
  const trimmed = placeId.trim();
  if (!trimmed) return null;
  const g = await ensureGoogleMapsLoaded();
  if (!g) return null;

  const elt = document.createElement('div');
  const svc = new g.maps.places.PlacesService(elt);
  return new Promise(resolve => {
    svc.getDetails(
      {
        placeId: trimmed,
        fields: ['name', 'geometry', 'formatted_address', 'website', 'url'],
      },
      (place, status) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          resolve(null);
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const website = typeof place.website === 'string' ? place.website.trim() : undefined;
        const googleMapsUrl = typeof place.url === 'string' ? place.url.trim() : undefined;
        resolve({
          name: (place.name || place.formatted_address || '').trim() || trimmed,
          lat,
          lng,
          ...(website ? { website } : {}),
          ...(googleMapsUrl ? { googleMapsUrl } : {}),
        });
      },
    );
  });
}
