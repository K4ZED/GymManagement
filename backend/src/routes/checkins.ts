import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, HttpError, notFound, pageMeta, paginate, paginationSchema, parse } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { addDays, findActiveMembership, serializeMembership, startOfDay } from '../lib/membership';

export const checkinsRouter = Router();

const checkInInclude = {
  member: { include: { user: { select: { name: true } } } },
  checkedInBy: { select: { id: true, name: true } },
} as const;

function serializeCheckIn(c: {
  id: string;
  checkedInAt: Date;
  member: { id: string; memberCode: string; user: { name: string } };
  checkedInBy: { id: string; name: string } | null;
}) {
  return {
    id: c.id,
    checkedInAt: c.checkedInAt,
    member: { id: c.member.id, memberCode: c.member.memberCode, name: c.member.user.name },
    checkedInBy: c.checkedInBy,
  };
}

/** Check-in member di meja depan, pakai memberId atau memberCode. Wajib punya membership aktif. */
checkinsRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = parse(z.object({ memberId: z.string().optional(), memberCode: z.string().optional() }), req.body);
  if (!body.memberId && !body.memberCode) throw badRequest('memberId atau memberCode wajib diisi', 'VALIDATION_ERROR');

  const member = await prisma.member.findUnique({
    where: body.memberId ? { id: body.memberId } : { memberCode: body.memberCode!.toUpperCase() },
    include: { user: true },
  });
  if (!member) throw notFound('Member');
  if (!member.user.isActive) throw new HttpError(422, 'MEMBER_INACTIVE', 'Akun member dinonaktifkan');

  const active = await findActiveMembership(member.id);
  if (!active) throw new HttpError(422, 'NO_ACTIVE_MEMBERSHIP', 'Member tidak punya membership aktif');

  const checkIn = await prisma.checkIn.create({
    data: { memberId: member.id, checkedInById: req.user!.id },
    include: checkInInclude,
  });
  res.status(201).json({ data: { ...serializeCheckIn(checkIn), activeMembership: serializeMembership(active) } });
});

/** MEMBER otomatis hanya melihat riwayat miliknya. `date` (YYYY-MM-DD) menimpa from/to. */
checkinsRouter.get('/', requireRole('ADMIN', 'STAFF', 'MEMBER'), async (req, res) => {
  const user = req.user!;
  const q = parse(
    paginationSchema.extend({
      memberId: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }),
    req.query,
  );
  let from = q.from;
  let to = q.to;
  if (q.date) {
    from = startOfDay(new Date(`${q.date}T00:00:00`));
    to = addDays(from, 1);
  }
  const where = {
    memberId: user.role === 'MEMBER' ? user.memberId! : q.memberId,
    ...((from || to) && { checkedInAt: { ...(from && { gte: from }), ...(to && { lt: to }) } }),
  };
  const [items, total] = await Promise.all([
    prisma.checkIn.findMany({ where, include: checkInInclude, orderBy: { checkedInAt: 'desc' }, ...paginate(q.page, q.limit) }),
    prisma.checkIn.count({ where }),
  ]);
  res.json({ data: items.map(serializeCheckIn), meta: pageMeta(q.page, q.limit, total) });
});
