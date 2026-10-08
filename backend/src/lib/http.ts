import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} tidak ditemukan`);
export const forbidden = (message = 'Akses ditolak') => new HttpError(403, 'FORBIDDEN', message);
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);
export const badRequest = (message: string, code = 'BAD_REQUEST') => new HttpError(400, code, message);

/** Validasi data dengan zod; ZodError ditangani errorHandler menjadi 400 VALIDATION_ERROR. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginate(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
