create table public.mercado_pago_payments (
  payment_id text primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  payment_status text not null
    constraint mercado_pago_payments_status_check
    check (payment_status in ('approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mercado_pago_payments_trip_id_idx
  on public.mercado_pago_payments (trip_id);

alter table public.mercado_pago_payments enable row level security;

revoke all on table public.mercado_pago_payments
  from public, anon, authenticated;
grant all on table public.mercado_pago_payments to service_role;

create or replace function public.apply_mercado_pago_payment(
  p_trip_id uuid,
  p_payment_id text,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips;
  v_payment_trip_id uuid;
  v_has_approved_payment boolean;
begin
  if p_payment_id is null or btrim(p_payment_id) = '' then
    raise exception 'Se requiere el identificador del pago de Mercado Pago.';
  end if;
  if p_payment_status is null
    or p_payment_status not in ('approved', 'rejected') then
    raise exception 'El estado del pago de Mercado Pago no es válido.';
  end if;

  select t.*
  into v_trip
  from public.trips t
  where t.id = p_trip_id
  for update;

  if not found
    or v_trip.status not in ('completed', 'paid')
    or v_trip.payment_method <> 'mercado_pago' then
    raise exception 'No se encontró un viaje elegible para actualizar el pago.';
  end if;

  insert into public.mercado_pago_payments (
    payment_id,
    trip_id,
    payment_status
  )
  values (
    p_payment_id,
    p_trip_id,
    p_payment_status
  )
  on conflict (payment_id) do update
  set payment_status = excluded.payment_status,
      updated_at = now()
  where public.mercado_pago_payments.trip_id = excluded.trip_id
  returning trip_id into v_payment_trip_id;

  if not found or v_payment_trip_id <> p_trip_id then
    raise exception 'El identificador del pago ya está asociado a otro viaje.';
  end if;

  select exists (
    select 1
    from public.mercado_pago_payments p
    where p.trip_id = p_trip_id
      and p.payment_status = 'approved'
  )
  into v_has_approved_payment;

  if v_has_approved_payment then
    update public.trips
    set payment_status = 'approved',
        status = 'paid',
        paid_at = coalesce(paid_at, now())
    where id = p_trip_id;
  elsif v_trip.status = 'completed' then
    update public.trips
    set payment_status = 'rejected'
    where id = p_trip_id;
  end if;
end;
$$;

revoke all on function public.apply_mercado_pago_payment(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_mercado_pago_payment(uuid, text, text)
  to service_role;