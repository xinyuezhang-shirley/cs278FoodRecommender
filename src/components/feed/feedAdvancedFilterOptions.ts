/** Shared option lists for feed advanced filter sheet (labels match existing dropdown semantics). */

export const FEED_DISTANCE_OPTIONS = [
  { value: '', label: 'Any distance' },
  { value: '5min', label: '~0.25 mi · 5 min walk' },
  { value: '10min', label: '~0.5 mi · 10 min walk' },
  { value: '15min', label: '~0.75 mi · 15 min walk' },
  { value: '1mi', label: 'Within 1 mile' },
  { value: '3mi', label: 'Within 3 miles' },
  { value: '5mi', label: 'Within 5 miles' },
] as const;

export const FEED_TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'open', label: 'Open now' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'late', label: 'Open late (9pm+)' },
] as const;

export const FEED_RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4.5', label: '4.5+ Exceptional' },
  { value: '4.0', label: '4.0+ Great' },
  { value: '3.5', label: '3.5+ Good' },
] as const;

export function distanceChipSummary(value: string): string {
  const row = FEED_DISTANCE_OPTIONS.find(o => o.value === value);
  if (!value || !row) return '';
  if (value === '5min') return 'Under ~0.25 mi';
  if (value === '10min') return 'Under ~0.5 mi';
  if (value === '15min') return 'Under ~0.75 mi';
  return row.label.replace(/^~[^·]+·\s*/, '').replace('Within ', '').trim();
}
