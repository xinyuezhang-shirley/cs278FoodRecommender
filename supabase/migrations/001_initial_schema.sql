-- Nommi: Stanford Food Discovery Platform
-- Run this in your Supabase SQL editor to set up the schema.

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  food_personality text,
  created_at timestamptz default now() not null
);

create table if not exists public.food_circles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon_type text default '🍴',
  created_at timestamptz default now() not null
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('free_food', 'recommendation', 'event')) not null,
  title text not null,
  description text,
  image_url text,
  location_name text not null,
  latitude double precision,
  longitude double precision,
  cuisine_tags text[] default '{}',
  dietary_tags text[] default '{}',
  is_free_food boolean default false,
  expires_at timestamptz,
  circle_id uuid references public.food_circles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz default now() not null
);

create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('like', 'still_there')) not null,
  unique (post_id, user_id)
);

create table if not exists public.circle_memberships (
  circle_id uuid references public.food_circles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (circle_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.food_circles enable row level security;
alter table public.circle_memberships enable row level security;

-- Profiles: anyone can read; only owner can update
create policy "profiles_read_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Posts: anyone can read; authenticated users can insert; only author can update/delete
create policy "posts_read_all" on public.posts
  for select using (true);

create policy "posts_insert_auth" on public.posts
  for insert with check (auth.uid() = author_id);

create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id);

create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- Comments: anyone can read; authenticated users can insert; only author can delete
create policy "comments_read_all" on public.comments
  for select using (true);

create policy "comments_insert_auth" on public.comments
  for insert with check (auth.uid() = author_id);

create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = author_id);

-- Reactions: anyone can read; authenticated users can upsert/delete their own
create policy "reactions_read_all" on public.reactions
  for select using (true);

create policy "reactions_insert_auth" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_update_own" on public.reactions
  for update using (auth.uid() = user_id);

create policy "reactions_delete_own" on public.reactions
  for delete using (auth.uid() = user_id);

-- Food circles: anyone can read
create policy "circles_read_all" on public.food_circles
  for select using (true);

-- Circle memberships: anyone can read; authenticated users manage their own
create policy "memberships_read_all" on public.circle_memberships
  for select using (true);

create policy "memberships_insert_auth" on public.circle_memberships
  for insert with check (auth.uid() = user_id);

create policy "memberships_delete_own" on public.circle_memberships
  for delete using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();
