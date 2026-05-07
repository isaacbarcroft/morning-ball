-- 0007_storage: avatars bucket, public read, owner-prefixed writes.
-- Path convention: {auth.uid()}/{filename}.ext

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Public read.
create policy "avatars public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Authenticated users can write only under their own auth.uid()/ prefix.
create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage anything in avatars (e.g. cleaning up shadow profile uploads).
create policy "avatars admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and public.is_admin())
  with check (bucket_id = 'avatars' and public.is_admin());
