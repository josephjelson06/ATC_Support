import { AmcStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, badRequest, parseId } from '../utils/http';
import { serializeAmc } from '../utils/serializers';

const router = Router();

const dateSchema = z
  .string()
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), { message: 'Invalid date.' });

const createAmcSchema = z
  .object({
    projectId: z.number().int().positive().nullable().optional(),
    hoursIncluded: z.number().int().nonnegative(),
    hoursUsed: z.number().int().nonnegative().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    status: z.nativeEnum(AmcStatus).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  });

const updateAmcSchema = z
  .object({
    projectId: z.number().int().positive().nullable().optional(),
    hoursIncluded: z.number().int().nonnegative().optional(),
    hoursUsed: z.number().int().nonnegative().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    status: z.nativeEnum(AmcStatus).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

const assertProjectBelongsToClient = async (clientId: number, projectId: number | null | undefined) => {
  if (!projectId) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      clientId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw badRequest('Selected project does not belong to this client.');
  }
};

router.get(
  '/clients/:id/amcs',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const amcs = await prisma.amc.findMany({
      where: {
        clientId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(amcs.map((amc) => serializeAmc(amc)));
  }),
);

router.post(
  '/clients/:id/amcs',
  requireRole(Role.PM),
  validate(createAmcSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof createAmcSchema>;
    await assertProjectBelongsToClient(clientId, payload.projectId);
    const amc = await prisma.amc.create({
      data: {
        clientId,
        projectId: payload.projectId ?? null,
        hoursIncluded: payload.hoursIncluded,
        hoursUsed: payload.hoursUsed ?? 0,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status ?? AmcStatus.ACTIVE,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(serializeAmc(amc));
  }),
);

router.patch(
  '/amcs/:id',
  requireRole(Role.PM),
  validate(updateAmcSchema),
  asyncHandler(async (req, res) => {
    const amcId = parseId(req.params.id, 'amc id');
    const payload = req.body as z.infer<typeof updateAmcSchema>;
    const existingAmc = await prisma.amc.findUnique({
      where: {
        id: amcId,
      },
      select: {
        id: true,
        clientId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!existingAmc) {
      throw badRequest('AMC not found.');
    }

    await assertProjectBelongsToClient(existingAmc.clientId, payload.projectId);

    const nextStartDate = payload.startDate ?? existingAmc.startDate;
    const nextEndDate = payload.endDate ?? existingAmc.endDate;

    if (nextEndDate < nextStartDate) {
      throw badRequest('endDate must be on or after startDate.');
    }

    const amc = await prisma.amc.update({
      where: {
        id: amcId,
      },
      data: {
        ...payload,
        projectId: payload.projectId === undefined ? undefined : payload.projectId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    res.json(serializeAmc(amc));
  }),
);

router.delete(
  '/amcs/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const amcId = parseId(req.params.id, 'amc id');

    await prisma.amc.delete({
      where: {
        id: amcId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
