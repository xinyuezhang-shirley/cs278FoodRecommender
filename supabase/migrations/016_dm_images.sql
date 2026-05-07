-- Support image attachments in direct messages.

alter table public.dm_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists image_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dm_messages_type_check'
  ) then
    alter table public.dm_messages
      add constraint dm_messages_type_check
      check (message_type in ('text', 'image'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dm_messages_payload_valid'
  ) then
    alter table public.dm_messages
      add constraint dm_messages_payload_valid
      check (
        (message_type = 'text' and char_length(trim(body)) > 0 and image_url is null)
        or
        (message_type = 'image' and image_url is not null and char_length(image_url) <= 4096)
      );
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('dm-images', 'dm-images', true)
on conflict (id) do nothing;

drop policy if exists "dm_images_read" on storage.objects;
create policy "dm_images_read" on storage.objects
for select to authenticated
using (bucket_id = 'dm-images');

drop policy if exists "dm_images_insert_own" on storage.objects;
create policy "dm_images_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'dm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "dm_images_update_own" on storage.objects;
create policy "dm_images_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'dm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'dm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "dm_images_delete_own" on storage.objects;
create policy "dm_images_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'dm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
