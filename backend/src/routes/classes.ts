import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, forbidden, HttpError, notFound, parse } from '../lib/http';
import { isStaffOrAdmin, requireRole, type AuthUser } from '../middleware/auth';
import { addDays, startOfDay } from '../lib/membership';

export const classesRouter = Router();

const activeBookingWhere = { status: { in: ['BOOKED', 'ATTENDED'] as ('BOOKED' | 'ATTENDED')[] } };

function sessionInclude(user: AuthUser) {
  return {
    trainer: { include: { user: { select: { name: true } } } },
    _count: { select: { bookings: { where: activeBookingWhere } } },
    ...(user.memberId && { bookings: { where: { memberId: user.memberId }, select: { id: true, status: true } } }),
  } satisfies Prisma.ClassSessionInclude;
}

type SessionWithIncludes = Prisma.ClassSessionGetPayload<{
  include: {
    trainer: { include: { user: { select: { name: true } } } };
    _count: { select: { bookings: true } };
  };
}> & { bookings?: { id: string; status: string }[] };

export function serializeSession(s: SessionWithIncludes, now = new Date()) {
  const status = s.cancelledAt ? 'CANCELLED' : s.endAt < now ? 'FINISHED' : s.startAt <= now ? 'ONGOING' : 'SCHEDULED';
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    startAt: s.startAt,
    endAt: s.endAt,
    capacity: s.capacity,
    room: s.room,
    cancelledAt: s.cancelledAt,
    status,
    trainer: { id: s.trainer.id, name: s.trainer.user.name },
    bookedCount: s._count.bookings,
    availableSlots: Math.max(0, s.capacity - s._count.bookings),
    ...(s.bookings && { myBooking: s.bookings[0] ?? null }),
  };
}

const sessionBody = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    trainerId: z.string().min(1),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    capacity: z.number().int().min(1),
    room: z.string().nullable().optional(),
  })
  .refine((v) => v.endAt > v.startAt, { message: 'endAt harus setelah startAt', path: ['endAt'] });

classesRouter.get('/', async (req, res) => {
  const q = parse(
    z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      trainerId: z.string().optional(),
      includeCancelled: z.enum(['true', 'false']).optional(),
    }),
    req.query,
  );
  const from = q.from ?? startOfDay();
  const to = q.to ?? addDays(from, 7);
  const sessions = await prisma.classSession.findMany({
    where: {
      startAt: { gte: from, lt: to },
      trainerId: q.trainerId,
      ...(q.includeCancelled !== 'true' && { cancelledAt: null }),
    },
    include: sessionInclude(req.user!),
    orderBy: { startAt: 'asc' },
  });
  res.json({ data: sessions.map((s) => serializeSession(s)) });
});

classesRouter.get('/:id', async (req, res) => {
  const user = req.user!;
  const session = await prisma.classSession.findUnique({ where: { id: String(req.params.id) }, include: sessionInclude(user) });
  if (!session) throw notFound('Kelas');

  const canSeeParticipants = isStaffOrAdmin(user) || (user.role === 'TRAINER' && user.trainerId === session.trainerId);
  const participants = canSeeParticipants
    ? (
        await prisma.booking.findMany({
          where: { sessionId: session.id },
          include: { member: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'asc' },
        })
      ).map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        member: { id: b.member.id, memberCode: b.member.memberCode, name: b.member.user.name },
      }))
    : undefined;

  res.json({ data: { ...serializeSession(session), ...(participants && { bookings: participants }) } });
});

classesRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = parse(sessionBody, req.body);
  if (!(await prisma.trainer.findUnique({ where: { id: body.trainerId } }))) throw notFound('Trainer');
  const session = await prisma.classSession.create({ data: body, include: sessionInclude(req.user!) });
  res.status(201).json({ data: serializeSession(session) });
});

