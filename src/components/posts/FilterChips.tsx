interface FilterChipsProps {
  active: string;
  onChange: (value: string) => void;
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🍕 Free Food', value: 'free_food' },
  { label: '⭐ Recs', value: 'recommendation' },
  { label: '🎉 Events', value: 'event' },
  { label: '🥗 Vegan', value: 'dietary:vegan' },
  { label: '🌾 GF', value: 'dietary:gluten-free' },
];

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-4">
      {FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={[
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            active === f.value
              ? 'bg-[#1a1a1a] text-white'
              : 'bg-white border border-[#e5e7eb] text-[#4b5563] hover:border-[#d1d5db]',
          ].join(' ')}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
