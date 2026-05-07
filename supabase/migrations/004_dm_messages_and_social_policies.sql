-- Additive DM messages + social write policies.

create table if not exists public.dm_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.dm_threads(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz default now() not null
);

create index if not exists dm_messages_thread_created_idx on public.dm_messages(thread_id, created_at);

alter table public.dm_messages enable row level security;

drop policy if exists "dm_threads_insert_participant" on public.dm_threads;
create policy "dm_threads_insert_participant" on public.dm_threads
  for insert to authenticated
  with check (auth.uid() = any(participant_ids));

drop policy if exists "friend_requests_update_receiver" on public.friend_requests;
create policy "friend_requests_update_receiver" on public.friend_requests
  for update to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

drop policy if exists "friendships_insert_authenticated" on public.friendships;
create policy "friendships_insert_authenticated" on public.friendships
  for insert to authenticated
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "dm_messages_read_participant" on public.dm_messages;
create policy "dm_messages_read_participant" on public.dm_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() = any(t.participant_ids)
    )
  );

drop policy if exists "dm_messages_insert_sender_participant" on public.dm_messages;
create policy "dm_messages_insert_sender_participant" on public.dm_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() = any(t.participant_ids)
    )
  );
