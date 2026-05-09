import type { PostKindFilter } from '../../types/filters';
import { SlidersHorizontal } from 'lucide-react';

interface Props {
  postKind: PostKindFilter;
  onPostKind: (v: PostKindFilter) => void;
  foodCategoryActive: boolean;
  foodSheetOpen: boolean;
  onOpenFoodCategories: () => void;
  advancedFilterCount: number;
  onOpenAdvancedFilters: () => void;
  /** e.g. clear map pin selection when filters change */
  onFilterInteraction?: () => void;
}

const KIND_CHIPS: { value: PostKindFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'free_food', label: '🎁 Free' },
  { value: 'recommendation', label: '⭐ Recs' },
  { value: 'event', label: '🎉 Events' },
];

export function FeedPrimaryFilterRow({
  postKind,
  onPostKind,
  foodCategoryActive,
  foodSheetOpen,
  onOpenFoodCategories,
  advancedFilterCount,
  onOpenAdvancedFilters,
  onFilterInteraction,
}: Props) {
  const compactPill =
    'flex-shrink-0 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-bold leading-tight border rounded-full whitespace-nowrap text-center transition-all duration-200 motion-safe:active:scale-[0.97]';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 w-full">
      <div
        className={[
          'flex flex-1 min-w-0 gap-1 flex-nowrap items-center py-px overflow-x-auto',
          '[scrollbar-width:none] [-ms-overflow-style:none]',
          '[&::-webkit-scrollbar]:hidden',
        ].join(' ')}
        role="group"
        aria-label="Post type and food category"
      >
        {KIND_CHIPS.map(chip => {
          const isActive = postKind === chip.value;
          return (
            <button
              key={chip.value || 'all'}
              type="button"
              title={chip.value === 'free_food' ? 'Free food' : undefined}
              onClick={() => {
                onFilterInteraction?.();
                onPostKind(chip.value);
              }}
              className={[
                compactPill,
                isActive
                  ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_4px_12px_rgba(47,95,196,0.18)]'
                  : chip.value === 'free_food'
                    ? 'bg-[#fff8e8] text-[#b45309] border-[#fcd34d]/70 hover:border-[#f59e0b]/50'
                    : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb] hover:border-[#2f5fc4]/35',
              ].join(' ')}
            >
              {chip.label}
            </button>
          );
        })}

        <button
          type="button"
          title="Food categories"
          onClick={() => {
            onFilterInteraction?.();
            onOpenFoodCategories();
          }}
          className={[
            compactPill,
            foodCategoryActive
              ? 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3] shadow-[0_4px_12px_rgba(244,63,94,0.1)]'
              : 'bg-white text-[#2f5fc4] border-[#dbe4ff] hover:border-[#2f5fc4]/40',
          ].join(' ')}
          aria-expanded={foodSheetOpen}
          aria-label="Food category"
        >
          🍜 Food category
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          onFilterInteraction?.();
          onOpenAdvancedFilters();
        }}
        className={[
          'relative shrink-0 flex flex-row items-center justify-center gap-1 rounded-full border px-2 sm:px-2.5 h-8 sm:h-[34px] min-w-[4.75rem] transition-colors text-[11px] sm:text-xs font-black',
          advancedFilterCount > 0
            ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_4px_12px_rgba(47,95,196,0.22)]'
            : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#2f5fc4]/35',
        ].join(' ')}
        aria-label={`More filters${advancedFilterCount > 0 ? `, ${advancedFilterCount} active` : ''}`}
      >
        {advancedFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#fff1f2] text-[9px] font-black text-[#e11d48] border border-[#fecdd3] flex items-center justify-center leading-none">
            {advancedFilterCount}
          </span>
        )}
        <SlidersHorizontal className="w-[15px] h-[15px] shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="truncate leading-none uppercase tracking-wide text-[10px] sm:text-[11px]">
          Filters
        </span>
      </button>
    </div>
  );
}
