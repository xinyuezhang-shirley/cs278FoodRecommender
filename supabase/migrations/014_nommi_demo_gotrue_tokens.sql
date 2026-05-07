-- GoTrue rejects auth.users rows with NULL token scalars ("Invalid login credentials" /
-- "Database error querying schema"). Applies to Nommi seeded demo IDs only.
-- Re-run seed.sql afterward if password hash must also be reset.

UPDATE auth.users SET
  confirmation_token     = '',
  recovery_token       = '',
  email_change_token_new = '',
  email_change          = ''
WHERE id IN (
  'eaf10001-a000-4a00-ba00-feed00001001'::uuid,
  'eaf10002-a000-4a00-ba00-feed00002002'::uuid,
  'eaf10003-a000-4a00-ba00-feed00003003'::uuid
);

UPDATE auth.identities AS i
SET provider_id = u.email::text
FROM auth.users AS u
WHERE i.user_id = u.id
  AND i.provider = 'email'
  AND u.id IN (
    'eaf10001-a000-4a00-ba00-feed00001001'::uuid,
    'eaf10002-a000-4a00-ba00-feed00002002'::uuid,
    'eaf10003-a000-4a00-ba00-feed00003003'::uuid
  );
