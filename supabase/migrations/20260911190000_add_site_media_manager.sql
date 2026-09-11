-- Mídias editáveis das categorias e grades editoriais da loja.

alter table public.categories
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video'));

create table if not exists public.site_media (
  slot_key text primary key check (slot_key ~ '^[a-z0-9-]+$'),
  label text not null check (char_length(label) between 2 and 100),
  section text not null check (char_length(section) between 2 and 100),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  media_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_media_touch_updated_at on public.site_media;
create trigger site_media_touch_updated_at
before update on public.site_media
for each row execute function public.touch_catalog_updated_at();

alter table public.site_media enable row level security;

revoke all on table public.site_media from anon, authenticated;
grant select on table public.site_media to anon, authenticated;
grant insert, update, delete on table public.site_media to authenticated;
grant select, insert, update, delete on table public.site_media to service_role;

create policy site_media_public_read
on public.site_media for select to anon, authenticated
using (
  active
  or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy site_media_admin_insert
on public.site_media for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy site_media_admin_update
on public.site_media for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy site_media_admin_delete
on public.site_media for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  31457280,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy site_media_objects_admin_select
on storage.objects for select to authenticated
using (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy site_media_objects_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy site_media_objects_admin_update
on storage.objects for update to authenticated
using (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy site_media_objects_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

update public.categories
set image_url = case id
    when 'sutias' then 'assets/images/categoria-sutias.webp'
    when 'calcinhas' then 'assets/images/categoria-calcinhas.webp'
    when 'bodies' then 'assets/images/categoria-bodies.webp'
    else image_url
  end,
  media_type = 'image'
where id in ('sutias', 'calcinhas', 'bodies');

insert into public.site_media (slot_key, label, section, media_type, media_url, sort_order, active) values
  ('atelier-1-left', 'Grade principal · quadro 1', 'Grade Rituais', 'video', 'assets/video/acesso-belissima.mp4', 10, true),
  ('atelier-1-right', 'Grade principal · quadro 2', 'Grade Rituais', 'image', 'assets/images/presente-belissima.webp', 20, true),
  ('atelier-2-left', 'Grade principal · quadro 3', 'Grade Rituais', 'image', 'assets/images/belissima-busto-rosa.webp', 30, true),
  ('atelier-2-right', 'Grade principal · quadro 4', 'Grade Rituais', 'video', 'assets/video/ritual-corporal-belissima.mp4', 40, true),
  ('editorial-1-main', 'História · mídia 1', 'Grade de histórias', 'video', 'assets/video/acesso-belissima.mp4', 50, true),
  ('editorial-1-detail', 'História · detalhe', 'Grade de histórias', 'image', 'assets/images/presente-belissima.webp', 60, true),
  ('editorial-2-main', 'História · mídia 2', 'Grade de histórias', 'video', 'assets/video/ritual-corporal-belissima.mp4', 70, true),
  ('editorial-3-main', 'História · mídia 3', 'Grade de histórias', 'image', 'assets/images/belissima-busto-rosa.webp', 80, true)
on conflict (slot_key) do nothing;
