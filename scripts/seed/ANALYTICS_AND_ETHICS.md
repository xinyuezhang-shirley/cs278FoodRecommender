# Seed data for analytics — safety, examples, critiques

Views are defined in **`supabase/migrations/020_seed_batch_tracking.sql`** (adapt names if your project diverged):

- **`real_posts`**, **`real_comments`**, **`real_activity`**, **`real_reactions`**, **`real_profiles`**, etc. — production-shaped slices (**`WHERE NOT`** seed flags **`AND`** **`seed_batch_id IS NULL`**).
- **`seed_posts`**, **`seed_activity`**, **`seed_profiles`**, etc. — inspection / QA (**`WHERE`** flagged **OR batch id set**).

## 1) Example KPIs — **real only**

```sql
-- Daily active-ish posters (distinct authors), real posts only
select date_trunc('day', created_at) as d,
       count(distinct author_id) as active_authors
from public.real_posts
group by 1
order by 1 desc;

-- Commentary rate on organic posts only
select avg(realtime.cnt)::numeric(8,4) as avg_comments_per_post
from (
  select p.id, count(*) as cnt
  from public.real_posts p
  left join public.real_comments c on c.post_id = p.id
  group by p.id
) realtime;
```

## 2) Admin / QA — slice & compare batches

```sql
-- Sanity: how big is scripted traffic?
select slug,
       sb.id as batch_uuid,
       (select count(*) from public.posts pp where pp.seed_batch_id = sb.id) as posts,
       (select count(*) from public.profiles pr where pr.seed_batch_id = sb.id) as profiles
from public.seed_batches sb
order by sb.created_at desc;
```

```sql
-- Top seeded personas by scripted reactions authored
select pr.username,
       count(*) as reaction_rows
from public.reactions rr
join public.profiles pr on pr.id = rr.user_id
where rr.is_seed_activity or rr.seed_batch_id is not null
group by 1
order by 2 desc
limit 15;
```

```sql
-- Scripted “hotspots” via location names
select location_name,
       count(*) posts
from public.posts
where is_seed_content or seed_batch_id is not null
group by 1
order by 2 desc;
```

## 3) Export hygiene checklist (prevent research contamination)

1. **Freeze query templates** referencing **`FROM real_*`** (never **`FROM posts`** for published studies unless you **`AND`** filter seed flags redundantly).
2. **Treat `NULL seed_batch_id` legacy rows cautiously**: old demo data without flags still looks “real” to views—occasionally **`UPDATE`** tag obvious junk with a retrospective batch slug.
3. **Never expose** scripted Auth emails externally; segregate demos to a **`throwaway`** project if doing human-subject research.
4. **Document cohort time windows** excluding known seed onboarding dates.
5. **Diff dashboards**: keep a Grafana/Metabase board toggling **Organic / Script / Overlay** traces.

---

## Section 9 — Critique / weak points / ethics

### Weak realism spots

1. Deterministic RNG still yields **detectable repetitions** in comment shards (tiny pool of short lines)—swap for larger pools or GPT-assisted paraphrasing if scrutinized.
2. **Geographic coherence**: some diners “teleport” between Mountain View ↔ Stanford same day narratives implied by overlapping RNG—acceptable for vibes, brittle for commute modeling.
3. **Language**: slang drifts inconsistently (“valid”, “lol”, “rn”) mixing cohorts subtly wrong for some archetypes—human pass helps.

### Ethical considerations

4. Restaurants are named factually **without** scraped reviews—that’s good—but implying endorsements (“slaps tbh”) is still **thin reputation risk** versus real businesses → keep disclaimers (“student project, fictionalized opinions”).
5. Using **near-real lat/lng** can feel privacy-adjacent; it’s generic POI-grade but avoid precise home addresses fictitiously tied to personas.

### Analytics contamination pathways

6. Forgotten **`SELECT *`** in Metabase forgetting seed views → polluted MAU/UPE.
7. Cross-environment leakage (staging seeded data copied to prod analytic warehouse).
8. User-generated overlaps (real user reacting to scripted post) bleed signal—analytics should join through **`FROM real_posts`** but **interaction tables** referencing synthetic posts remain mixed unless flagged.

### Scale / infra

9. Pagination on **`admin.listUsers`** for upsert lookups is **`O(users)` worst case** — fine for demos; replace with deterministic email derivation + caught duplicate errors earlier if scale grows.
10. Purge assumes **exclusive seed ownership**: if organic users mistakenly share **`seed_batch_id`**, deletion becomes dangerous (**RLS tightening** prevents this—see migration notes).

### Simplifications (if tightening scope)

Drop **`still_there`** reactions initially; omit Mountain View outliers; shrink persona count to ~12 — community graph still plausible with less writing surface.
