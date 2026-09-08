drop policy if exists categories_public_read on public.categories;
create policy categories_anon_read
on public.categories for select to anon
using (active);
create policy categories_authenticated_read
on public.categories for select to authenticated
using (
  active
  or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

drop policy if exists products_public_read on public.products;
create policy products_anon_read
on public.products for select to anon
using (active);
create policy products_authenticated_read
on public.products for select to authenticated
using (
  active
  or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
