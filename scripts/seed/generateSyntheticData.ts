/**
 * Deterministic faux activity for demos — messy/varied prose (not review-shaped).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

const demoPersonas = JSON.parse(readFileSync(join(dir, 'data/demoPersonas.json'), 'utf8')) as SeedPersona[];
const demoRestaurants = JSON.parse(readFileSync(join(dir, 'data/demoRestaurants.json'), 'utf8')) as SeedRestaurant[];

export interface SeedPersona {
  username: string;
  display_name: string;
  bio: string;
  stanford_arc: string;
  dietary_preferences: string[];
  allergies: string[];
  favorite_cuisines: string[];
  posting_frequency?: string;
  activity_level: string;
  circles: string[];
  writing_style?: string;
  commenting_style?: string;
  budget_level?: string;
}

export interface SeedRestaurant {
  name: string;
  area: string;
  lat: number;
  lng: number;
  cuisine_categories: string[];
  typical_menu_items: string[];
  dietary_tags?: string[];
  allergy_notes?: string;
  price_level?: string;
  good_for?: string[];
  student_context?: string;
  vibe?: string;
  nommi_tags: string[];
}

function rng(seed: string) {
  let s =
    [...seed].reduce<number>((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 17), 0) >>> 0;
  if (!s) s = 99991;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    return ((s >>> 0) % 16_777_216) / 16_777_216;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

/** Specific orders students actually name-drop */
const SPECIFIC_ITEMS = [
  'iced latte',
  'matcha latte',
  'almond croissant',
  'veggie burger',
  'tofu bowl',
  'falafel wrap',
  'burrito bowl',
  'tonkotsu ramen',
  'pad see ew',
  'poke bowl',
  'brown sugar boba milk tea',
  'cold brew',
  'garlic noodles',
  'soup dumplings',
  'gyro plate',
  'shakshuka',
  'acai bowl',
  'huevos rancheros',
  'chicken katsu curry',
];

function dishFor(rest: SeedRestaurant, rand: () => number): string {
  const blob = `${rest.name} ${[...rest.cuisine_categories, ...rest.nommi_tags].join(' ')}`.toLowerCase();

  /** Bias snippets toward vaguely matching cuisine blobs */
  const scored = SPECIFIC_ITEMS.map(item => ({
    item,
    score:
      (/tea|coffee|matcha|cafe|cafe|caff/.test(blob) && /latte|matcha|coffee|cold brew|boba/i.test(item) ? 1.2 : 0)
      + (/ramen|noodle|japanese|poke|viet|thai/.test(blob) && /ramen|pad|pho|poke|noodle/i.test(item) ? 1.15 : 0)
      + (/mex|cub|cali|american|burger/.test(blob) && /burrito|taco|burger|huevos/i.test(item) ? 1.05 : 0)
      + (/med|middle|halal|greek|turk/.test(blob) && /falafel|gyro|shak/i.test(item) ? 1.1 : 0)
      + rand() * 0.06,
  })).sort((a, b) => b.score - a.score);

  if (rand() < 0.42) return scored[0]!.item;
  if (rand() < 0.78) return pick(rest.typical_menu_items, rand);
  return pick(SPECIFIC_ITEMS, rand);
}

function shortPlace(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').replace(/\s+vicinity.*$/i, '').trim();
}

