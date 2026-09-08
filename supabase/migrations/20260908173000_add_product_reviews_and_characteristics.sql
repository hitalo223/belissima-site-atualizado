alter table public.products
  add column if not exists characteristics jsonb not null default '[]'::jsonb;

alter table public.products
  drop constraint if exists products_characteristics_array,
  add constraint products_characteristics_array
    check (jsonb_typeof(characteristics) = 'array');

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on update cascade on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id),
  check (comment is null or char_length(comment) <= 1200)
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews(product_id);

create index if not exists product_reviews_product_rating_idx
  on public.product_reviews(product_id, rating);

drop trigger if exists product_reviews_touch_updated_at on public.product_reviews;
create trigger product_reviews_touch_updated_at
before update on public.product_reviews
for each row execute function public.touch_catalog_updated_at();

alter table public.product_reviews enable row level security;

revoke all on table public.product_reviews from anon, authenticated;
grant select on table public.product_reviews to anon, authenticated;
grant insert, update, delete on table public.product_reviews to authenticated;
grant select, insert, update, delete on table public.product_reviews to service_role;

drop policy if exists product_reviews_public_read on public.product_reviews;
create policy product_reviews_public_read
on public.product_reviews for select to anon, authenticated
using (true);

drop policy if exists product_reviews_insert_own on public.product_reviews;
create policy product_reviews_insert_own
on public.product_reviews for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists product_reviews_update_own on public.product_reviews;
create policy product_reviews_update_own
on public.product_reviews for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists product_reviews_delete_own on public.product_reviews;
create policy product_reviews_delete_own
on public.product_reviews for delete to authenticated
using ((select auth.uid()) = user_id);
