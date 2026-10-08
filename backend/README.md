# Gym Management — Backend

Node.js + Express 5 + TypeScript + Prisma, autentikasi JWT (Bearer token).
Untuk demo, database memakai **SQLite** lokal (`prisma/dev.db`), tanpa server DB.

## Menjalankan

```bash
cp .env.example .env          # isi JWT_SECRET
npm install
npx prisma migrate dev        # buat tabel (file prisma/dev.db)
npm run db:seed               # data contoh (bisa diulang untuk reset demo)
npm run dev                   # http://localhost:4000
```

Pindah ke PostgreSQL nanti: ubah `provider` di `prisma/schema.prisma` ke `postgresql`, set `DATABASE_URL`,
hapus folder `prisma/migrations`, lalu `npx prisma migrate dev`. Tambahkan lagi `mode: 'insensitive'`
pada filter pencarian `contains` jika perlu pencarian case-insensitive di PostgreSQL.

## Akun seed (password: `password123`)

| Email | Role |
|---|---|
| admin@gym.test | ADMIN |
| staff@gym.test | STAFF |
| trainer@gym.test | TRAINER |
| member@gym.test | MEMBER |

## Struktur

```
prisma/schema.prisma   model database
prisma/seed.ts         data contoh
src/app.ts             registrasi route
src/middleware/        auth (JWT, role) & error handler
src/routes/            satu file per resource
src/lib/               helper (http error, pagination, serializer, membership)
```

Kontrak API: lihat `../API_CONTRACT.md`.
