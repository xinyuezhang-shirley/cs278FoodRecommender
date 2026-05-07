import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, X, ChevronRight, Loader2 } from 'lucide-react';
import { CAMPUS_LOCATIONS } from '../../utils/helpers';
import type { LocationAutocompleteItem } from '../../services/locationService';
import {
  autocompletePlaces,
  fetchPlaceLatLng,
  isNominatimSearchEnabled,
  placesSearchAvailable,
} from '../../services/locationService';
import { ensureGoogleMapsLoaded, isGoogleMapsConfigured } from '../../services/googleMapsPlaces';

export interface LocationSelection {
  name: string;
  lat?: number;
  lng?: number;
  place_website_url?: string;
  google_maps_url?: string;
}

interface Props {
  locationName: string;
  onSelect: (sel: LocationSelection) => void;
}

export function LocationPicker({ locationName, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<LocationAutocompleteItem[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  /** Warm up Maps JS when the sheet opens so the first keystroke hits a ready SDK. */
  const [mapsBootstrap, setMapsBootstrap] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const placesEnabled = placesSearchAvailable();
  const googleConfigured = isGoogleMapsConfigured();
  const nominatimConfigured = isNominatimSearchEnabled();

  const runMapsWarmup = useCallback(() => {
    if (!googleConfigured) return;
    setMapsBootstrap('loading');
    void ensureGoogleMapsLoaded().then(g => {
      setMapsBootstrap(g ? 'ready' : 'failed');
    });
  }, [googleConfigured]);

  useEffect(() => {
    if (!open || !googleConfigured) return;
    try {
      if (
        typeof google !== 'undefined'
        && google.maps?.places?.AutocompleteService !== undefined
      ) {
        setMapsBootstrap('ready');
        return;
      }
    } catch {
      /* optional bootstrap */
    }
    runMapsWarmup();
  }, [open, googleConfigured, runMapsWarmup]);

  useEffect(() => {
    if (!open) setMapsBootstrap('idle');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setRemoteSuggestions([]);
      return;
    }
    let cancelled = false;
    setPlacesLoading(true);
    void autocompletePlaces(debouncedQuery)
      .then((rows) => { if (!cancelled) setRemoteSuggestions(rows); })
      .catch(() => { if (!cancelled) setRemoteSuggestions([]); })
      .finally(() => { if (!cancelled) setPlacesLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const filtered = CAMPUS_LOCATIONS.filter(l =>
    !query || l.name.toLowerCase().includes(query.toLowerCase())
  );

  function finalize(sel: LocationSelection) {
    onSelect(sel);
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setRemoteSuggestions([]);
    setCustomMode(false);
    setCustomDraft('');
    setResolvingPlaceId(null);
  }

  async function selectRemotePlace(item: LocationAutocompleteItem) {
    const displayLine = item.secondary ? `${item.displayName} · ${item.secondary}` : item.displayName;

    if (
      item.source === 'osm'
      && item.lat != null
      && item.lng != null
      && Number.isFinite(item.lat)
      && Number.isFinite(item.lng)
    ) {
      finalize({
        name: displayLine,
        lat: item.lat,
        lng: item.lng,
        google_maps_url: item.openStreetMapUrl,
      });
      return;
    }

    if (!item.placeId) {
      finalize({ name: displayLine });
      return;
    }
    setResolvingPlaceId(item.placeId);
    const det = await fetchPlaceLatLng(item.placeId);
    setResolvingPlaceId(null);
    if (det) {
      finalize({
        name: det.displayName,
        lat: det.lat,
        lng: det.lng,
        place_website_url: det.placeWebsiteUrl,
        google_maps_url: det.googleMapsUrl,
      });
    } else {
      finalize({ name: item.secondary ? `${item.displayName}, ${item.secondary}` : item.displayName });
    }
  }

  function selectCampus(name: string, lat?: number, lng?: number) {
    finalize({ name, lat, lng });
  }

  function applyCustom() {
    const v = customDraft.trim();
    if (v) finalize({ name: v });
  }

  function handleOpenAndClear() {
    onSelect({ name: '' });
    setOpen(true);
  }

  const googleRemote = remoteSuggestions.filter(s => s.source !== 'osm');
  const osmRemote = remoteSuggestions.filter(s => s.source === 'osm');

  return (
    <div ref={containerRef} className="relative">
      {locationName ? (
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <MapPin className="w-4 h-4 shrink-0 text-[#f43f5e]" aria-hidden />
          <span className="text-sm font-medium text-[#1a1a1a] flex-1 cursor-pointer" onClick={handleOpenAndClear}>
            {locationName}
          </span>
          <button
            type="button"
            onClick={() => onSelect({ name: '' })}
            className="w-5 h-5 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0"
            aria-label="Clear location"
          >
            <X className="w-3 h-3 text-[#6b7280]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 px-4 py-3.5 w-full text-left"
        >
          <MapPin className="w-4 h-4 text-[#9ca3af] shrink-0" aria-hidden />
          <span className="text-sm text-[#9ca3af]">Where is this food?</span>
        </button>
      )}

      {open && (
        <div
          className="absolute left-4 right-4 top-full z-[600] rounded-2xl overflow-hidden border border-[#e8ecf4]"
          style={{ background: 'white', boxShadow: '0 12px 48px rgba(47,95,196,0.15), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="px-3 py-2 bg-[#fafbff] border-b border-[#f0f4ff] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#6f90d8] shrink-0" aria-hidden />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search place name (cafés, restaurants, spots)…"
              className="flex-1 text-sm text-[#1a1a1a] outline-none bg-transparent placeholder-[#94a3b8]"
            />
            {placesLoading && <Loader2 className="w-4 h-4 text-[#2f5fc4] animate-spin shrink-0" aria-hidden />}
          </div>

          {!placesEnabled && (
            <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-950 leading-snug">
              Off-campus search is off. Set <span className="font-mono">VITE_GOOGLE_MAPS_API_KEY</span> for Google Places, or leave Nominatim enabled (default) with optional{' '}
              <span className="font-mono">VITE_NOMINATIM_EMAIL</span> for fair-use contact.
            </div>
          )}
          {placesEnabled && !googleConfigured && nominatimConfigured && (
            <div className="px-3 py-2 bg-sky-50 border-b border-sky-100 text-[11px] text-sky-950 leading-snug">
              Searching with{' '}
              <a
                href="https://nominatim.openstreetmap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Nominatim
              </a>
              {' '}(OpenStreetMap). Follow the{' '}
              <a
                href="https://operations.osmfoundation.org/policies/nominatim/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                usage policy
              </a>
              ; add <span className="font-mono">VITE_NOMINATIM_EMAIL</span> in production if you can.
            </div>
          )}
          {googleConfigured && mapsBootstrap === 'loading' && (
            <div className="px-3 py-1.5 border-b border-[#f0f4ff] text-[11px] text-[#6b7280] flex items-center gap-2 bg-white">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
              Connecting to Google Places…
            </div>
          )}
          {googleConfigured && mapsBootstrap === 'failed' && (
            <div className="px-3 py-2 bg-rose-50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-950">
              <span className="min-w-[12rem]">Maps didn’t load. Check billing, Places + Maps JS on the key, and referrer restrictions.</span>
              <button
                type="button"
                onClick={() => runMapsWarmup()}
                className="shrink-0 font-bold text-[#be123c] underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          <div className="max-h-[260px] overflow-y-auto overscroll-contain bg-white">
            <p className="text-[10px] font-black text-[#9ca3af] uppercase px-4 pt-3 pb-1 tracking-wide">On campus</p>
            {filtered.map(loc => (
              <button
                key={loc.name}
                type="button"
                onClick={() => selectCampus(loc.name, loc.lat, loc.lng)}
                className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-[#faf9f5]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2f5fc4] mt-1 shrink-0" />
                <span className="text-sm text-[#1a1a1a]">{loc.name}</span>
              </button>
            ))}
            {filtered.length === 0 && !remoteSuggestions.length && !placesLoading && (
              <p className="text-xs text-[#9ca3af] px-4 py-3 leading-relaxed">
                {debouncedQuery.length < 2
                  ? 'Type at least two characters to search off campus (Google Places and/or OpenStreetMap).'
                  : googleConfigured && mapsBootstrap === 'failed'
                    ? 'Google search isn’t available right now — try OpenStreetMap results, campus picks, or Pin manually.'
                    : placesEnabled
                      ? 'Nothing matched yet. Try simpler words — or Pin a spot manually.'
                      : 'Try another spelling — or Pin a spot manually.'}
              </p>
            )}

            {googleRemote.length > 0 && (
              <>
                <p className="text-[10px] font-black text-[#9ca3af] uppercase px-4 pt-4 pb-1 tracking-wide flex items-center gap-2">
                  Google Places
                  <span className="font-semibold lowercase text-[#c4c9d6] tracking-normal normal-case">Pins map when available</span>
                </p>
                {googleRemote.map(item => {
                  const key = `g-${item.placeId ?? item.displayName}-${item.secondary ?? ''}`;
                  const busy = resolvingPlaceId === item.placeId && item.placeId;
                  const line2 = item.secondary;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void selectRemotePlace(item)}
                      disabled={!!busy}
                      className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-[#fafbff] disabled:opacity-50"
                    >
                      <span className="text-lg shrink-0" aria-hidden>📍</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#1a1a1a] truncate">{item.displayName}</span>
                        {line2 && <span className="block text-xs text-[#6b7280] mt-0.5 line-clamp-2">{line2}</span>}
                      </span>
                      {busy && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#2f5fc4]" />}
                    </button>
                  );
                })}
              </>
            )}

            {osmRemote.length > 0 && (
              <>
                <p className="text-[10px] font-black text-[#9ca3af] uppercase px-4 pt-4 pb-1 tracking-wide flex items-center gap-2">
                  OpenStreetMap
                  <span className="font-semibold lowercase text-[#c4c9d6] tracking-normal normal-case">Nominatim · © OSM contributors</span>
                </p>
                {osmRemote.map(item => {
                  const key = `o-${item.placeId ?? item.displayName}-${item.secondary ?? ''}`;
                  const line2 = item.secondary;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void selectRemotePlace(item)}
                      className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-[#f0fdf4]"
                    >
                      <span className="text-lg shrink-0" aria-hidden>🗺️</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#1a1a1a] truncate">{item.displayName}</span>
                        {line2 && <span className="block text-xs text-[#6b7280] mt-0.5 line-clamp-2">{line2}</span>}
                      </span>
                    </button>
                  );
                })}
                <p className="text-[10px] text-[#94a3b8] px-4 pb-2 pt-1">
                  © OpenStreetMap contributors, ODbL. Data{' '}
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                    licensing
                  </a>
                  .
                </p>
              </>
            )}
          </div>

          <div className="border-t border-[#f3f4f6] bg-[#faf9f5]/80">
            {!customMode ? (
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/80"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" aria-hidden />
                <span className="text-sm text-[#6b7280]">Pin a spot manually…</span>
              </button>
            ) : (
              <div className="flex gap-2 px-3 py-2.5 items-center">
                <input
                  autoFocus
                  type="text"
                  value={customDraft}
                  onChange={e => setCustomDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyCustom();
                    }
                  }}
                  placeholder="Name this place yourself"
                  className="flex-1 text-sm px-3 py-1.5 bg-white rounded-xl border border-[#e5e7eb] outline-none"
                />
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!customDraft.trim()}
                  className="text-sm font-semibold px-2 disabled:opacity-40 text-[#f43f5e]"
                >
                  Use
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
