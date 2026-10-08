# Technical Decisions and Engineering Standards

**Status:** Catatan teknis implementasi aplikasi latihan.

Versi dependency dikunci di `package-lock.json`; perubahan dependency dilakukan terencana dan dideskripsikan saat review.

## Stack

- Nuxt 4.4.x dengan TypeScript dan struktur direktori standar Nuxt.
- Tailwind CSS mengikuti panduan resmi Tailwind untuk Nuxt/Vite; gunakan satu pola integrasi yang konsisten dan jangan mencampur plugin/integrasi ganda.
- Supabase Auth, PostgreSQL, Data API, migrations, RLS, dan generated TypeScript database types.
- CRUD utama menggunakan Supabase REST API melalui `supabase-js`.
- Supabase Storage untuk logo vendor dan PDF kontrak; Supabase Realtime untuk sinkronisasi daftar/dashboard.
- Pengaturan ambang pengingat disimpan pada `app_settings.contract_expiry_notice_days`; UI admin menerima integer 1–3650 dan dashboard membaca ulang nilai saat tabel settings berubah melalui Realtime.
- Keempat kapabilitas Supabase (REST/Data API, RLS, Storage, Realtime) wajib masuk rancangan dan implementasi MVP; Storage/Realtime bukan fase opsional atau sekadar kemungkinan pengembangan berikutnya.
- Modul Nuxt `@nuxtjs/supabase` digunakan sebagai integrasi Supabase dengan dukungan SSR cookie.

## Struktur direktori yang direncanakan

```text
.
├── app/
│   ├── assets/
│   │   └── css/main.css
│   ├── components/
│   │   ├── app/
│   │   ├── contracts/
│   │   ├── vendors/
│   │   └── ui/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   │   ├── login.vue
│   │   ├── index.vue
│   │   ├── settings.vue
│   │   ├── vendors/
│   │   └── contracts/
│   ├── plugins/
│   ├── types/
│   │   └── database.types.ts
│   └── app.vue
├── docs/
├── public/
├── server/
│   └── api/version.get.ts
├── supabase/
│   ├── migrations/
│   └── tests/
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── nuxt.config.ts
├── package.json
├── README.md
└── version.json
```

- Ikuti Nuxt 4 `app/` source directory dan routing berbasis file di `app/pages/`; jangan menambah `src/` atau abstraction layer tanpa kebutuhan.
- `server/` hanya untuk endpoint server yang memang diperlukan; operasi CRUD dapat memakai client Supabase terautentikasi dengan RLS. Jangan membuat proxy API tanpa kebutuhan keamanan/bisnis.
- Tailwind global CSS berada di `app/assets/css/main.css`; aset statis yang disajikan apa adanya berada di `public/`.
- Direktori tetap dapat disesuaikan bila kebutuhan nyata muncul; gunakan konvensi auto-import Nuxt dengan sadar dan hindari barrel file yang tidak diperlukan.

## Supabase dan keamanan

- Gunakan project Supabase dev/staging terpisah yang dibuat melalui Supabase Dashboard; tidak membuat/menghubungkan project production untuk demo. Migration diterapkan melalui SQL Editor dashboard.
- Browser hanya menerima Supabase URL dan publishable key melalui runtime config publik. Publishable key bukan pengganti RLS.
- Secret key/service-role key tidak pernah dimasukkan ke browser, file contoh env, commit, atau log. Jika benar-benar dibutuhkan untuk operasi admin server-only, simpan di server runtime secret dan evaluasi apakah kebutuhan itu dapat dihindari.
- Gunakan Supabase Auth; akun dibuat manual, tanpa sign-up publik. Proteksi route di Nuxt untuk UX, dan tegakkan akses lagi pada database melalui RLS/grants.
- Aktifkan RLS pada semua tabel di schema yang diekspos. Set grants secara least-privilege, revoke akses `anon`, dan pisahkan policy untuk SELECT/INSERT/UPDATE/DELETE.
- Identitas admin dibatasi lewat tabel allowlist internal yang tidak terekspos (`app_admins` di `public` dengan seluruh akses client dicabut), yang hanya diisi operator melalui migration/SQL tepercaya. Policy memakai helper `SECURITY DEFINER` di schema non-exposed, dengan `search_path` kosong/dikunci dan execute grant minimum. Jangan memberikan akses tulis ke setiap akun `authenticated`.
- Policy database mencakup seluruh tabel, termasuk `app_settings` dan metadata file. Jangan mengandalkan frontend atau `user_metadata` yang dapat diedit pengguna untuk menentukan admin.
- Simpan skema, constraint, grants, RLS, trigger, dan index sebagai migration yang bisa direproduksi; hindari perubahan manual yang tidak dicatat.
- File `supabase/tests/authorization_rls.test.sql` berisi pemeriksaan dasar RLS, grants, bucket Storage, dan publication Realtime. Belum dijalankan melalui runner pgTAP.
- Gunakan generated `database.types.ts`, validasi input di UI dan database, prepared query melalui client SDK, serta tampilkan error yang tidak membocorkan rahasia.
- Aktifkan proteksi login yang tersedia pada Supabase Auth, validasi redirect URL secara ketat, dan gunakan HTTPS saat deployment.

## Storage dan file

