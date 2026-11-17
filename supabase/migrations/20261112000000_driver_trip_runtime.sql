create table if not exists public.driver_locations (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  latitude double precision,
  longitude double precision,
  is_available boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint driver_locations_coordinates_check check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users (id) on delete set null,
  driver_auth_user_id uuid references auth.users (id) on delete set null,
  excluded_driver_ids uuid[] not null default '{}',
  origin_label text not null,
  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_label text not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  distance_km numeric(8, 2) not null,
  duration_minutes integer not null,
  category text not null,
  payment_method text not null,
  estimated_fare numeric(12, 2) not null,
  estimated_commission numeric(12, 2) not null,
  estimated_driver_net numeric(12, 2) not null,
  commission_rate numeric(5, 4) not null,
  final_fare numeric(12, 2),
  commission_amount numeric(12, 2),
  driver_net_amount numeric(12, 2),
  payment_status text not null default 'pending',
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trips_status_check check (
    status in (
      'requested',
      'accepted',
      'driver_arriving',
      'in_progress',
      'completed',
      'paid',
      'cancelled',
      'rejected'
    )
  ),
  constraint trips_payment_status_check check (
    payment_status in ('approved', 'pending', 'rejected', 'cash')
  ),
  constraint trips_payment_method_check check (
    payment_method in ('cash', 'mercado_pago', 'card', 'other')
  ),
  constraint trips_commission_rate_check check (
    commission_rate >= 0 and commission_rate <= 1
  ),
  constraint trips_amounts_check check (
    distance_km >= 0
    and duration_minutes >= 0
    and estimated_fare >= 0
    and estimated_commission >= 0
    and estimated_driver_net >= 0
  )
);

alter table public.trips
  add column if not exists offered_at timestamptz not null default now();

do $$
begin
  alter table public.trips
    add constraint trips_coordinate_bounds_check check (
      origin_latitude between -90 and 90
      and origin_longitude between -180 and 180
      and destination_latitude between -90 and 90
      and destination_longitude between -180 and 180
    );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.driver_push_tokens (
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  token text primary key,
  updated_at timestamptz not null default now()
);

create index if not exists trips_driver_status_requested_at_idx
  on public.trips (driver_auth_user_id, status, requested_at desc);
create index if not exists trips_requested_status_requested_at_idx
  on public.trips (status, offered_at);
create index if not exists trips_driver_completed_at_idx
  on public.trips (driver_auth_user_id, completed_at desc);

create or replace function public.request_trip(p_trip jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  insert into public.trips (
    requested_by,
    origin_label,
    origin_latitude,
    origin_longitude,
    destination_label,
    destination_latitude,
    destination_longitude,
    distance_km,
    duration_minutes,
    category,
    payment_method,
    estimated_fare,
    estimated_commission,
    estimated_driver_net,
    commission_rate,
    status
  )
  values (
    v_user_id,
    nullif(btrim(p_trip ->> 'origin_label'), ''),
    (p_trip ->> 'origin_latitude')::double precision,
    (p_trip ->> 'origin_longitude')::double precision,
    nullif(btrim(p_trip ->> 'destination_label'), ''),
    (p_trip ->> 'destination_latitude')::double precision,
    (p_trip ->> 'destination_longitude')::double precision,
    (p_trip ->> 'distance_km')::numeric,
    (p_trip ->> 'duration_minutes')::integer,
    nullif(btrim(p_trip ->> 'category'), ''),
    p_trip ->> 'payment_method',
    (p_trip ->> 'estimated_fare')::numeric,
    (p_trip ->> 'estimated_commission')::numeric,
    (p_trip ->> 'estimated_driver_net')::numeric,
    (p_trip ->> 'commission_rate')::numeric,
    'requested'
  )
  returning id into v_trip_id;

  return v_trip_id;
end;
$$;

create or replace function public.cancel_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  update public.trips t
  set status = 'cancelled'
  where t.id = p_trip_id
    and t.requested_by = v_user_id
    and t.status in ('requested', 'accepted', 'driver_arriving');

  if not found then
    raise exception 'El viaje no se puede cancelar en su estado actual.';
  end if;
end;
$$;

alter table public.driver_locations enable row level security;
alter table public.trips enable row level security;
alter table public.driver_push_tokens enable row level security;

revoke all on public.driver_locations, public.trips, public.driver_push_tokens
  from anon, authenticated;
grant select on public.driver_locations, public.trips to authenticated;

create or replace function public.current_user_can_receive_trip_requests()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.drivers d
    join public.driver_locations dl on dl.auth_user_id = d.auth_user_id
    where d.auth_user_id = (select auth.uid())
      and d.is_verified = true
      and dl.is_available = true
      and dl.updated_at > now() - interval '30 seconds'
  );
