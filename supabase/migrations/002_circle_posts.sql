-- ============================================================================
-- Nommi: circle_posts join table (share/curate posts in circles, no post duplicate)
-- Safe to run on existing projects. Does not drop columns or data.
--
-- Manual: run in Supabase SQL Editor after 001_initial_schema.sql, or via CLI.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Optional: tags on circles (for Create circle UI)
-- ---------------------------------------------------------------------------
ALTER TABLE public.food_circles
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

UPDATE public.food_circles SET tags = '{}'::text[] WHERE tags IS NULL;

-- ---------------------------------------------------------------------------
-- circle_posts: one row = one post shared into one circle (attribution: shared_by)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id uuid NOT NULL REFERENCES public.food_circles (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (circle_id, post_id),
  CONSTRAINT circle_posts_note_len CHECK (note IS NULL OR char_length(note) <= 280)
);

CREATE INDEX IF NOT EXISTS circle_posts_circle_id_idx ON public.circle_posts (circle_id);
CREATE INDEX IF NOT EXISTS circle_posts_post_id_idx ON public.circle_posts (post_id);
CREATE INDEX IF NOT EXISTS circle_posts_shared_by_idx ON public.circle_posts (shared_by);
CREATE INDEX IF NOT EXISTS circle_posts_created_at_idx ON public.circle_posts (created_at DESC);

-- ---------------------------------------------------------------------------
-- Backfill: legacy posts.circle_id → circle_posts (author is first sharer)
-- ---------------------------------------------------------------------------
INSERT INTO public.circle_posts (circle_id, post_id, shared_by, created_at)
SELECT p.circle_id, p.id, p.author_id, p.created_at
FROM public.posts p
WHERE p.circle_id IS NOT NULL
ON CONFLICT (circle_id, post_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Allow authenticated users to create new circles (app “Create circle”)
-- Matches open read model; tighten later if you add private circles.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_insert_authenticated" ON public.food_circles;
CREATE POLICY "circles_insert_authenticated"
  ON public.food_circles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- RLS: circle_posts
-- SELECT: members of that circle only (join to discover, then join to view shares)
-- INSERT: member + shared_by must be current user
-- DELETE: remover must be user who shared (removes curation row only; post stays public)
-- ---------------------------------------------------------------------------
ALTER TABLE public.circle_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "circle_posts_select_circle_members" ON public.circle_posts;
DROP POLICY IF EXISTS "circle_posts_insert_circle_members" ON public.circle_posts;
DROP POLICY IF EXISTS "circle_posts_delete_own_share" ON public.circle_posts;

CREATE POLICY "circle_posts_select_circle_members"
  ON public.circle_posts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_memberships m
      WHERE m.circle_id = circle_posts.circle_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "circle_posts_insert_circle_members"
  ON public.circle_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shared_by
    AND EXISTS (
      SELECT 1 FROM public.circle_memberships m
      WHERE m.circle_id = circle_posts.circle_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "circle_posts_delete_own_share"
  ON public.circle_posts FOR DELETE TO authenticated
  USING (auth.uid() = shared_by);
