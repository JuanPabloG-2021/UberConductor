create or replace function public.get_driver_verification_status()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_verified boolean;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  select d.is_verified
  into v_is_verified
  from public.drivers as d
  where d.auth_user_id = v_user_id;

  return v_is_verified;
end;
$$;

revoke all on function public.get_driver_verification_status()
  from public, anon;
grant execute on function public.get_driver_verification_status()
  to authenticated;

notify pgrst, 'reload schema';
