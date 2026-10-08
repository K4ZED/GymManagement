import type { Membership, Plan } from '@prisma/client';
import { prisma } from './prisma';

export type MembershipStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'CANCELLED';

export function membershipStatus(m: Pick<Membership, 'startDate' | 'endDate' | 'cancelledAt'>, now = new Date()): MembershipStatus {
  if (m.cancelledAt) return 'CANCELLED';
  if (m.startDate > now) return 'UPCOMING';
  if (m.endDate < now) return 'EXPIRED';
  return 'ACTIVE';
}

export function serializeMembership(m: Membership & { plan?: Plan }) {
  return { ...m, status: membershipStatus(m) };
}

/** Membership aktif member saat ini (null jika tidak ada). */
export function findActiveMembership(memberId: string, now = new Date()) {
  return prisma.membership.findFirst({
    where: { memberId, cancelledAt: null, startDate: { lte: now }, endDate: { gte: now } },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  });
}

/** Filter Prisma untuk member yang punya membership aktif. */
export function activeMembershipWhere(now = new Date()) {
  return { some: { cancelledAt: null, startDate: { lte: now }, endDate: { gte: now } } };
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
