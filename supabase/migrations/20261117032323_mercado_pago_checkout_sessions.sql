-- AI-assisted: see docs/AI_LOG.md #2.
create table public.mercado_pago_checkout_sessions (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  preference_id text not null unique,
  checkout_url text not null
    constraint mercado_pago_checkout_sessions_checkout_url_https_check
    check (checkout_url ~ '^https://'),
  created_at timestamptz not null default now()
);

alter table public.mercado_pago_checkout_sessions enable row level security;

revoke all on table public.mercado_pago_checkout_sessions
  from public, anon, authenticated;
grant all on table public.mercado_pago_checkout_sessions to service_role;