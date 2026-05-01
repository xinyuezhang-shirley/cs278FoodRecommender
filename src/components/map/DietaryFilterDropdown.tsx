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
  const hasSel = selected.length > 0;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-1 h-8 px-3 rounded-full text-xs font-bold transition-all border',
          hasSel
            ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_6px_16px_rgba(47,95,196,0.25)]'
            : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb]',
        ].join(' ')}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-70" aria-hidden />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-[500] rounded-2xl overflow-hidden py-1 min-w-[180px] bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)]">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#2f5fc4] hover:bg-[#eaf1ff]"
            >
              <X className="w-3 h-3" aria-hidden /> Clear all
            </button>
          )}
          {OPTIONS.map(opt => (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-[#faf9f5] text-left transition-colors"
            >
              <span className="capitalize text-[#1a1a1a]">{opt}</span>
              {selected.includes(opt) && <Check className="w-3.5 h-3.5 text-[#2f5fc4] flex-shrink-0" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
