-- One reaction row per (post, user, type) so "like" and "still_there" can coexist.
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_post_id_user_id_key;

DO $$
BEGIN
  ALTER TABLE public.reactions ADD CONSTRAINT reactions_post_user_type_key UNIQUE (post_id, user_id, type);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
