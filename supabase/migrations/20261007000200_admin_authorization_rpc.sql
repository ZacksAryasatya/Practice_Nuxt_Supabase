-- Expose a minimal authorization check for Nuxt route UX.
-- RLS policies continue to enforce authorization for all database operations.

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_app_admin();
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;
