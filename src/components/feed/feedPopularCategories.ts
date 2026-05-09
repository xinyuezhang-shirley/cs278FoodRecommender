import type { Post } from '../../types';

/** High-visibility categories for the feed picker (matches `cuisine_tags` slugs after sanitize). */
export const FEED_POPULAR_CATEGORIES: readonly { slug: string; label: string; emoji: string }[] = [
  { slug: 'pizza', label: 'Pizza', emoji: '🍕' },
  { slug: 'boba', label: 'Boba', emoji: '🧋' },
  { slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { slug: 'sushi', label: 'Sushi', emoji: '🍣' },
  { slug: 'dessert', label: 'Dessert', emoji: '🍰' },
  { slug: 'burgers', label: 'Burgers', emoji: '🍔' },
  { slug: 'ramen', label: 'Noodles', emoji: '🍜' },
];

export const FEED_POPULAR_CATEGORY_SLUGS = new Set(FEED_POPULAR_CATEGORIES.map(c => c.slug));

export function labelForFeedCategorySlug(slug: string): string {
  const pop = FEED_POPULAR_CATEGORIES.find(c => c.slug === slug);
  if (pop) return `${pop.emoji} ${pop.label}`;
  return slug;
}

/** Tags that appear on posts but aren’t in the Popular list (custom + long-tail presets). */
export function deriveOtherFeedCategoryTags(posts: Post[]): string[] {
  const seen = new Set<string>();
  for (const p of posts) {
    for (const raw of p.cuisine_tags ?? []) {
      const t = raw.trim().toLowerCase();
      if (!t || FEED_POPULAR_CATEGORY_SLUGS.has(t)) continue;
      seen.add(t);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
