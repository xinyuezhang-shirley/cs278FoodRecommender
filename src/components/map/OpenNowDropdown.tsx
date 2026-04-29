import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const OPTIONS = [
  { value: '',        label: 'Any time' },
  { value: 'open',    label: 'Open now' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'late',    label: 'Open late (9pm+)' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function OpenNowDropdown({ value, onChange }: Props) {
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

  const label = OPTIONS.find(o => o.value === value)?.label ?? 'Any time';

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
          className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[160px]"
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
              className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-[#f9fafb] text-left"
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
