create table if not exists public.shipping_integrations (
  provider text not null,
  environment text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (provider, environment),
  check (environment in ('sandbox', 'production'))
);

alter table public.shipping_integrations enable row level security;
revoke all on table public.shipping_integrations from anon, authenticated;
grant select, insert, update, delete on table public.shipping_integrations to service_role;