- Gunakan bucket privat untuk PDF kontrak dan akses terotorisasi melalui Storage policies; jangan menyimpan URL publik untuk dokumen sensitif.
- Upload browser langsung ke Storage API dengan sesi pengguna dan publishable key; policies menjadi otorisasi server-side.
- Validasi allowlist MIME/ekstensi dan ukuran di UI serta bucket/server-side policy yang tersedia. MIME dari browser saja tidak dianggap tepercaya.
- SOP perusahaan menetapkan gambar JPEG/PNG/WebP maksimum 5 MB dan menganjurkan kompresi <1 MB; terapkan bila menyimpan logo/gambar. SOP melarang video mentah.
- Logo vendor: JPEG/PNG/WebP maksimal 5 MB per file; kompresi/resize client-side dianjurkan agar ukuran ideal <1 MB sesuai SOP.
- Dokumen kontrak: PDF saja, maksimal 50 MB per file sesuai keputusan scope project. Batas ini keputusan project, bukan batas yang tertulis di SOP perusahaan.
- Gunakan bucket privat; satu kontrak dapat memiliki beberapa lampiran. Version history khusus tidak dibuat, tetapi admin dapat menghapus lampiran melalui UI dengan konfirmasi.
- Simpan path object dan metadata minimum di DB; gunakan nama object UUID, signed URL dengan masa berlaku pendek untuk akses temporer bila diperlukan, dan cleanup saat penggantian/penghapusan.
- Operasi DB + Storage bersifat multi-langkah: upload PDF membersihkan object jika insert metadata gagal; penghapusan kontrak membersihkan object dan metadata sebelum row kontrak. Upload saat membuat kontrak dilakukan setelah row tersimpan; jika gagal, kontrak tetap ada dan UI menyediakan retry dari halaman detail.

## Realtime

- Gunakan Supabase Realtime untuk event perubahan baris pada tabel yang diperlukan, bukan menggantikan REST/Data API untuk initial load atau CRUD.
- Aktifkan publication hanya pada tabel yang dibutuhkan dan pastikan otorisasi/RLS untuk perubahan realtime sesuai identitas admin.
- Subscribe saat halaman relevan aktif, unsubscribe saat ditinggalkan, dan batasi payload ke data non-sensitif yang diperlukan.
- Event memicu refresh query daftar vendor/kontrak dan dashboard; tangani reconnect dengan refetch REST agar UI pulih dari event yang terlewat.
- Jangan mengasumsikan upload Storage otomatis menghasilkan event Postgres Realtime pada metadata file; proses metadata lewat REST.

## Nuxt SSR dan autentikasi

- Ikuti panduan `@nuxtjs/supabase`; gunakan dukungan SSR cookie jika render/server perlu mengenali sesi.
- Lindungi halaman dengan middleware/opsi redirect modul, tetapi anggap ini hanya route guard UX; RLS tetap batas otorisasi utama.
- Jangan membaca session hanya dari state client untuk mengamankan data server. Validasi identitas pada server bila endpoint server mengakses data sensitif.
- Sediakan state loading/error/unauthenticated yang eksplisit; jangan render data sensitif sebelum status sesi diketahui.

## Tailwind dan UI

- Gunakan Tailwind CSS utility untuk layout/responsiveness dan komponen Vue yang dapat dipakai ulang untuk pola UI konsisten.
- Pasang Tailwind melalui panduan resmi Nuxt yang sesuai versi Tailwind yang dipilih. Dokumentasi saat penyusunan memakai Vite plugin `@tailwindcss/vite` dan `@import "tailwindcss"`; bila menggunakan versi/plugin Nuxt lain, pilih satu integrasi resmi yang kompatibel.
- Sediakan label form, fokus keyboard, kontras memadai, dan state loading/empty/error/success.
- Jangan menyusun class dinamis yang tidak dapat dideteksi build-time; petakan variasi status ke class eksplisit.
- Bahasa ID/EN di header memakai dictionary key stabil, bukan terjemahan tersebar di template; simpan pilihan browser-side untuk MVP.

## SOP perusahaan yang diterapkan

- Kode dan nama identifier berbahasa Inggris; ikuti camelCase untuk variable/function dan snake_case database bila konsisten dengan SQL.
- Repository berisi `/docs`, `README.md`, `.gitignore`, `.env.example`.
- Dokumentasikan query/purpose schema, peran dan permission Supabase.
- `version.json` dan `CHANGELOG.md` di root. Untuk web, endpoint baca `GET /version` disediakan tanpa mengekspos secret.
- Single-repo tidak membutuhkan `/version-manifest` berdasarkan SOP versioning.
- `version.json` dan `CHANGELOG.md` diperbarui saat final push mengikuti baseline/revisi versi yang berlaku. Endpoint `/version` menyajikan metadata versi non-rahasia.
- Branch dan commit mengikuti SOP perusahaan bila Git remote/branch digunakan. Jangan membuat tag/push tanpa arahan/versi staging yang disepakati.
- `.env` lokal tidak di-commit; `.env.example` hanya berisi nama variable dan placeholder.

## Rujukan resmi

- Nuxt directory structure: https://nuxt.com/docs/4.x/directory-structure
- Nuxt pages/routing: https://nuxt.com/docs/4.x/directory-structure/app/pages
- Nuxt runtime config: https://nuxt.com/docs/4.x/guide/going-further/runtime-config
- Nuxt Supabase module: https://supabase.nuxtjs.org/getting-started/introduction
- Tailwind CSS Nuxt guide: https://tailwindcss.com/docs/installation/framework-guides/nuxt
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase database tests: https://supabase.com/docs/guides/local-development/testing/pgtap
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Realtime: https://supabase.com/docs/guides/realtime

Dokumentasi Nuxt/Tailwind/Supabase berubah dari waktu ke waktu. Cocokkan versi dan API dengan dependency yang terkunci di `package-lock.json`.
