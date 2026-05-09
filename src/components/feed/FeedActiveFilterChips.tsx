import { X } from 'lucide-react';
import type { MapFilters } from '../../types/mapFilters';
import { labelCuisineFilterToken } from '../../utils/cuisineUi';
import {
  labelForFeedCategorySlug,
  FEED_POPULAR_CATEGORY_SLUGS,
} from './feedPopularCategories';
import { FEED_TIME_OPTIONS, distanceChipSummary } from './feedAdvancedFilterOptions';

interface Props {
  filters: MapFilters;
  setFoodCategories: (v: string[]) => void;
  setDietary: (v: string[]) => void;
  setDistance: (v: string) => void;
  setOpenNow: (v: string) => void;
  setRating: (v: string) => void;
  setPhotosOnly: (v: boolean) => void;
  setCampusOnly: (v: boolean) => void;
  setSortBy: (v: 'recent' | 'popular') => void;
}

function categoryLabel(slug: string): string {
  if (FEED_POPULAR_CATEGORY_SLUGS.has(slug)) return labelForFeedCategorySlug(slug);
  return labelCuisineFilterToken(slug);
}

export function FeedActiveFilterChips({
  filters,
  setFoodCategories,
  setDietary,
  setDistance,
  setOpenNow,
  setRating,
  setPhotosOnly,
  setCampusOnly,
  setSortBy,
}: Props) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const slug of filters.food_categories) {
    chips.push({
      key: `cat-${slug}`,
      label: categoryLabel(slug),
      onRemove: () => setFoodCategories(filters.food_categories.filter(c => c !== slug)),
    });
  }

  for (const d of filters.dietary) {
    chips.push({
      key: `diet-${d}`,
      label: d,
      onRemove: () => setDietary(filters.dietary.filter(x => x !== d)),
    });
  }

  if (filters.distance) {
    const summary = distanceChipSummary(filters.distance);
    chips.push({
      key: 'dist',
      label: summary || 'Distance',
      onRemove: () => setDistance(''),
    });
  }

  if (filters.openNow) {
    const label = FEED_TIME_OPTIONS.find(o => o.value === filters.openNow)?.label ?? 'Hours';
    chips.push({
      key: 'time',
      label,
      onRemove: () => setOpenNow(''),
    });
  }

  if (filters.rating) {
    chips.push({
      key: 'rating',
      label: `${filters.rating}+ ★`,
      onRemove: () => setRating(''),
    });
  }

  if (filters.photosOnly) {
    chips.push({
      key: 'photo',
      label: 'With photo',
      onRemove: () => setPhotosOnly(false),
    });
  }

  if (filters.campusOnly) {
    chips.push({
      key: 'campus',
      label: 'Campus area',
      onRemove: () => setCampusOnly(false),
    });
  }

  if (filters.sortBy === 'popular') {
    chips.push({
      key: 'sort',
      label: 'Popular first',
      onRemove: () => setSortBy('recent'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2 pt-1"
      role="list"
      aria-label="Active filters"
    >
      {chips.map(c => (
        <button
          key={c.key}
          type="button"
          role="listitem"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-full text-[11px] font-bold border bg-white text-[#374151] border-[#e5e7eb] shadow-[0_2px_8px_rgba(47,95,196,0.06)] min-h-[36px] max-w-[100%] motion-safe:active:scale-[0.98] transition-transform"
        >
          <span className="truncate">{c.label}</span>
          <X className="w-3.5 h-3.5 shrink-0 text-[#9ca3af]" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
    </div>
  );
}
