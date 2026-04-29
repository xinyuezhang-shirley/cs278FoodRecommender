import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const OPTIONS = [
  'vegan', 'vegetarian', 'halal', 'kosher',
  'gluten-free', 'dairy-free', 'nut-free',
  'soy-free', 'egg-free', 'shellfish-free',
  'low-carb', 'keto', 'paleo', 'raw', 'whole30',
];

interface Props {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function DietaryFilterDropdown({ selected, onChange }: Props) {
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

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }

  const label = selected.length === 0
    ? 'Dietary'
    : `Dietary · ${selected.length}`;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-all"
        style={{
          background: selected.length ? '#1a1a1a' : 'rgba(255,255,255,0.85)',
          color: selected.length ? 'white' : '#374151',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: selected.length ? 'none' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        }}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[180px]"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}
        >
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#f43f5e] hover:bg-[#fff0f3]"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          {OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-[#f9fafb] text-left"
            >
              <span className="capitalize text-[#1a1a1a]">{opt}</span>
              {selected.includes(opt) && <Check className="w-3.5 h-3.5 text-[#16a34a] flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
