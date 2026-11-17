alter table public.drivers
  add column if not exists auth_user_id uuid
  references auth.users (id) on delete cascade;

create unique index if not exists drivers_auth_user_id_key
  on public.drivers (auth_user_id);

alter table public.drivers
  add column if not exists is_verified boolean not null default false;

update public.drivers
set is_verified = false
where is_verified is null;

alter table public.drivers
  alter column is_verified set default false,
  alter column is_verified set not null;

alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.documents enable row level security;

revoke all on public.drivers, public.vehicles, public.documents
  from anon, authenticated;

create or replace function public.create_driver_registration(
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
  v_document_number text := p_driver ->> 'document_number';
  v_license_number text := p_documents ->> 'license_number';
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  if v_document_number is null or btrim(v_document_number) = '' then
    raise exception 'El número de documento es obligatorio.';
  end if;

  if v_license_number is distinct from v_document_number then
    raise exception 'La licencia debe coincidir con el número de documento.';
  end if;

  if coalesce(p_driver ->> 'full_name', '') = ''
    or coalesce(p_driver ->> 'phone_number', '') = ''
    or coalesce(p_driver ->> 'email', '') = ''
    or coalesce(p_vehicle ->> 'category', '') = ''
    or coalesce(p_vehicle ->> 'license_plate', '') = '' then
    raise exception 'Faltan datos obligatorios para crear el registro.';
  end if;

  insert into public.drivers (
    document_number,
    auth_user_id,
    full_name,
    phone_number,
    birth_date,
    gender,
    email,
    language,
    profile_photo_path,
    is_verified,
    terms_accepted
  )
  values (
    v_document_number,
    v_user_id,
    p_driver ->> 'full_name',
    p_driver ->> 'phone_number',
    nullif(p_driver ->> 'birth_date', '')::date,
    p_driver ->> 'gender',
    p_driver ->> 'email',
    p_driver ->> 'language',
    p_driver ->> 'profile_photo_path',
    false,
    true
  );

  insert into public.vehicles (
    driver_document_number,
    category,
    license_plate,
    brand,
    model,
    year,
    color,
    passenger_capacity,
    photo_path
  )
  values (
    v_document_number,
    p_vehicle ->> 'category',
    p_vehicle ->> 'license_plate',
    p_vehicle ->> 'brand',
    p_vehicle ->> 'model',
    nullif(p_vehicle ->> 'year', '')::integer,
    p_vehicle ->> 'color',
    nullif(p_vehicle ->> 'passenger_capacity', '')::smallint,
    p_vehicle ->> 'photo_path'
  );

  insert into public.documents (
    license_number,
    license_photo_path,
    license_expiration_date,
    insurance_photo_path,
    insurance_expiration_date,
    technical_inspection_photo_path,
    technical_inspection_expiration_date,
    mercado_pago_email
  )
  values (
    v_document_number,
    p_documents ->> 'license_photo_path',
    nullif(p_documents ->> 'license_expiration_date', '')::date,
    p_documents ->> 'insurance_photo_path',
    nullif(p_documents ->> 'insurance_expiration_date', '')::date,
    p_documents ->> 'technical_inspection_photo_path',
    nullif(p_documents ->> 'technical_inspection_expiration_date', '')::date,
    p_documents ->> 'mercado_pago_email'
  );
end;
$$;

revoke all on function public.create_driver_registration(jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.create_driver_registration(jsonb, jsonb, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
