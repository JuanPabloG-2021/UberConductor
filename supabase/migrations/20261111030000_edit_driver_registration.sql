create or replace function public.get_driver_registration()
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
      'license_number', doc.license_number,
      'license_photo_path', doc.license_photo_path,
      'license_expiration_date', doc.license_expiration_date,
      'insurance_photo_path', doc.insurance_photo_path,
      'insurance_expiration_date', doc.insurance_expiration_date,
      'technical_inspection_photo_path', doc.technical_inspection_photo_path,
      'technical_inspection_expiration_date',
        doc.technical_inspection_expiration_date,
      'mercado_pago_email', doc.mercado_pago_email
    )
  )
  from public.drivers as d
  join public.vehicles as v
    on v.driver_document_number = d.document_number
  join public.documents as doc
    on doc.license_number = d.document_number
  where d.auth_user_id = (select auth.uid())
    and d.is_verified = false;
$$;

revoke all on function public.get_driver_registration()
  from public, anon;
grant execute on function public.get_driver_registration()
  to authenticated;

create or replace function public.update_driver_registration(
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
  v_is_verified boolean;
  v_updated_rows integer;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  select d.document_number, d.is_verified
  into v_document_number, v_is_verified
  from public.drivers as d
  where d.auth_user_id = v_user_id
  for update;

  if not found then
    raise exception 'No se encontró una solicitud de registro para editar.';
  end if;

  if v_is_verified then
    raise exception 'El perfil ya fue aprobado y no se puede editar desde esta pantalla.';
  end if;

  if p_driver ->> 'document_number' is distinct from v_document_number
    or p_documents ->> 'license_number' is distinct from v_document_number then
    raise exception 'No se pueden cambiar los números de documento o licencia de una solicitud enviada.';
  end if;

  update public.drivers
  set
    full_name = p_driver ->> 'full_name',
    phone_number = p_driver ->> 'phone_number',
    birth_date = nullif(p_driver ->> 'birth_date', '')::date,
    gender = p_driver ->> 'gender',
    email = p_driver ->> 'email',
    language = p_driver ->> 'language',
    profile_photo_path = p_driver ->> 'profile_photo_path'
  where auth_user_id = v_user_id
    and is_verified = false;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'No se pudo actualizar el perfil del conductor.';
  end if;

  update public.vehicles
  set
    category = p_vehicle ->> 'category',
    license_plate = p_vehicle ->> 'license_plate',
    brand = p_vehicle ->> 'brand',
    model = p_vehicle ->> 'model',
    year = nullif(p_vehicle ->> 'year', '')::integer,
    color = p_vehicle ->> 'color',
    passenger_capacity =
      nullif(p_vehicle ->> 'passenger_capacity', '')::smallint,
    photo_path = p_vehicle ->> 'photo_path'
  where driver_document_number = v_document_number;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'No se encontró el vehículo de la solicitud.';
  end if;

  update public.documents
  set
    license_photo_path = p_documents ->> 'license_photo_path',
    license_expiration_date =
      nullif(p_documents ->> 'license_expiration_date', '')::date,
    insurance_photo_path = p_documents ->> 'insurance_photo_path',
    insurance_expiration_date =
      nullif(p_documents ->> 'insurance_expiration_date', '')::date,
    technical_inspection_photo_path =
      p_documents ->> 'technical_inspection_photo_path',
    technical_inspection_expiration_date =
      nullif(p_documents ->> 'technical_inspection_expiration_date', '')::date,
    mercado_pago_email = p_documents ->> 'mercado_pago_email'
  where license_number = v_document_number;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'No se encontraron los documentos de la solicitud.';
  end if;
end;
$$;

revoke all on function public.update_driver_registration(jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.update_driver_registration(jsonb, jsonb, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
