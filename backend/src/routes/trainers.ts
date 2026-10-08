import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { forbidden, notFound, parse } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { serializeTrainer } from '../lib/serializers';

export const trainersRouter = Router();

trainersRouter.get('/', async (req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const trainers = await prisma.trainer.findMany({
    where: includeInactive === 'true' ? {} : { user: { isActive: true } },
    include: { user: true },
    orderBy: { user: { name: 'asc' } },
  });
  res.json({ data: trainers.map(serializeTrainer) });
});

trainersRouter.get('/:id', async (req, res) => {
  const trainer = await prisma.trainer.findUnique({ where: { id: String(req.params.id) }, include: { user: true } });
  if (!trainer) throw notFound('Trainer');
  res.json({ data: serializeTrainer(trainer) });
});

trainersRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().optional(),
      specialization: z.string().optional(),
      bio: z.string().optional(),
    }),
    req.body,
  );
  const trainer = await prisma.trainer.create({
    data: {
      specialization: body.specialization,
      bio: body.bio,
      user: {
        create: {
          name: body.name,
          email: body.email.toLowerCase(),
          phone: body.phone,
          role: 'TRAINER',
          passwordHash: await bcrypt.hash(body.password, 10),
        },
      },
    },
    include: { user: true },
  });
  res.status(201).json({ data: serializeTrainer(trainer) });
});

/** ADMIN bisa ubah semua field; TRAINER hanya profilnya sendiri (tanpa isActive). */
trainersRouter.patch('/:id', requireRole('ADMIN', 'TRAINER'), async (req, res) => {
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isAdmin && req.user!.trainerId !== String(req.params.id)) throw forbidden();
  const body = parse(
    z.object({
      name: z.string().min(1).optional(),
      phone: z.string().nullable().optional(),
      specialization: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }),
    req.body,
  );
  const { name, phone, isActive, ...profile } = body;
  const trainer = await prisma.trainer.update({
    where: { id: String(req.params.id) },
    data: { ...profile, user: { update: { name, phone, ...(isAdmin && { isActive }) } } },
    include: { user: true },
  });
  res.json({ data: serializeTrainer(trainer) });
});
