import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, parse } from '../lib/http';
import { authenticate, signToken } from '../middleware/auth';
import { activeMembershipInclude, serializeMember, serializeTrainer, serializeUser } from '../lib/serializers';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const body = parse(z.object({ email: z.string().email(), password: z.string().min(1) }), req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }
  if (!user.isActive) throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Akun dinonaktifkan');
  res.json({ data: { token: signToken(user.id, user.role), user: serializeUser(user) } });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    include: {
      member: { include: { user: true, memberships: activeMembershipInclude() } },
      trainer: { include: { user: true } },
    },
  });
  const { member, trainer, ...rest } = user;
  res.json({
    data: {
      ...serializeUser(rest),
      member: member ? serializeMember(member) : null,
      trainer: trainer ? serializeTrainer(trainer) : null,
    },
  });
});

authRouter.patch('/me/password', authenticate, async (req, res) => {
  const body = parse(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }), req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Password lama salah');
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 10) } });
  res.json({ data: { success: true } });
});
