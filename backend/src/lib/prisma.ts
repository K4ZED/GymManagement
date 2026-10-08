import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Lokal memakai SQLite (DATABASE_URL "file:..."), deployment memakai PostgreSQL. */
const isSqlite = (process.env.DATABASE_URL ?? '').startsWith('file:');

/**
 * Filter `contains` tanpa membedakan huruf besar/kecil. PostgreSQL butuh `mode: 'insensitive'`;
 * SQLite tidak mendukung `mode`, tapi LIKE-nya sudah case-insensitive untuk huruf ASCII.
 */
export function containsInsensitive(value: string) {
  return (isSqlite ? { contains: value } : { contains: value, mode: 'insensitive' }) as { contains: string };
}
