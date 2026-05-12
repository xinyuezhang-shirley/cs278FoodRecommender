-- Anonymous posts: public label only; author_id remains the real owner for RLS/edit/delete.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;

UPDATE public.posts
SET is_anonymous = false
WHERE is_anonymous IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN is_anonymous SET NOT NULL;

COMMENT ON COLUMN public.posts.is_anonymous IS 'When true, UI shows pseudonym author; author_id unchanged for ownership and moderation.';

NOTIFY pgrst, 'reload schema';
