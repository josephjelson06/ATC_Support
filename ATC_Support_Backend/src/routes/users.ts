import bcrypt from 'bcrypt';
import { AssignmentAuthority, Prisma, Role, ScopeMode, SupportLevel, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, notFound, parseId } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { parseSearchEntityId } from '../utils/search';
import { serializeUser } from '../utils/serializers';
import { normalizeUserAccessProfile, safeUserSelect } from '../utils/userModel';

const router = Router();

const userSelect = {
  ...safeUserSelect,
  projectMemberships: {
    include: {
      project: {
        select: {
          id: true,
          clientId: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      projectId: 'asc',
    },
  },
} as const;

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  supportLevel: z.nativeEnum(SupportLevel).nullable().optional(),
  scopeMode: z.nativeEnum(ScopeMode).optional(),
  assignmentAuthority: z.nativeEnum(AssignmentAuthority).optional(),
  projectIds: z.array(z.number().int().positive()).optional(),
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
    const searchId = parseSearchEntityId(search);
    const role = req.query.role ? String(req.query.role) : undefined;
    const supportLevel = req.query.supportLevel ? String(req.query.supportLevel) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const where: Prisma.UserWhereInput = {
      ...(role ? { role: role as Role } : {}),
      ...(supportLevel ? { supportLevel: supportLevel as SupportLevel } : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(projectId
        ? {
            projectMemberships: {
              some: {
                projectId,
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
              ...(searchId ? [{ id: searchId }] : []),
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
    const accessProfile = normalizeUserAccessProfile(payload);
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const projectIds = Array.from(new Set(payload.projectIds || []));
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase(),
          passwordHash,
          role: accessProfile.role,
          supportLevel: accessProfile.supportLevel,
          scopeMode: accessProfile.scopeMode,
          assignmentAuthority: accessProfile.assignmentAuthority,
          status: accessProfile.status,
          projectMemberships:
            projectIds.length > 0
              ? {
                  createMany: {
                    data: projectIds.map((projectId) => ({ projectId })),
                  },
                }
              : undefined,
        },
        select: userSelect,
      });

      return createdUser;
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
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
        supportLevel: true,
        scopeMode: true,
        assignmentAuthority: true,
        status: true,
      },
    });

    if (!existingUser) {
      throw notFound('User not found.');
    }

    const nextAccessProfile = normalizeUserAccessProfile({
      role: payload.role ?? existingUser.role,
      supportLevel: payload.supportLevel ?? existingUser.supportLevel,
      scopeMode: payload.scopeMode ?? existingUser.scopeMode,
      assignmentAuthority: payload.assignmentAuthority ?? existingUser.assignmentAuthority,
      status: payload.status ?? existingUser.status,
    });

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.email !== undefined) {
      data.email = payload.email.toLowerCase();
    }

    if (payload.role !== undefined) {
      data.role = nextAccessProfile.role;
    }

    if (payload.supportLevel !== undefined || payload.role !== undefined) {
      data.supportLevel = nextAccessProfile.supportLevel;
    }

    if (payload.scopeMode !== undefined || payload.role !== undefined || payload.supportLevel !== undefined) {
      data.scopeMode = nextAccessProfile.scopeMode;
    }

    if (payload.assignmentAuthority !== undefined || payload.role !== undefined || payload.supportLevel !== undefined) {
      data.assignmentAuthority = nextAccessProfile.assignmentAuthority;
    }

    if (payload.status !== undefined || payload.role !== undefined || payload.supportLevel !== undefined) {
      data.status = nextAccessProfile.status;
    }

    if (payload.password !== undefined) {
      data.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const projectIds = payload.projectIds ? Array.from(new Set(payload.projectIds)) : null;

    const user = await prisma.$transaction(async (transaction) => {
      if (projectIds) {
        await transaction.projectMember.deleteMany({
          where: {
            userId,
          },
        });

        if (projectIds.length > 0) {
          await transaction.projectMember.createMany({
            data: projectIds.map((projectId) => ({ userId, projectId })),
          });
        }
      }

      return transaction.user.update({
        where: {
          id: userId,
        },
        data,
        select: userSelect,
      });
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
