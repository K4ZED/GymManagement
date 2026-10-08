import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { forbidden, notFound, pageMeta, paginate, paginationSchema, parse, HttpError } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { activeMembershipInclude, serializeMember } from '../lib/serializers';
import { activeMembershipWhere, addDays, serializeMembership } from '../lib/membership';

export const membersRouter = Router();

const optionalDate = z.coerce.date().nullable().optional();
const profileFields = {
  phone: z.string().nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE']).nullable().optional(),
  birthDate: optionalDate,
  address: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
};

async function nextMemberCode() {
  const last = await prisma.member.findFirst({ orderBy: { memberCode: 'desc' }, select: { memberCode: true } });
  const n = last ? Number(last.memberCode.replace(/\D/g, '')) + 1 : 1;
  return `GYM-${String(n).padStart(5, '0')}`;
}

/** Buat membership baru; jika startDate kosong, mulai hari ini atau setelah membership terakhir yang masih berjalan. */
async function createMembership(memberId: string, input: { planId: string; startDate?: Date; notes?: string }) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw notFound('Plan');
  if (!plan.isActive) throw new HttpError(422, 'PLAN_INACTIVE', 'Plan sudah tidak aktif');

  let startDate = input.startDate;
  if (!startDate) {
    const now = new Date();
    const latest = await prisma.membership.findFirst({
      where: { memberId, cancelledAt: null, endDate: { gte: now } },
      orderBy: { endDate: 'desc' },
    });
    startDate = latest ? latest.endDate : now;
  }
  const membership = await prisma.membership.create({
    data: {
      memberId,
      planId: plan.id,
      startDate,
      endDate: addDays(startDate, plan.durationDays),
      price: plan.price,
      notes: input.notes,
    },
    include: { plan: true },
  });
  return serializeMembership(membership);
}

function assertCanView(req: { user?: { role: string; memberId: string | null } }, memberId: string) {
  const u = req.user!;
  if (u.role === 'MEMBER' && u.memberId !== memberId) throw forbidden();
}

membersRouter.get('/', requireRole('ADMIN', 'STAFF', 'TRAINER'), async (req, res) => {
  const q = parse(
    paginationSchema.extend({
      q: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    }),
    req.query,
  );
  const where = {
    ...(q.q && {
      OR: [
        { memberCode: { contains: q.q } },
        { user: { name: { contains: q.q } } },
        { user: { email: { contains: q.q } } },
        { user: { phone: { contains: q.q } } },
      ],
    }),
    ...(q.status === 'ACTIVE' && { memberships: activeMembershipWhere() }),
    ...(q.status === 'INACTIVE' && { NOT: { memberships: activeMembershipWhere() } }),
  };
  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { user: true, memberships: activeMembershipInclude() },
      orderBy: { joinedAt: 'desc' },
      ...paginate(q.page, q.limit),
    }),
    prisma.member.count({ where }),
  ]);
  res.json({ data: items.map(serializeMember), meta: pageMeta(q.page, q.limit, total) });
});

membersRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      ...profileFields,
      planId: z.string().optional(),
      startDate: z.coerce.date().optional(),
    }),
    req.body,
  );
  const member = await prisma.member.create({
    data: {
      memberCode: await nextMemberCode(),
      gender: body.gender,
      birthDate: body.birthDate,
      address: body.address,
      emergencyContact: body.emergencyContact,
      user: {
        create: {
          name: body.name,
          email: body.email.toLowerCase(),
          phone: body.phone,
          role: 'MEMBER',
          passwordHash: await bcrypt.hash(body.password, 10),
        },
      },
    },
  });
  if (body.planId) await createMembership(member.id, { planId: body.planId, startDate: body.startDate });

  const full = await prisma.member.findUniqueOrThrow({
    where: { id: member.id },
    include: { user: true, memberships: activeMembershipInclude() },
  });
  res.status(201).json({ data: serializeMember(full) });
});

membersRouter.get('/:id', async (req, res) => {
  assertCanView(req, String(req.params.id));
  const member = await prisma.member.findUnique({
    where: { id: String(req.params.id) },
    include: { user: true, memberships: activeMembershipInclude() },
  });
  if (!member) throw notFound('Member');
  res.json({ data: serializeMember(member) });
});

const memberRestrictedFields = ['email', 'password', 'isActive'];

/** ADMIN/STAFF ubah semua field; MEMBER hanya profilnya sendiri dan tanpa email/password/isActive. */
membersRouter.patch('/:id', requireRole('ADMIN', 'STAFF', 'MEMBER'), async (req, res) => {
  if (req.user!.role === 'MEMBER') {
    assertCanView(req, String(req.params.id));
    const blocked = memberRestrictedFields.filter((f) => req.body && f in req.body);
    if (blocked.length) throw forbidden(`Member tidak boleh mengubah: ${blocked.join(', ')}`);
  }
  const body = parse(
    z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
      ...profileFields,
    }),
    req.body,
  );
  const { name, email, phone, isActive, password, ...profile } = body;
  const member = await prisma.member.update({
    where: { id: String(req.params.id) },
    data: {
      ...profile,
      user: {
        update: {
          name,
          phone,
          isActive,
          ...(email && { email: email.toLowerCase() }),
          ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
        },
      },
    },
    include: { user: true, memberships: activeMembershipInclude() },
  });
  res.json({ data: serializeMember(member) });
});

/** Soft delete: nonaktifkan akun member. */
membersRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const member = await prisma.member.update({
    where: { id: String(req.params.id) },
    data: { user: { update: { isActive: false } } },
    include: { user: true, memberships: activeMembershipInclude() },
  });
  res.json({ data: serializeMember(member) });
});

membersRouter.get('/:id/memberships', async (req, res) => {
  assertCanView(req, String(req.params.id));
  const items = await prisma.membership.findMany({
    where: { memberId: String(req.params.id) },
    include: { plan: true },
    orderBy: { startDate: 'desc' },
  });
  res.json({ data: items.map(serializeMembership) });
});

/** Daftar membership baru / perpanjangan. */
membersRouter.post('/:id/memberships', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = parse(
    z.object({ planId: z.string().min(1), startDate: z.coerce.date().optional(), notes: z.string().optional() }),
    req.body,
  );
  const exists = await prisma.member.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
  if (!exists) throw notFound('Member');
  res.status(201).json({ data: await createMembership(String(req.params.id), body) });
});
