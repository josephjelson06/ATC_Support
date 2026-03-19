import bcrypt from 'bcrypt';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { serializeUser } from '../utils/serializers';

const router = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus).optional(),
});

const updateUserSchema = createUserSchema
  .omit({
    password: true,
  })
  .extend({
    password: z.string().min(6).optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const role = req.query.role ? String(req.query.role) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const where: Prisma.UserWhereInput = {
      ...(role ? { role: role as Role } : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    if (pagination) {
      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          select: userSelect,
          orderBy: {
            id: 'asc',
          },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.user.count({ where }),
      ]);

      res.json(createPaginatedResponse(users.map((user) => serializeUser(user)), total, pagination));
      return;
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: {
        id: 'asc',
      },
    });

    res.json(users.map((user) => serializeUser(user)));
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createUserSchema>;
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role,
        status: payload.status ?? UserStatus.ACTIVE,
      },
      select: userSelect,
    });

    res.status(201).json(serializeUser(user));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.id, 'user id');
    const payload = req.body as z.infer<typeof updateUserSchema>;
    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.email !== undefined) {
      data.email = payload.email.toLowerCase();
    }

    if (payload.role !== undefined) {
      data.role = payload.role;
    }

    if (payload.status !== undefined) {
      data.status = payload.status;
    }

    if (payload.password !== undefined) {
      data.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: userSelect,
    });

    res.json(serializeUser(user));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.id, 'user id');

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
