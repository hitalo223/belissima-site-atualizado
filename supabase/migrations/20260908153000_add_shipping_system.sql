alter table public.products
  add column if not exists weight_kg numeric(8,3),
  add column if not exists height_cm numeric(8,2),
  add column if not exists width_cm numeric(8,2),
  add column if not exists length_cm numeric(8,2);

alter table public.products
  drop constraint if exists products_weight_kg_positive,
  drop constraint if exists products_height_cm_positive,
  drop constraint if exists products_width_cm_positive,
  drop constraint if exists products_length_cm_positive;

alter table public.products
  add constraint products_weight_kg_positive check (weight_kg is null or weight_kg > 0),
  add constraint products_height_cm_positive check (height_cm is null or height_cm > 0),
  add constraint products_width_cm_positive check (width_cm is null or width_cm > 0),
  add constraint products_length_cm_positive check (length_cm is null or length_cm > 0);

alter table public.orders
  add column if not exists shipping_provider text,
  add column if not exists shipping_carrier text,
  add column if not exists shipping_service text,
  add column if not exists shipping_service_id text,
  add column if not exists shipping_quote_id text,
  add column if not exists shipping_cost_cents bigint,
  add column if not exists shipping_charged_cents bigint,
  add column if not exists shipping_delivery_days integer,
  add column if not exists shipping_destination_postal_code text,
  add column if not exists shipping_tracking_code text,
  add column if not exists shipping_label_status text not null default 'not_created',
  add column if not exists shipping_label_id text,
  add column if not exists shipping_label_created_at timestamptz;

alter table public.orders
  drop constraint if exists orders_shipping_cost_nonnegative,
  drop constraint if exists orders_shipping_charged_nonnegative,
  drop constraint if exists orders_shipping_postal_code_format,
  drop constraint if exists orders_shipping_label_status_valid;

alter table public.orders
  add constraint orders_shipping_cost_nonnegative check (shipping_cost_cents is null or shipping_cost_cents >= 0),
  add constraint orders_shipping_charged_nonnegative check (shipping_charged_cents is null or shipping_charged_cents >= 0),
  add constraint orders_shipping_postal_code_format check (shipping_destination_postal_code is null or shipping_destination_postal_code ~ '^\d{8}$'),
  add constraint orders_shipping_label_status_valid check (shipping_label_status in ('not_created', 'ready', 'created', 'printed', 'cancelled', 'error'));

create index if not exists orders_shipping_label_status_idx on public.orders(shipping_label_status);
