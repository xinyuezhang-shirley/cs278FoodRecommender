-- Harden auto-profile creation: SECURITY DEFINER must pin search_path (Supabase recommendation).
-- Sanitize fallback username derived from email so it matches app's [a-z0-9_] pattern.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  from_email text;
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

  INSERT INTO public.profiles (id, username) VALUES (NEW.id, uname);
  RETURN NEW;
END;
$$;
