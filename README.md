# Vendor & Contract Management

Aplikasi web latihan untuk mengelola data vendor dan kontrak secara terpusat. Aplikasi ini dibuat untuk mempraktikkan Nuxt 4, Tailwind CSS, dan Supabase, mencakup CRUD vendor dan kontrak, autentikasi admin, pengamanan data dengan RLS, pengelolaan logo dan dokumen kontrak melalui Supabase Storage, serta pembaruan data langsung menggunakan Supabase Realtime. Dashboard membantu memantau vendor, kontrak aktif, dan kontrak yang mendekati tanggal berakhir.

## Tech stack

- Nuxt 4 + TypeScript
- Tailwind CSS 4
- Supabase Auth, REST Data API, PostgreSQL RLS, Storage, dan Realtime

## Prasyarat

- Node.js 22 atau lebih baru (Nuxt docs merekomendasikan release LTS aktif).
- npm.
- Project Supabase dev/staging; jangan gunakan project/data production.

## Setup lokal

1. Buat project Supabase dev/staging lewat Dashboard. Gunakan data fiktif; jangan sambungkan aplikasi latihan ke data production.
2. Jalankan migration SQL di `supabase/migrations/` secara berurutan lewat SQL Editor. Jika initial migration sudah pernah dijalankan, jalankan hanya migration berikutnya yang belum diterapkan—jangan jalankan initial schema ulang.
3. Buat akun admin lewat Authentication di Dashboard, lalu tambahkan UUID akun ke `public.app_admins` lewat SQL Editor/operator database tepercaya. Aplikasi tidak menyediakan sign-up publik atau pengelolaan allowlist.
4. Install dependencies: `npm install`.
5. Salin `.env.example` menjadi `.env`, lalu isi Supabase Project URL dan publishable key. Jangan masukkan secret/service-role key ke client atau Git.
6. Jalankan `npm run dev` dan buka alamat yang dicetak Nuxt, biasanya `http://localhost:3000`.

## Run dan build

- Development: `npm run dev`
- Typecheck: `npm run typecheck`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Dokumentasi

Lihat [`docs/README.md`](./docs/README.md) untuk PRD, ERD, flowchart, dan keputusan teknis.

## Fitur utama

- Login admin dengan Supabase Auth.
- CRUD vendor dan kontrak melalui Supabase REST API; tabel dilindungi RLS.
- Logo vendor dan PDF kontrak menggunakan bucket privat Supabase Storage.
- Daftar dan dashboard diperbarui dengan Supabase Realtime.
- Ambang pengingat kontrak dapat diatur admin di menu Pengaturan (1–3650 hari).
- UI Bahasa Indonesia dan Inggris.

## Keamanan

- `.env` tidak boleh di-commit.
- Hanya Supabase publishable key yang boleh digunakan browser; secret/service-role key tidak boleh masuk ke client.
- RLS dan Storage policies wajib disiapkan sebelum memakai data aplikasi.
- Gunakan data demo fiktif pada instance Supabase dev/staging.
