import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Navigation } from 'lucide-react';

const OPTIONS = [
  { value: '',      label: 'Any distance' },
  { value: '5min',  label: '5 min walk (~0.25 mi)' },
  { value: '10min', label: '10 min walk (~0.5 mi)' },
  { value: '15min', label: '15 min walk (~0.75 mi)' },
  { value: '1mi',   label: 'Within 1 mile' },
  { value: '3mi',   label: 'Within 3 miles' },
  { value: '5mi',   label: 'Within 5 miles' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

export function DistanceFilterDropdown({ value, onChange, hasLocation, onRequestLocation }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = OPTIONS.find(o => o.value === value);
  const label = value ? selected?.label ?? 'Distance' : 'Distance';

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-all"
        style={{
          background: value ? '#1a1a1a' : 'rgba(255,255,255,0.85)',
          color: value ? 'white' : '#374151',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: value ? 'none' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        }}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[210px]"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}
        >
          {!hasLocation && (
            <button
              onClick={() => { onRequestLocation(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#6366f1] hover:bg-[#f5f3ff] border-b border-[#f0f0f0]"
            >
              <Navigation className="w-3.5 h-3.5" /> Enable location for distance
            </button>
          )}
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              disabled={!hasLocation && opt.value !== ''}
              className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-[#f9fafb] text-left disabled:opacity-40"
              style={{ fontWeight: value === opt.value ? 700 : 400, color: value === opt.value ? '#1a1a1a' : '#374151' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
