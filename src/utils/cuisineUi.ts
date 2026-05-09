import { CUISINE_OPTIONS } from './helpers';

/** Map/feed filter shortcuts (not stored as `cuisine_tags` on posts). */
export const POST_TYPE_FILTER_LABELS: Record<string, string> = {
  free_food: '🎁 Free Food',
  recommendation: '⭐ Recs',
  event: '🎉 Events',
};

export const CUISINE_EMOJI: Record<string, string> = {
  boba: '🧋',
  ramen: '🍜',
  sushi: '🍣',
  pizza: '🍕',
  coffee: '☕',
  dessert: '🍰',
  sandwiches: '🥪',
  salad: '🥗',
  tacos: '🌮',
  burgers: '🍔',
  'dim sum': '🥟',
  thai: '🍛',
  korean: '🥩',
  indian: '🫔',
  mediterranean: '🥙',
};

export function labelCuisineFilterToken(tag: string): string {
  if (POST_TYPE_FILTER_LABELS[tag]) return POST_TYPE_FILTER_LABELS[tag];
  const emoji = CUISINE_EMOJI[tag];
  return emoji ? `${emoji} ${tag}` : tag;
}

export function isPresetCuisineTag(tag: string): boolean {
  return CUISINE_OPTIONS.includes(tag);
}
