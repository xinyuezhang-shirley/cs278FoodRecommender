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
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-1 h-8 px-3 rounded-full text-xs font-bold transition-all border',
          value
            ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_6px_16px_rgba(47,95,196,0.25)]'
            : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb]',
        ].join(' ')}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-70" aria-hidden />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[210px] bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)]">
          {!hasLocation && (
            <button
              type="button"
              onClick={() => { onRequestLocation(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#2f5fc4] hover:bg-[#eaf1ff] border-b border-[#e5e7eb]"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden /> Enable location for distance
            </button>
          )}
          {OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              disabled={!hasLocation && opt.value !== ''}
              className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left disabled:opacity-40 transition-colors font-medium text-[#374151]"
              style={{ fontWeight: value === opt.value ? 700 : 500, color: value === opt.value ? '#2f5fc4' : '#374151' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
