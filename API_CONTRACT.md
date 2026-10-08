# API Contract — Gym Management

> Pemilik: @backend. Versi: **v0.3** (2026-10-08). Setiap perubahan endpoint dicatat di bagian **Changelog**.

## Umum

- Base URL: `http://localhost:4000/api`
- Format: JSON. Tanggal/waktu: ISO 8601 (`2026-10-08T07:00:00.000Z`). Uang: integer Rupiah (`300000`).
- Auth: header `Authorization: Bearer <token>` untuk semua endpoint kecuali `POST /auth/login` dan `GET /health`. Token berlaku 1 hari; jika `401` → arahkan ke login.
- CORS default mengizinkan `http://localhost:5173`.
- Menjalankan backend: lihat `backend/README.md` (SQLite lokal: sekali `npm run db:local:setup`, lalu `npm run dev`). `npm run db:seed` untuk reset data demo. Deployment Vercel memakai PostgreSQL Supabase; perilaku API sama.

### Bentuk respons

```jsonc
// sukses (objek)
{ "data": { ... } }
// sukses (list berpaginasi)
{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Data tidak valid", "details": [{ "path": "email", "message": "Invalid email" }] } }
```

Pagination query (endpoint yang punya `meta`): `page` (default 1), `limit` (default 20, maks 100).

### Kode error

| HTTP | code | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `BAD_REQUEST`, `INVALID_PASSWORD` | input salah (`details` berisi per-field) |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | token tidak ada/invalid, atau login gagal |
| 403 | `FORBIDDEN`, `ACCOUNT_INACTIVE` | role tidak berhak / akun nonaktif |
| 404 | `NOT_FOUND` | data tidak ada |
| 409 | `CONFLICT` | duplikat (mis. email sudah dipakai, sudah booking) |
| 422 | `CANNOT_DEACTIVATE_SELF`, `CLASS_HAS_BOOKINGS`, `NO_ACTIVE_MEMBERSHIP`, `MEMBER_INACTIVE`, `PLAN_INACTIVE`, `CLASS_FULL`, `CLASS_STARTED`, `CLASS_CANCELLED`, `CAPACITY_BELOW_BOOKINGS`, `INVALID_STATUS` | aturan bisnis ditolak |
| 500 | `INTERNAL_ERROR` | error server |

### Role

`ADMIN` (semua akses), `STAFF` (front desk: member, membership, check-in, jadwal kelas, dashboard), `TRAINER` (lihat jadwal & peserta kelasnya, tandai hadir), `MEMBER` (lihat data sendiri, booking kelas).

---

## Objek data

```ts
type Role = 'ADMIN' | 'STAFF' | 'TRAINER' | 'MEMBER';

interface User { id; email; name; phone: string|null; role: Role; isActive: boolean; createdAt; updatedAt }

interface Plan { id; name; description: string|null; durationDays: number; price: number; isActive: boolean; createdAt; updatedAt }

interface Membership {
  id; memberId; planId; startDate; endDate; price: number; notes: string|null; cancelledAt: string|null; createdAt;
  status: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'CANCELLED';   // dihitung server
  plan: Plan;
}

interface Member {
  id; userId; memberCode: string;            // contoh "GYM-00001"
  name; email; phone: string|null; isActive: boolean;
  gender: 'MALE'|'FEMALE'|null; birthDate: string|null; address: string|null; emergencyContact: string|null;
  joinedAt;
  activeMembership: Membership | null;       // null = tidak aktif
}

interface Trainer { id; userId; name; email; phone: string|null; isActive: boolean; specialization: string|null; bio: string|null }

interface ClassSession {
  id; name; description: string|null; startAt; endAt; capacity: number; room: string|null; cancelledAt: string|null;
  status: 'SCHEDULED' | 'ONGOING' | 'FINISHED' | 'CANCELLED';  // dihitung server
  trainer: { id; name };
  bookedCount: number; availableSlots: number;
  myBooking?: { id; status: BookingStatus } | null;            // hanya ada jika yang login MEMBER
}

type BookingStatus = 'BOOKED' | 'CANCELLED' | 'ATTENDED';
interface Booking {
  id; status: BookingStatus; createdAt;
  member: { id; memberCode; name };
  session: { id; name; startAt; endAt; room; cancelledAt; trainer: { id; name } };
}

interface CheckIn { id; checkedInAt; member: { id; memberCode; name }; checkedInBy: { id; name } | null }
```

---

## Endpoint

Kolom **Role**: siapa yang boleh. "Semua" = semua user yang login.

