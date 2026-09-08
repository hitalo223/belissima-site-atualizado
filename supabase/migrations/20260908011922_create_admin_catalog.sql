-- Catálogo, perfis e autorização do painel administrativo da Belíssima.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  category_id text not null references public.categories(id) on update cascade on delete restrict,
  name text not null check (char_length(name) between 2 and 140),
  description text,
  price_cents bigint not null check (price_cents >= 0),
  badge text,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  image_urls text[] not null default '{}',
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  provider text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active);
create index if not exists products_featured_idx on public.products(featured) where active;
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create or replace function public.touch_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_catalog_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_catalog_updated_at();

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    provider,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_app_meta_data ->> 'provider',
    new.email_confirmed_at,
    new.last_sign_in_at,
    new.created_at,
    now()
  )
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    provider = excluded.provider,
    email_confirmed_at = excluded.email_confirmed_at,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;

drop trigger if exists sync_profile_after_auth_change on auth.users;
create trigger sync_profile_after_auth_change
after insert or update of email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, last_sign_in_at
on auth.users
for each row execute function public.sync_profile_from_auth();

insert into public.profiles (user_id, email, full_name, provider, email_confirmed_at, last_sign_in_at, created_at, updated_at)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'nome', raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  raw_app_meta_data ->> 'provider',
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  now()
from auth.users
on conflict (user_id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  provider = excluded.provider,
  email_confirmed_at = excluded.email_confirmed_at,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = now();

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;

revoke all on table public.admin_users, public.categories, public.products, public.profiles from anon, authenticated;
grant select on table public.categories, public.products to anon, authenticated;
grant insert, update, delete on table public.categories, public.products to authenticated;
grant select on table public.admin_users, public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.admin_users, public.categories, public.products, public.profiles to service_role;

create policy admin_users_read_self
on public.admin_users for select to authenticated
using ((select auth.uid()) = user_id);

create policy categories_public_read
on public.categories for select to anon, authenticated
using (active or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy categories_admin_insert
on public.categories for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy categories_admin_update
on public.categories for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy categories_admin_delete
on public.categories for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy products_public_read
on public.products for select to anon, authenticated
using (active or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy products_admin_insert
on public.products for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy products_admin_update
on public.products for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy products_admin_delete
on public.products for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy profiles_read_self
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_admin_read
on public.profiles for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy profiles_update_self
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.orders, public.order_items from anon, authenticated;
grant select on table public.orders to authenticated;
grant update (fulfillment_status) on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

create policy orders_read_owner
on public.orders for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    customer_email is not null
    and lower(customer_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy orders_admin_read
on public.orders for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy orders_admin_update
on public.orders for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy order_items_read_via_order
on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_admin_select
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy product_images_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy product_images_admin_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy product_images_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

insert into public.categories (id, name, sort_order, active) values
  ('sutias', 'Sutiãs', 0, true),
  ('calcinhas', 'Calcinhas', 10, true),
  ('bodies', 'Bodies', 20, true),
  ('conjuntos', 'Conjuntos', 30, true),
  ('pijamas', 'Pijamas', 40, true),
  ('modeladores', 'Modeladores', 50, true),
  ('outlet', 'Outlet', 60, true)
on conflict (id) do nothing;

insert into public.products (
  id, category_id, name, price_cents, badge, colors, sizes, image_urls,
  stock_quantity, active, featured
) values
  ('sutia-renda-sem-costura', 'sutias', 'Sutiã Renda Sem Costura', 18990, 'NOVO', array['#604C43', '#C8AD88']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, true),
  ('sutia-bojo-basico', 'sutias', 'Sutiã Bojo Básico', 12990, null, array['#A99586', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('sutia-triangulo-cropped', 'sutias', 'Sutiã Triângulo Cropped', 15990, '-15%', array['#9B7D7D', '#604C43']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('sutia-pushup-renda', 'sutias', 'Sutiã Push-up Renda', 19990, null, array['#604C43', '#B88F70']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('calcinha-biquini-lisa', 'calcinhas', 'Calcinha Biquíni Lisa', 7990, '-15%', array['#A99586', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, true),
  ('calcinha-tanga-renda', 'calcinhas', 'Calcinha Tanga Renda', 6990, null, array['#604C43', '#C8AD88']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('calcinha-boyshort-algodao', 'calcinhas', 'Calcinha Boyshort Algodão', 5990, null, array['#9B7D7D', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('calcinha-fio-renda', 'calcinhas', 'Calcinha Fio Dental Renda', 4990, 'NOVO', array['#604C43', '#B88F70']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('body-decote-v', 'bodies', 'Body Decote V', 21990, 'NOVO', array['#604C43', '#C8AD88']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, true),
  ('body-renda-costas-nu', 'bodies', 'Body Renda Costas Nu', 23990, null, array['#9B7D7D', '#604C43']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('body-manga-longa-tule', 'bodies', 'Body Manga Longa Tule', 25990, null, array['#A99586', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('body-basico-algodao', 'bodies', 'Body Básico Algodão', 17990, null, array['#604C43', '#A99586']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('conjunto-seda-natural', 'conjuntos', 'Conjunto Seda Natural', 25990, null, array['#B88F70', '#604C43']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, true),
  ('conjunto-renda-floral', 'conjuntos', 'Conjunto Renda Floral', 27990, 'NOVO', array['#9B7D7D', '#C8AD88']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('conjunto-basico-microfibra', 'conjuntos', 'Conjunto Básico Microfibra', 14990, null, array['#A99586', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('conjunto-noite-cetim', 'conjuntos', 'Conjunto Noite Cetim', 29990, null, array['#604C43', '#B88F70']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('pijama-longo-cetim', 'pijamas', 'Pijama Longo Cetim', 24990, null, array['#604C43', '#A99586']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('pijama-curto-algodao', 'pijamas', 'Pijama Curto Algodão', 15990, null, array['#9B7D7D', '#F3EDE4']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('camisola-renda', 'pijamas', 'Camisola Renda', 21990, 'NOVO', array['#604C43', '#C8AD88']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('short-doll-seda', 'pijamas', 'Short Doll Seda', 19990, null, array['#B88F70', '#A99586']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('cinta-modeladora-alta', 'modeladores', 'Cinta Modeladora Alta', 17990, null, array['#604C43', '#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('short-modelador', 'modeladores', 'Short Modelador', 13990, null, array['#A99586']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('body-modelador', 'modeladores', 'Body Modelador', 22990, null, array['#604C43', '#9B7D7D']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('cinta-pos-parto', 'modeladores', 'Cinta Cirúrgica Pós-parto', 19990, null, array['#F3EDE4']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('outlet-sutia-basico', 'outlet', 'Sutiã Básico (Outlet)', 6990, '-40%', array['#A99586', '#604C43']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false),
  ('outlet-conjunto-renda', 'outlet', 'Conjunto Renda (Outlet)', 14990, '-30%', array['#9B7D7D']::text[], array['P', 'M', 'G', 'GG']::text[], '{}', null, true, false),
  ('outlet-pijama-algodao', 'outlet', 'Pijama Algodão (Outlet)', 8990, '-35%', array['#604C43', '#F3EDE4']::text[], array['P', 'M']::text[], '{}', null, true, false),
  ('outlet-body-tule', 'outlet', 'Body Tule (Outlet)', 11990, '-40%', array['#C8AD88']::text[], array['P', 'M', 'G']::text[], '{}', null, true, false)
on conflict (id) do nothing;

