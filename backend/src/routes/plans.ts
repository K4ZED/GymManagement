import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { notFound, parse } from '../lib/http';
import { isStaffOrAdmin, requireRole } from '../middleware/auth';

export const plansRouter = Router();

const planBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  durationDays: z.number().int().min(1),
  price: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

plansRouter.get('/', async (req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const showAll = includeInactive === 'true' && isStaffOrAdmin(req.user!);
  const plans = await prisma.plan.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: [{ durationDays: 'asc' }, { price: 'asc' }],
  });
  res.json({ data: plans });
});

plansRouter.get('/:id', async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: String(req.params.id) } });
  if (!plan) throw notFound('Plan');
  res.json({ data: plan });
});

plansRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const plan = await prisma.plan.create({ data: parse(planBody, req.body) });
  res.status(201).json({ data: plan });
});

plansRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const plan = await prisma.plan.update({ where: { id: String(req.params.id) }, data: parse(planBody.partial(), req.body) });
  res.json({ data: plan });
});

/** Soft delete: plan dinonaktifkan agar riwayat membership tetap utuh. */
plansRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const plan = await prisma.plan.update({ where: { id: String(req.params.id) }, data: { isActive: false } });
  res.json({ data: plan });
});
