-- Friend discovery: username (exact/@ prefix) + email exact match via auth.users.
-- SECURITY DEFINER so clients never read auth.users directly. Callable by authenticated users only.

create or replace function public.find_users_for_friend_search(p_query text)
returns table (
  user_id uuid,
  username text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  q text := trim(coalesce(p_query, ''));
  q_user text := lower(trim(both '@' from q));
begin
  if length(q) < 2 then
    return;
  end if;

  if auth.uid() is null then
    return;
  end if;

  -- Exact username (case-insensitive, optional leading @)
  return query
  select p.id, p.username, p.avatar_url::text
  from public.profiles p
  where lower(p.username) = q_user
  limit 5;

  if found then
    return;
  end if;

  -- Exact signup email match (privacy: only resolves when full email typed)
  if q like '%@%.%' then
    return query
    select p.id, p.username, p.avatar_url::text
    from public.profiles p
    inner join auth.users u on u.id = p.id
    where lower(u.email::text) = lower(q)
    limit 5;
  end if;

  return;
end;
$$;

grant execute on function public.find_users_for_friend_search(text) to authenticated;
