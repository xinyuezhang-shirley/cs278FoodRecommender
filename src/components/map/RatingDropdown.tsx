import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star } from 'lucide-react';

const OPTIONS = [
  { value: '',    label: 'Any rating' },
  { value: '4.5', label: '4.5+ ★ Exceptional' },
  { value: '4.0', label: '4.0+ ★ Great' },
  { value: '3.5', label: '3.5+ ★ Good' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function RatingDropdown({ value, onChange }: Props) {
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

  const label = value ? `${value}+ ★` : 'Rating';

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
        {value ? <Star className="w-3 h-3 shrink-0" aria-hidden /> : null}
        {label}
        <ChevronDown className="w-3 h-3 opacity-70" aria-hidden />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[180px] bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)]">
          {OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left transition-colors"
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
