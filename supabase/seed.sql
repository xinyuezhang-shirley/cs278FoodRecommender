-- ============================================================================
-- NOMMI — Stanford / Palo Alto food discovery seed (auth + circles + posts)
-- Run once in Supabase SQL Editor AFTER `supabase/migrations/001_initial_schema.sql`.
--
-- Creates THREE demo Auth users + profiles (+ identities for email/password),
-- then memberships, posts, comments, reactions.
--
-- Demo logins (same password):
--   alice@nommi.stanford.demo       → profile username: alice_tree
--   bob@nommi.stanford.demo         → bob_boba
--   carmen@nommi.stanford.demo      → carmen_bites
--   Password: NommiDemo1!
--
-- Re-run safely: skips users/emails already present; upserts circles & posts data.
--
-- Requires pgcrypto for bcrypt (`crypt`).
-- ============================================================================

-- Blowfish hashing for passwords (often already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO public.food_circles (id, name, description, icon_type)
VALUES
  ('fad00001-ffff-4000-afff-feed00011101'::uuid,
   'Stanford Free Food Radar',
   'Club tables, HCI leftovers, plaza pop-ups — help it find a belly.',
   '🍕'),
  ('fad00002-ffff-4000-afff-feed00022202'::uuid,
   'Boba Tea Collective',
   'Brown sugar tides, chewy pearls — rate your campus / PA cup.',
   '🧋'),
  ('fad00003-ffff-4000-afff-feed00033303'::uuid,
   'Palo Alto & University Ave Crawl',
   'Bike down Cal Ave for tamales, paella pits, oat milk tastings.',
   '🌯'),
  ('fad00004-ffff-4000-afff-feed00044404'::uuid,
   'Coffee & Quiet Corners',
   'Foam art, AeroPress dads, napkins for P-sets — keep pours hot.',
   '☕'),
  ('fad00005-ffff-4000-afff-feed00055505'::uuid,
   'Late Night Fuel',
   'EV toaster ovens + dining hall rumor mill after 21:00.',
   '🌙')
ON CONFLICT (id) DO UPDATE SET
  name        = excluded.name,
  description = excluded.description,
  icon_type   = excluded.icon_type;

DO $nommi$
DECLARE
  v_pw text := crypt('NommiDemo1!', gen_salt('bf'));

  -- Stable demo user IDs (FK targets for memberships / posts). Do not change after first run unless you truncate auth.
  u_a uuid := 'eaf10001-a000-4a00-ba00-feed00001001'::uuid;
  u_b uuid := 'eaf10002-a000-4a00-ba00-feed00002002'::uuid;
  u_c uuid := 'eaf10003-a000-4a00-ba00-feed00003003'::uuid;

  em_a text := 'alice@nommi.stanford.demo';
  em_b text := 'bob@nommi.stanford.demo';
  em_c text := 'carmen@nommi.stanford.demo';

  un_a text := 'alice_tree';
  un_b text := 'bob_boba';
  un_c text := 'carmen_bites';
BEGIN
  -- --- User A ---
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = u_a) THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email::text = em_a AND id <> u_a) THEN
      RAISE EXCEPTION '[nommi seed] Email % is already registered with a different id', em_a;
    END IF;

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      u_a,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      em_a,
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', un_a),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u_a AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      u_a,
      jsonb_build_object(
        'sub', u_a::text,
        'email', em_a,
        'email_verified', true,
        'phone_verified', false,
        'username', un_a
      ),
      'email',
      u_a::text,
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_a) THEN
    INSERT INTO public.profiles (id, username)
    VALUES (u_a, un_a);
  END IF;

  -- --- User B ---
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = u_b) THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email::text = em_b AND id <> u_b) THEN
      RAISE EXCEPTION '[nommi seed] Email % is already registered with a different id', em_b;
    END IF;

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      u_b,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      em_b,
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', un_b),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u_b AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      u_b,
      jsonb_build_object(
        'sub', u_b::text,
        'email', em_b,
        'email_verified', true,
        'phone_verified', false,
        'username', un_b
      ),
      'email',
      u_b::text,
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_b) THEN
    INSERT INTO public.profiles (id, username)
    VALUES (u_b, un_b);
  END IF;

  -- --- User C ---
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = u_c) THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email::text = em_c AND id <> u_c) THEN
      RAISE EXCEPTION '[nommi seed] Email % is already registered with a different id', em_c;
    END IF;

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      u_c,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      em_c,
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', un_c),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u_c AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      u_c,
      jsonb_build_object(
        'sub', u_c::text,
        'email', em_c,
        'email_verified', true,
        'phone_verified', false,
        'username', un_c
      ),
      'email',
      u_c::text,
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_c) THEN
    INSERT INTO public.profiles (id, username)
    VALUES (u_c, un_c);
  END IF;

  -- Richer profile bios (runs every time — safe UPDATE)
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/7.x/notionists/svg?seed=stomachstanford',
    bio              = 'Hunting the best dumplings west of Salvatierra.',
    food_personality = 'Campus Grazing Goat 🐐'
  WHERE id = u_a;

  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/7.x/notionists/svg?seed=foodiefrosh',
    bio              = 'Quarter system ⇒ quarter-second snack decisions.',
    food_personality = 'First-Year Boba Mapper 🗺️'
  WHERE id = u_b;

  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/7.x/notionists/svg?seed=nommiSnack',
    bio              = 'Slides into panels with recyclable fork morale.',
    food_personality = 'Tier-Zero Catering Hunter ⚡️'
  WHERE id = u_c;

  INSERT INTO public.circle_memberships (circle_id, user_id) VALUES
    ('fad00001-ffff-4000-afff-feed00011101'::uuid, u_a),
    ('fad00002-ffff-4000-afff-feed00022202'::uuid, u_a),
    ('fad00003-ffff-4000-afff-feed00033303'::uuid, u_a),
    ('fad00005-ffff-4000-afff-feed00055505'::uuid, u_a),
    ('fad00001-ffff-4000-afff-feed00011101'::uuid, u_b),
    ('fad00002-ffff-4000-afff-feed00022202'::uuid, u_b),
    ('fad00004-ffff-4000-afff-feed00044404'::uuid, u_b),
    ('fad00001-ffff-4000-afff-feed00011101'::uuid, u_c),
    ('fad00004-ffff-4000-afff-feed00044404'::uuid, u_c),
    ('fad00003-ffff-4000-afff-feed00033303'::uuid, u_c)
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  INSERT INTO public.posts (
    id, author_id, type, title, description, image_url,
    location_name, latitude, longitude,
    cuisine_tags, dietary_tags,
    is_free_food, expires_at, circle_id
  ) VALUES
    ('f00d0101-feed-400d-a00d-000001000101'::uuid, u_c, 'free_food',
     'Pastry + iced coffee runoff @ GSB Kraft terrace',
     'Marketing club buffet wrapped — flakey croissants, fruit tubs, pitchers of iced coffee until custodial sweep.',
     'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=960',
     'GSB Knight terrace', 37.4292::double precision, -122.1663::double precision,
     ARRAY['pastries','coffee']::text[], ARRAY['vegetarian']::text[], TRUE,
     now() AT TIME ZONE 'UTC' + interval '26 hours', 'fad00001-ffff-4000-afff-feed00011101'::uuid),

    ('f00d0102-feed-400d-a00d-000001000102'::uuid, u_b, 'free_food',
     'Huang HCI lab pizza tsunami',
     'Study ordered too much half cheese / half veg. Boxes on Huang basement breakout divider — finish before housekeeping.',
     'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=960',
     'Huang basement lounge', 37.4286::double precision, -122.1735::double precision,
     ARRAY['pizza']::text[], ARRAY['vegetarian']::text[], TRUE,
     now() AT TIME ZONE 'UTC' + interval '4 hours', 'fad00001-ffff-4000-afff-feed00011101'::uuid),

    ('f00d0103-feed-400d-a00d-000001000103'::uuid, u_a, 'free_food',
     'Robot demo snack bags • White Plaza',
     'Sea robots pop-up stocked snack packs + mini coconut waters. Organizer said communal until bins empty.',
     'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=960',
     'White Plaza', 37.4236::double precision, -122.1714::double precision,
     ARRAY['snacks']::text[], ARRAY['vegan','gluten-free']::text[], TRUE,
     now() AT TIME ZONE 'UTC' + interval '8 hours', 'fad00001-ffff-4000-afff-feed00011101'::uuid),

    ('f00d0104-feed-400d-a00d-000001000104'::uuid, u_b, 'recommendation',
     'Brown Sugar QQ swirl @ i‑Tea Palo Alto',
     '30% sugar / light ice survives Caltrain vibrations. Pearls chewy 45 min later.',
     'https://images.unsplash.com/photo-1558865869-e6ba98ee7bea?w=960',
     'University Ave corridor', 37.4462::double precision, -122.1614::double precision,
     ARRAY['boba','taiwanese']::text[], ARRAY['dairy-free']::text[], FALSE, NULL,
     'fad00002-ffff-4000-afff-feed00022202'::uuid),

    ('f00d0105-feed-400d-a00d-000001000105'::uuid, u_a, 'recommendation',
     'CoHo salted cream flight week',
     'Not secret menu but seasonal — hot + iced pair. Order 50% sweetness or enamel cries.',
     'https://images.unsplash.com/photo-1558865869-e6ba98ee7bea?w=960',
     'CoHo café', 37.4254::double precision, -122.1698::double precision,
     ARRAY['boba','coffee']::text[], ARRAY['vegetarian']::text[], FALSE, NULL,
     'fad00002-ffff-4000-afff-feed00022202'::uuid),

    ('f00d0106-feed-400d-a00d-000001000106'::uuid, u_a, 'recommendation',
     'Athletics Café cortado that slaps louder than cheering',
     'New La Marzocco line doubles down on chocolate-covered cherry vibes. Loud steam wand ⇒ Pavlovian finals panic.',
     'https://images.unsplash.com/photo-1559496417-ae7fcc8dccd2?w=960',
     'Arrillaga sports café', 37.4277::double precision, -122.1725::double precision,
     ARRAY['coffee']::text[], ARRAY['vegan']::text[], FALSE, NULL,
     'fad00004-ffff-4000-afff-feed00044404'::uuid),

    ('f00d0107-feed-400d-a00d-000001000107'::uuid, u_c, 'recommendation',
     'Blue Bottle Forest iced NOLA loop',
     'Shakerato tins + shady patio Mist fans = grad chapter edits tolerable.',
     NULL,
     'Blue Bottle Palo Alto · Forest Ave', 37.4468::double precision, -122.1626::double precision,
     ARRAY['coffee']::text[], ARRAY[]::text[], FALSE, NULL,
     'fad00003-ffff-4000-afff-feed00033303'::uuid),

    ('f00d0108-feed-400d-a00d-000001000108'::uuid, u_c, 'recommendation',
     'Teleféric happy hour gambas crawl',
     'Pan tumaca + smoky paelleras on California Ave Tuesdays. Patio heaters when fog rolls.',
     'https://images.unsplash.com/photo-1553621042-f6e147245754?w=960',
     'Teleféric · California Ave', 37.4275::double precision, -122.1454::double precision,
     ARRAY['spanish']::text[], ARRAY[]::text[], FALSE, NULL,
     'fad00003-ffff-4000-afff-feed00033303'::uuid),

    ('f00d0109-feed-400d-a00d-000001000109'::uuid, u_a, 'event',
     'CSA + tamale haul @ Campus Drive farm stand',
     'Student-grown greens + tamales swapping jackfruit vegan / pork vibes 10‑2 Sundays.',
     NULL,
     'Campus edible garden pickup lane', 37.4187::double precision, -122.1792::double precision,
     ARRAY['farmers-market','tamale']::text[], ARRAY['vegetarian']::text[], FALSE,
     now() AT TIME ZONE 'UTC' + interval '10 days',
     'fad00003-ffff-4000-afff-feed00033303'::uuid),

    ('f00d0110-feed-400d-a00d-000001000110'::uuid, u_b, 'free_food',
     'EVGR toaster samosas & mango lassi shots',
     'Bollywood RA night surplus — toaster oven rewarming instructions taped above.',
     'https://images.unsplash.com/photo-1572441713132-438f91e9e086?w=960',
     'EVGR lounge cluster', 37.4186::double precision, -122.1584::double precision,
     ARRAY['indian']::text[], ARRAY['vegetarian']::text[], TRUE,
     now() AT TIME ZONE 'UTC' + interval '3 hours', 'fad00005-ffff-4000-afff-feed00055505'::uuid),

    ('f00d0111-feed-400d-a00d-000001000111'::uuid, u_a, 'recommendation',
     'Arrillaga congee topper hack after nine',
     'Ask politely at Mongolian station — crispy shallots stash behind counter smiles back.',
     'https://images.unsplash.com/photo-1580822184711-fc5400eef7eb?w=960',
     'Arrillaga / EV courtyard window', 37.4263::double precision, -122.1735::double precision,
     ARRAY['chinese']::text[], ARRAY['gluten-free']::text[], FALSE, NULL,
     'fad00005-ffff-4000-afff-feed00055505'::uuid),

    ('f00d0112-feed-400d-a00d-000001000112'::uuid, u_a, 'event',
     'Imaginary Midnight Boba Alley @ Meyer sketch',
     'If TreeHacks had a hydration lane behind Old Union playing lo-fi mashups… bring thermos fantasies.',
     'https://images.unsplash.com/photo-1572490122747-3968b75cdb01?w=960',
     'Meyer / Old Union walkway', 37.4272::double precision, -122.1701::double precision,
     ARRAY['boba']::text[], ARRAY['vegan']::text[], FALSE,
     now() AT TIME ZONE 'UTC' + interval '4 days',
     'fad00002-ffff-4000-afff-feed00022202'::uuid)
  ON CONFLICT (id) DO UPDATE SET
    title        = excluded.title,
    description  = excluded.description,
    image_url    = excluded.image_url,
    cuisine_tags = excluded.cuisine_tags,
    dietary_tags = excluded.dietary_tags,
    is_free_food = excluded.is_free_food,
    expires_at   = excluded.expires_at,
    circle_id    = excluded.circle_id,
    author_id    = excluded.author_id,
    updated_at   = now();

  INSERT INTO public.comments (id, post_id, author_id, content) VALUES
    ('cafec011-0110-4111-ac11-cafecede0004'::uuid, 'f00d0104-feed-400d-a00d-000001000104'::uuid, u_a,
     'less sweet build survived Caltrain. pearls still springy ✅'),
    ('cafec011-0220-4111-ac22-cafecede0008'::uuid, 'f00d0101-feed-400d-a00d-000001000101'::uuid, u_b,
     '11:54 still croissants, napkins armageddon tho'),
    ('cafec011-0330-4111-ac33-cafecede000f'::uuid, 'f00d0102-feed-400d-a00d-000001000102'::uuid, u_c,
     'veg corner slice holding on — custodian ETA unknown'),
    ('cafec011-0440-4111-ac44-cafecede0111'::uuid, 'f00d0111-feed-400d-a00d-000001000111'::uuid, u_c,
     'congee toppings confirmed post rehearsal 👀 cashier sighed politely')
  ON CONFLICT (id) DO UPDATE SET content = excluded.content;

  INSERT INTO public.reactions (post_id, user_id, type) VALUES
    ('f00d0103-feed-400d-a00d-000001000103'::uuid, u_b, 'like'),
    ('f00d0103-feed-400d-a00d-000001000103'::uuid, u_c, 'still_there'),
    ('f00d0104-feed-400d-a00d-000001000104'::uuid, u_a, 'like'),
    ('f00d0110-feed-400d-a00d-000001000110'::uuid, u_a, 'still_there')
  ON CONFLICT (post_id, user_id) DO UPDATE SET type = excluded.type;

  RAISE NOTICE '[nommi seed] Demo accounts: alice|bob|carmen @nommi.stanford.demo | password NommiDemo1!';
END
$nommi$;
