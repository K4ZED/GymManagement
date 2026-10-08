import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { forbidden, HttpError, notFound, pageMeta, paginate, paginationSchema, parse } from '../lib/http';
import { isStaffOrAdmin, requireRole } from '../middleware/auth';

export const bookingsRouter = Router();

const bookingInclude = {
  session: { include: { trainer: { include: { user: { select: { name: true } } } } } },
  member: { include: { user: { select: { name: true } } } },
} as const;

type BookingFull = Awaited<ReturnType<typeof findBooking>>;
function findBooking(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

function serializeBooking(b: NonNullable<BookingFull>) {
  return {
    id: b.id,
    status: b.status,
    createdAt: b.createdAt,
    member: { id: b.member.id, memberCode: b.member.memberCode, name: b.member.user.name },
    session: {
      id: b.session.id,
      name: b.session.name,
      startAt: b.session.startAt,
      endAt: b.session.endAt,
      room: b.session.room,
      cancelledAt: b.session.cancelledAt,
      trainer: { id: b.session.trainer.id, name: b.session.trainer.user.name },
    },
  };
}

/** MEMBER otomatis hanya melihat booking miliknya; TRAINER hanya booking di kelasnya. */
bookingsRouter.get('/', async (req, res) => {
  const user = req.user!;
  const q = parse(
    paginationSchema.extend({
      memberId: z.string().optional(),
      sessionId: z.string().optional(),
      status: z.enum(['BOOKED', 'CANCELLED', 'ATTENDED']).optional(),
      upcoming: z.enum(['true', 'false']).optional(),
    }),
    req.query,
  );
  const where = {
    memberId: user.role === 'MEMBER' ? user.memberId! : q.memberId,
    sessionId: q.sessionId,
    status: q.status,
    session: {
      ...(user.role === 'TRAINER' && { trainerId: user.trainerId! }),
      ...(q.upcoming === 'true' && { startAt: { gte: new Date() } }),
    },
  };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { session: { startAt: q.upcoming === 'true' ? 'asc' : 'desc' } },
      ...paginate(q.page, q.limit),
    }),
    prisma.booking.count({ where }),
  ]);
  res.json({ data: items.map(serializeBooking), meta: pageMeta(q.page, q.limit, total) });
});

bookingsRouter.post('/:id/cancel', requireRole('ADMIN', 'STAFF', 'MEMBER'), async (req, res) => {
  const user = req.user!;
  const booking = await findBooking(String(req.params.id));
  if (!booking) throw notFound('Booking');
  if (user.role === 'MEMBER' && booking.memberId !== user.memberId) throw forbidden();
  if (booking.status !== 'BOOKED') throw new HttpError(422, 'INVALID_STATUS', `Booking berstatus ${booking.status}`);
  if (!isStaffOrAdmin(user) && booking.session.startAt <= new Date()) {
    throw new HttpError(422, 'CLASS_STARTED', 'Kelas sudah dimulai');
  }
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
  res.json({ data: serializeBooking((await findBooking(booking.id))!) });
});

/** Tandai hadir di kelas. TRAINER hanya untuk kelasnya sendiri. */
bookingsRouter.post('/:id/attend', requireRole('ADMIN', 'STAFF', 'TRAINER'), async (req, res) => {
  const user = req.user!;
  const booking = await findBooking(String(req.params.id));
  if (!booking) throw notFound('Booking');
  if (user.role === 'TRAINER' && booking.session.trainerId !== user.trainerId) throw forbidden();
  if (booking.status !== 'BOOKED') throw new HttpError(422, 'INVALID_STATUS', `Booking berstatus ${booking.status}`);
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'ATTENDED' } });
  res.json({ data: serializeBooking((await findBooking(booking.id))!) });
});