$$;

revoke all on function public.current_user_can_receive_trip_requests()
  from public, anon;
grant execute on function public.current_user_can_receive_trip_requests()
  to authenticated;

drop policy if exists "Drivers can read their trip requests and history"
  on public.trips;
create policy "Drivers can read their trip requests and history"
  on public.trips for select to authenticated
  using (
    requested_by = (select auth.uid())
    or driver_auth_user_id = (select auth.uid())
    or (
      status = 'requested'
      and driver_auth_user_id is null
      and public.current_user_can_receive_trip_requests()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.trips;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime is unavailable; enable Realtime for public.trips in Supabase.';
end;
$$;

drop policy if exists "Trip participants can read driver locations"
  on public.driver_locations;
create policy "Trip participants can read driver locations"
  on public.driver_locations for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or exists (
      select 1
      from public.trips t
      where t.driver_auth_user_id = driver_locations.auth_user_id
        and t.requested_by = (select auth.uid())
        and t.status in (
          'accepted',
          'driver_arriving',
          'in_progress'
        )
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.driver_locations;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime is unavailable; enable Realtime for public.driver_locations in Supabase.';
end;
$$;

create or replace function public.driver_set_location(
  p_latitude double precision,
  p_longitude double precision,
  p_is_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  if not exists (
    select 1 from public.drivers d
    where d.auth_user_id = v_user_id and d.is_verified = true
  ) then
    raise exception 'Solo un conductor aprobado puede actualizar su ubicación.';
  end if;

  if p_is_available and (
    p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  ) then
    raise exception 'Se requiere una ubicación válida para estar disponible.';
  end if;

  insert into public.driver_locations (
    auth_user_id, latitude, longitude, is_available, updated_at
  )
  values (
    v_user_id, p_latitude, p_longitude, p_is_available, now()
  )
  on conflict (auth_user_id) do update
  set latitude = excluded.latitude,
      longitude = excluded.longitude,
      is_available = excluded.is_available,
      updated_at = now();
end;
$$;

create or replace function public.driver_get_trip_requests()
returns setof public.trips
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1
    from public.drivers d
    join public.driver_locations dl on dl.auth_user_id = d.auth_user_id
    where d.auth_user_id = v_user_id
      and d.is_verified = true
      and dl.is_available = true
      and dl.updated_at > now() - interval '30 seconds'
  ) then
    raise exception 'Se requiere un conductor aprobado.';
  end if;

  return query
  select t.*
  from public.trips t
  where t.status = 'requested'
    and t.driver_auth_user_id is null
    and t.offered_at > now() - interval '15 seconds'
    and not (v_user_id = any(t.excluded_driver_ids))
  order by t.requested_at asc;
end;
$$;

create or replace function public.driver_get_active_trip()
returns setof public.trips
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  return query
  select t.*
  from public.trips t
  where t.driver_auth_user_id = v_user_id
    and t.status in ('accepted', 'driver_arriving', 'in_progress', 'completed')
  order by t.accepted_at desc nulls last
  limit 1;
end;
$$;

create or replace function public.driver_accept_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips;
begin
  if v_user_id is null or not exists (
    select 1
    from public.drivers d
    join public.driver_locations dl on dl.auth_user_id = d.auth_user_id
    where d.auth_user_id = v_user_id
      and d.is_verified = true
      and dl.is_available = true
      and dl.updated_at > now() - interval '30 seconds'
  ) then
    raise exception 'Se requiere un conductor aprobado.';
  end if;

  update public.trips t
  set driver_auth_user_id = v_user_id,
      status = 'accepted',
      accepted_at = now()
  where t.id = p_trip_id
    and t.status = 'requested'
    and t.driver_auth_user_id is null
    and t.offered_at > now() - interval '15 seconds'
    and not (v_user_id = any(t.excluded_driver_ids))
    and exists (
      select 1 from public.driver_locations dl
      where dl.auth_user_id = v_user_id
        and dl.is_available = true
        and dl.updated_at > now() - interval '30 seconds'
    )
  returning t.* into v_trip;

  if not found then
    raise exception 'La solicitud ya no está disponible.';
  end if;
  return v_trip;
end;
$$;

create or replace function public.driver_reject_trip(p_trip_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result text;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  update public.trips t
  set excluded_driver_ids = array_append(t.excluded_driver_ids, v_user_id),
      status = case
        when exists (
          select 1
          from public.driver_locations dl
          join public.drivers d on d.auth_user_id = dl.auth_user_id
          where dl.is_available
            and d.is_verified
            and dl.auth_user_id <> v_user_id
            and dl.updated_at > now() - interval '30 seconds'
            and not (dl.auth_user_id = any(t.excluded_driver_ids))
        ) then 'requested'
        else 'rejected'
      end,
      offered_at = case
        when exists (
          select 1
          from public.driver_locations dl
          join public.drivers d on d.auth_user_id = dl.auth_user_id
          where dl.is_available
            and d.is_verified
            and dl.auth_user_id <> v_user_id
            and dl.updated_at > now() - interval '30 seconds'
            and not (dl.auth_user_id = any(t.excluded_driver_ids))
        ) then now()
        else t.offered_at
      end
  where t.id = p_trip_id
    and t.status = 'requested'
    and t.driver_auth_user_id is null
    and exists (
      select 1 from public.drivers d
      join public.driver_locations dl on dl.auth_user_id = d.auth_user_id
      where d.auth_user_id = v_user_id
        and d.is_verified = true
        and dl.is_available = true
        and dl.updated_at > now() - interval '30 seconds'
    )
    and t.offered_at > now() - interval '15 seconds'
    and not (v_user_id = any(t.excluded_driver_ids))
  returning t.status into v_result;

  if not found then
    raise exception 'La solicitud ya no está disponible.';
  end if;
  return v_result;
end;
$$;

create or replace function public.driver_expire_trip_request(
  p_trip_id uuid,
  p_expected_offered_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text;
begin
  update public.trips t
  set status = 'rejected'
  where t.id = p_trip_id
    and t.status = 'requested'
    and t.offered_at = p_expected_offered_at
    and t.offered_at <= now() - interval '15 seconds'
  returning t.status into v_result;

  return coalesce(v_result, 'stale');
end;
$$;

create or replace function public.driver_update_payment_status(
  p_trip_id uuid,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_payment_status not in ('approved', 'rejected') then
    raise exception 'El estado de pago no es válido.';
  end if;

  update public.trips
  set payment_status = p_payment_status,
      status = case
        when p_payment_status = 'approved' then 'paid'
        else status
      end,
      paid_at = case
        when p_payment_status = 'approved' then now()
        else paid_at
      end
  where id = p_trip_id
    and status = 'completed'
    and payment_method <> 'cash';

  if not found then
    raise exception 'No se encontró un pago electrónico pendiente para actualizar.';
  end if;
end;
$$;

create or replace function public.driver_advance_trip(
  p_trip_id uuid,
  p_next_status text
)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  if p_next_status = 'driver_arriving' then
    update public.trips t
    set status = 'driver_arriving'
    where t.id = p_trip_id
      and t.driver_auth_user_id = v_user_id
      and t.status = 'accepted'
    returning t.* into v_trip;
  elsif p_next_status = 'in_progress' then
    update public.trips t
    set status = 'in_progress', started_at = now()
    where t.id = p_trip_id
      and t.driver_auth_user_id = v_user_id
      and t.status = 'driver_arriving'
    returning t.* into v_trip;
  elsif p_next_status = 'completed' then
    update public.trips t
    set final_fare = t.estimated_fare,
        commission_amount = round(t.estimated_fare * t.commission_rate, 2),
        driver_net_amount = t.estimated_fare
          - round(t.estimated_fare * t.commission_rate, 2),
        payment_status = case
          when t.payment_method = 'cash' then 'cash'
          else 'pending'
        end,
        status = 'completed',
        completed_at = now()
    where t.id = p_trip_id
      and t.driver_auth_user_id = v_user_id
      and t.status = 'in_progress'
    returning t.* into v_trip;
  elsif p_next_status = 'paid' then
    update public.trips t
    set status = 'paid', paid_at = now()
    where t.id = p_trip_id
      and t.driver_auth_user_id = v_user_id
      and t.status = 'completed'
      and t.payment_method = 'cash'
    returning t.* into v_trip;
  else
    raise exception 'Transición de viaje no permitida.';
  end if;

  if not found then
    raise exception 'No se pudo actualizar el viaje: verifica su estado actual.';
  end if;
  return v_trip;
end;
$$;

create or replace function public.driver_cancel_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  update public.trips t
  set status = 'cancelled'
  where t.id = p_trip_id
    and t.driver_auth_user_id = v_user_id
    and t.status in ('accepted', 'driver_arriving');

  if not found then
    raise exception 'El viaje no se puede cancelar en su estado actual.';
  end if;
end;
$$;

create or replace function public.driver_get_earnings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_day_start timestamptz := date_trunc('day', now());
  v_week_start timestamptz := date_trunc('week', now());
  v_month_start timestamptz := date_trunc('month', now());
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  select jsonb_build_object(
    'day', coalesce(sum(t.driver_net_amount) filter (
      where t.completed_at >= v_day_start
    ), 0),
    'week', coalesce(sum(t.driver_net_amount) filter (
      where t.completed_at >= v_week_start
    ), 0),
    'month', coalesce(sum(t.driver_net_amount) filter (
      where t.completed_at >= v_month_start
    ), 0),
    'as_of', v_now
  )
  into v_result
  from public.trips t
  where t.driver_auth_user_id = v_user_id
    and t.status in ('completed', 'paid');

  return v_result;
end;
$$;

create or replace function public.driver_get_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'driver', jsonb_build_object(
      'document_number', d.document_number,
      'full_name', d.full_name,
      'phone_number', d.phone_number,
      'birth_date', d.birth_date,
      'gender', d.gender,
      'email', d.email,
      'language', d.language,
      'profile_photo_path', d.profile_photo_path
    ),
    'vehicle', jsonb_build_object(
      'category', v.category,
      'license_plate', v.license_plate,
      'brand', v.brand,
      'model', v.model,
      'year', v.year,
      'color', v.color,
      'passenger_capacity', v.passenger_capacity,
      'photo_path', v.photo_path
    ),
    'documents', jsonb_build_object(
      'license_photo_path', doc.license_photo_path,
      'license_expiration_date', doc.license_expiration_date,
      'insurance_photo_path', doc.insurance_photo_path,
      'insurance_expiration_date', doc.insurance_expiration_date,
      'technical_inspection_photo_path',
        doc.technical_inspection_photo_path,
      'technical_inspection_expiration_date',
        doc.technical_inspection_expiration_date,
      'mercado_pago_email', doc.mercado_pago_email
    )
  )
  from public.drivers d
  join public.vehicles v on v.driver_document_number = d.document_number
  join public.documents doc on doc.license_number = d.document_number
  where d.auth_user_id = (select auth.uid())
    and d.is_verified = true;
$$;

create or replace function public.driver_register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved_token text;
begin
  if v_user_id is null or not exists (
    select 1 from public.drivers d
    where d.auth_user_id = v_user_id and d.is_verified = true
  ) then
    raise exception 'Se requiere un conductor aprobado para registrar notificaciones.';
  end if;
  if p_token is null or length(btrim(p_token)) < 20 then
    raise exception 'El token de notificaciones no es válido.';
  end if;

  insert into public.driver_push_tokens (auth_user_id, token, updated_at)
  values (v_user_id, p_token, now())
  on conflict (token) do update
  set auth_user_id = excluded.auth_user_id,
      updated_at = now()
  where public.driver_push_tokens.auth_user_id = v_user_id
  returning token into v_saved_token;

  if v_saved_token is null then
    raise exception 'El token de notificaciones ya pertenece a otro usuario.';
  end if;
end;
$$;

create or replace function public.driver_remove_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;
  delete from public.driver_push_tokens
  where auth_user_id = v_user_id and token = p_token;
end;
$$;

create or replace function public.driver_update_profile(
  p_driver jsonb,
  p_vehicle jsonb,
  p_documents jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_document_number text;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  select d.document_number into v_document_number
  from public.drivers d
  where d.auth_user_id = v_user_id and d.is_verified = true
  for update;
  if not found then
    raise exception 'No se encontró un perfil aprobado para actualizar.';
  end if;

  update public.drivers
  set full_name = p_driver ->> 'full_name',
      phone_number = p_driver ->> 'phone_number',
      birth_date = nullif(p_driver ->> 'birth_date', '')::date,
      gender = p_driver ->> 'gender',
      email = p_driver ->> 'email',
      language = p_driver ->> 'language',
      profile_photo_path = coalesce(
        p_driver ->> 'profile_photo_path',
        profile_photo_path
      )
  where auth_user_id = v_user_id and is_verified = true;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'No se pudo actualizar el perfil.';
  end if;

  update public.vehicles
  set category = p_vehicle ->> 'category',
      license_plate = p_vehicle ->> 'license_plate',
      brand = p_vehicle ->> 'brand',
      model = p_vehicle ->> 'model',
      year = nullif(p_vehicle ->> 'year', '')::integer,
      color = p_vehicle ->> 'color',
      photo_path = coalesce(p_vehicle ->> 'photo_path', photo_path),
      passenger_capacity =
        nullif(p_vehicle ->> 'passenger_capacity', '')::smallint
  where driver_document_number = v_document_number;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'No se encontró el vehículo para actualizar.';
  end if;

  update public.documents
  set license_expiration_date =
        nullif(p_documents ->> 'license_expiration_date', '')::date,
      insurance_expiration_date =
        nullif(p_documents ->> 'insurance_expiration_date', '')::date,
      technical_inspection_expiration_date =
        nullif(p_documents ->> 'technical_inspection_expiration_date', '')::date,
      license_photo_path = coalesce(
        p_documents ->> 'license_photo_path',
        license_photo_path
      ),
      insurance_photo_path = coalesce(
        p_documents ->> 'insurance_photo_path',
        insurance_photo_path
      ),
      technical_inspection_photo_path = coalesce(
        p_documents ->> 'technical_inspection_photo_path',
        technical_inspection_photo_path
      ),
      mercado_pago_email = p_documents ->> 'mercado_pago_email'
  where license_number = v_document_number;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'No se encontraron los documentos para actualizar.';
  end if;
end;
$$;

revoke all on function public.driver_set_location(double precision, double precision, boolean)
  from public, anon;
revoke all on function public.request_trip(jsonb)
  from public, anon;
revoke all on function public.cancel_trip(uuid)
  from public, anon;
revoke all on function public.driver_get_trip_requests()
  from public, anon;
revoke all on function public.driver_get_active_trip()
  from public, anon;
revoke all on function public.driver_accept_trip(uuid)
  from public, anon;
revoke all on function public.driver_reject_trip(uuid)
  from public, anon;
revoke all on function public.driver_expire_trip_request(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.driver_update_payment_status(uuid, text)
  from public, anon, authenticated;
revoke all on function public.driver_advance_trip(uuid, text)
  from public, anon;
revoke all on function public.driver_cancel_trip(uuid)
  from public, anon;
revoke all on function public.driver_get_earnings()
  from public, anon;
revoke all on function public.driver_get_profile()
  from public, anon;
revoke all on function public.driver_register_push_token(text)
  from public, anon;
revoke all on function public.driver_remove_push_token(text)
  from public, anon;
revoke all on function public.driver_update_profile(jsonb, jsonb, jsonb)
  from public, anon;

grant execute on function public.driver_set_location(double precision, double precision, boolean)
  to authenticated;
grant execute on function public.request_trip(jsonb)
  to authenticated;
grant execute on function public.cancel_trip(uuid)
  to authenticated;
grant execute on function public.driver_get_trip_requests()
  to authenticated;
grant execute on function public.driver_get_active_trip()
  to authenticated;
grant execute on function public.driver_accept_trip(uuid)
  to authenticated;
grant execute on function public.driver_reject_trip(uuid)
  to authenticated;
grant execute on function public.driver_expire_trip_request(uuid, timestamptz)
  to service_role;
grant execute on function public.driver_update_payment_status(uuid, text)
  to service_role;
grant execute on function public.driver_advance_trip(uuid, text)
  to authenticated;
grant execute on function public.driver_cancel_trip(uuid)
  to authenticated;
grant execute on function public.driver_get_earnings()
  to authenticated;
grant execute on function public.driver_get_profile()
  to authenticated;
grant execute on function public.driver_register_push_token(text)
  to authenticated;
grant execute on function public.driver_remove_push_token(text)
  to authenticated;
grant execute on function public.driver_update_profile(jsonb, jsonb, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
