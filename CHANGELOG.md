# Changelog

Semua perubahan penting untuk **Vendor & Contract Management** dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0-beta.1] - 2026-10-08
### Added
- Implementasi autentikasi admin menggunakan Supabase Auth dan proteksi route.
- Tambah CRUD vendor dan kontrak menggunakan Supabase REST API.
- Tambah RLS, allowlist admin, Storage privat untuk logo/PDF, dan Supabase Realtime.
- Tambah dashboard administrasi, pencarian/filter, detail data, dan preview dokumen kontrak.
- Tambah pilihan bahasa Indonesia/Inggris, validasi form, dan dialog konfirmasi tindakan.
- Tambah struktur Nuxt 4, Tailwind CSS, dokumentasi MVP, migration, serta endpoint `GET /version`.

### Changed
- Perbarui tampilan menjadi panel administrasi dengan navigasi sidebar dan ringkasan dashboard.
- Format nilai kontrak berdasarkan locale dan mata uang yang dipilih.
- Tampilkan profil/logo vendor serta jumlah kontrak terkait pada daftar vendor.
- Gunakan upload resumable untuk dokumen PDF kontrak hingga 50 MB.

### Fixed
- Cegah penghapusan vendor yang masih memiliki kontrak melalui validasi aplikasi dan database.
- Perbaiki navigasi route detail/edit vendor dan kontrak.
- Perbaiki mismatch hydration pada judul halaman admin.
- Perbaiki status upload/simpan kontrak dan pemuatan preview PDF.
- Perbaiki perlindungan penghapusan vendor yang masih memiliki kontrak.
- Rapikan dropdown, formulir kontrak/vendor, dan tampilan dashboard/admin.
- Tambahkan preview logo vendor pada daftar, serta preview dan pengelolaan lampiran kontrak.
- Perbaiki hydration header agar teks awal server/client konsisten.
- Perbarui brand sidebar dengan logo SVG lokal.
- Tambahkan preview PDF saat edit kontrak dan perbaiki fallback loading preview.
- Perjelas dokumentasi MVP/ERD/flowchart agar cocok dengan alur aplikasi.
