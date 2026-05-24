/**
 * Seeds realistic demo personas + posts + light social edges into Supabase.
 *
 * Prerequisites: migrations through 020_seed_batch_tracking.sql applied.
 *
 * Env (e.g. from repo root `.env.local`):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (never ship to browsers)
 *   NOMMI_SEED_AUTH_PASSWORD    (same password used for each demo Auth user unless existing)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import type { GeneratedPostRow, SeedRestaurant } from './generateSyntheticData.js';
import { buildExportBundle } from './generateSyntheticData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

const BATCH_SLUG = process.env.NOMMI_SEED_BATCH_SLUG ?? 'nommi-demo-stanford-ecosystem-v1';

const EMAIL_DOMAIN = process.env.NOMMI_SEED_EMAIL_DOMAIN ?? 'nommi-demo.local.invalid';

export function coerceSupabaseEnv(opts?: { requireSeedPassword?: boolean }) {
  const url =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.VITE_SUPABASE_SERVICE_ROLE ??
    '';

  const password = process.env.NOMMI_SEED_AUTH_PASSWORD ?? '';
  const errors: string[] = [];
  if (!url.startsWith('https://')) errors.push('Need SUPABASE_URL (or VITE_SUPABASE_URL) with https.');
  if (key.length < 40) {
    const hasAnon = (process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '').length > 40;
    errors.push(
      hasAnon
        ? 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Project Settings → API → service_role). It is NOT the anon key — never use a VITE_ prefix for service_role.'
        : 'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (service_role JWT from Dashboard → Settings → API).',
    );
  }
  const needPass = opts?.requireSeedPassword !== false;
  if (needPass && password.length < 8) {
    errors.push(
      'Set NOMMI_SEED_AUTH_PASSWORD in .env.local (any 8+ chars) — shared password used when creating demo Auth users.',
    );
  }
  return { url, serviceRoleKey: key, seedPassword: password, envErrors: errors };
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw error;
    const u = data.users.find(x => x.email === email);
    if (u) return u;

    const n = data.users?.length ?? 0;
    if (n < 500) break;
  }
  return null;
}

async function purgeBatch(admin: ReturnType<typeof createClient>) {
  const { data: batch } = await admin.from('seed_batches').select('id').eq('slug', BATCH_SLUG).maybeSingle();
  if (!batch?.id) {
    console.warn(`No seed batch row for slug '${BATCH_SLUG}'`);
    return;
  }
  const { data: profs } = await admin.from('profiles').select('id').eq('seed_batch_id', batch.id);

  console.log(`Deleting ${profs?.length ?? 0} seed auth users (+ cascades)...`);
  for (const p of profs ?? []) {
    await admin.auth.admin.deleteUser(p.id).catch(() => undefined);
  }
  await admin.from('seed_batches').delete().eq('id', batch.id);
  console.log('Purge done.');
}


function postTimelineIso(rows: GeneratedPostRow[]): string[] {
  const t0 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const t1 = Date.now() - 65 * 60 * 1000;
  const wsum = rows.reduce((a, r) => a + r.created_at_relative_weight, 0) || 1;
  const raw: number[] = [];
  let acc = t0;
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i]!.created_at_relative_weight / wsum;
    acc += (t1 - t0) * w * (0.86 + Math.sin(i * 0.31) * 0.06);
    acc += Math.sin(i * 1.9 + 11) * 4200 * 60;
    raw.push(Math.min(t1 - (rows.length - i) * 45_000, acc));
  }
  raw.sort((a, b) => a - b);
  return raw.map(ms => new Date(Math.floor(ms)).toISOString());
}

/** Align seeded free-food `created_at` with Map “recent” UX (deterministic pseudo-random offsets). */
const SEED_FREE_FOOD_RECENT_WINDOW_HOURS = 48;

function overlayRecentFreeFoodCreatedAt(
  rows: GeneratedPostRow[],
  isoAlignedToRowOrder: string[],
): string[] {
  const next = [...isoAlignedToRowOrder];
  const now = Date.now();
  const windowMs = SEED_FREE_FOOD_RECENT_WINDOW_HOURS * 60 * 60 * 1000;
  rows.forEach((row, idx) => {
    if (row.type !== 'free_food') return;
    const frac = ((idx * 1103515245 + 12345) >>> 0) / 4294967295;
    const t = Math.floor(now - windowMs * (0.04 + frac * 0.92));
    next[idx] = new Date(t).toISOString();
  });
  return next;
}

