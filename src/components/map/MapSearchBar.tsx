import { Search, X } from 'lucide-react';

interface MapSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function MapSearchBar({ value, onChange }: MapSearchBarProps) {
  return (
    <div
      className="relative flex items-center"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '100px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <Search className="absolute left-3.5 w-4 h-4 text-[#9ca3af] pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Find food near you…"
        className="w-full pl-9 pr-8 py-2.5 bg-transparent text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-[#9ca3af] hover:text-[#6b7280]"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
