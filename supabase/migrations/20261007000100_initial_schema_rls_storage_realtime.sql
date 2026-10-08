-- Initial schema and security baseline for Vendor & Contract Management.
-- Apply only to local/dev/staging Supabase instances.

begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null unique,
  name text not null,
  service_category text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  logo_storage_path text,
  status text not null default 'under_review'
    check (status in ('under_review', 'active', 'inactive')),
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_code_not_blank check (length(btrim(vendor_code)) > 0),
  constraint vendors_name_not_blank check (length(btrim(name)) > 0),
  constraint vendors_category_not_blank check (length(btrim(service_category)) > 0),
  constraint vendors_logo_path_format check (
    logo_storage_path is null
    or logo_storage_path ~ ('^' || id::text || '/[0-9a-f-]+\.(jpg|jpeg|png|webp)$')
  )
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  title text not null,
  start_date date not null,
  end_date date not null,
  contract_value numeric(18, 2),
  currency text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'renewal_review', 'closed', 'cancelled')),
  owner_name text not null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_number_not_blank check (length(btrim(contract_number)) > 0),
  constraint contracts_title_not_blank check (length(btrim(title)) > 0),
  constraint contracts_owner_not_blank check (length(btrim(owner_name)) > 0),
  constraint contracts_date_order check (end_date >= start_date),
  constraint contracts_value_nonnegative check (contract_value is null or contract_value >= 0),
  constraint contracts_currency_code check (
    currency is null or currency ~ '^[A-Z]{3}$'
  ),
  constraint contracts_value_has_currency check (
    (contract_value is null and currency is null)
    or (contract_value is not null and currency is not null)
  )
);

create table public.contract_files (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint contract_files_path_format check (
    storage_path ~ ('^' || contract_id::text || '/[0-9a-f-]+\.pdf$')
  ),
  constraint contract_files_name_not_blank check (length(btrim(original_name)) > 0)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint app_settings_key_not_blank check (length(btrim(key)) > 0)
);

insert into public.app_settings (key, value)
values ('contract_expiry_notice_days', '90'::jsonb);

create index vendors_status_idx on public.vendors (status);
create index vendors_name_idx on public.vendors using btree (name);
create index contracts_vendor_id_idx on public.contracts (vendor_id);
create index contracts_status_idx on public.contracts (status);
create index contracts_end_date_idx on public.contracts (end_date);
create index contract_files_contract_id_idx on public.contract_files (contract_id);
create index contract_files_uploaded_by_idx on public.contract_files (uploaded_by);

create function private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins as admin
    where admin.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_app_admin() from public, anon;
grant execute on function private.is_app_admin() to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vendors_set_updated_at
before update on public.vendors
for each row execute function private.set_updated_at();

create trigger contracts_set_updated_at
before update on public.contracts
for each row execute function private.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function private.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.vendors enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_files enable row level security;
alter table public.app_settings enable row level security;

revoke all on table public.app_admins from anon, authenticated;
revoke all on table public.vendors from anon, authenticated;
revoke all on table public.contracts from anon, authenticated;
revoke all on table public.contract_files from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;

grant select, insert, update, delete on table public.vendors to authenticated;
grant select, insert, update, delete on table public.contracts to authenticated;
grant select, insert, update, delete on table public.contract_files to authenticated;
grant select, update on table public.app_settings to authenticated;

create policy vendors_admin_select on public.vendors
for select to authenticated
using ((select private.is_app_admin()));

create policy vendors_admin_insert on public.vendors
for insert to authenticated
with check (
  (select private.is_app_admin())
  and created_by = (select auth.uid())
);

create policy vendors_admin_update on public.vendors
for update to authenticated
using ((select private.is_app_admin()))
with check ((select private.is_app_admin()));

create policy vendors_admin_delete on public.vendors
for delete to authenticated
using (
  (select private.is_app_admin())
  and not exists (
    select 1 from public.contracts as contract
    where contract.vendor_id = vendors.id
  )
);

create policy contracts_admin_select on public.contracts
for select to authenticated
using ((select private.is_app_admin()));

create policy contracts_admin_insert on public.contracts
for insert to authenticated
with check (
  (select private.is_app_admin())
  and created_by = (select auth.uid())
);

create policy contracts_admin_update on public.contracts
for update to authenticated
using ((select private.is_app_admin()))
with check ((select private.is_app_admin()));

create policy contracts_admin_delete on public.contracts
for delete to authenticated
using (
  (select private.is_app_admin())
  and status in ('draft', 'cancelled')
);

create policy contract_files_admin_select on public.contract_files
for select to authenticated
using ((select private.is_app_admin()));

create policy contract_files_admin_insert on public.contract_files
for insert to authenticated
with check (
  (select private.is_app_admin())
  and uploaded_by = (select auth.uid())
);

create policy contract_files_admin_update on public.contract_files
for update to authenticated
using ((select private.is_app_admin()))
with check ((select private.is_app_admin()));

create policy contract_files_admin_delete on public.contract_files
for delete to authenticated
using ((select private.is_app_admin()));

create policy app_settings_admin_select on public.app_settings
for select to authenticated
using ((select private.is_app_admin()));

create policy app_settings_admin_update on public.app_settings
for update to authenticated
using ((select private.is_app_admin()))
with check (
  (select private.is_app_admin())
  and updated_by = (select auth.uid())
);

create policy app_settings_admin_insert on public.app_settings
for insert to authenticated
with check (
  (select private.is_app_admin())
  and updated_by = (select auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vendor-logos', 'vendor-logos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('contract-documents', 'contract-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy vendor_logos_admin_select on storage.objects
for select to authenticated
using (
  bucket_id = 'vendor-logos'
  and (select private.is_app_admin())
);

create policy vendor_logos_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vendor-logos'
  and (select private.is_app_admin())
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.filename(name)) ~ '^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
);

create policy vendor_logos_admin_update on storage.objects
for update to authenticated
using (
  bucket_id = 'vendor-logos'
  and (select private.is_app_admin())
)
with check (
  bucket_id = 'vendor-logos'
  and (select private.is_app_admin())
);

create policy vendor_logos_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'vendor-logos'
  and (select private.is_app_admin())
);

create policy contract_documents_admin_select on storage.objects
for select to authenticated
using (
  bucket_id = 'contract-documents'
  and (select private.is_app_admin())
);

create policy contract_documents_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'contract-documents'
  and (select private.is_app_admin())
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.filename(name)) ~ '^[0-9a-f-]{36}\.pdf$'
);

create policy contract_documents_admin_update on storage.objects
for update to authenticated
using (
  bucket_id = 'contract-documents'
  and (select private.is_app_admin())
)
with check (
  bucket_id = 'contract-documents'
  and (select private.is_app_admin())
);

create policy contract_documents_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'contract-documents'
  and (select private.is_app_admin())
);

alter table public.vendors replica identity full;
alter table public.contracts replica identity full;
alter table public.contract_files replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.vendors;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.contracts;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.contract_files;
exception when duplicate_object then null;
end;
$$;

commit;