async function upsertSeedUser(admin: ReturnType<typeof createClient>, params: {
  email: string;
  password: string;
  username: string;
  bio: string;
  display_name: string;
  batch_uuid: string;
}) {
  const existing = await findUserByEmail(admin, params.email);
  if (!existing?.id) {
    const created = await admin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { username: params.username },
    });
    if (created.error) throw created.error;

    const id = created.data.user!.id;
    const { error: upErr } = await admin.from('profiles').upsert({
      id,
      username: params.username.slice(0, 30),
      bio: params.bio,
      avatar_url: null,
      food_personality: null,
      is_seed_user: true,
      seed_persona: params.display_name.slice(0, 120),
      seed_batch_id: params.batch_uuid,
    }, { onConflict: 'id' });

    if (upErr && !`${upErr.message}`.includes('duplicate')) console.warn(upErr.message);
    return id;
  }
  await admin.from('profiles').update({
    is_seed_user: true,
    seed_persona: params.display_name.slice(0, 120),
    seed_batch_id: params.batch_uuid,
    bio: params.bio,
    username: params.username.slice(0, 30),
  }).eq('id', existing.id);
  return existing.id;
}

async function fetchCircleMap(admin: ReturnType<typeof createClient>): Promise<Map<string, string>> {
  const { data, error } = await admin.from('food_circles').select('id, name');
  if (error) throw error;
  const m = new Map<string, string>();
  for (const row of data ?? []) m.set((row.name as string).trim().toLowerCase(), row.id as string);
  return m;
}

function restByName(restaurants: SeedRestaurant[]) {
  const m = new Map<string, SeedRestaurant>();
  for (const r of restaurants) m.set(r.name, r);
  return (name: string) => {
    const x = m.get(name);
    if (!x) throw new Error(`Unknown restaurant in generator: "${name}"`);
    return x;
  };
}

