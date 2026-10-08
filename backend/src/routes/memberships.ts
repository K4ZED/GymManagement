import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { conflict, notFound } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { serializeMembership } from '../lib/membership';

export const membershipsRouter = Router();

membershipsRouter.post('/:id/cancel', requireRole('ADMIN'), async (req, res) => {
  const existing = await prisma.membership.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Membership');
  if (existing.cancelledAt) throw conflict('Membership sudah dibatalkan');
  const m = await prisma.membership.update({
    where: { id: existing.id },
    data: { cancelledAt: new Date() },
    include: { plan: true },
  });
  res.json({ data: serializeMembership(m) });
});
