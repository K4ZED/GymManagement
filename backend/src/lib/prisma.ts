import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** Lokal memakai SQLite (DATABASE_URL "file:..."), deployment memakai PostgreSQL. */
const isSqlite = (process.env.DATABASE_URL ?? '').startsWith('file:');

// PostgreSQL memakai driver adapter `pg` (schema: engineType = "client"); SQLite lokal memakai engine bawaan.
export const prisma = isSqlite
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) } as ConstructorParameters<
      typeof PrismaClient
    >[0]);

/**
 * Filter `contains` tanpa membedakan huruf besar/kecil. PostgreSQL butuh `mode: 'insensitive'`;
 * SQLite tidak mendukung `mode`, tapi LIKE-nya sudah case-insensitive untuk huruf ASCII.
 */
export function containsInsensitive(value: string) {
  return (isSqlite ? { contains: value } : { contains: value, mode: 'insensitive' }) as { contains: string };
}
