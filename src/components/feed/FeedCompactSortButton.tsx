import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, TrendingUp } from 'lucide-react';

interface Props {
  sortBy: 'recent' | 'popular';
  onChange: (v: 'recent' | 'popular') => void;
}

export function FeedCompactSortButton({ sortBy, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-xs font-black text-[#2f5fc4] px-3 py-2 rounded-full border border-[#dbe4ff] bg-[#f5f7ff]/90 min-h-[40px] transition-colors hover:border-[#2f5fc4]/40"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {sortBy === 'recent' ? (
          <Clock className="w-3.5 h-3.5 opacity-80" aria-hidden />
        ) : (
          <TrendingUp className="w-3.5 h-3.5 opacity-80" aria-hidden />
        )}
        {sortBy === 'recent' ? 'Recent' : 'Popular'}
        <ChevronDown className="w-3 h-3 opacity-60" aria-hidden />
      </button>

      {open && (
        <ul
          className="absolute right-0 top-full mt-1.5 z-[600] min-w-[10.5rem] rounded-2xl border border-[#e5e7eb] bg-white py-1 shadow-[0_12px_32px_rgba(47,95,196,0.14)] overflow-hidden"
          role="listbox"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={sortBy === 'recent'}
              onClick={() => {
                onChange('recent');
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold hover:bg-[#faf9f5] text-[#374151]"
            >
              <Clock className="w-4 h-4 text-[#6f90d8]" aria-hidden />
              Most recent
            </button>
          </li>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={sortBy === 'popular'}
              onClick={() => {
                onChange('popular');
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold hover:bg-[#faf9f5] text-[#374151]"
            >
              <TrendingUp className="w-4 h-4 text-[#2f5fc4]" aria-hidden />
              Most popular
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
