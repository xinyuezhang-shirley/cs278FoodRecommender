-- Allow sender to cancel a pending outbound friend request.

drop policy if exists "friend_requests_delete_sender_pending" on public.friend_requests;
create policy "friend_requests_delete_sender_pending" on public.friend_requests
  for delete to authenticated
  using (auth.uid() = sender_id and status = 'pending');
