create or replace function public.driver_registration_exists(
  p_document_number text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.drivers
    where btrim(document_number) = btrim(p_document_number)
  );
$$;

revoke all on function public.driver_registration_exists(text)
  from public, anon;
grant execute on function public.driver_registration_exists(text)
  to authenticated;

create or replace function public.prevent_duplicate_driver_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(btrim(new.document_number), 0)
  );

  if exists (
    select 1
    from public.drivers
    where btrim(document_number) = btrim(new.document_number)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DRIVER_REGISTRATION_PENDING';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_duplicate_driver_registration()
  from public, anon, authenticated;

create trigger prevent_duplicate_driver_registration
before insert on public.drivers
for each row
execute function public.prevent_duplicate_driver_registration();

notify pgrst, 'reload schema';
