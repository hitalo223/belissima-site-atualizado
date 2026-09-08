drop policy if exists orders_read_owner on public.orders;
drop policy if exists orders_admin_read on public.orders;
create policy orders_read_authorized
on public.orders for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    customer_email is not null
    and lower(customer_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
  or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

drop policy if exists profiles_read_self on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_read_authorized
on public.profiles for select to authenticated
using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
