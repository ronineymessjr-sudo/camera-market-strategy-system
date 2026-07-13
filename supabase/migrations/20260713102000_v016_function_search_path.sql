-- V0.16 hardening: pin trusted function resolution to the application schema.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.audit_price_verification()') is not null then
    alter function public.audit_price_verification() set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.enforce_verified_signal()') is not null then
    alter function public.enforce_verified_signal() set search_path = public, pg_temp;
  end if;
end
$$;
