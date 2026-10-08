-- Vendor records with any linked contract must never be hard-deleted.
-- Apply this migration in the Supabase Dashboard SQL Editor.

drop policy if exists vendors_admin_delete on public.vendors;
drop policy if exists vendors_cannot_delete_with_contracts on public.vendors;

create policy vendors_admin_delete on public.vendors
for delete to authenticated
using ((select private.is_app_admin()));

-- A restrictive policy is ANDed with every permissive DELETE policy, so an
-- additional permissive policy cannot accidentally bypass this relationship rule.
create policy vendors_cannot_delete_with_contracts on public.vendors
as restrictive
for delete to authenticated
using (
  not exists (
    select 1
    from public.contracts as contract
    where contract.vendor_id = vendors.id
  )
);

create or replace function private.prevent_vendor_delete_with_contracts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.contracts as contract
    where contract.vendor_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Cannot delete a vendor while contracts are linked to it.';
  end if;

  return old;
end;
$$;

revoke all on function private.prevent_vendor_delete_with_contracts() from public, anon, authenticated;

drop trigger if exists vendors_prevent_delete_with_contracts on public.vendors;
create trigger vendors_prevent_delete_with_contracts
before delete on public.vendors
for each row execute function private.prevent_vendor_delete_with_contracts();
