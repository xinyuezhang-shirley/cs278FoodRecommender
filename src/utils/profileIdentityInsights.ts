import type { FoodCircle, Post } from '../types';

export interface TasteChip {
  id: string;
  label: string;
  active: boolean;
}

/** Campus-area taste facets we derive from authored posts only. */
const TASTE_RULES: { id: string; label: string; test: (p: Post) => boolean }[] = [
  {
    id: 'boba',
    label: 'Boba',
    test: p =>
      mentions(p, /\bboba\b|\bbubble tea\b|\bpearl\b/i) ||
      p.cuisine_tags.some(t => /boba|bubble/i.test(t)),
  },
  {
    id: 'coffee',
    label: 'Coffee',
    test: p =>
      mentions(p, /\bcoffee\b|\bespresso\b|\blr\b|\bla\b/i) ||
      p.cuisine_tags.some(t => /coffee|espresso|latte|cafe|caffe/i.test(t)),
  },
  {
    id: 'ramen',
    label: 'Ramen',
    test: p =>
      mentions(p, /\bramen\b|\bpho\b/i) ||
      p.cuisine_tags.some(t => /ramen|noodle/i.test(t)),
  },
  {
    id: 'free_food',
    label: 'Free food',
    test: p => p.is_free_food,
  },
  {
    id: 'snacks',
    label: 'Snacks',
    test: p =>
      mentions(p, /\bsnack\b|\bgrab-and-go\b|\bpastries?\b|\bbakery\b/i) ||
      p.cuisine_tags.some(t =>
        ['snacks', 'pastry', 'bakery', 'sandwiches', 'sandwich'].some(k =>
          t.toLowerCase().includes(k)),
      ),
  },
  {
    id: 'desserts',
    label: 'Desserts',
    test: p =>
      mentions(p, /\bdessert\b|\bcake\b|\bdelicious\b|\bice cream\b|\bdonut\b|\bsweets?\b/i) ||
      p.cuisine_tags.some(t => /dessert|sweet|pastry|ice cream/i.test(t)),
  },
  {
    id: 'study_cafe',
    label: 'Study cafés',
    test: p =>
      mentions(p, /\bstudy\b|\blibrary\b|\bquiet\b|\bpset\b|\breading\b/i) &&
      (mentions(p, /\bcoffee\b|\bcaf[eé]/i) || p.cuisine_tags.some(t => /coffee|cafe/i.test(t))),
  },
  {
    id: 'late_night',
    label: 'Late-night eats',
    test: p => hourLocal(p.created_at) >= 21 || hourLocal(p.created_at) <= 5,
  },
  {
    id: 'healthy',
    label: 'Healthy',
    test: p =>
      p.cuisine_tags.some(t => /salad|healthy|bowl/i.test(t)) ||
      p.dietary_tags.length > 0 ||
      mentions(p, /\bsalad\b|\bhealthy\b|\bvegan\b|\bvegetarian\b/i),
  },
  {
    id: 'events',
    label: 'Events',
    test: p => p.type === 'event',
  },
];

function mentions(p: Post, re: RegExp): boolean {
  return re.test(`${p.title} ${p.description}`);
}

function hourLocal(iso: string): number {
  return new Date(iso).getHours();
}

export function buildTasteChips(posts: Post[]): TasteChip[] {
  return TASTE_RULES.map(rule => ({
    id: rule.id,
    label: rule.label,
    active: posts.some(rule.test),
  }));
}

/** Unique dietary-related tags appearing on authored posts (not a persisted profile field). */
export function dietarySignalsFromPosts(posts: Post[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const p of posts) {
    for (const d of p.dietary_tags) {
      const k = d.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      order.push(formatDietLabel(d));
    }
  }
  return order.slice(0, 10);
}

