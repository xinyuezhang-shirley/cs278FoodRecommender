import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownChipProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}

export function FilterDropdownChip({ label, options, value, onChange }: FilterDropdownChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== '';
  const selectedLabel = options.find(o => o.value === value)?.label;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-1 px-3 py-2 rounded-full text-sm font-bold transition-all border',
          active
            ? 'bg-[#2f5fc4] text-white border-[#2f5fc4]'
            : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb] hover:border-[#2f5fc4]/35',
        ].join(' ')}
      >
        {active ? selectedLabel : label}
        <ChevronDown
          className="w-3 h-3 transition-transform shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 min-w-[140px] rounded-2xl overflow-hidden z-[500] bg-white border border-[#e5e7eb] shadow-[0_12px_32px_rgba(47,95,196,0.14)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#6b7280] hover:bg-[#faf9f5] transition-colors"
          >
            <span>Any {label.toLowerCase()}</span>
            {value === '' && <Check className="w-3.5 h-3.5 text-[#2f5fc4]" aria-hidden />}
          </button>
          <div className="h-px bg-[#e5e7eb]" />
          {options.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#faf9f5] transition-colors"
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-[#2f5fc4]" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
