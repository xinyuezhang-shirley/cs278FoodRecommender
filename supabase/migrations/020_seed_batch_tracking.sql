-- =====================================================================
-- Seed registry + flags vs real/production analytics (safe on existing DBs).
--
-- Convention:
--   - Real rows default: booleans FALSE, seed_batch_id NULL (includes legacy rows).
--   - Seeded row typically: booleans TRUE *and* seed_batch_id FK set (either alone still “seeded”).
--
-- Profiles: identities / personas
-- Posts: seed “content”; interactions: reactions, intents, memberships, circle_posts, …
--
-- Earlier draft used text seed_batch_id; if present we drop those columns before adding uuid FKs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tear down analytic views before altering underlying columns/types
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.real_activity;
DROP VIEW IF EXISTS public.seed_activity;
DROP VIEW IF EXISTS public.real_posts;
DROP VIEW IF EXISTS public.seed_posts;
DROP VIEW IF EXISTS public.real_comments;
DROP VIEW IF EXISTS public.seed_comments;
DROP VIEW IF EXISTS public.real_reactions;
DROP VIEW IF EXISTS public.seed_reactions;
DROP VIEW IF EXISTS public.real_post_intents;
DROP VIEW IF EXISTS public.seed_post_intents;
DROP VIEW IF EXISTS public.real_friendships;
DROP VIEW IF EXISTS public.seed_friendships;
DROP VIEW IF EXISTS public.real_friend_requests;
DROP VIEW IF EXISTS public.seed_friend_requests;
DROP VIEW IF EXISTS public.real_circle_memberships;
DROP VIEW IF EXISTS public.seed_circle_memberships;
DROP VIEW IF EXISTS public.real_circle_posts;
DROP VIEW IF EXISTS public.seed_circle_posts;
DROP VIEW IF EXISTS public.real_food_circles;
DROP VIEW IF EXISTS public.seed_food_circles;
DROP VIEW IF EXISTS public.real_profiles;
DROP VIEW IF EXISTS public.seed_profiles;
DROP VIEW IF EXISTS public.real_dm_threads;
DROP VIEW IF EXISTS public.seed_dm_threads;
DROP VIEW IF EXISTS public.real_dm_messages;
DROP VIEW IF EXISTS public.seed_dm_messages;
DROP VIEW IF EXISTS public.real_activity_notifications;
DROP VIEW IF EXISTS public.seed_activity_notifications;

-- Indexes from older seed_batch_id drafts (text or uuid naming kept below)
DROP INDEX IF EXISTS public.profiles_seed_batch_id_idx;
DROP INDEX IF EXISTS public.posts_seed_batch_id_idx;
DROP INDEX IF EXISTS public.comments_seed_batch_id_idx;
DROP INDEX IF EXISTS public.reactions_seed_batch_id_idx;
DROP INDEX IF EXISTS public.circle_posts_seed_batch_id_idx;

-- ---------------------------------------------------------------------
-- Migrate legacy text seed_batch_id columns → drop (replaced by uuid FK)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'profiles',
    'food_circles',
    'posts',
    'comments',
    'reactions',
    'circle_memberships',
    'circle_posts',
    'post_intents',
    'friend_requests',
    'friendships',
    'dm_threads',
    'dm_messages',
    'activity_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = tbl
        AND c.column_name = 'seed_batch_id'
        AND c.data_type = 'text'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN seed_batch_id', tbl);
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- Registry (FK target)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.seed_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seed_batches_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.seed_batches IS
  'Named demo/import runs; referenced by profiles, posts, circles, and interaction tables for purge + analytics.';

ALTER TABLE public.seed_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seed_batches_select_authenticated ON public.seed_batches;

CREATE POLICY seed_batches_select_authenticated
  ON public.seed_batches FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- Profiles (auth identities live on auth.users; flags live here)
-- =====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_seed_user boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.is_seed_user IS 'True for synthetic/demo accounts seeded into auth+profiles.';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seed_persona text;
COMMENT ON COLUMN public.profiles.seed_persona IS 'Optional label for scripted personas (scenario name, persona key, etc.).';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.profiles.seed_batch_id IS 'FK to seed_batches for grouping one bootstrap run.';
DO $$
BEGIN
  ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- Content: posts + curated circles catalogue
