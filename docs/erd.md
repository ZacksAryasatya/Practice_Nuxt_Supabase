# Entity Relationship Diagram

Schema aplikasi terdiri dari lima tabel di `public`: `app_admins`, `vendors`, `contracts`, `contract_files`, dan `app_settings`. Identitas pengguna disimpan oleh Supabase Auth. Binary logo/PDF berada di Supabase Storage; database hanya menyimpan path dan metadata file.

```mermaid
erDiagram
    AUTH_USERS ||--o{ VENDORS : creates
    AUTH_USERS ||--o{ CONTRACTS : creates
    AUTH_USERS ||--o{ CONTRACT_FILES : uploads
    AUTH_USERS o|--o{ APP_SETTINGS : updates
    AUTH_USERS ||--o| APP_ADMINS : allowlisted
    VENDORS ||--o{ CONTRACTS : has
    CONTRACTS ||--o{ CONTRACT_FILES : attaches

    AUTH_USERS { uuid id PK }
    APP_ADMINS { uuid user_id PK, FK; timestamptz created_at }
    VENDORS {
      uuid id PK
      text vendor_code UK
      text name
      text service_category
      text contact_name
      text contact_email
      text contact_phone
      text logo_storage_path
      text status
      text notes
      uuid created_by FK
      timestamptz created_at
      timestamptz updated_at
    }
    CONTRACTS {
      uuid id PK
      text contract_number UK
      uuid vendor_id FK
      text title
      date start_date
      date end_date
      numeric contract_value
      text currency
      text status
      text owner_name
      text notes
      uuid created_by FK
      timestamptz created_at
      timestamptz updated_at
    }
    CONTRACT_FILES {
      uuid id PK
      uuid contract_id FK
      text storage_path UK
      text original_name
      text mime_type
      bigint file_size_bytes
      uuid uploaded_by FK
      timestamptz created_at
    }
    APP_SETTINGS {
      text key PK
      jsonb value
      uuid updated_by FK
      timestamptz updated_at
    }
```

## Tabel dan constraints

### `app_admins`

- `user_id`: primary key sekaligus FK ke `auth.users.id`, `ON DELETE CASCADE`.
- `created_at`: `timestamptz`, default `now()`.
- Tabel ini allowlist otorisasi admin. Client `anon`/`authenticated` tidak diberi grant langsung untuk membaca atau mengubahnya. Operator mengelolanya melalui SQL tepercaya.

### `vendors`

- `id`: UUID primary key, default `gen_random_uuid()`.
- `vendor_code`: teks wajib dan unik; saat ini diinput manual.
- `name`, `service_category`: wajib dan tidak boleh blank.
- `contact_name`, `contact_email`, `contact_phone`, `notes`, `logo_storage_path`: opsional.
- `status`: `under_review`, `active`, atau `inactive`.
- `created_by`: FK wajib ke `auth.users.id`, default `auth.uid()`.
- `created_at`, `updated_at`: `timestamptz`; `updated_at` dipelihara trigger.
- `logo_storage_path` menunjuk object pada bucket `vendor-logos`, dengan pola `<vendor_uuid>/<object_uuid>.<jpg|jpeg|png|webp>`.

### `contracts`

- `id`: UUID primary key, default `gen_random_uuid()`.
- `contract_number`: teks wajib dan unik.
- `vendor_id`: FK wajib ke `vendors.id`, `ON DELETE RESTRICT`.
- `title`, `owner_name`: wajib dan tidak boleh blank. `owner_name` adalah PIC internal berupa teks, bukan FK akun.
- `start_date`, `end_date`: SQL `date`, wajib; constraint `end_date >= start_date`.
- `contract_value`: `numeric(18,2)`, opsional, tidak negatif.
- `currency`: kode ISO 4217 nullable. UI menawarkan kode mata uang yang didukung runtime; saat nominal tidak kosong, helper form menambahkan mata uang terpilih (default `IDR`); saat nominal dikosongkan, helper menyimpan null.
- `status`: `draft`, `active`, `renewal_review`, `closed`, atau `cancelled`.
- `created_by`: FK wajib ke `auth.users.id`, default `auth.uid()`.
- `notes`: opsional. Timestamp dikelola database.

### `contract_files`

- Metadata PDF kontrak; binary disimpan pada bucket privat `contract-documents`.
- `contract_id`: FK ke `contracts.id`, `ON DELETE RESTRICT`.
- `storage_path`: unik, pola `<contract_uuid>/<object_uuid>.pdf`.
- `original_name`, `mime_type`, `file_size_bytes`: metadata file. MIME harus PDF dan ukuran maksimal 50 MiB.
- `uploaded_by`: FK wajib ke `auth.users.id`, default `auth.uid()`.
- Penghapusan file menghapus object Storage dahulu, lalu metadata. Penghapusan kontrak menghapus lampiran terkait lebih dulu; kegagalan tahap DB setelah object terhapus dapat meninggalkan metadata yatim untuk dibersihkan.

### `app_settings`

- Key/value konfigurasi global aplikasi.
- Key `contract_expiry_notice_days` bernilai awal JSON number `90`. Dashboard membacanya untuk menghitung kontrak aktif yang berakhir dalam rentang itu; admin dapat mengubahnya melalui halaman Pengaturan dengan rentang 1–3650 hari. UI memvalidasi integer/rentang; constraint rentang database belum ditambahkan.
- Hanya admin dapat membaca/mengubah melalui policy. `updated_by` opsional menunjuk `auth.users.id`.

## Logo Storage

- `vendors.logo_storage_path` menyimpan object path, bukan URL.
- Bucket privat `vendor-logos`; MIME JPEG/PNG/WebP, maksimum 5 MiB. Kompresi/resize client-side dianjurkan agar idealnya di bawah 1 MiB.
- Path object menggunakan `<vendor_uuid>/<object_uuid>.<extension>`.

## Relasi, policy, dan indeks

- Satu vendor memiliki nol atau banyak kontrak; setiap kontrak menunjuk tepat satu vendor.
- Vendor dengan kontrak tertaut tidak dapat dihapus: FK `ON DELETE RESTRICT`, restrictive RLS delete policy, trigger database, dan pengecekan UI.
- Kontrak dapat dihapus admin setelah konfirmasi. Lampiran dan metadata dihapus sebelum row kontrak.
- Semua tabel aplikasi mengaktifkan RLS. Helper admin `SECURITY DEFINER` berada pada schema non-exposed, memakai `search_path` kosong, dan execute privilege terbatas.
- Storage buckets privat dan mempunyai policy operasi terpisah untuk admin.
- Index tersedia pada FK dan kolom status/tanggal yang dipakai query/realtime.
- Tabel `vendors`, `contracts`, `contract_files` dipublikasikan ke Supabase Realtime; dashboard juga subscribe ke `app_settings`.
- `updated_at` pada tabel vendor/kontrak/pengaturan dipelihara trigger database.