classesRouter.patch('/:id', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = parse(sessionBody.innerType().partial(), req.body);
  const existing = await prisma.classSession.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Kelas');
  const startAt = body.startAt ?? existing.startAt;
  const endAt = body.endAt ?? existing.endAt;
  if (endAt <= startAt) throw badRequest('endAt harus setelah startAt', 'VALIDATION_ERROR');
  if (body.capacity !== undefined) {
    const booked = await prisma.booking.count({ where: { sessionId: existing.id, ...activeBookingWhere } });
    if (body.capacity < booked) throw new HttpError(422, 'CAPACITY_BELOW_BOOKINGS', `Sudah ada ${booked} booking`);
  }
  const session = await prisma.classSession.update({
    where: { id: existing.id },
    data: body,
    include: sessionInclude(req.user!),
  });
  res.json({ data: serializeSession(session) });
});

classesRouter.post('/:id/cancel', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const existing = await prisma.classSession.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Kelas');
  if (existing.cancelledAt) throw conflict('Kelas sudah dibatalkan');
  const session = await prisma.classSession.update({
    where: { id: existing.id },
    data: { cancelledAt: new Date() },
    include: sessionInclude(req.user!),
  });
  res.json({ data: serializeSession(session) });
});

/** Hapus permanen, hanya jika belum pernah ada booking (termasuk yang dibatalkan) agar riwayat tidak hilang. */
classesRouter.delete('/:id', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const existing = await prisma.classSession.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Kelas');
  const bookings = await prisma.booking.count({ where: { sessionId: existing.id } });
  if (bookings > 0) throw new HttpError(422, 'CLASS_HAS_BOOKINGS', `Kelas sudah punya ${bookings} booking, batalkan saja`);
  await prisma.classSession.delete({ where: { id: existing.id } });
  res.json({ data: { id: existing.id, deleted: true } });
});

/** Booking kelas. MEMBER booking untuk dirinya; ADMIN/STAFF wajib kirim memberId. */
classesRouter.post('/:id/bookings', requireRole('ADMIN', 'STAFF', 'MEMBER'), async (req, res) => {
  const user = req.user!;
  const body = parse(z.object({ memberId: z.string().optional() }), req.body ?? {});
  const memberId = user.role === 'MEMBER' ? user.memberId : body.memberId;
  if (!memberId) throw badRequest('memberId wajib diisi', 'VALIDATION_ERROR');
  if (user.role === 'MEMBER' && body.memberId && body.memberId !== user.memberId) throw forbidden();

  const booking = await prisma.$transaction(
    async (tx) => {
      const session = await tx.classSession.findUnique({ where: { id: String(req.params.id) } });
      if (!session) throw notFound('Kelas');
      if (session.cancelledAt) throw new HttpError(422, 'CLASS_CANCELLED', 'Kelas sudah dibatalkan');
      if (session.startAt <= new Date()) throw new HttpError(422, 'CLASS_STARTED', 'Kelas sudah dimulai');

      const hasMembership = await tx.membership.findFirst({
        where: { memberId, cancelledAt: null, startDate: { lte: session.startAt }, endDate: { gte: session.startAt } },
      });
      if (!hasMembership) {
        throw new HttpError(422, 'NO_ACTIVE_MEMBERSHIP', 'Member tidak punya membership aktif pada tanggal kelas');
      }

      const existing = await tx.booking.findUnique({ where: { sessionId_memberId: { sessionId: session.id, memberId } } });
      if (existing && existing.status !== 'CANCELLED') throw conflict('Member sudah booking kelas ini');

      const booked = await tx.booking.count({ where: { sessionId: session.id, ...activeBookingWhere } });
      if (booked >= session.capacity) throw new HttpError(422, 'CLASS_FULL', 'Kelas sudah penuh');

      return existing
        ? tx.booking.update({ where: { id: existing.id }, data: { status: 'BOOKED' } })
        : tx.booking.create({ data: { sessionId: session.id, memberId } });
    },
    { isolationLevel: 'Serializable' },
  );
  res.status(201).json({ data: booking });
});
