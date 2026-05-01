import { Search, X } from 'lucide-react';

interface MapSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function MapSearchBar({ value, onChange }: MapSearchBarProps) {
  return (
    <div
      className="relative flex items-center rounded-full border border-[#e5e7eb] bg-white/95 shadow-[0_6px_20px_rgba(47,95,196,0.1)] backdrop-blur-md overflow-hidden"
      style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
    >
      <Search className="absolute left-3.5 w-4 h-4 text-[#6f90d8] pointer-events-none" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Find food near you…"
        className="w-full pl-9 pr-9 py-2.5 bg-transparent text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5fc4]/15 rounded-full"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 text-[#9ca3af] hover:text-[#2f5fc4] rounded-full"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