function formatDietLabel(raw: string): string {
  return raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export interface HabitStat {
  label: string;
  value: string;
}

export function campusFoodHabits(posts: Post[], freeFoodCount: number): HabitStat[] {
  const hasData = posts.length > 0;

  const topLoc =
    posts.length === 0
      ? null
      : frequentString(posts.map(p => p.location_name).filter(Boolean));

  const topCat =
    posts.length === 0
      ? null
      : frequentString(posts.flatMap(p => p.cuisine_tags.map(t => t.trim())).filter(Boolean));

  const favTime = posts.length === 0 ? null : dominantTimeBand(posts);
  const composition = summarizePostKinds(posts);

  return [
    {
      label: 'Most active near',
      value: hasData && topLoc ? topLoc : 'Not enough data yet',
    },
    {
      label: 'Usually posts',
      value: hasData ? composition : 'Not enough data yet',
    },
    {
      label: 'Favorite time',
      value: hasData && favTime ? favTime : 'More posts needed',
    },
    {
      label: 'Top category',
      value:
        hasData && topCat
          ? (formatTagLabel(topCat) as string)
          : 'Start sharing to reveal',
    },
    {
      label: 'Free food shared',
      value: `${freeFoodCount} post${freeFoodCount === 1 ? '' : 's'}`,
    },
  ];
}

function frequentString(values: string[]): string | null {
  if (!values.length) return null;
  const tally = new Map<string, number>();
  for (const v of values) {
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  let top = '';
  let n = 0;
  tally.forEach((count, loc) => {
    if (count > n) {
      n = count;
      top = loc;
    }
  });
  return top || null;
}

function dominantTimeBand(posts: Post[]): string | null {
  const bands = { morning: 0, afternoon: 0, evening: 0, lateNight: 0 };
  for (const p of posts) {
    const h = hourLocal(p.created_at);
    if (h >= 5 && h <= 11) bands.morning++;
    else if (h >= 12 && h <= 16) bands.afternoon++;
    else if (h >= 17 && h <= 20) bands.evening++;
    else bands.lateNight++;
  }
  const entries = Object.entries(bands) as [keyof typeof bands, number][];
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === 0) return null;
  const map: Record<keyof typeof bands, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    lateNight: 'Late night',
  };
  return map[entries[0][0]];
}

function summarizePostKinds(posts: Post[]): string {
  if (!posts.length) return 'No posts yet';
  const ff = posts.filter(p => p.is_free_food).length;
  const ev = posts.filter(p => p.type === 'event').length;
  const rec = posts.filter(p => p.type === 'recommendation').length;
  const parts: string[] = [];
  const freeLbl = freeDominantLabel(ff, posts.length);
  if (freeLbl) parts.push(freeLbl);
  if (ev > 0) parts.push(eventsLabel(ev));
  const tagHint = snacksOrGenericHint(posts);
  if (tagHint && !parts.join('').toLowerCase().includes(tagHint.toLowerCase())) parts.push(tagHint);
  if (parts.length === 0) parts.push(rec > 0 ? 'Recommendations' : 'Mixed picks');
  return parts.slice(0, 3).join(' · ');
}

function freeDominantLabel(ff: number, total: number): string | null {
  if (ff === 0) return null;
  if (ff >= total * 0.5) return 'Mostly free food';
  return 'Some free food';
}

function eventsLabel(ev: number): string {
  return ev >= 3 ? `Events (${ev}+)` : 'Events';
}

function snacksOrGenericHint(posts: Post[]): string | null {
  const tags = posts.flatMap(p => p.cuisine_tags.map(t => t.toLowerCase()));
  if (tags.some(t => /snack|sandwich|boba|coffee|study/i.test(t))) {
    const first = tags.find(t => /snack|sandwich/i.test(t));
    return first ? titleCaseRough(first) : 'Snacks & quick bites';
  }
  return null;
}

