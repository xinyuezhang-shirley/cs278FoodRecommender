import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { ChevronDown, Clock, TrendingUp } from 'lucide-react';

interface Props {
  value: 'recent' | 'popular';
  onChange: (v: 'recent' | 'popular') => void;
}

const OPTIONS: { value: 'recent' | 'popular'; label: string; Icon: FC<{ className?: string }> }[] = [
  { value: 'recent', label: 'Most recent', Icon: Clock },
  { value: 'popular', label: 'Most popular', Icon: TrendingUp },
];

export function SortByDropdown({ value, onChange }: Props) {
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

  const selected = OPTIONS.find(o => o.value === value)!;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-bold transition-all bg-[#f5f7ff] border border-[#e5e7eb] text-[#6b7280] hover:border-[#2f5fc4]/35"
      >
        <selected.Icon className="w-3 h-3 opacity-80" aria-hidden />
        {selected.label}
        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
      </button>

      {open && (
        <div className="absolute top-10 right-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[168px] bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)]">
          {OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left transition-colors font-medium text-[#1a1a1a]"
              style={{ fontWeight: value === opt.value ? 700 : 500 }}
            >
              <opt.Icon className={`w-3.5 h-3.5 ${value === opt.value ? 'text-[#2f5fc4]' : 'text-[#6b7280]'}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