-- =====================================================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_seed_content boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.posts.is_seed_content IS 'True when row is scripted demo content.';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.posts.seed_batch_id IS 'FK to seed_batches; NULL → treat as prod unless flag set.';
DO $$
BEGIN
  ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.food_circles ADD COLUMN IF NOT EXISTS is_seed_catalog boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.food_circles.is_seed_catalog IS 'True when circle row came from scripted catalog seed (vs user-created circle).';
ALTER TABLE public.food_circles ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.food_circles.seed_batch_id IS 'FK grouping catalog seed installs.';
DO $$
BEGIN
  ALTER TABLE ONLY public.food_circles
    ADD CONSTRAINT food_circles_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- Interaction / activity-shaped tables (“likes”, saves, joins, shares, …)
-- =====================================================================

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.comments.is_seed_activity IS 'Synthetic comment activity for demos.';
COMMENT ON COLUMN public.comments.seed_batch_id IS 'FK to seed_batches.';
DO $$
BEGIN
  ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.reactions.is_seed_activity IS 'Synthetic likes (“like” / “still_there”) for demos.';
COMMENT ON COLUMN public.reactions.seed_batch_id IS 'FK to seed_batches.';
DO $$
BEGIN
  ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.post_intents ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.post_intents ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.post_intents.is_seed_activity IS 'Synthetic saves/intents.';
COMMENT ON COLUMN public.post_intents.seed_batch_id IS 'FK to seed_batches.';
DO $$
BEGIN
  ALTER TABLE ONLY public.post_intents
    ADD CONSTRAINT post_intents_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.circle_memberships ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.circle_memberships ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.circle_memberships.is_seed_activity IS 'Synthetic circle join rows.';
COMMENT ON COLUMN public.circle_memberships.seed_batch_id IS 'FK to seed_batches.';
DO $$
BEGIN
  ALTER TABLE ONLY public.circle_memberships
    ADD CONSTRAINT circle_memberships_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.circle_posts ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.circle_posts ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
COMMENT ON COLUMN public.circle_posts.is_seed_activity IS 'Synthetic share rows into circles.';
COMMENT ON COLUMN public.circle_posts.seed_batch_id IS 'FK to seed_batches.';
DO $$
BEGIN
  ALTER TABLE ONLY public.circle_posts
    ADD CONSTRAINT circle_posts_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.friend_requests ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.friend_requests ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
DO $$
BEGIN
  ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
DO $$
BEGIN
  ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.dm_threads ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.dm_threads ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
DO $$
BEGIN
  ALTER TABLE ONLY public.dm_threads
    ADD CONSTRAINT dm_threads_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
DO $$
BEGIN
  ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.activity_notifications ADD COLUMN IF NOT EXISTS is_seed_activity boolean NOT NULL DEFAULT false;
ALTER TABLE public.activity_notifications ADD COLUMN IF NOT EXISTS seed_batch_id uuid;
DO $$
BEGIN
  ALTER TABLE ONLY public.activity_notifications
    ADD CONSTRAINT activity_notifications_seed_batch_id_fkey
    FOREIGN KEY (seed_batch_id) REFERENCES public.seed_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- Partial indexes for batch-scoped deletes / lookups
-- =====================================================================
CREATE INDEX IF NOT EXISTS profiles_seed_batch_uuid_idx ON public.profiles(seed_batch_id) WHERE seed_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_seed_batch_uuid_idx ON public.posts(seed_batch_id) WHERE seed_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_seed_batch_uuid_idx ON public.comments(seed_batch_id) WHERE seed_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reactions_seed_batch_uuid_idx ON public.reactions(seed_batch_id) WHERE seed_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS circle_posts_seed_batch_uuid_idx ON public.circle_posts(seed_batch_id) WHERE seed_batch_id IS NOT NULL;

-- =====================================================================
-- real_* — production-shaped slices (SECURITY INVOKER; RLS on base tables applies)
-- =====================================================================
CREATE OR REPLACE VIEW public.real_profiles AS
SELECT
  id,
  username,
  avatar_url,
  bio,
  food_personality,
  show_friends_public,
  created_at
FROM public.profiles
WHERE NOT is_seed_user AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_posts AS
SELECT
  id,
  author_id,
  type,
  title,
  description,
  image_url,
  location_name,
  latitude,
  longitude,
  place_website_url,
  google_maps_url,
  cuisine_tags,
  dietary_tags,
  is_free_food,
  expires_at,
  circle_id,
  created_at,
  updated_at,
  is_anonymous
