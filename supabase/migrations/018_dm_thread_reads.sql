-- Per-user read cursor per DM thread (Option B): unread = messages from others strictly after last_read_at.

create table if not exists public.dm_thread_reads (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists dm_thread_reads_user_idx on public.dm_thread_reads (user_id);
create index if not exists dm_thread_reads_thread_idx on public.dm_thread_reads (thread_id);

alter table public.dm_thread_reads enable row level security;

drop policy if exists "dm_thread_reads_select_own" on public.dm_thread_reads;
create policy "dm_thread_reads_select_own" on public.dm_thread_reads
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "dm_thread_reads_insert_participant_own" on public.dm_thread_reads;
create policy "dm_thread_reads_insert_participant_own" on public.dm_thread_reads
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and auth.uid() = any(t.participant_ids)
    )
  );

drop policy if exists "dm_thread_reads_update_own" on public.dm_thread_reads;
create policy "dm_thread_reads_update_own" on public.dm_thread_reads
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and auth.uid() = any(t.participant_ids)
    )
  );

-- Upsert timestamps
create or replace function public.dm_thread_reads_touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dm_thread_reads_touch_updated ON public.dm_thread_reads;
create trigger dm_thread_reads_touch_updated
  before insert or update on public.dm_thread_reads
  for each row
  execute procedure public.dm_thread_reads_touch_updated_at();

-- New threads: each participant starts fully “caught up” until new inbound messages arrive.
create or replace function public.dm_thread_reads_init_participants()
returns trigger as $$
begin
  insert into public.dm_thread_reads (thread_id, user_id, last_read_at)
  select new.id, p.uid, now()
  from unnest(new.participant_ids) as p(uid)
  on conflict (thread_id, user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;

drop trigger if exists dm_threads_after_insert_init_reads ON public.dm_threads;
create trigger dm_threads_after_insert_init_reads
  after insert on public.dm_threads
  for each row
  execute procedure public.dm_thread_reads_init_participants();

-- Baseline: no retroactive unread storm for existing threads.
insert into public.dm_thread_reads (thread_id, user_id, last_read_at)
select t.id as thread_id, p.uid as user_id, now()
from public.dm_threads t
cross join lateral unnest(t.participant_ids) as p(uid)
on conflict (thread_id, user_id) do nothing;

-- Server-side unread counts (RLS-aware).
create or replace function public.get_dm_unread_counts(p_user_id uuid)
returns table(thread_id uuid, unread_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    t.id,
    count(m.id)::bigint
  from public.dm_threads t
  left join public.dm_thread_reads r
    on r.thread_id = t.id
    and r.user_id = p_user_id
  left join public.dm_messages m
    on m.thread_id = t.id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  where p_user_id = any(t.participant_ids)
  group by t.id;
end;
$$;

grant execute on function public.get_dm_unread_counts(uuid) to authenticated;

-- Realtime updates for unread badge + lists
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_thread_reads'
  ) then
    alter publication supabase_realtime add table public.dm_thread_reads;
  end if;
end $$;
