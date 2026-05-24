-- Fix "new row violates row level security policy for table posts" for normal sessions.
-- Table uses `author_id` (FK → `profiles.id`); RLS must enforce `auth.uid() = author_id`.
--
-- (1) RLS on posts uses (SELECT auth.uid()) scoped to authenticated — avoids PostgREST/RLS
--     init-plan quirks where a bare auth.uid() is evaluated incorrectly for INSERT batches.
--
-- (2) handle_new_user: if synthetic/chosen username collides with UNIQUE(profiles.username),
--     retry with a deterministic fallback derived from NEW.id instead of failing the trigger.
--
-- Safe on existing DBs: replaces named policies and replaces function only.

DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;

CREATE POLICY "posts_insert_auth" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  from_email text;
  id_digits text;
  fallback_username text;
BEGIN
  uname := NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), '');

  IF uname IS NULL THEN
    from_email :=
      regexp_replace(
        lower(split_part(coalesce(NEW.email, ''), '@', 1)),
        '[^a-z0-9_]',
        '_',
        'g'
      );
    from_email := trim(both '_' from from_email);
    IF coalesce(length(from_email), 0) < 2 THEN
      uname := 'nommi_' || left(regexp_replace(NEW.id::text, '-', '', 'g'), 10);
    ELSE
      uname := left(from_email, 30);
    END IF;
  END IF;

  IF length(uname) > 30 THEN uname := left(uname, 30); END IF;

  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, uname);
    RETURN NEW;
  EXCEPTION
    WHEN unique_violation THEN
      id_digits := regexp_replace(NEW.id::text, '-', '', 'g');
      fallback_username := left('nommi_' || id_digits, 30);
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, fallback_username);
      RETURN NEW;
  END;
END;
$$;
