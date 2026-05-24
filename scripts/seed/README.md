# Nommi demo seed (Stanford-ish ecosystem)

Synthetic personas, real **factual restaurant names**, and deterministic **student-style** posts/social edges for demos/testing. Reviews are **not** copied from Yelp or other platforms; wording is newly written for coursework.

## Files

| Path | Purpose |
|------|---------|
| `scripts/seed/data/demoPersonas.json` | 25 personas (profiles + behavior hints). |
| `scripts/seed/data/demoRestaurants.json` | ~28 eateries with cuisines, factual menu hints, tags, coarse lat/lng. |
| `scripts/seed/generateSyntheticData.ts` | Deterministic RNG → **150 posts** + likes/comments/saves/circle joins. |
| `scripts/seed/nommiSeed.ts` | Applies data to Supabase (service role) + purge helpers. |
| `scripts/seed/output/` (gitignored) | Optional JSON corpus from `--export-json`. |

## Apply DB schema first

Run migration **`020_seed_batch_tracking.sql`** (creates **`seed_batches`**, flags, **`real_*`** / **`seed_*`** views).

## Environment (.env.local or shell)

Template (copy into `.env.local`): **[`scripts/seed/env.example.txt`](env.example.txt)**.

Never commit **`SUPABASE_SERVICE_ROLE_KEY`** to git.

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NOMMI_SEED_AUTH_PASSWORD=some-long-shared-demo-password

# Optional:
# NOMMI_SEED_BATCH_SLUG=my-second-round
# NOMMI_SEED_EMAIL_DOMAIN=nommi-demo.local.invalid
```

## Commands

Export **only** corpus JSON (no DB):

```bash
npm run seed:demo:export-json
```

Full seed (**idempotent-ish**: recreates/upgrades seed users tagged to batch):

```bash
npm run seed:demo
```

Purge demo batch (deletes **`seed_batches`** row + seeded auth users tied to **`seed_batch_id`**, relying on Postgres cascades):

```bash
npm run seed:demo:purge
```

Reset cleanly:

```bash
npm run seed:demo:reset
```

Flags:

- **`--purge`** — delete batch first, then insert.
- **`--purge-only`** — delete batch + users only.
- **`--export-json`** — write `scripts/seed/output/nommi-seed-bundle-<slug>.json`.

## How it behaves

1. Inserts **`public.seed_batches`** (`slug`).
2. For each persona: **`auth.admin.createUser`** (or reuse by email); updates **`profiles`** with **`is_seed_user`**, **`seed_persona`**, **`seed_batch_id`**, bio.
3. Inserts **`posts`** (**`is_seed_content`**, **`seed_batch_id`**) spaced over ~3 months weighted toward “finals-ish” tails.
4. Inserts **`reactions`** (likes / still-there), **`comments`**, **`post_intents`** (saved), **`circle_memberships`** when circle names exist in **`food_circles`**.

Emails look like **`{username}.{batchSlug}@{NOMMI_SEED_EMAIL_DOMAIN}`**.

## Admin / UX (overview)

1. **`VITE_NOMMI_ADMIN=1`** (or equivalent) gated React route / debug panel rendering **tiny “seed”** pill when **`is_seed_user`** or **`seed_batch_id`** surfaces in admin-only payloads.
2. Normal clients never select seed flags in public queries (**omit columns** server-side).
3. Reruns: **`npm run seed:demo:purge`** then **`seed:demo`**, or use a **new **`NOMMI_SEED_BATCH_SLUG`**** to A/B scripted worlds.
4. Research exports: always query **`real_posts`** / **`real_activity`** SQL views—or filter **`WHERE NOT is_seed_content AND seed_batch_id IS NULL`**—as a checklist baseline.

See **`ANALYTICS_AND_ETHICS.md`** for analytics recipes + risks.