FROM public.posts
WHERE NOT is_seed_content AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_comments AS
SELECT id, post_id, author_id, content, created_at
FROM public.comments
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_reactions AS
SELECT id, post_id, user_id, type
FROM public.reactions
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_post_intents AS
SELECT id, user_id, post_id, intent_type, created_at
FROM public.post_intents
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_friendships AS
SELECT id, user_a_id, user_b_id, created_at
FROM public.friendships
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_friend_requests AS
SELECT id, sender_id, receiver_id, status, created_at
FROM public.friend_requests
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_circle_memberships AS
SELECT circle_id, user_id, joined_at
FROM public.circle_memberships
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_circle_posts AS
SELECT id, circle_id, post_id, shared_by, note, created_at
FROM public.circle_posts
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_food_circles AS
SELECT id, name, description, icon_type, tags, created_at
FROM public.food_circles
WHERE NOT is_seed_catalog AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_dm_threads AS
SELECT id, participant_ids, last_message_at
FROM public.dm_threads
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_dm_messages AS
SELECT id, thread_id, sender_id, body, created_at, message_type, image_url
FROM public.dm_messages
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_activity_notifications AS
SELECT id, user_id, actor_id, kind, entity_id, read_at, created_at
FROM public.activity_notifications
WHERE NOT is_seed_activity AND seed_batch_id IS NULL;

CREATE OR REPLACE VIEW public.real_activity AS
SELECT
  'post'::text AS kind,
  p.id AS entity_id,
  p.created_at AS occurred_at,
  p.author_id AS actor_id,
  NULL::uuid AS post_id,
  NULL::uuid AS circle_id,
  NULL::uuid AS secondary_actor_id
FROM public.posts p
WHERE NOT p.is_seed_content AND p.seed_batch_id IS NULL

UNION ALL

SELECT
  'comment',
  c.id,
  c.created_at,
  c.author_id,
  c.post_id,
  NULL::uuid,
  NULL::uuid
FROM public.comments c
WHERE NOT c.is_seed_activity AND c.seed_batch_id IS NULL

UNION ALL

SELECT
  'circle_share',
  cp.id,
  cp.created_at,
  cp.shared_by,
  cp.post_id,
  cp.circle_id,
  NULL::uuid
FROM public.circle_posts cp
WHERE NOT cp.is_seed_activity AND cp.seed_batch_id IS NULL;

COMMENT ON VIEW public.real_activity IS
  'Unified non-seeded events: posts, comments, curated circle shares.';

COMMENT ON VIEW public.real_profiles IS 'Profiles whose identity is not marked as seeded.';
COMMENT ON VIEW public.real_posts IS 'Non-seeded post content.';
COMMENT ON VIEW public.real_comments IS 'Non-seeded comments.';

-- =====================================================================
-- seed_* — mirror for QA / scripted load inspection
-- =====================================================================
CREATE OR REPLACE VIEW public.seed_profiles AS
SELECT
  id,
  username,
  avatar_url,
  bio,
  food_personality,
  show_friends_public,
  created_at,
  is_seed_user,
  seed_persona,
  seed_batch_id
FROM public.profiles
WHERE is_seed_user OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_posts AS
SELECT
  id,
  author_id,
  type,
  title,
  description,
  image_url,
  location_name,
  latitude,
  longitude,
  place_website_url,
  google_maps_url,
  cuisine_tags,
  dietary_tags,
  is_free_food,
  expires_at,
  circle_id,
  created_at,
  updated_at,
  is_anonymous,
  is_seed_content,
  seed_batch_id
