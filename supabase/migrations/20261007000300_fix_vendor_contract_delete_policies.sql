-- Reapply policies for projects where the initial migration was already run.
-- Existing applied migrations are not rerun automatically by Supabase SQL Editor.

drop policy if exists vendors_admin_delete on public.vendors;
create policy vendors_admin_delete on public.vendors
for delete to authenticated
using (
  (select private.is_app_admin())
  and not exists (
    select 1
    from public.contracts as contract
    where contract.vendor_id = vendors.id
  )
);

drop policy if exists contracts_admin_delete on public.contracts;
create policy contracts_admin_delete on public.contracts
for delete to authenticated
using ((select private.is_app_admin()));

-- A contract with attached file metadata is protected by the FK (ON DELETE RESTRICT).
-- The UI must delete the Storage object and metadata first, then retry contract deletion.
