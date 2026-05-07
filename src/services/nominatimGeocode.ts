/** OpenStreetMap Nominatim search — see usage policy https://operations.osmfoundation.org/policies/nominatim/ */

const DEFAULT_BASE = 'https://nominatim.openstreetmap.org';

export function getNominatimBaseUrl(): string {
  const raw = import.meta.env.VITE_NOMINATIM_URL as string | undefined;
  if (typeof raw === 'string' && raw.trim()) return raw.replace(/\/$/, '').trim();
  return DEFAULT_BASE;
}

/** Disable with VITE_NOMINATIM_DISABLED=true */
export function isNominatimSearchEnabled(): boolean {
  const d = import.meta.env.VITE_NOMINATIM_DISABLED as string | undefined;
  return d !== 'true' && d !== '1';
}

export interface NominatimAutocompleteRow {
  displayName: string;
  secondary?: string;
  placeId: string;
  lat: number;
  lng: number;
  openStreetMapUrl?: string;
}

interface NominatimJsonResult {
  lat: string;
  lon: string;
  display_name: string;
  osm_type?: string;
  osm_id?: number;
}

function openStreetMapUrlFromOsm(osmType: string | undefined, osmId: number | undefined): string | undefined {
  if (osmId == null || !osmType) return undefined;
  const t = osmType.toLowerCase();
  if (t === 'node' || t === 'way' || t === 'relation') {
    return `https://www.openstreetmap.org/${t}/${osmId}`;
  }
  return undefined;
}

export async function searchNominatim(query: string): Promise<NominatimAutocompleteRow[]> {
  if (!isNominatimSearchEnabled()) return [];
  const q = query.trim();
  if (q.length < 2) return [];

  const base = getNominatimBaseUrl();
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '8',
    addressdetails: '1',
    countrycodes: 'us',
    dedupe: '1',
    /** SF peninsula / campus bias (not strict) */
    viewbox: '-122.45,37.25,-121.85,37.55',
    bounded: '0',
  });

  const email = import.meta.env.VITE_NOMINATIM_EMAIL as string | undefined;
  if (typeof email === 'string' && email.includes('@')) {
    params.set('email', email.trim());
  }

  const url = `${base}/search?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      mode: 'cors',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];

    const out: NominatimAutocompleteRow[] = [];
    for (const raw of data as NominatimJsonResult[]) {
      const lat = Number.parseFloat(raw.lat);
      const lng = Number.parseFloat(raw.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const full = raw.display_name.split(',').map(s => s.trim()).filter(Boolean);
      const primary = full[0] ?? raw.display_name;
      const secondary = full.length > 1 ? full.slice(1).join(', ') : undefined;
      const osmKey = raw.osm_type != null && raw.osm_id != null
        ? `${String(raw.osm_type).toLowerCase()}:${raw.osm_id}`
        : `${lat.toFixed(5)},${lng.toFixed(5)}`;

      out.push({
        displayName: primary,
        secondary,
        placeId: `osm:${osmKey}`,
        lat,
        lng,
        openStreetMapUrl: openStreetMapUrlFromOsm(raw.osm_type, raw.osm_id),
      });
    }
    return out;
  } catch {
    return [];
  }
}
