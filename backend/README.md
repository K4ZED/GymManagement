# Gym Management — Backend

Node.js + Express 5 + TypeScript + Prisma, autentikasi JWT (Bearer token).
Database: lokal **SQLite** (`prisma/dev.db`), deployment demo (Vercel) **PostgreSQL Supabase**.

`prisma/schema.prisma` (PostgreSQL) adalah satu-satunya sumber schema. Untuk lokal,
`scripts/sqlite-schema.js` membuat salinan `prisma/schema.sqlite.prisma` (jangan diedit, di-gitignore).

## Menjalankan (lokal)

```bash
cp .env.example .env          # isi JWT_SECRET
npm install
npm run db:local:setup        # buat tabel SQLite + data contoh
npm run dev                   # http://localhost:4000 (otomatis generate client SQLite)
npm run db:seed               # reset data demo kapan saja
```

Setelah mengubah `schema.prisma`: jalankan `npm run db:local:setup` lagi untuk lokal, lalu buat migrasi
PostgreSQL untuk Supabase:

```bash
npx prisma migrate diff --from-url "<session pooler>" --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<nama>/migration.sql
```

Catatan: pencarian teks memakai helper `containsInsensitive` (`src/lib/prisma.ts`) karena SQLite tidak
mendukung `mode: 'insensitive'`.

## Deployment (Vercel + Supabase)

`vercel.json` di root menjalankan backend sebagai service `backend` dan meneruskan `/api/*` ke sana.
Service Vercel tidak menyertakan `node_modules` ke function, jadi `npm run build` (`scripts/build.js`)
mem-bundle server + semua library jadi satu file `dist/server.js` (entrypoint service). Karena itu Prisma
untuk PostgreSQL memakai `engineType = "client"` + driver adapter `pg` (tanpa engine native); SQLite lokal
tetap memakai engine bawaan. Cek bundle: `npm run build && node dist/server.js`.
Environment variable di Vercel (service backend):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (port 6543) + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase session pooler (port 5432) |
| `JWT_SECRET` | string acak panjang (beda dari lokal) |
| `CORS_ORIGIN` | domain Vercel, mis. `https://nama-app.vercel.app` |

Migrasi & seed ke Supabase dijalankan dari laptop (bukan saat build). URL ada di `.env` lokal
(`SUPABASE_DIRECT_URL`). Seed **menghapus semua data** demo lalu mengisi ulang.

```bash
DATABASE_URL="<session pooler>" DIRECT_URL="<session pooler>" npm run db:supabase:migrate
DATABASE_URL="<session pooler>" DIRECT_URL="<session pooler>" npm run db:seed
npm run db:local:client       # kembalikan Prisma client ke SQLite untuk development
```

## Akun seed (password: `password123`)

| Email | Role |
|---|---|
| admin@gym.test | ADMIN |
| staff@gym.test | STAFF |
| trainer@gym.test | TRAINER |
| member@gym.test | MEMBER |

## Struktur

```
prisma/schema.prisma   model database (sumber utama, PostgreSQL)
prisma/migrations/     migrasi PostgreSQL (Supabase)
scripts/               generator schema SQLite untuk lokal
prisma/seed.ts         data contoh
src/app.ts             registrasi route
src/middleware/        auth (JWT, role) & error handler
src/routes/            satu file per resource
src/lib/               helper (http error, pagination, serializer, membership)
```

Kontrak API: lihat `../API_CONTRACT.md`.