FROM public.posts
WHERE is_seed_content OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_comments AS
SELECT id, post_id, author_id, content, created_at, is_seed_activity, seed_batch_id
FROM public.comments
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_reactions AS
SELECT id, post_id, user_id, type, is_seed_activity, seed_batch_id
FROM public.reactions
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_post_intents AS
SELECT id, user_id, post_id, intent_type, created_at, is_seed_activity, seed_batch_id
FROM public.post_intents
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_friendships AS
SELECT id, user_a_id, user_b_id, created_at, is_seed_activity, seed_batch_id
FROM public.friendships
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_friend_requests AS
SELECT id, sender_id, receiver_id, status, created_at, is_seed_activity, seed_batch_id
FROM public.friend_requests
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_circle_memberships AS
SELECT circle_id, user_id, joined_at, is_seed_activity, seed_batch_id
FROM public.circle_memberships
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_circle_posts AS
SELECT id, circle_id, post_id, shared_by, note, created_at, is_seed_activity, seed_batch_id
FROM public.circle_posts
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_food_circles AS
SELECT id, name, description, icon_type, tags, created_at, is_seed_catalog, seed_batch_id
FROM public.food_circles
WHERE is_seed_catalog OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_dm_threads AS
SELECT id, participant_ids, last_message_at, is_seed_activity, seed_batch_id
FROM public.dm_threads
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_dm_messages AS
SELECT id, thread_id, sender_id, body, created_at, message_type, image_url, is_seed_activity, seed_batch_id
FROM public.dm_messages
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_activity_notifications AS
SELECT id, user_id, actor_id, kind, entity_id, read_at, created_at, is_seed_activity, seed_batch_id
FROM public.activity_notifications
WHERE is_seed_activity OR seed_batch_id IS NOT NULL;

CREATE OR REPLACE VIEW public.seed_activity AS
SELECT
  'post'::text AS kind,
  p.id AS entity_id,
  p.created_at AS occurred_at,
  p.author_id AS actor_id,
  NULL::uuid AS post_id,
  NULL::uuid AS circle_id,
  NULL::uuid AS secondary_actor_id
FROM public.posts p
WHERE p.is_seed_content OR p.seed_batch_id IS NOT NULL

UNION ALL

SELECT
  'comment',
  c.id,
  c.created_at,
  c.author_id,
  c.post_id,
  NULL::uuid,
  NULL::uuid
FROM public.comments c
WHERE c.is_seed_activity OR c.seed_batch_id IS NOT NULL

UNION ALL

SELECT
  'circle_share',
  cp.id,
  cp.created_at,
  cp.shared_by,
  cp.post_id,
  cp.circle_id,
  NULL::uuid
FROM public.circle_posts cp
WHERE cp.is_seed_activity OR cp.seed_batch_id IS NOT NULL;

COMMENT ON VIEW public.seed_activity IS
  'Union of scripted feed events tied to seeded posts/comments/shares';

-- =====================================================================
-- Grants for PostgREST / API consumers
-- =====================================================================
GRANT SELECT ON public.seed_batches TO authenticated, service_role;

GRANT SELECT ON public.real_profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.real_posts TO anon, authenticated, service_role;
GRANT SELECT ON public.real_comments TO anon, authenticated, service_role;
GRANT SELECT ON public.real_activity TO anon, authenticated, service_role;
GRANT SELECT ON public.real_reactions TO anon, authenticated, service_role;
GRANT SELECT ON public.real_post_intents TO authenticated, service_role;
GRANT SELECT ON public.real_friendships TO authenticated, service_role;
GRANT SELECT ON public.real_friend_requests TO authenticated, service_role;
GRANT SELECT ON public.real_circle_memberships TO authenticated, service_role;
GRANT SELECT ON public.real_circle_posts TO authenticated, service_role;
GRANT SELECT ON public.real_food_circles TO anon, authenticated, service_role;
GRANT SELECT ON public.real_dm_threads TO authenticated, service_role;
GRANT SELECT ON public.real_dm_messages TO authenticated, service_role;
GRANT SELECT ON public.real_activity_notifications TO authenticated, service_role;

GRANT SELECT ON public.seed_profiles TO authenticated, service_role;
GRANT SELECT ON public.seed_posts TO authenticated, service_role;
GRANT SELECT ON public.seed_comments TO authenticated, service_role;
GRANT SELECT ON public.seed_activity TO authenticated, service_role;
GRANT SELECT ON public.seed_reactions TO authenticated, service_role;
GRANT SELECT ON public.seed_post_intents TO authenticated, service_role;
GRANT SELECT ON public.seed_friendships TO authenticated, service_role;
GRANT SELECT ON public.seed_friend_requests TO authenticated, service_role;
GRANT SELECT ON public.seed_circle_memberships TO authenticated, service_role;
GRANT SELECT ON public.seed_circle_posts TO authenticated, service_role;
GRANT SELECT ON public.seed_food_circles TO authenticated, service_role;
GRANT SELECT ON public.seed_dm_threads TO authenticated, service_role;
GRANT SELECT ON public.seed_dm_messages TO authenticated, service_role;
GRANT SELECT ON public.seed_activity_notifications TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
