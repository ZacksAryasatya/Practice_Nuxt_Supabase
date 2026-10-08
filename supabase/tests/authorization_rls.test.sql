begin;
select plan(14);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.app_admins'::regclass),
  'admin allowlist has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.vendors'::regclass),
  'vendors has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.contracts'::regclass),
  'contracts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.contract_files'::regclass),
  'contract files has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.app_settings'::regclass),
  'app settings has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.vendors', 'select,insert,update,delete'),
  'anon has no vendor table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.contracts', 'select,insert,update,delete'),
  'anon has no contract table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.app_admins', 'select,insert,update,delete'),
  'clients cannot read or modify the admin allowlist directly'
);

select ok(
  not has_function_privilege('anon', 'private.is_app_admin()', 'execute'),
  'anon cannot call the admin helper'
);
select ok(
  has_function_privilege('authenticated', 'private.is_app_admin()', 'execute'),
  'authenticated role can evaluate its admin authorization helper'
);

select ok(
  exists (
    select 1 from storage.buckets
    where id = 'vendor-logos'
      and not public
      and file_size_limit = 5242880
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  ),
  'vendor logo bucket is private and follows image limits'
);
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'contract-documents'
      and not public
      and file_size_limit = 52428800
      and allowed_mime_types = array['application/pdf']
  ),
  'contract document bucket is private, PDF-only, and limited to 50 MiB'
);

select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vendors'),
  'vendors is included in the Realtime publication'
);
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contracts'),
  'contracts is included in the Realtime publication'
);

select * from finish();
rollback;
