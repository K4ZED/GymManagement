import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { containsInsensitive, prisma } from '../lib/prisma';
import { HttpError, pageMeta, paginate, paginationSchema, parse } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { userPublicSelect } from '../lib/serializers';

/** Kelola akun internal (ADMIN/STAFF). Trainer & member punya endpoint sendiri. Khusus ADMIN. */
export const usersRouter = Router();
usersRouter.use(requireRole('ADMIN'));

usersRouter.get('/', async (req, res) => {
  const q = parse(
    paginationSchema.extend({
      role: z.enum(['ADMIN', 'STAFF', 'TRAINER', 'MEMBER']).optional(),
      q: z.string().optional(),
    }),
    req.query,
  );
  const where = {
    role: q.role,
    ...(q.q && {
      OR: [
        { name: containsInsensitive(q.q) },
        { email: containsInsensitive(q.q) },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: userPublicSelect, orderBy: { createdAt: 'desc' }, ...paginate(q.page, q.limit) }),
    prisma.user.count({ where }),
  ]);
  res.json({ data: items, meta: pageMeta(q.page, q.limit, total) });
});

usersRouter.post('/', async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().optional(),
      role: z.enum(['ADMIN', 'STAFF']),
    }),
    req.body,
  );
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      role: body.role,
      passwordHash: await bcrypt.hash(body.password, 10),
    },
    select: userPublicSelect,
  });
  res.status(201).json({ data: user });
});

usersRouter.patch('/:id', async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().min(1).optional(),
      phone: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    }),
    req.body,
  );
  if (String(req.params.id) === req.user!.id && body.isActive === false) {
    throw new HttpError(422, 'CANNOT_DEACTIVATE_SELF', 'Tidak bisa menonaktifkan akun sendiri');
  }
  const { password, ...rest } = body;
  const user = await prisma.user.update({
    where: { id: String(req.params.id) },
    data: { ...rest, ...(password && { passwordHash: await bcrypt.hash(password, 10) }) },
    select: userPublicSelect,
  });
  res.json({ data: user });
});
