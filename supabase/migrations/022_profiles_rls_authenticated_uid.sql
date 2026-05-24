-- Align profiles write RLS with posts (migration 021): evaluate auth.uid per row via subquery + scope to authenticated.
-- Enables reliable client inserts/upserts (e.g. ensureAuthUidAndProfileRow) alongside trigger-created profiles.

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
