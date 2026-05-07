import { autocompleteWithMapsJs, fetchPlaceDetailsMapsJs, isGoogleMapsConfigured } from './googleMapsPlaces';
import { isNominatimSearchEnabled, searchNominatim } from './nominatimGeocode';

export { isNominatimSearchEnabled, getNominatimBaseUrl } from './nominatimGeocode';

export interface LocationAutocompleteItem {
  /** Display title (Place name line). */
  displayName: string;
  secondary?: string;
  placeId?: string;
  /** Present for Nominatim hits (no extra geocode call). */
  lat?: number;
  lng?: number;
  source?: 'google' | 'osm';
  openStreetMapUrl?: string;
}

function dedupeKey(x: LocationAutocompleteItem): string {
  return `${x.displayName.trim().toLowerCase()}|${(x.secondary ?? '').trim().toLowerCase().slice(0, 64)}`;
}

/** True when off-campus search can run (Google Places and/or Nominatim). */
export function placesSearchAvailable(): boolean {
  return isGoogleMapsConfigured() || isNominatimSearchEnabled();
}

export async function autocompletePlaces(query: string): Promise<LocationAutocompleteItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const runGoogle = isGoogleMapsConfigured()
    ? (async (): Promise<LocationAutocompleteItem[]> => {
        const mapsPredictions = await autocompleteWithMapsJs(q);
        const mapRows: LocationAutocompleteItem[] = mapsPredictions.length > 0
          ? mapsPredictions.map(p => {
              const parts = p.description.split(',').map(x => x.trim()).filter(Boolean);
              const primary = parts[0] ?? p.description;
              const secondary = parts.length > 1 ? parts.slice(1).join(', ') : undefined;
              return {
                displayName: primary,
                secondary,
                placeId: p.placeId || undefined,
                source: 'google' as const,
              };
            })
          : await restAutocompleteFallback(q).then(rows => rows.map(r => ({ ...r, source: 'google' as const })));

        const seen = new Set<string>();
        return mapRows.filter(x => {
          const k = dedupeKey(x);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      })()
    : Promise.resolve([]);

  const runNominatim = isNominatimSearchEnabled()
    ? searchNominatim(q).then(rows =>
        rows.map(
          (r): LocationAutocompleteItem => ({
            displayName: r.displayName,
            secondary: r.secondary,
            placeId: r.placeId,
            lat: r.lat,
            lng: r.lng,
            source: 'osm',
            openStreetMapUrl: r.openStreetMapUrl,
          }),
        ),
      )
    : Promise.resolve([]);

  const [goog, nom] = await Promise.all([runGoogle, runNominatim]);

  const seen = new Set<string>();
  const merged: LocationAutocompleteItem[] = [];
  for (const x of goog) {
    const k = dedupeKey(x);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(x);
  }
  for (const x of nom) {
    const k = dedupeKey(x);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(x);
    if (merged.length >= 12) break;
  }
  return merged;
}

export interface PlaceDetailsResolved {
  displayName: string;
  lat: number;
  lng: number;
  placeWebsiteUrl?: string;
  googleMapsUrl?: string;
}

export async function fetchPlaceLatLng(placeId: string): Promise<PlaceDetailsResolved | null> {
  if (placeId.startsWith('osm:')) return null;

  const byJs = await fetchPlaceDetailsMapsJs(placeId);
  if (byJs) {
    return {
      displayName: byJs.name,
      lat: byJs.lat,
      lng: byJs.lng,
      ...(byJs.website ? { placeWebsiteUrl: byJs.website } : {}),
      ...(byJs.googleMapsUrl ? { googleMapsUrl: byJs.googleMapsUrl } : {}),
    };
  }

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key?.trim()) return null;
  return restFetchPlaceFallback(placeId, key.trim());
}

/** Fallback if Maps JS unavailable (blocked build / SSR). Rare for Vite SPA. */
async function restAutocompleteFallback(query: string): Promise<LocationAutocompleteItem[]> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key?.trim()) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify({ input: query, includedRegionCodes: ['us'] }),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
        };
      }>;
    };
    const out: LocationAutocompleteItem[] = [];
    const seen = new Set<string>();
    for (const s of data.suggestions ?? []) {
      const pred = s.placePrediction;
      if (!pred?.text?.text?.trim()) continue;
      const line = pred.text.text.trim();
      const parts = line.split(',').map(x => x.trim()).filter(Boolean);
      const primary = parts[0] ?? line;
      if (seen.has(primary)) continue;
      seen.add(primary);
      out.push({
        displayName: primary,
        secondary: parts.length > 1 ? parts.slice(1).join(', ') : undefined,
        placeId: pred.placeId?.trim(),
      });
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function restFetchPlaceFallback(placeId: string, key: string): Promise<PlaceDetailsResolved | null> {
  const id = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,location,websiteUri,googleMapsUri',
      },
    });
    if (!res.ok) return null;
    const body = await res.json() as {
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      websiteUri?: string;
      googleMapsUri?: string;
    };
    const lat = body.location?.latitude;
    const lng = body.location?.longitude;
    if (lat == null || lng == null) return null;
    const placeWebsiteUrl = body.websiteUri?.trim();
    const googleMapsUrl = body.googleMapsUri?.trim();
    return {
      displayName: body.displayName?.text?.trim() ?? id,
      lat,
      lng,
      ...(placeWebsiteUrl ? { placeWebsiteUrl } : {}),
      ...(googleMapsUrl ? { googleMapsUrl } : {}),
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer `autocompletePlaces` */
export const locationProvider = {
  async search(query: string) {
    return autocompletePlaces(query);
  },
};
