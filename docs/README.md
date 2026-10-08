# Project Documentation

Dokumentasi untuk aplikasi latihan **Vendor & Contract Management**. Dokumen ini menjelaskan scope, model data, alur aplikasi, dan keputusan teknis untuk review Project Manager.

## Dokumen

- [Product Requirements Document](./prd.md) — tujuan, scope MVP, kebutuhan fungsional, dan kriteria penerimaan.
- [ERD](./erd.md) — entitas, kolom, relasi, dan aturan integritas data.
- [Flowcharts](./flowcharts.md) — alur autentikasi, CRUD, upload file, dan realtime.
- [Technical Decisions](./technical-decisions.md) — acuan Nuxt, Tailwind CSS, Supabase, security, dan SOP.
- [Migration Supabase](../supabase/migrations) — SQL schema, authorization, dan koreksi policy.

## Menjalankan migration

Project memakai Supabase Dashboard, bukan Supabase CLI lokal. File migration mencatat SQL yang diterapkan. Pada database yang sudah berisi data, jalankan hanya migration baru yang belum diterapkan; jangan jalankan ulang initial schema.
