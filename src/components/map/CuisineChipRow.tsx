const CHIPS = [
  { value: '',               label: 'All' },
  { value: 'free_food',      label: '🎁 Free Food' },
  { value: 'recommendation', label: '⭐ Recs' },
  { value: 'event',          label: '🎉 Events' },
  { value: 'boba',           label: '🧋 Boba' },
  { value: 'coffee',         label: '☕ Coffee' },
  { value: 'pizza',          label: '🍕 Pizza' },
  { value: 'ramen',          label: '🍜 Ramen' },
  { value: 'tacos',          label: '🌮 Mexican' },
  { value: 'indian',         label: '🍛 Indian' },
  { value: 'dim sum',        label: '🥟 Chinese' },
  { value: 'salad',          label: '🥗 Healthy' },
  { value: 'sandwiches',     label: '🥪 Sandwiches' },
];

interface CuisineChipRowProps {
  active: string;
  onChange: (v: string) => void;
}

export function CuisineChipRow({ active, onChange }: CuisineChipRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none' }}>
      {CHIPS.map(chip => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              isActive
                ? { background: '#1a1a1a', color: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.18)' }
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
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
