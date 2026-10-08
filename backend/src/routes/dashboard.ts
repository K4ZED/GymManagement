import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { parse } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { activeMembershipWhere, addDays, serializeMembership, startOfDay } from '../lib/membership';

export const dashboardRouter = Router();
dashboardRouter.use(requireRole('ADMIN', 'STAFF'));

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

dashboardRouter.get('/summary', async (_req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = addDays(today, -6);

  const [totalMembers, activeMembers, expiringIn7Days, newMembersThisMonth, checkInsToday, classesToday, revenue, recentCheckIns] =
    await Promise.all([
      prisma.member.count({ where: { user: { isActive: true } } }),
      prisma.member.count({ where: { memberships: activeMembershipWhere(now) } }),
      prisma.membership.count({ where: { cancelledAt: null, startDate: { lte: now }, endDate: { gte: now, lt: addDays(now, 7) } } }),
      prisma.member.count({ where: { joinedAt: { gte: monthStart } } }),
      prisma.checkIn.count({ where: { checkedInAt: { gte: today, lt: tomorrow } } }),
      prisma.classSession.count({ where: { cancelledAt: null, startAt: { gte: today, lt: tomorrow } } }),
      prisma.membership.aggregate({ _sum: { price: true }, where: { cancelledAt: null, createdAt: { gte: monthStart } } }),
      prisma.checkIn.findMany({ where: { checkedInAt: { gte: weekAgo } }, select: { checkedInAt: true } }),
    ]);

  const counts = new Map<string, number>();
  for (const c of recentCheckIns) counts.set(dateKey(c.checkedInAt), (counts.get(dateKey(c.checkedInAt)) ?? 0) + 1);
  const checkInsLast7Days = Array.from({ length: 7 }, (_, i) => {
    const key = dateKey(addDays(weekAgo, i));
    return { date: key, count: counts.get(key) ?? 0 };
  });

  res.json({
    data: {
      totalMembers,
      activeMembers,
      expiringIn7Days,
      newMembersThisMonth,
      checkInsToday,
      classesToday,
      membershipRevenueThisMonth: revenue._sum.price ?? 0,
      checkInsLast7Days,
    },
  });
});

/** Membership aktif yang akan habis dalam N hari (default 7), untuk follow-up perpanjangan. */
dashboardRouter.get('/expiring', async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(7) }), req.query);
  const now = new Date();
  const items = await prisma.membership.findMany({
    where: { cancelledAt: null, startDate: { lte: now }, endDate: { gte: now, lt: addDays(now, days) } },
    include: { plan: true, member: { include: { user: { select: { name: true, phone: true } } } } },
    orderBy: { endDate: 'asc' },
  });
  res.json({
    data: items.map(({ member, ...m }) => ({
      ...serializeMembership(m),
      member: { id: member.id, memberCode: member.memberCode, name: member.user.name, phone: member.user.phone },
    })),
  });
});
