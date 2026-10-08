import type { Member, Membership, Plan, Trainer, User } from '@prisma/client';
import { serializeMembership } from './membership';

export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function serializeUser(u: User) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

type MemberWithRelations = Member & {
  user: Pick<User, 'name' | 'email' | 'phone' | 'isActive'>;
  memberships?: (Membership & { plan: Plan })[];
};

/** memberships yang di-include harus sudah difilter ke membership aktif (lihat activeMembershipInclude). */
export function serializeMember(m: MemberWithRelations) {
  const active = m.memberships?.[0];
  return {
    id: m.id,
    userId: m.userId,
    memberCode: m.memberCode,
    name: m.user.name,
    email: m.user.email,
    phone: m.user.phone,
    isActive: m.user.isActive,
    gender: m.gender,
    birthDate: m.birthDate,
    address: m.address,
    emergencyContact: m.emergencyContact,
    joinedAt: m.joinedAt,
    activeMembership: active ? serializeMembership(active) : null,
  };
}

export function activeMembershipInclude(now = new Date()) {
  return {
    where: { cancelledAt: null, startDate: { lte: now }, endDate: { gte: now } },
    include: { plan: true },
    orderBy: { endDate: 'desc' as const },
    take: 1,
  };
}

export function serializeTrainer(t: Trainer & { user: Pick<User, 'name' | 'email' | 'phone' | 'isActive'> }) {
  return {
    id: t.id,
    userId: t.userId,
    name: t.user.name,
    email: t.user.email,
    phone: t.user.phone,
    isActive: t.user.isActive,
    specialization: t.specialization,
    bio: t.bio,
  };
}
