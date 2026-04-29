import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, ChevronRight } from 'lucide-react';
import { CAMPUS_LOCATIONS } from '../../utils/helpers';

interface Props {
  locationName: string;
  onSelect: (name: string, lat?: number, lng?: number) => void;
}

export function LocationPicker({ locationName, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const filtered = CAMPUS_LOCATIONS.filter(l =>
    !query || l.name.toLowerCase().includes(query.toLowerCase())
  );

  function select(name: string, lat?: number, lng?: number) {
    onSelect(name, lat, lng);
    setOpen(false);
    setQuery('');
    setCustomMode(false);
    setCustomDraft('');
  }

  function applyCustom() {
    const v = customDraft.trim();
    if (v) select(v);
  }

  function handleOpenAndClear() {
    onSelect('', undefined, undefined);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      {locationName ? (
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#f43f5e' }} />
          <span
            className="text-sm font-medium text-[#1a1a1a] flex-1 cursor-pointer"
            onClick={handleOpenAndClear}
          >
            {locationName}
          </span>
          <button
            type="button"
            onClick={() => onSelect('', undefined, undefined)}
            className="w-5 h-5 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0"
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
          <MapPin className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
          <span className="text-sm text-[#9ca3af]">Add location</span>
        </button>
      )}

      {open && (
        <div
          className="absolute left-4 right-4 top-full z-[600] rounded-2xl overflow-hidden"
          style={{ background: 'white', boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {/* Search row */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f3f4f6]">
            <Search className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search locations…"
              className="flex-1 text-sm text-[#1a1a1a] outline-none bg-transparent placeholder-[#9ca3af]"
            />
          </div>

          {/* Location list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map(loc => (
              <button
                key={loc.name}
                type="button"
                onClick={() => select(loc.name, loc.lat, loc.lng)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#fafafa] transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
                <span className="text-sm text-[#1a1a1a]">{loc.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-[#9ca3af] px-4 py-3">No matching locations</p>
            )}
          </div>

          {/* Custom location */}
          <div className="border-t border-[#f3f4f6]">
            {!customMode ? (
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#fafafa] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" />
                <span className="text-sm text-[#6b7280]">Custom location…</span>
              </button>
            ) : (
              <div className="flex gap-2 px-3 py-2.5 items-center">
                <input
                  autoFocus
                  type="text"
                  value={customDraft}
                  onChange={e => setCustomDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustom(); } }}
                  placeholder="Enter location name…"
                  className="flex-1 text-sm px-3 py-1.5 bg-[#f3f4f6] rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!customDraft.trim()}
                  className="text-sm font-semibold px-1 disabled:opacity-40"
                  style={{ color: '#f43f5e' }}
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
