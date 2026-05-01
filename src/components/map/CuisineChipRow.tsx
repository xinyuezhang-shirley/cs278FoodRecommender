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
            type="button"
            onClick={() => onChange(chip.value)}
            className={[
              'flex-shrink-0 rounded-full px-3 py-2 text-sm font-bold transition-all border',
              isActive
                ? 'bg-[#2f5fc4] text-white border-[#2f5fc4]'
                : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb] hover:border-[#2f5fc4]/35',
            ].join(' ')}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
