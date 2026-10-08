import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { forbidden, HttpError } from '../lib/http';

export interface AuthUser {
  id: string;
  role: Role;
  memberId: string | null;
  trainerId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHORIZED', 'Token tidak ada');

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Token tidak valid atau kedaluwarsa');
  }

  const user = await prisma.user.findUnique({
    where: { id: String(payload.sub) },
    include: { member: { select: { id: true } }, trainer: { select: { id: true } } },
  });
  if (!user || !user.isActive) throw new HttpError(401, 'UNAUTHORIZED', 'Akun tidak aktif');

  req.user = { id: user.id, role: user.role, memberId: user.member?.id ?? null, trainerId: user.trainer?.id ?? null };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

export const isStaffOrAdmin = (user: AuthUser) => user.role === 'ADMIN' || user.role === 'STAFF';
