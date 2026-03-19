import { ClientStatus, Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, conflict, parseId, notFound } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { serializeAmc, serializeClient, serializeProject } from '../utils/serializers';

const router = Router();

const createClientSchema = z.object({
  name: z.string().trim().min(2),
  industry: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email().optional(),
  website: z.string().trim().url().optional(),
  notes: z.string().trim().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

const updateClientSchema = createClientSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const status = req.query.status ? String(req.query.status) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const where: Prisma.ClientWhereInput = {
      ...(status ? { status: status as ClientStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { industry: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    const select = {
      id: true,
      name: true,
      industry: true,
      address: true,
      city: true,
      phone: true,
      email: true,
      website: true,
      notes: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          contacts: true,
          consignees: true,
          projects: true,
          amcs: true,
        },
      },
    } as const;

    if (pagination) {
      const [clients, total] = await prisma.$transaction([
        prisma.client.findMany({
          where,
          select,
          orderBy: {
            id: 'asc',
          },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.client.count({ where }),
      ]);

      res.json(createPaginatedResponse(clients.map((client) => serializeClient(client)), total, pagination));
      return;
    }

    const clients = await prisma.client.findMany({
      where,
      select,
      orderBy: {
        id: 'asc',
      },
    });

    res.json(clients.map((client) => serializeClient(client)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      include: {
        contacts: true,
        consignees: {
          include: {
            contacts: true,
          },
        },
        amcs: {
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
        },
        projects: {
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
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!client) {
      throw notFound('Client not found.');
    }

    res.json({
      ...serializeClient({
        id: client.id,
        name: client.name,
        industry: client.industry,
        address: client.address,
        city: client.city,
        phone: client.phone,
        email: client.email,
        website: client.website,
        notes: client.notes,
        status: client.status,
        createdAt: client.createdAt,
      }),
      contacts: client.contacts,
      consignees: client.consignees,
      amcs: client.amcs.map((amc) => serializeAmc(amc)),
      projects: client.projects.map((project) => serializeProject(project)),
    });
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createClientSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createClientSchema>;
    const client = await prisma.client.create({
      data: {
        name: payload.name,
        industry: payload.industry,
        address: payload.address,
        city: payload.city,
        phone: payload.phone,
        email: payload.email?.toLowerCase(),
        website: payload.website,
        notes: payload.notes,
        status: payload.status ?? ClientStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        industry: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        website: true,
        notes: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json(serializeClient(client));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateClientSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof updateClientSchema>;
    const client = await prisma.client.update({
      where: {
        id: clientId,
      },
      data: payload,
      select: {
        id: true,
        name: true,
        industry: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        website: true,
        notes: true,
        status: true,
        createdAt: true,
      },
    });

    res.json(serializeClient(client));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const [contactCount, consigneeCount, amcCount, projectCount] = await Promise.all([
      prisma.clientContact.count({
        where: {
          clientId,
        },
      }),
      prisma.consignee.count({
        where: {
          clientId,
        },
      }),
      prisma.amc.count({
        where: {
          clientId,
        },
      }),
      prisma.project.count({
        where: {
          clientId,
        },
      }),
    ]);

    const blockers = {
      contacts: contactCount,
      consignees: consigneeCount,
      amcs: amcCount,
      projects: projectCount,
    };

    if (Object.values(blockers).some((count) => count > 0)) {
      throw conflict('Delete blocked: remove linked contacts, consignees, AMCs, and projects first.', blockers);
    }

    await prisma.client.delete({
      where: {
        id: clientId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
