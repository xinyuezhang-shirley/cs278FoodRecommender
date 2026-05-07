-- Profile privacy: opt-in visibility of friend list + safe RPC for other users.

alter table public.profiles
  add column if not exists show_friends_public boolean not null default false;

comment on column public.profiles.show_friends_public is
  'When true, signed-in Nommi users can see this profile’s Nommi friendships (friends list only).';

-- Never broaden table RLS: expose friends of a subject only when they opted in.
create or replace function public.get_friend_profiles_for_subject(p_subject uuid)
returns table (
  id uuid,
  username text,
  avatar_url text,
  bio text,
  food_personality text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_subject
      and coalesce(p.show_friends_public, false) = true
  ) then
    return;
  end if;

  return query
  select pr.id, pr.username, pr.avatar_url, pr.bio, pr.food_personality, pr.created_at
  from public.friendships f
  join public.profiles pr on pr.id = case
    when f.user_a_id = p_subject then f.user_b_id
    else f.user_a_id
  end
  where f.user_a_id = p_subject or f.user_b_id = p_subject
  order by pr.username asc nulls last;
end;
$$;

grant execute on function public.get_friend_profiles_for_subject(uuid) to authenticated;
