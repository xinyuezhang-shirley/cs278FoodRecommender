import { useEffect } from 'react';
import { Navigation, Check, X } from 'lucide-react';
import { BottomSheet } from '../ui/Modal';
import type { MapFilters, MapAdvancedFiltersPatch } from '../../types/mapFilters';
import { DIETARY_OPTIONS } from '../../utils/helpers';
import {
  FEED_DISTANCE_OPTIONS,
  FEED_TIME_OPTIONS,
  FEED_RATING_OPTIONS,
} from './feedAdvancedFilterOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: MapFilters;
  hasLocation: boolean;
  supportsOpenNow: boolean;
  supportsRating: boolean;
  onRequestLocation: () => void;
  patchAdvancedFilters: (patch: Partial<MapAdvancedFiltersPatch>) => void;
  resetAdvancedFilters: () => void;
}

export function FeedAdvancedFiltersSheet({
  open,
  onClose,
  filters,
  hasLocation,
  supportsOpenNow,
  supportsRating,
  onRequestLocation,
  patchAdvancedFilters,
  resetAdvancedFilters,
}: Props) {
  useEffect(() => {
    if (open && !supportsOpenNow && filters.openNow) {
      patchAdvancedFilters({ openNow: '' });
    }
  }, [open, supportsOpenNow, filters.openNow, patchAdvancedFilters]);

  useEffect(() => {
    if (open && !supportsRating && filters.rating) {
      patchAdvancedFilters({ rating: '' });
    }
  }, [open, supportsRating, filters.rating, patchAdvancedFilters]);

  function toggleDietary(tag: string) {
    const dietary = filters.dietary.includes(tag)
      ? filters.dietary.filter(x => x !== tag)
      : [...filters.dietary, tag];
    patchAdvancedFilters({ dietary });
  }

  function handleReset() {
    resetAdvancedFilters();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col max-h-[min(88dvh,720px)] min-h-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-[#eef2f6]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#9ca3af]">Fine-tune</p>
            <h2 className="text-lg font-black text-[#2f5fc4] tracking-tight">Filters</h2>
            <p className="text-[11px] font-semibold text-[#9ca3af] mt-1">
              Changes apply as you tap — adjust sort from the pill on the feed or map bar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-7 min-h-0 touch-pan-y">
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af] mb-2">
              Dietary preferences
            </h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(tag => {
                const sel = filters.dietary.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietary(tag)}
                    className={[
                      'px-3.5 py-2 rounded-full text-xs font-bold border capitalize min-h-[40px] transition-colors',
                      sel
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-[#6b7280] border-[#e5e7eb]',
                    ].join(' ')}
                  >
                    {sel && <Check className="inline w-3 h-3 mr-1 -mt-0.5 align-middle" aria-hidden />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af]">Distance</h3>
              {!hasLocation && (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="text-[11px] font-black text-[#2f5fc4] flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" aria-hidden />
                  Enable location
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {FEED_DISTANCE_OPTIONS.map(opt => {
                const disabled = !hasLocation && opt.value !== '';
                const sel = filters.distance === opt.value;
                return (
                  <button
                    key={opt.value || 'any'}
                    type="button"
                    disabled={disabled}
                    onClick={() => patchAdvancedFilters({ distance: opt.value })}
                    className={[
                      'px-3 py-2 rounded-full text-[11px] font-bold border min-h-[40px] transition-colors text-left max-w-full',
                      sel
                        ? 'bg-[#eaf1ff] border-[#2f5fc4]/40 text-[#2f5fc4]'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280]',
                      disabled ? 'opacity-35 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {!hasLocation && !!filters.distance && (
              <p className="text-[10px] font-semibold text-amber-700 mt-2">
                Turn on location to constrain by distance. Current distance filter is paused.
              </p>
            )}
          </section>

          <section className={!supportsOpenNow ? 'opacity-45 pointer-events-none' : ''}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af]">Hours</h3>
              {!supportsOpenNow && (
                <span className="text-[10px] font-bold text-[#9ca3af] text-right max-w-[58%]">
                  No posts have open-hours data yet
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {FEED_TIME_OPTIONS.map(opt => {
                const sel = filters.openNow === opt.value;
                return (
                  <button
                    key={opt.value || 'time-any'}
                    type="button"
                    disabled={!supportsOpenNow}
                    onClick={() => patchAdvancedFilters({ openNow: opt.value })}
                    className={[
                      'px-3.5 py-2 rounded-full text-xs font-bold border min-h-[40px]',
                      sel
                        ? 'bg-violet-50 border-violet-200 text-violet-900'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={!supportsRating ? 'opacity-45 pointer-events-none' : ''}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af]">Rating</h3>
              {!supportsRating && (
                <span className="text-[10px] font-bold text-[#9ca3af] text-right max-w-[58%]">
                  No ratings on posts yet
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {FEED_RATING_OPTIONS.map(opt => {
                const sel = filters.rating === opt.value;
                return (
                  <button
                    key={opt.value || 'rate-any'}
                    type="button"
                    disabled={!supportsRating}
                    onClick={() => patchAdvancedFilters({ rating: opt.value })}
                    className={[
                      'px-3.5 py-2 rounded-full text-xs font-bold border min-h-[40px]',
                      sel
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-wide text-[#9ca3af]">Post details</h3>

            <button
              type="button"
              role="switch"
              aria-checked={filters.photosOnly}
              onClick={() => patchAdvancedFilters({ photosOnly: !filters.photosOnly })}
              className={[
                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border min-h-[52px] transition-colors',
                filters.photosOnly
                  ? 'bg-[#eaf1ff] border-[#2f5fc4]/35'
                  : 'bg-white border-[#e5e7eb]',
              ].join(' ')}
            >
              <span className="text-sm font-bold text-[#374151] text-left">With photo</span>
              <span
                className={[
                  'w-11 h-7 rounded-full p-1 flex shrink-0 transition-colors',
                  filters.photosOnly ? 'justify-end bg-[#2f5fc4]' : 'justify-start bg-[#e5e7eb]',
                ].join(' ')}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={filters.campusOnly}
              onClick={() => patchAdvancedFilters({ campusOnly: !filters.campusOnly })}
              className={[
                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border min-h-[52px] transition-colors',
                filters.campusOnly
                  ? 'bg-[#eaf1ff] border-[#2f5fc4]/35'
                  : 'bg-white border-[#e5e7eb]',
              ].join(' ')}
            >
              <span className="text-sm font-bold text-[#374151] text-left">Campus area only</span>
              <span
                className={[
                  'w-11 h-7 rounded-full p-1 flex shrink-0 transition-colors',
                  filters.campusOnly ? 'justify-end bg-[#2f5fc4]' : 'justify-start bg-[#e5e7eb]',
                ].join(' ')}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
          </section>
        </div>

        <div className="shrink-0 pt-3 pb-1 border-t border-[#eef2f6] bg-[#faf9f5]">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-3.5 rounded-full text-sm font-bold text-[#6b7280] border border-[#e5e7eb] bg-white min-h-[48px]"
          >
            Reset these filters
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
