const CHIPS = [
  { value: 'free_food',      label: '🎁 Free Food' },
  { value: '',               label: 'All' },
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
            key={chip.value || 'all'}
            type="button"
            onClick={() => onChange(chip.value)}
            className={[
              'flex-shrink-0 rounded-full px-3 py-2 text-sm font-bold border transition-all duration-200 ease-out',
              'motion-safe:active:scale-[0.97]',
              isActive
                ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_6px_18px_rgba(47,95,196,0.22)]'
                : chip.value === 'free_food'
                  ? 'bg-[#fff8e8] text-[#b45309] border-[#fcd34d]/80 hover:border-[#f59e0b]/60'
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
