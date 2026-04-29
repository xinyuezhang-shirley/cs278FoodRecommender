import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, TrendingUp } from 'lucide-react';

interface Props {
  value: 'recent' | 'popular';
  onChange: (v: 'recent' | 'popular') => void;
}

const OPTIONS: { value: 'recent' | 'popular'; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'recent',  label: 'Most recent',  Icon: Clock },
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
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-all"
        style={{
          background: 'rgba(255,255,255,0.92)',
          color: '#374151',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <selected.Icon className="w-3 h-3 opacity-70" />
        {selected.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute top-10 right-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[160px]"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}
        >
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#f9fafb] text-left"
              style={{ fontWeight: value === opt.value ? 700 : 400, color: '#1a1a1a' }}
            >
              <opt.Icon className="w-3.5 h-3.5 text-[#6b7280]" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
