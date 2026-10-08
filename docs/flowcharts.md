# Flowcharts

## Login dan otorisasi

```mermaid
flowchart TD
    A([Buka aplikasi]) --> B{Sesi Supabase Auth tersedia?}
    B -- Tidak --> C[Nuxt mengarahkan ke halaman login]
    C --> D[Supabase Auth memvalidasi email dan password]
    D --> E{Login berhasil?}
    E -- Tidak --> F[Tampilkan error login]
    F --> C
    E -- Ya --> G[Nuxt meminta pemeriksaan allowlist admin]
    B -- Ya --> G
    G --> H{Admin diizinkan?}
    H -- Tidak --> I[Hapus sesi dan tampilkan pesan akses ditolak]
    I --> C
    H -- Ya --> J[Dashboard dan modul aplikasi]
    J --> K[REST request tetap diperiksa grants dan RLS]
    J --> L[File tetap diperiksa Storage policies]
    J --> M[Logout melalui Supabase Auth]
```

## CRUD vendor dan kontrak

```mermaid
flowchart TD
    A([Admin memilih modul]) --> B{Vendor atau kontrak?}
    B --> C[REST API membaca daftar, mencari, dan memfilter]
    C --> D{Aksi}
    D -- Tambah --> E[Isi form]
    D -- Detail/edit --> F[Muat detail dan ubah field]
    E --> G[Validasi form dan constraints database]
    F --> G
    G --> H{Data valid?}
    H -- Tidak --> I[Tampilkan error pada field]
    I --> E
    H -- Ya --> J[Supabase REST API dengan sesi pengguna]
    J --> K[Grants dan RLS memeriksa admin]
    K --> L{Operasi berhasil?}
    L -- Tidak --> M[Tampilkan error yang dapat ditindaklanjuti]
    L -- Ya --> N[Perbarui daftar dan dashboard via Realtime]
    D -- Hapus vendor --> O{Vendor masih punya kontrak?}
    O -- Ya --> P[Tolak delete dan tampilkan alasan; sarankan nonaktifkan]
    O -- Tidak --> Q[Dialog konfirmasi custom]
    D -- Hapus kontrak --> R[Dialog konfirmasi custom]
    Q --> J
    R --> S[Hapus object Storage dan metadata lampiran]
    S --> J
    P --> C
```

## Lampiran dan realtime

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Nuxt UI
    participant SDK as supabase-js
    participant API as Supabase REST API
    participant DB as PostgreSQL + RLS
    participant Storage as Supabase Storage + policies
    participant RT as Supabase Realtime

    Admin->>UI: Simpan form vendor/kontrak
    UI->>SDK: Insert/update row dengan sesi admin
    SDK->>API: REST request + publishable key + session
    API->>DB: Cek grants, RLS, foreign key, constraints
    DB-->>API: Row berhasil disimpan atau error
    API-->>SDK: Respons REST
    SDK-->>UI: Data hasil CRUD

    Admin->>UI: Pilih logo atau PDF
    UI->>Storage: Upload file dengan sesi admin; PDF memakai resumable TUS
    Storage->>Storage: Cek bucket policy, MIME, dan ukuran
    Storage-->>UI: Object path
    UI->>API: Simpan path dan metadata file
    API->>DB: Cek RLS dan foreign key

    DB-->>RT: Perubahan tabel yang dipublish
    RT-->>UI: Event perubahan
    UI->>API: Refetch data terbaru
```

## Siklus kontrak

```mermaid
flowchart TD
    A([Admin membuat kontrak]) --> B[Isi vendor aktif, nomor, judul, tanggal, status, PIC]
    B --> C[Isi nilai dan mata uang opsional]
    C --> D[Pilih PDF opsional]
    D --> E{Validasi lolos?}
    E -- Tidak --> F[Tampilkan pesan validasi per field/file]
    F --> B
    E -- Ya --> G[Simpan kontrak melalui REST API]
    G --> H{PDF dipilih?}
    H -- Tidak --> N[Navigasi ke halaman detail kontrak]
    H -- Ya --> I[Upload PDF resumable ke bucket privat]
    I --> J[Simpan metadata/path ke contract_files]
    J --> N
    I -- Gagal --> K[Kontrak tetap tersimpan; UI meminta upload ulang dari halaman detail]
    K --> N
    N --> O[Detail menampilkan metadata dan preview signed URL]
    O --> P[Dashboard menghitung indikator dari tanggal akhir dan app_settings]
```

## Pengaturan ambang pengingat

```mermaid
flowchart TD
    A([Admin membuka Pengaturan]) --> B[Baca app_settings melalui REST API]
    B --> C[Tampilkan contract_expiry_notice_days]
    C --> D[Admin memasukkan jumlah hari]
    D --> E{Bilangan bulat 1–3650?}
    E -- Tidak --> F[Tampilkan validasi; jangan kirim perubahan]
    F --> D
    E -- Ya --> G[Update app_settings melalui REST API]
    G --> H[Grants dan RLS memeriksa akses admin]
    H --> I{Berhasil?}
    I -- Tidak --> J[Tampilkan pesan gagal simpan]
    I -- Ya --> K[Tampilkan konfirmasi sukses]
    K --> L[Dashboard menerima Realtime dan menghitung ulang]
```
