-- Additive social + interaction foundations with safe rollout.

create table if not exists public.post_intents (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  intent_type text check (intent_type in ('saved', 'been_there', 'want_to_go', 'favorite')) not null,
  created_at timestamptz default now() not null,
  unique (user_id, post_id, intent_type)
);

create table if not exists public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) not null default 'pending',
  created_at timestamptz default now() not null,
  unique (sender_id, receiver_id)
);

create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_a_id uuid references public.profiles(id) on delete cascade not null,
  user_b_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_a_id, user_b_id)
);

create table if not exists public.dm_threads (
  id uuid default gen_random_uuid() primary key,
  participant_ids uuid[] not null,
  last_message_at timestamptz default now() not null
);

create table if not exists public.activity_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.post_intents enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.dm_threads enable row level security;
alter table public.activity_notifications enable row level security;

drop policy if exists "post_intents_select_own" on public.post_intents;
create policy "post_intents_select_own" on public.post_intents for select using (auth.uid() = user_id);
drop policy if exists "post_intents_write_own" on public.post_intents;
create policy "post_intents_write_own" on public.post_intents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "friend_requests_read_participant" on public.friend_requests;
create policy "friend_requests_read_participant" on public.friend_requests for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "friend_requests_write_sender" on public.friend_requests;
create policy "friend_requests_write_sender" on public.friend_requests for insert with check (auth.uid() = sender_id);

drop policy if exists "friendships_read_participant" on public.friendships;
create policy "friendships_read_participant" on public.friendships for select
using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "dm_threads_read_participant" on public.dm_threads;
create policy "dm_threads_read_participant" on public.dm_threads for select
using (auth.uid() = any(participant_ids));

drop policy if exists "notifications_read_own" on public.activity_notifications;
create policy "notifications_read_own" on public.activity_notifications for select using (auth.uid() = user_id);
