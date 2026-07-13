-- V0.16 hardening: pin trusted function resolution to the application schema.

alter function public.set_updated_at()
set search_path = public, pg_temp;

alter function public.audit_price_verification()
set search_path = public, pg_temp;

alter function public.enforce_verified_signal()
set search_path = public, pg_temp;