### Auth

| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | publik | body `{ email, password }` → `{ token, user: User }` |
| GET | `/auth/me` | Semua | `User & { member: Member\|null, trainer: Trainer\|null }` — pakai `member.id` / `trainer.id` untuk filter |
| PATCH | `/auth/me/password` | Semua | body `{ currentPassword, newPassword (min 8) }` → `{ success: true }` |

### Users (akun ADMIN/STAFF)

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/users` | ADMIN | query `role?`, `q?` (nama/email), pagination → `User[]` |
| POST | `/users` | ADMIN | body `{ name, email, password, phone?, role: 'ADMIN'\|'STAFF' }` → `User` (201) |
| PATCH | `/users/:id` | ADMIN | body `{ name?, phone?, isActive?, password? }` → `User`. `isActive: false` pada akun sendiri → 422 `CANNOT_DEACTIVATE_SELF` |

Akun TRAINER dan MEMBER dibuat lewat `/trainers` dan `/members`.

### Plans (paket membership)

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/plans` | Semua | hanya yang aktif. `?includeInactive=true` (ADMIN/STAFF) untuk semua → `Plan[]` (tanpa pagination) |
| GET | `/plans/:id` | Semua | `Plan` |
| POST | `/plans` | ADMIN | body `{ name, description?, durationDays, price, isActive? }` → `Plan` (201) |
| PATCH | `/plans/:id` | ADMIN | field sama, semua opsional |
| DELETE | `/plans/:id` | ADMIN | soft delete (`isActive=false`) → `Plan` |

### Members

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/members` | ADMIN, STAFF, TRAINER | query `q?` (nama/email/telepon/kode), `status?` = `ACTIVE`\|`INACTIVE` (punya/tidak punya membership aktif), pagination → `Member[]` |
| POST | `/members` | ADMIN, STAFF | body `{ name, email, password, phone?, gender?, birthDate?, address?, emergencyContact?, planId?, startDate? }` → `Member` (201). Jika `planId` diisi, langsung dibuatkan membership. |
| GET | `/members/:id` | Semua (MEMBER hanya dirinya) | `Member` |
| PATCH | `/members/:id` | ADMIN, STAFF, MEMBER (hanya dirinya) | ADMIN/STAFF: body `{ name?, email?, phone?, password?, isActive?, gender?, birthDate?, address?, emergencyContact? }`. MEMBER: hanya `{ name?, phone?, gender?, birthDate?, address?, emergencyContact? }`; id selain miliknya, atau body berisi `email`/`password`/`isActive` → 403 `FORBIDDEN`. → `Member`. (MEMBER ganti password lewat `PATCH /auth/me/password`.) |
| DELETE | `/members/:id` | ADMIN | soft delete (akun dinonaktifkan) → `Member` |
| GET | `/members/:id/memberships` | Semua (MEMBER hanya dirinya) | riwayat, terbaru dulu → `Membership[]` |
| POST | `/members/:id/memberships` | ADMIN, STAFF | **daftar / perpanjang**. body `{ planId, startDate?, notes? }` → `Membership` (201). Jika `startDate` kosong: mulai sekarang, atau tepat setelah membership berjalan berakhir (perpanjangan menyambung). `endDate = startDate + plan.durationDays`. |

### Memberships

| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/memberships/:id/cancel` | ADMIN | batalkan → `Membership` (status `CANCELLED`) |

