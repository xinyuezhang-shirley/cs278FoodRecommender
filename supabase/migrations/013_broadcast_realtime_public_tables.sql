-- Expose Nommi tables to Supabase Realtime (postgres_changes). Idempotent via pg_publication_tables.
-- Replication uses RLS: clients only receive events for rows SELECT policy allows.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'posts',
    'comments',
    'reactions',
    'profiles',
    'food_circles',
    'circle_memberships',
    'circle_posts',
    'post_intents',
    'friendships',
    'dm_threads',
    'dm_messages',
    'activity_notifications',
    'friend_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I;', 'public', t);
    END IF;
  END LOOP;
END $$;
