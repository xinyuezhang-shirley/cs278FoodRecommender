-- Allow thread participants to bump last_message_at when sending DMs (was blocked: no UPDATE policy).

drop policy if exists "dm_threads_update_participant" on public.dm_threads;
create policy "dm_threads_update_participant" on public.dm_threads
  for update to authenticated
  using (auth.uid() = any(participant_ids))
  with check (auth.uid() = any(participant_ids));