### Trainers

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/trainers` | Semua | hanya yang aktif; `?includeInactive=true` untuk semua → `Trainer[]` (tanpa pagination) |
| GET | `/trainers/:id` | Semua | `Trainer` |
| POST | `/trainers` | ADMIN | body `{ name, email, password, phone?, specialization?, bio? }` → `Trainer` (201) |
| PATCH | `/trainers/:id` | ADMIN, TRAINER (diri sendiri) | body `{ name?, phone?, specialization?, bio?, isActive? (ADMIN saja) }` → `Trainer` |

### Classes (jadwal kelas)

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/classes` | Semua | query `from?` (default awal hari ini), `to?` (default from+7 hari), `trainerId?`, `includeCancelled?=true` → `ClassSession[]` urut `startAt` (tanpa pagination) |
| GET | `/classes/:id` | Semua | `ClassSession`; untuk ADMIN/STAFF/trainer kelas tsb ditambah `bookings: { id, status, createdAt, member: { id, memberCode, name } }[]` |
| POST | `/classes` | ADMIN, STAFF | body `{ name, description?, trainerId, startAt, endAt, capacity, room? }` → `ClassSession` (201) |
| PATCH | `/classes/:id` | ADMIN, STAFF | field sama, semua opsional. `capacity` tidak boleh < jumlah booking (`CAPACITY_BELOW_BOOKINGS`) |
| POST | `/classes/:id/cancel` | ADMIN, STAFF | batalkan kelas → `ClassSession` |
| DELETE | `/classes/:id` | ADMIN, STAFF | hapus permanen → `{ id, deleted: true }`. Hanya jika kelas belum pernah punya booking (termasuk booking `CANCELLED`); jika ada → 422 `CLASS_HAS_BOOKINGS` (pakai `/cancel`). |
| POST | `/classes/:id/bookings` | MEMBER, ADMIN, STAFF | booking. MEMBER: body kosong (untuk dirinya). ADMIN/STAFF: body `{ memberId }`. → `{ id, sessionId, memberId, status, createdAt, updatedAt }` (201). Error: `CLASS_FULL`, `CLASS_STARTED`, `CLASS_CANCELLED`, `NO_ACTIVE_MEMBERSHIP`, `CONFLICT` (sudah booking). |

### Bookings

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/bookings` | Semua | query `memberId?`, `sessionId?`, `status?`, `upcoming?=true` (hanya kelas mendatang, urut terdekat), pagination → `Booking[]`. MEMBER otomatis hanya miliknya; TRAINER hanya kelasnya. |
| POST | `/bookings/:id/cancel` | MEMBER (miliknya, sebelum kelas mulai), ADMIN, STAFF | → `Booking` |
| POST | `/bookings/:id/attend` | ADMIN, STAFF, TRAINER (kelasnya) | tandai hadir → `Booking` |

### Check-ins (kehadiran gym)

| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/checkins` | ADMIN, STAFF | body `{ memberId }` **atau** `{ memberCode }` → `CheckIn & { activeMembership: Membership }` (201). Error: `NO_ACTIVE_MEMBERSHIP`, `MEMBER_INACTIVE`, `NOT_FOUND`. |
| GET | `/checkins` | ADMIN, STAFF, MEMBER | query `memberId?`, `date?` (`YYYY-MM-DD`), atau `from?`/`to?`, pagination → `CheckIn[]` terbaru dulu. MEMBER otomatis hanya miliknya. |

### Dashboard

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/dashboard/summary` | ADMIN, STAFF | lihat contoh di bawah |
| GET | `/dashboard/expiring` | ADMIN, STAFF | query `days?` (default 7, maks 90) → `(Membership & { member: { id, memberCode, name, phone } })[]` urut `endDate` terdekat |

```json
{
  "data": {
    "totalMembers": 6,
    "activeMembers": 4,
    "expiringIn7Days": 1,
    "newMembersThisMonth": 2,
    "checkInsToday": 3,
    "classesToday": 3,
    "membershipRevenueThisMonth": 1100000,
    "checkInsLast7Days": [{ "date": "2026-10-02", "count": 2 }, "... 7 item, lama → baru"]
  }
}
```

`membershipRevenueThisMonth` = total harga membership yang dibuat bulan ini (modul pembayaran belum ada di v1).

### Lain-lain

| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | `{ status: 'ok', region }` (`region` = region Vercel, `local` di laptop) |

---

## Akun seed (password `password123`)

`admin@gym.test` (ADMIN), `staff@gym.test` (STAFF), `trainer@gym.test` (TRAINER), `member@gym.test` (MEMBER).

## Changelog

- **v0.3 (2026-10-08)** — (permintaan @frontend) tambah `DELETE /classes/:id` (ADMIN, STAFF): hapus permanen sesi kelas yang belum pernah punya booking, untuk "Urungkan" salin kelas. Ada booking → 422 `CLASS_HAS_BOOKINGS`.

- **v0.2 (2026-10-08)** — (permintaan @frontend)
  - `PATCH /members/:id` sekarang bisa dipanggil MEMBER untuk profilnya sendiri (field: `name, phone, gender, birthDate, address, emergencyContact`). Id lain atau field `email`/`password`/`isActive` → 403.
  - `PATCH /users/:id` dengan `isActive: false` pada akun sendiri → 422 `CANNOT_DEACTIVATE_SELF` (sebelumnya 400 `BAD_REQUEST`).

- **v0.1 (2026-10-08)** — versi awal: auth, users, plans, members & memberships (perpanjangan), trainers, classes & bookings, check-ins, dashboard. Pembayaran belum termasuk v1.
