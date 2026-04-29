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
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
        style={
          active
            ? {
                background: '#16a34a',
                color: 'white',
                boxShadow: '0 1px 6px rgba(22,163,74,0.3)',
              }
            : {
                background: 'rgba(255,255,255,0.92)',
                color: '#374151',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }
        }
      >
        {active ? selectedLabel : label}
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 min-w-[140px] rounded-2xl overflow-hidden z-[500]"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Clear option */}
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
          >
            <span>Any {label.toLowerCase()}</span>
            {value === '' && <Check className="w-3.5 h-3.5 text-[#16a34a]" />}
          </button>
          <div className="h-px bg-[#f3f4f6]" />
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors"
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-[#16a34a]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
