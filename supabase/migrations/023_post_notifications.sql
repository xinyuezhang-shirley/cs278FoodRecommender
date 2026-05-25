-- In-app notifications for post interactions (likes, comments, saves/intents).
-- Rows are inserted by SECURITY DEFINER triggers so clients never forge notifications;
-- SELECT/UPDATE(is_read) go through RLS for the authenticated recipient.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN ('like', 'comment', 'save', 'favorite', 'want_to_go', 'been_there')
  ),
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_seed_activity boolean NOT NULL DEFAULT false,
  seed_batch_id uuid REFERENCES public.seed_batches(id) ON DELETE SET NULL,
  CONSTRAINT notifications_recipient_differs_from_actor CHECK (recipient_id <> actor_id)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_created_idx
  ON public.notifications(recipient_id, created_at DESC)
  WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications(recipient_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notifications IS 'Post interaction alerts for the post owner; inserted by triggers, read by recipients.';

-- Recipients see only their rows
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

-- Mark read only on own notifications
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

REVOKE ALL ON public.notifications FROM PUBLIC;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ---------------------------------------------------------------------------
-- Trigger: new comment → notify post owner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_owner_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT p.author_id INTO post_author FROM public.posts AS p WHERE p.id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.author_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    post_id,
    type,
    is_seed_activity,
    seed_batch_id
  )
  VALUES (
    post_author,
    NEW.author_id,
    NEW.post_id,
    'comment',
    NEW.is_seed_activity,
    NEW.seed_batch_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notifications_on_comment_insert ON public.comments;
CREATE TRIGGER tr_notifications_on_comment_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_post_owner_on_comment();

COMMENT ON FUNCTION public.notify_post_owner_on_comment() IS 'Notify post owner when someone comments (skips self-comments).';

-- ---------------------------------------------------------------------------
-- Trigger: new reaction (like only — still_there omitted for quieter UX)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_owner_on_reaction_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  IF NEW.type <> 'like' THEN
    RETURN NEW;
  END IF;
  SELECT p.author_id INTO post_author FROM public.posts AS p WHERE p.id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    post_id,
    type,
    is_seed_activity,
    seed_batch_id
  )
  VALUES (
    post_author,
    NEW.user_id,
    NEW.post_id,
    'like',
    NEW.is_seed_activity,
    NEW.seed_batch_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notifications_on_reaction_like_insert ON public.reactions;
CREATE TRIGGER tr_notifications_on_reaction_like_insert
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE PROCEDURE public.notify_post_owner_on_reaction_like();

COMMENT ON FUNCTION public.notify_post_owner_on_reaction_like() IS 'Notify post owner when someone likes (not still_there).';

-- ---------------------------------------------------------------------------
-- Trigger: post_intents row → mapped notification type for post owner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_post_owner_on_post_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
  notif_type text;
BEGIN
  SELECT p.author_id INTO post_author FROM public.posts AS p WHERE p.id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  notif_type := CASE NEW.intent_type
    WHEN 'saved' THEN 'save'
    WHEN 'favorite' THEN 'favorite'
    WHEN 'want_to_go' THEN 'want_to_go'
    WHEN 'been_there' THEN 'been_there'
    ELSE NULL
  END;
  IF notif_type IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    post_id,
    type,
    is_seed_activity,
    seed_batch_id
  )
  VALUES (
    post_author,
    NEW.user_id,
    NEW.post_id,
    notif_type,
    NEW.is_seed_activity,
    NEW.seed_batch_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notifications_on_post_intent_insert ON public.post_intents;
CREATE TRIGGER tr_notifications_on_post_intent_insert
  AFTER INSERT ON public.post_intents
  FOR EACH ROW EXECUTE PROCEDURE public.notify_post_owner_on_post_intent();

COMMENT ON FUNCTION public.notify_post_owner_on_post_intent() IS 'Notify post owner when someone saves/favorites/marked place intent.';

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes respects RLS for subscribers)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