export async function runSeedCli() {
  const args = process.argv.slice(2);
  const purgeOnly = args.includes('--purge-only');
  const purgeFirst = args.includes('--purge');
  const exportOnly = args.includes('--export-json');

  const { url, serviceRoleKey, seedPassword, envErrors } = coerceSupabaseEnv({
    requireSeedPassword: !exportOnly && !purgeOnly,
  });

  if (!exportOnly && envErrors.length > 0) {
    console.error(envErrors.join('\n'));
    process.exit(2);
    return;
  }

  const bundle = buildExportBundle(BATCH_SLUG, 150);

  if (exportOnly) {
    const outDir = path.join(__dirname, 'output');
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `nommi-seed-bundle-${BATCH_SLUG}.json`);
    writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    console.log(`Wrote corpus JSON (${bundle.posts.length} posts): ${outPath}`);
    process.exit(0);
    return;
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (purgeOnly) {
    await purgeBatch(admin as never);
    process.exit(0);
    return;
  }
  if (purgeFirst) await purgeBatch(admin as never);

  const { error: batErr } = await admin.from('seed_batches').insert({
    slug: BATCH_SLUG,
    description: 'Stanford-ish demo personas + eateries + imperfect student prose',
  });
  if (
    batErr
    && batErr.code !== '23505'
    && !(batErr.message ?? '').includes('duplicate')
    && !(batErr.details ?? '').includes('already exists')
  ) {
    throw batErr;
  }

  const { data: batchRow } = await admin.from('seed_batches').select('id').eq('slug', BATCH_SLUG).single();

  const batch_uuid = batchRow?.id ?? '';
  if (!batch_uuid) throw new Error('Could not fetch seed_batches id after upsert.');
  console.log(`Using seed batch ${BATCH_SLUG} → ${batch_uuid}`);

  const userIdByUsername = new Map<string, string>();

  for (const p of bundle.personas) {
    const email = `${p.username}.${BATCH_SLUG.replace(/[^\w]/g, '-')}@${EMAIL_DOMAIN}`;
    const id = await upsertSeedUser(admin as never, {
      email,
      password: seedPassword,
      username: p.username.slice(0, 24),
      bio: `${p.display_name}: ${p.bio}`,
      display_name: p.display_name as string,
      batch_uuid,
    });
    userIdByUsername.set(p.username, id);
  }

  const circleKey = await fetchCircleMap(admin as never);

  /** circle joins */
  let joins = 0;
  for (const row of bundle.circle_joins) {
    const cid = circleKey.get(row.circle_name.trim().toLowerCase());
    if (!cid) {
      console.warn(`Skip circle '${row.circle_name}' (not found in DB).`);
      continue;
    }
    const uid = userIdByUsername.get(row.user_username);
    if (!uid) continue;
    const { error } = await admin.from('circle_memberships').insert({
      circle_id: cid,
      user_id: uid,
      joined_at: row.created_iso,
      seed_batch_id: batch_uuid,
      is_seed_activity: true,
    });
    if (!error || error.code === '23505') joins++;
  }
  console.log(`Circle joins applied (attempts OK): ~${joins}`);

  const resolveRest = restByName(bundle.restaurants);

  let times = postTimelineIso(bundle.posts);
  times = overlayRecentFreeFoodCreatedAt(bundle.posts, times);

  /** posts */
  const postIdsOrdered: string[] = [];
  for (let idx = 0; idx < bundle.posts.length; idx++) {
    const row = bundle.posts[idx]!;
    const author = userIdByUsername.get(row.persona_username);
    if (!author) continue;
    const r = resolveRest(row.restaurant_name);

    const { data: ins, error } = await admin.from('posts').insert({
      author_id: author,
      type: row.type,
      title: row.title,
      description: row.description,
      image_url: null,
      location_name: r.name,
      latitude: r.lat,
      longitude: r.lng,
      cuisine_tags: row.cuisine_tags,
      dietary_tags: row.dietary_tags,
      is_free_food: row.type === 'free_food',
      expires_at: null,
      circle_id: null,
      is_anonymous: false,
      created_at: times[idx],
      updated_at: times[idx],
      is_seed_content: true,
      seed_batch_id: batch_uuid,
    }).select('id').single();
    if (error) console.error(idx, row.title.slice(0, 40), error.message);
    if (ins?.id) postIdsOrdered.push(ins.id);
    else console.warn(`Post insert failed idx ${idx}`);
  }

  if (postIdsOrdered.length !== bundle.posts.length)
    console.warn(`Post count mismatch: ${postIdsOrdered.length}/${bundle.posts.length}`);

  /** comments */
  let cCt = 0;
  for (const c of bundle.comments) {
    const uid = userIdByUsername.get(c.user_username);
    const pid = postIdsOrdered[c.post_index];
    if (!uid || !pid) continue;

    await admin.from('comments').insert({
      id: crypto.randomUUID(),
      post_id: pid,
      author_id: uid,
      content: c.content.slice(0, 280),
      created_at: c.created_iso,
      is_seed_activity: true,
      seed_batch_id: batch_uuid,
    });
    cCt++;
  }

  /** likes / still-there reactions */
  let rCt = 0;
  for (const l of bundle.likes) {
    const uid = userIdByUsername.get(l.user_username);
    const pid = postIdsOrdered[l.post_index];
    if (!uid || !pid) continue;
    const { error } = await admin.from('reactions').insert({
      id: crypto.randomUUID(),
      post_id: pid,
      user_id: uid,
      type: l.reaction_type,
      seed_batch_id: batch_uuid,
      is_seed_activity: true,
    });
    if (!error || error.code === '23505') rCt++;
  }

  /** saves + been_there / want_to_go / favorite intents */
  let sCt = 0;
  let iCt = 0;
  const intentRows = [
    ...bundle.saves.map(sv => ({ ...sv, intent_type: 'saved' as const })),
    ...(bundle.intents ?? []).map(it => ({
      user_username: it.user_username,
      post_index: it.post_index,
      created_iso: it.created_iso,
      intent_type: it.intent_type,
    })),
  ];
  for (const row of intentRows) {
    const uid = userIdByUsername.get(row.user_username);
    const pid = postIdsOrdered[row.post_index];
    if (!uid || !pid) continue;
    const pi = await admin.from('post_intents').upsert({
      id: crypto.randomUUID(),
      user_id: uid,
      post_id: pid,
      intent_type: row.intent_type,
      created_at: row.created_iso,
      seed_batch_id: batch_uuid,
      is_seed_activity: true,
    }, { onConflict: 'user_id,post_id,intent_type' });
    if (!pi.error) {
      if (row.intent_type === 'saved') sCt++;
      else iCt++;
    }
  }

  console.log(
    `Done seeding '${BATCH_SLUG}' — posts:${postIdsOrdered.length} reactions:${rCt} saves:${sCt} other_intents:${iCt} comments:${cCt}`,
  );
}

void runSeedCli().catch(err => {
  console.error(err);
  process.exit(1);
});
