# Product Requirements Document — Vendor & Contract Management

**Versi dokumen:** 0.2.0

## Ringkasan

Aplikasi latihan untuk mempelajari dan mendemonstrasikan pengelolaan vendor dan kontrak menggunakan Nuxt, Tailwind CSS, dan Supabase. Aplikasi mencakup CRUD, autentikasi admin, file privat, serta pembaruan data realtime.

CRUD menggunakan Supabase REST API melalui `supabase-js`. RLS melindungi tabel, Storage policies melindungi file, dan Supabase Realtime memperbarui daftar/dashboard yang berlangganan.

## Pengguna dan autentikasi

- Pengguna yang diizinkan: admin yang ditambahkan manual melalui Supabase Dashboard dan dicatat di `public.app_admins`.
- Supabase Auth mengelola login dan sesi. Tidak ada pendaftaran publik.
- Nuxt route middleware membantu mengarahkan pengguna; grants, RLS, Storage policies, dan allowlist admin di database adalah batas otorisasi.
- Tidak ada role viewer atau persetujuan bertingkat pada versi latihan ini.

## Fitur

### Dashboard

- Menampilkan jumlah vendor, kontrak aktif, dan kontrak aktif yang mendekati tanggal akhir.
- Menampilkan daftar maksimal lima kontrak yang perlu ditinjau berikut nama vendor dan tanggal akhir.
- Ambang berasal dari `app_settings.contract_expiry_notice_days`, nilai awal 90 hari. Admin dapat mengubahnya pada halaman `/settings` dengan bilangan bulat 1–3650 hari.
- Ambang hanya menentukan label/daftar tindak lanjut. Sistem tidak mengubah tanggal maupun status kontrak otomatis.
- Dashboard berlangganan ke perubahan tabel vendor, kontrak, dan pengaturan melalui Realtime.

### Vendor

- Field: kode vendor, nama perusahaan, kategori layanan, PIC, email PIC, telepon PIC, status, catatan, dan logo opsional.
- Kode vendor dimasukkan manual dan wajib unik. Nama perusahaan serta kategori layanan wajib; kontak, logo, dan catatan opsional.
- Status vendor: `under_review`, `active`, `inactive`.
- Admin dapat membuat, melihat daftar/detail, mencari, memfilter, mengedit, dan menghapus vendor.
- Vendor yang masih memiliki kontrak tidak dapat dihapus; admin dapat menonaktifkannya.
- Daftar menampilkan logo atau avatar inisial, nama/email perusahaan, kategori, jumlah kontrak, PIC/kontak, dan status.

### Kontrak

- Field: nomor kontrak, vendor, judul/ruang lingkup, tanggal mulai/akhir, nilai opsional, kode mata uang, status, PIC internal, catatan, dan lampiran PDF opsional.
- Nomor kontrak, vendor, judul, tanggal, status, dan PIC internal wajib. Nilai kontrak serta lampiran opsional.
- Tanggal mulai dan akhir ditentukan sendiri untuk setiap kontrak; `end_date` tidak boleh sebelum `start_date`.
- Mata uang menggunakan kode ISO yang tersedia di runtime, misalnya IDR/USD/JPY; kode disimpan bersama nilai. UI memformat nominal mengikuti locale dan mata uang.
- Status administratif: `draft`, `active`, `renewal_review`, `closed`, `cancelled`.
- Admin dapat membuat, melihat daftar/detail, mencari, memfilter, mengedit, dan menghapus kontrak dengan konfirmasi. Penghapusan permanen membersihkan object Storage dan metadata lampiran sebelum row kontrak.
- Daftar kontrak diperbarui oleh Realtime.

### File dan Storage

- Bucket privat `vendor-logos`: JPEG/PNG/WebP, maksimum 5 MiB. Kompresi gambar mengikuti SOP, idealnya di bawah 1 MiB.
- Bucket privat `contract-documents`: PDF, maksimum 50 MiB per file. Batas PDF ini keputusan project latihan, bukan batas dari SOP perusahaan.
- Logo tampil di tabel/detail vendor; jika belum ada, UI memakai inisial nama perusahaan.
- PDF dapat dipilih saat membuat kontrak atau diunggah dari halaman detail; lampiran yang sudah ada beserta preview tersedia di halaman edit dan detail.
- Jika pembuatan row kontrak berhasil tetapi upload PDF gagal, kontrak tetap tersimpan; UI memberi tahu admin untuk mengulangi upload dari halaman detail.
- Preview menggunakan signed URL sementara; file tidak disimpan sebagai URL publik.
- Version history dokumen tidak termasuk scope; lampiran yang salah dapat dihapus admin dari detail kontrak dengan dialog konfirmasi.

### Bahasa

- UI menyediakan Bahasa Indonesia dan Inggris lewat switch pada header panel admin dan login.
- Pilihan bahasa disimpan di browser untuk versi latihan ini.

## Aturan data dan keamanan

- `vendor_code` dan `contract_number` unik.
- Kontrak baru harus terhubung ke vendor aktif.
- Nilai kontrak tidak negatif. Bila nilai diisi, mata uang juga disimpan.
- Email PIC divalidasi jika diisi.
- RLS aktif pada setiap tabel yang diekspos. Policy admin memeriksa allowlist melalui helper database; frontend bukan sumber otorisasi.
- `anon` tidak diberi akses ke data aplikasi. Client memakai publishable key dan sesi; secret/service-role key tidak boleh masuk browser/repository.
- Storage policies membatasi akses file ke admin.
- Data demo harus fiktif; gunakan project Supabase dev/staging, bukan data production.

## Halaman

- `/login` — autentikasi admin.
- `/` — dashboard.
- `/vendors` — daftar, pencarian/filter, dan aksi vendor.
- `/vendors/new` — tambah vendor.
- `/vendors/[id]` — detail vendor dan kontrak terkait.
- `/vendors/[id]/edit` — edit vendor.
- `/contracts` — daftar, pencarian/filter, dan aksi kontrak.
- `/contracts/new` — tambah kontrak dan lampiran opsional.
- `/contracts/[id]` — detail kontrak, lampiran, dan preview PDF.
- `/contracts/[id]/edit` — edit kontrak dan lihat lampiran yang sudah ada.
- `/settings` — atur ambang pengingat kontrak.

## Kriteria penerimaan

- Hanya admin yang tercatat di allowlist `app_admins` yang dapat menggunakan operasi data; database dan Storage menolak akses yang tidak diizinkan.
- CRUD vendor/kontrak bekerja melalui Supabase REST API, termasuk aturan penghapusan dan validasi.
- Logo dan PDF mengikuti bucket, MIME, dan batas ukuran yang ditetapkan.
- Preview PDF menggunakan file privat; jika preview gagal, aksi buka/unduh tetap tersedia.
- Jika upload lampiran gagal setelah row kontrak berhasil dibuat, kontrak tetap tercatat dan UI menjelaskan langkah untuk mencoba upload kembali.
- Perubahan vendor/kontrak memperbarui daftar terkait dan dashboard tanpa refresh manual saat Realtime tersambung.
- Tampilan menyediakan state loading, kosong, validasi, error, dan sukses yang jelas serta UI Indonesia/Inggris.

## Batasan versi latihan

- Tidak ada email/notifikasi otomatis, workflow approval, pembayaran/invoice, multi-role, multi-tenant, atau integrasi sistem lain.
- Nilai pengingat default 90 hari berada di database dan dapat diubah melalui halaman Pengaturan.