/** Occasional glitches — not every word */
function maybeSloppy(text: string, rand: () => number): string {
  let t = text;
  if (rand() > 0.92) t = t.replace(/\bDefinitely\b/i, 'definetly');
  if (rand() > 0.94) t = t.replace(/\bprobably\b/i, 'probbaly');
  if (rand() > 0.96) t = t.replace(/\byou're\b/gi, "your");
  if (rand() > 0.97) t = t.replace(/\bvegetarian\b/i, 'vegiterian');
  return t;
}

function formatVoice(persona: SeedPersona, text: string, rand: () => number): string {
  const ws = persona.writing_style?.toLowerCase() ?? '';
  let out = text;
  if (ws.includes('lowercase') || rand() > 0.55) out = out.toLowerCase();
  if (ws.includes('chaotic') && rand() > 0.7) {
    out = out
      .split(' ')
      .map((w, i) => (i % 5 === 0 && w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
  return maybeSloppy(out, rand);
}

function maybeNaturalRating(rating: number, rand: () => number): string | null {
  if (rand() > 0.14) return null;
  const bits = [
    `like a soft ${Math.floor(rating)}`,
    `${Math.round(rating)}/10 if im being honest`,
    `not horrible id say`,
    rating >= 8 ? `actually bumped it up vs last time` : `mid week energy`,
    `better than ok worse than amazing`,
  ];
  return pick(bits, rand);
}

function buildMessyRecommendation(
  persona: SeedPersona,
  rest: SeedRestaurant,
  dish: string,
  rating_approx: number,
  rand: () => number,
): { title: string; description: string } {
  const place = shortPlace(rest.name);

  /** Titles: short, typo-adjacent, question marks, vibes */
  const titlePool = [
    `${place}: expensive but i keep coming back`,
    `best quick coffee before class?`,
    `tap fries are carrying me`,
    `actual vegetarian lunch option near campus`,
    `need better gf options but this worked`,
    `not a hot take ${place}`,
    `${dish} at ${place} didnt disappoint`,
    `was skeptical about ${place}`,
    `late night brain fog food`,
    `${place}? ok fine`,
    `random ${dish} run`,
    `good after section tbh`,
    `need caffeine send help`,
    `why is everyone at ${place} rn`,
    `study break fuel`,
    `parents asked where to eat 💀`,
    `${dish}`,
    `${place}. yeah.`,
    `honestly ${place} hit`,
    `${dish} + regret (small)`,
  ];

  const titleRaw = formatVoice(persona, pick(titlePool, rand), rand).slice(0, 130);

  /** Pick 1–3 optional detail shards (NOT every post) */
  const shardWait = (): string =>
    pick(
      [`line sucked sat afternoon`, `no wait weekday`, `queue moved ok`, `waited forever once never again`, `skipped the line miracle`],
      rand,
    );
  const shardPrice = (): string =>
    pick(
      [
        `wallet cried a little`,
        `$ ok-ish`,
        `split bill lifesaver`,
        `why is bay area pricing like this`,
        `splurge day`,
        `still cheaper than uber eats nightly`,
      ],
      rand,
    );
  const shardPortion = (): string =>
    pick([`fine for lunch`, `smallish`, `actually full`, `needed chips after lol`, `one plate carried`], rand);
  const shardMove = (): string =>
    pick(
      [`rode down`, `bike`, `dont ask i walked`, `borrowed someone's car 💀`, `caltrain grind`, `on campus dodge`],
      rand,
    );
  const shardDietary = (): string => {
    const tags = persona.dietary_preferences.join(' ').toLowerCase();
    const al = persona.allergies.join(' ').toLowerCase();
    if (tags.includes('halal'))
      return pick([`halal vibes ok ask`, `skipped meat didnt trust signage`, `asked twice at counter`], rand);
    if (tags.includes('vegan'))
      return pick([`vegan option existed shock`, `dairy lurking watch`, `veg bowl solid`], rand);
    if (tags.includes('vegetarian'))
      return pick(
        [`not sad salad hours`, `falafel saved me`, `beyond patty vibes ok`, `veg plate actually edible`, `not just fries + lettuce`, `vegetarian didnt feel like punishment`],
        rand,
      );
    if (/gluten|celiac/i.test(tags + al))
      return pick([
        `gf or gluten-light?? idk`,
        `risky if youre celiac ngl`,
        `rice noodle safe for me`,
        `cross contam stress`,
      ], rand);
    if (/nut|peanut|tree/i.test(al))
      return pick([`peanut cautious`, `kitchen shared ask`, `said nut allergy got blank stare haha`], rand);
    return pick(
      [`dairy-light order`, `want more protein honestly`, `kosher-ish menu not labeled great`],
      rand,
    );
  };

  /** Description modes — mostly NOT balanced mini-reviews */
  const modeRoll = rand();
  const ratingSentence = maybeNaturalRating(rating_approx, rand);

  /** Base opener fragments mentioning dish inconsistently */
  const gotDish = pick(
    [`got ${dish}`, `${dish}`, `${dish} again`, `tried ${dish}`, `${dish} + overstimulation`],
    rand,
  );

  let bodyParts: string[] = [];

  if (modeRoll < 0.12) {
    /** Ultra short reaction */
    bodyParts.push(
      pick(
        [`${gotDish}.`, `${gotDish}… fine`, `${place}. ${gotDish}.`, `${gotDish} slaps kinda`, `${gotDish} mid`],
        rand,
      ),
    );
  } else if (modeRoll < 0.22) {
    /** Fragment tornado */
    bodyParts.push(
      pick([`${gotDish} // ${shardPrice()}`, `${gotDish}. ${shardWait()}.`, `${shardWait()}. ${gotDish}.`], rand),
    );
  } else if (modeRoll < 0.42) {
    /** Practical slice */
    if (rand() > 0.45) bodyParts.push(shardWait());
    if (rand() > 0.6) bodyParts.push(pick([`would go before section`, `not a date spot lol`, `group ok`, `solo fine`], rand));
    bodyParts.push(gotDish + pick(['', ' — sleepy order', '. tired brain food', '. no notes really'], rand));
    if (rand() > 0.55 && rest.good_for?.some(g => /study|laptop/i.test(g)))
      bodyParts.push(pick(['outlets mid', 'crowded laptops', 'no outlets pain'], rand));
  } else if (modeRoll < 0.58) {
    /** Dietary-heavy */
    bodyParts.push(gotDish);
    bodyParts.push(shardDietary());
    if (rand() > 0.4) bodyParts.push(shardPrice());
  } else if (modeRoll < 0.74) {
    /** Opinion rant-ish but incomplete */
    bodyParts.push(
      pick([
        `${gotDish}`,
        `${place}. ${gotDish}.`,
        `${gotDish} was better than it had any right to be`,
        `${gotDish} salty today ??`,
      ], rand),
    );
    if (rand() > 0.5) bodyParts.push(shardPortion());
    if (rand() > 0.65) bodyParts.push(shardWait());
    if (rand() > 0.85) bodyParts.push(shardPrice());
  } else if (modeRoll < 0.88) {
    /** Longer but still sloppy */
    const chunk = `${gotDish}. ${shardWait()}`;
    bodyParts.push(
      pick(
        [
          `${chunk} — ${shardPortion()} — ${shardMove()}`,
          `${gotDish}. ${shardDietary()}. staff fine.`,
          `${place}: ${shardPrice()}. ${gotDish}. thats it thats the review`,
          `went with ${shardMove()}. ${gotDish}. ${shardWait()}`,
        ],
        rand,
      ),
    );
  } else {
    /** Stream of consciousness */
    bodyParts.push(
      pick([
        `${gotDish} idk vibes ok`,
        `${place} guilt trip everytime i swear ${gotDish}`,
        `${gotDish} + dehydration + existentialism`,
      ], rand),
    );
  }

  if (ratingSentence && rand() > 0.55) bodyParts.push(ratingSentence);

  /** Join unevenly — allow missing punctuation */
  let description = bodyParts.join(' ');
  description = description.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
  if (rand() > 0.7 && !/[.!?]$/.test(description)) description += pick(['.', '…', '!', '', ' lol'], rand);
  description = description.slice(0, 940);

  return {
    title: titleRaw,
    description: description || `${gotDish} ${place}`,
  };
}

/** Paired threads: opener → plausible reply referencing thread */
const COMMENT_THREAD_PAIRS: [string, string][] = [
  ['wait was this actually filling', 'yeah i was hungry again like 2 hrs later lol'],
  ['ok but prices hurt tho', '^^ fr stanford bubble tax'],
  ['do they have outlets?', 'barely… two near the wall if youre lucky'],
  ['i had same thing mid lol', '^ valid sometimes it hits sometimes it doesnt'],
  ['is this gf or just gluten light', 'staff said gf menu item but grill shared idk'],
  ['need to try after 229', 'dont go right when class dumps out line insane'],
  ['how crowded?', 'Tuesday chill Saturday clown show'],
  ['wifi situation??', '^ slow but workable for procrastination'],
  ['parking clown show?', 'yeah i biked lol'],
];

const SOLO_COMMENT_SHARDS = [
  'wait why is everyone gatekeeping coupa',
  'saved ty',
  'this + no sleep = surviving',
  'lmk if boba spot is fake busy',
  'need halal sanity check',
  'nut allergy brain always',
  'dairy hates me still went',
  '',
  '^ same',
  '^^ facts',
];

export function personaPostWeight(activity: string): number {
  const s = activity.toLowerCase();
  if (s.includes('very low')) return 0.15;
  if (s.includes('very high')) return 2.55;
  if (s.includes('low')) return 0.45;
  if (s.includes('high')) return 1.92;
  return 1;
}

function weightedPersonaIdx(personas: SeedPersona[], rand: () => number): number {
  const ws = personas.map(p => personaPostWeight(p.activity_level));
  const sum = ws.reduce((a, b) => a + b, 0);
  let t = rand() * sum;
  for (let i = 0; i < personas.length; i++) {
    t -= ws[i]!;
    if (t <= 0) return i;
  }
  return personas.length - 1;
}

function pickRestaurant(restaurants: SeedRestaurant[], persona: SeedPersona, rand: () => number): SeedRestaurant {
  const faveFragments = persona.favorite_cuisines.flatMap(fc =>
    fc.toLowerCase().split(/[^a-z]+/gi).filter(x => x.length >= 4),
  );
  const prefs = persona.dietary_preferences.join(' ').toLowerCase();
  const ranked = restaurants
    .map((rest, idx) => {
      const blob = `${rest.name} ${[...rest.nommi_tags, ...rest.cuisine_categories, ...(rest.dietary_tags ?? [])].join(' ')}`.toLowerCase();
      let score = 1 + Math.sin(idx * 1.19) * 0.15;
      for (const ff of faveFragments) {
        if (blob.includes(ff)) score += 1.08;
      }
      if (prefs.includes('halal') && blob.includes('halal')) score += 1.4;
      if (prefs.includes('vegetarian') && blob.includes('vegetarian')) score += 0.9;
      if (prefs.includes('vegan') && blob.includes('vegan')) score += 1.1;
      if ((prefs.includes('gluten') || persona.allergies.some(a => /celiac|gluten/i.test(a))) && blob.includes('gluten'))
        score += 1.2;
      if (persona.budget_level?.includes('minimal') || persona.budget_level?.includes('budget')) {
        if (rest.price_level === '$') score += 0.8;
      }
      const macroVibe =
        /\b(high protein|athletic|macros)\b/i.test(persona.stanford_arc)
        && /bowl|protein|poke|gyro/i.test(blob);
      if (macroVibe) score += 0.5;
      return { rest, score };
    })
    .sort((a, b) => b.score - a.score);
  const window = ranked.slice(0, Math.min(11, ranked.length));
  return window[Math.floor(rand() * window.length)]?.rest ?? restaurants[0]!;
}

function buildFreeFoodBody(persona: SeedPersona, rest: SeedRestaurant, rand: () => number): string {
  const shards = formatVoice(
    persona,
    pick(
      [
        `FREE boxes near ${shortPlace(rest.name)} — gone fast dont @ me`,
        `leftovers at tresidder area?? ran`,
        `pizza appeared. chaos. grabbed slice.`,
        `not asking questions just eating`,
      ],
      rand,
    ),
    rand,
  );
  return shards.slice(0, 940);
}

function buildEventBody(place: string, persona: SeedPersona, rand: () => number): string {
  return formatVoice(
    persona,
    pick([
      `${place} sampling table idk samples small but free-ish`,
      `flyer said tastings. stood there awkwardly worth it.`,
      `tabling vibes + granola bar energy`,
      `went for snack not a meal honest`,
      `line for samples weirdly polite`,
    ], rand),
    rand,
  ).slice(0, 940);
}

export type GeneratedPostRow = {
  persona_username: string;
  restaurant_name: string;
  type: 'recommendation' | 'free_food' | 'event';
  title: string;
  description: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  rating_approx: number;
  seed_batch_placeholder: string;
  is_seed_content: true;
  created_at_relative_weight: number;
  post_index: number;
};

export function generatePosts(slugPlaceholder: string, count = 150): GeneratedPostRow[] {
  const personas = demoPersonas;
  const rests = demoRestaurants;
  const rows: GeneratedPostRow[] = [];

  function timeWeight(i: number): number {
    const p = i / Math.max(count - 1, 1);
    const finals = p > 0.73 ? 1 + (p - 0.73) * 4.8 : 1;
    return finals * (0.95 + Math.sin(i * 0.33) * 0.1);
  }

  for (let i = 0; i < count; i++) {
    const r = rng(`${slugPlaceholder}:post:${i}`);
    let type: GeneratedPostRow['type'] = 'recommendation';
    if (r() < 0.11 && personas.some(x => x.username === 'jayo_free_food_radar')) type = 'free_food';
    else if (r() < 0.078) type = 'event';

    const persona = personas[weightedPersonaIdx(personas, r)]!;
    const rest = pickRestaurant(rests, persona, r);
    const dish = dishFor(rest, r);

    let rating_approx =
      type === 'free_food'
        ? 10
        : Math.min(9.8, Math.max(5.4, 7.2 + r() * 2.9 - (r() > 0.76 ? r() * 2.2 : 0)));
    rating_approx = Math.round(rating_approx * 10) / 10;

    let title = '';
    let description = '';

    /** Tags */
    const baseTags = [...new Set([...rest.nommi_tags, ...rest.cuisine_categories])];
    const personaBlob = persona.dietary_preferences.join(' ') + persona.allergies.join(' ');
    const extraTags: string[] = [];
    if (/vegetarian|vegan/i.test(personaBlob)) extraTags.push('vegetarian-aware');
    if (/halal/i.test(personaBlob)) extraTags.push('halal-conscious');
    if (/kosher/i.test(personaBlob)) extraTags.push('kosher-conscious');
    if (/gluten|celiac/i.test(personaBlob)) extraTags.push('gluten-conscious');
    if (/nut|peanut|tree/i.test(personaBlob)) extraTags.push('nut-conscious');
    if (/dairy/i.test(personaBlob)) extraTags.push('dairy-conscious');
    if (/protein|gym/i.test(persona.stanford_arc + personaBlob)) extraTags.push('high-protein');
    if (/budget|minimal/i.test(persona.budget_level ?? '')) extraTags.push('cheap-eats');

    const cuisine_tags = [...new Set([...baseTags.filter(t => !t.includes('_')), ...extraTags])];
    const dietary_tags = [
      ...new Set([
        ...(rest.dietary_tags ?? []).map(String),
        ...extraTags,
        ...(r() > 0.92 ? ['student-life'] : []),
      ]),
    ].filter(Boolean);

    if (type === 'free_food') {
      title = formatVoice(persona, pick(['free food ping', 'FREE??', 'grazing season', 'pizza hallucination'], r), r);
      description = buildFreeFoodBody(persona, rest, r);
    } else if (type === 'event') {
      const pl = shortPlace(rest.name);
      title = formatVoice(persona, pick([`samples @ ${pl}?`, `${pl} tabling thing`, `free-ish bites idk`, 'flyer lied a little'], r), r).slice(
        0,
        130,
      );
      description = buildEventBody(pl, persona, r);
    } else {
      const messy = buildMessyRecommendation(persona, rest, dish, rating_approx, r);
      title = messy.title;
      description = formatVoice(persona, messy.description, r);
    }

    rows.push({
      persona_username: persona.username,
      restaurant_name: rest.name,
      type,
      title: title.slice(0, 130),
      description: description.slice(0, 940),
      cuisine_tags,
      dietary_tags,
      rating_approx,
      seed_batch_placeholder: slugPlaceholder,
      is_seed_content: true,
      created_at_relative_weight: timeWeight(i),
      post_index: i,
    });
  }
  return rows;
}

export type DemoLikeRow = {
  user_username: string;
  reaction_type: 'like' | 'still_there';
  post_index: number;
  created_iso: string;
  is_seed_activity: true;
  seed_batch_placeholder: string;
};

export type DemoCommentRow = {
  user_username: string;
  content: string;
  post_index: number;
  created_iso: string;
  is_seed_activity: true;
  seed_batch_placeholder: string;
};

export type DemoSaveRow = {
  user_username: string;
  post_index: number;
  created_iso: string;
  is_seed_activity: true;
  seed_batch_placeholder: string;
};

export type DemoIntentRow = {
  user_username: string;
  post_index: number;
  intent_type: 'been_there' | 'want_to_go' | 'favorite';
  created_iso: string;
  is_seed_activity: true;
  seed_batch_placeholder: string;
};

export type DemoCircleJoinRow = {
  user_username: string;
  circle_name: string;
  created_iso: string;
  is_seed_activity: true;
  seed_batch_placeholder: string;
};

function pickDistinctPersonas(
  personas: SeedPersona[],
  excludeUsername: string,
  n: number,
  rand: () => number,
): SeedPersona[] {
  const bag = personas.filter(p => p.username !== excludeUsername);
  const cap = Math.max(1, Math.min(n, bag.length));
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag.slice(0, cap);
}

function randomOther(personas: SeedPersona[], exclude: string, rand: () => number): SeedPersona {
  for (let t = 0; t < 80; t++) {
    const c = personas[Math.floor(rand() * personas.length)]!;
    if (c.username !== exclude) return c;
  }
  return personas.find(p => p.username !== exclude)!;
}

export function generateSocialActivity(
  slugPlaceholder: string,
  posts: GeneratedPostRow[],
): {
  likes: DemoLikeRow[];
  comments: DemoCommentRow[];
  saves: DemoSaveRow[];
  intents: DemoIntentRow[];
  circle_joins: DemoCircleJoinRow[];
} {
  const personas = demoPersonas;
  const postCount = posts.length;

  const likes: DemoLikeRow[] = [];
  const comments: DemoCommentRow[] = [];
  const saves: DemoSaveRow[] = [];
  const intents: DemoIntentRow[] = [];

  for (let pi = 0; pi < postCount; pi++) {
    const rnd = rng(`${slugPlaceholder}:soc:${pi}`);
    const post = posts[pi]!;
    const author = personas.find(p => p.username === post.persona_username);
    const viral = rnd() > 0.82;
    const activityBoost = personaPostWeight(author?.activity_level ?? 'medium');

    /** Denser interactions */
    const nLike =
      Math.floor(rnd() * (viral ? 11 : 7)) +
      Math.floor(activityBoost * 2) +
      (viral ? 6 : 4);
    const nCom = Math.floor(rnd() * (viral ? 5 : 4)) + 3 + Math.floor(activityBoost);

    /** Saves + intents */
    const nSave = Math.floor(rnd() * 4) + 3 + (viral ? 2 : 0);
    const nBeen = Math.floor(rnd() * 4) + 2 + (rnd() > 0.35 ? 1 : 0);
    const nWant = Math.floor(rnd() * 3) + 2;
    const nFav = Math.floor(rnd() * 2) + (rnd() > 0.55 ? 1 : 0);

    let tOff = rnd() * 86_400 * 110;

    for (let l = 0; l < nLike; l++) {
      const px = randomOther(personas, post.persona_username, rnd);
      likes.push({
        user_username: px.username,
        reaction_type: rnd() > 0.82 ? 'still_there' : 'like',
        post_index: pi,
        created_iso: new Date(Date.now() - tOff + l * 4100).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
    }

    tOff *= 1.06;

    /** Comment thread: opener + replies + shards */
    const threadNeed = Math.max(nCom + 4, 7);
    const threadUsers = pickDistinctPersonas(personas, post.persona_username, threadNeed, rnd);

    /** Thread pair (looks like classmates) */
    if (rnd() > 0.12) {
      const [open, reply] = pick(COMMENT_THREAD_PAIRS, rnd);
      const uOpen = threadUsers[0]!;
      const uReply = threadUsers[1]!;
      comments.push({
        user_username: uOpen.username,
        content: maybeSloppy(open, rnd),
        post_index: pi,
        created_iso: new Date(Date.now() - tOff).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
      comments.push({
        user_username: uReply.username,
        content: maybeSloppy(reply, rnd),
        post_index: pi,
        created_iso: new Date(Date.now() - tOff + 6200).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
      /** Optional third that references "^" conversation */
      if (rnd() > 0.45) {
        const u3 = threadUsers[2]!;
        const third = pick(
          [`^^ both wrong it was crowded`, '^ ok fair', '^ try weekday', 'the burrito Bowl situation is weird there', 'yeah no'],
          rnd,
        );
        comments.push({
          user_username: u3.username,
          content: maybeSloppy(third, rnd),
          post_index: pi,
          created_iso: new Date(Date.now() - tOff + 11_800).toISOString(),
          is_seed_activity: true,
          seed_batch_placeholder: slugPlaceholder,
        });
      }
    }

    /** Fill remaining quota with shards / solo lines */
    let k = comments.filter(c => c.post_index === pi).length;
    let ui = 3;
    while (k < nCom && ui < threadUsers.length) {
      const u = threadUsers[ui++]!;
      const line = maybeSloppy(pick(SOLO_COMMENT_SHARDS, rnd) || pick(['yeah', 'ok noted', 'debatable', `i believe u`, `${post.title.slice(0, 24)} vibes`], rnd), rnd);
      comments.push({
        user_username: u.username,
        content: line.slice(0, 280),
        post_index: pi,
        created_iso: new Date(Date.now() - tOff - k * 3300).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
      k++;
    }

    /** Saves */
    for (let s = 0; s < nSave; s++) {
      const sx = randomOther(personas, post.persona_username, rnd);
      saves.push({
        user_username: sx.username,
        post_index: pi,
        created_iso: new Date(Date.now() - tOff - (s + 1) * 3800).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
    }

    function pushIntent(intentType: DemoIntentRow['intent_type'], cnt: number) {
      const intentPool = pickDistinctPersonas(personas, post.persona_username, Math.min(cnt + 3, personas.length - 1), rnd);
      for (let j = 0; j < cnt && j < intentPool.length; j++) {
        const ix = intentPool[j]!;
        intents.push({
          user_username: ix.username,
          post_index: pi,
          intent_type: intentType,
          created_iso: new Date(Date.now() - tOff - (j + 3) * 2900).toISOString(),
          is_seed_activity: true,
          seed_batch_placeholder: slugPlaceholder,
        });
      }
    }

    pushIntent('been_there', nBeen);
    pushIntent('want_to_go', nWant);
    pushIntent('favorite', Math.max(nFav, rnd() > 0.92 ? 1 : 0));
  }

  const circle_joins: DemoCircleJoinRow[] = [];
  for (const p of personas) {
    const rCircle = rng(`${slugPlaceholder}:mem:${p.username}`);
    for (const cname of p.circles ?? []) {
      const joinOdds = Math.min(0.92, personaPostWeight(p.activity_level) * 0.2 + rCircle() * 0.06);
      if (rCircle() < joinOdds) {
        circle_joins.push({
          user_username: p.username,
          circle_name: cname,
          created_iso: new Date(Date.now() - rCircle() * 86_400 * 88).toISOString(),
          is_seed_activity: true,
          seed_batch_placeholder: slugPlaceholder,
        });
      }
    }
    if ((!p.circles || p.circles.length === 0) && rCircle() < 0.35) {
      circle_joins.push({
        user_username: p.username,
        circle_name: 'Budget Bites',
        created_iso: new Date(Date.now() - rCircle() * 86_400 * 54).toISOString(),
        is_seed_activity: true,
        seed_batch_placeholder: slugPlaceholder,
      });
    }
  }

  return { likes, comments, saves, intents, circle_joins };
}

export function buildExportBundle(slugPlaceholder: string, postCount = 150) {
  const posts = generatePosts(slugPlaceholder, postCount);
  const soc = generateSocialActivity(slugPlaceholder, posts);
  return {
    personas: demoPersonas,
    restaurants: demoRestaurants,
    posts,
    ...soc,
    meta: { generated_for_batch_slug_placeholder: slugPlaceholder, post_count: postCount },
  };
}