function titleCaseRough(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function formatTagLabel(tag: string | null): string | null {
  if (!tag) return null;
  return titleCaseRough(tag.replace(/-/g, ' '));
}

const CIRCLE_KEYS: { re: RegExp; weight: number; cues: string[] }[] = [
  { re: /\bfree food\b|rada|hunters|leftover/i, weight: 3, cues: ['free_food'] },
  { re: /\bboba\b|\btea collective\b|\bpearl\b/i, weight: 3, cues: ['boba'] },
  { re: /\bcoffee\b|\bcaf[eé]|quiet\b/i, weight: 2, cues: ['coffee'] },
  { re: /\blate\b|\bfuel\b|\bnight\b|\b21/i, weight: 3, cues: ['late_night'] },
  { re: /\bpa\b|palo|university ave|crawl|cal ave/i, weight: 2, cues: ['ramen', 'snacks'] },
];

function posterCuisineKeywords(posts: Post[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of posts) {
    if (p.is_free_food) add(m, 'free_food');
    if (p.type === 'event') add(m, 'events');
    for (const t of p.cuisine_tags) add(m, t.toLowerCase());
    const h = hourLocal(p.created_at);
    if (h >= 21 || h <= 5) add(m, 'late_night');
    if (/boba|coffee|salad/i.test(`${p.title} ${p.description}`)) {
      if (/boba/i.test(p.title + p.description)) add(m, 'boba');
      if (/coffee|cafe/i.test(p.title + p.description)) add(m, 'coffee');
      if (/salad|healthy/i.test(p.title + p.description)) add(m, 'healthy');
    }
  }
  return m;
}

function add(m: Map<string, number>, k: string) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

/** Up to three circles user is not in; ranked by coarse match to post signals. */
export function suggestCirclesForUser(posts: Post[], circles: FoodCircle[]): FoodCircle[] {
  const open = circles.filter(c => !c.is_member);
  const signals = posterCuisineKeywords(posts);

  function scoreCircle(circle: FoodCircle): number {
    const blob = `${circle.name}\n${circle.description}`.toLowerCase();
    let s = 0;
    for (const ck of CIRCLE_KEYS) {
      if (!ck.re.test(blob)) continue;
      s += ck.weight;
      for (const cue of ck.cues) s += signals.get(cue) ?? 0;
    }
    if (/boba/i.test(blob) && signals.has('boba')) s += 4 + (signals.get('boba') ?? 0);
    if (/free food/i.test(blob) && signals.has('free_food')) s += 4 + (signals.get('free_food') ?? 0);
    if (/coffee/i.test(blob) && signals.has('coffee')) s += 3 + (signals.get('coffee') ?? 0);
    s += Math.min(circle.member_count ?? 0, 99) / 400;
    return s;
  }

  if (posts.length === 0) {
    return [...open]
      .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
      .slice(0, 3);
  }

  return [...open]
    .sort((a, b) => scoreCircle(b) - scoreCircle(a))
    .slice(0, 3);
}

export interface MilestoneDef {
  id: string;
  title: string;
  unlocked: boolean;
  detail: string;
}

export function buildMilestones(
  posts: Post[],
  freeFoodCount: number,
  circleCount: number,
): MilestoneDef[] {
  const zoneCount = new Set(posts.map(p => (p.location_name || '').trim()).filter(Boolean)).size;

  return [
    {
      id: 'first',
      title: 'First post',
      unlocked: posts.length >= 1,
      detail:
        posts.length >= 1
          ? `You kicked things off · ${posts.length} post${posts.length === 1 ? '' : 's'} total`
          : 'Publish your first food spot.',
    },
    {
      id: 'ff',
      title: 'Free food regular',
      unlocked: freeFoodCount >= 5,
      detail:
        freeFoodCount >= 5
          ? `${freeFoodCount} free food shout-outs shared`
          : 'Share 5 free food spots to unlock.',
    },
    {
      id: 'circles',
      title: 'Circle regular',
      unlocked: circleCount >= 3,
      detail:
        circleCount >= 3
          ? `Member of ${circleCount} circles`
          : 'Join 3 food circles.',
    },
    {
      id: 'zones',
      title: 'Campus explorer',
      unlocked: zoneCount >= 3,
      detail:
        zoneCount >= 3
          ? `Posted from ${zoneCount} different spots`
          : 'Post from 3 different campus spots.',
    },
    {
      id: 'saves',
      title: 'Saved spots curator',
      unlocked: false,
      detail: 'Save 10 places when saves roll out.',
    },
  ];
}
