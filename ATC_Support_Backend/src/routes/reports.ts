import { TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { assertProjectAccess, ticketScopeForUser } from '../utils/access';
import { asyncHandler } from '../utils/http';
import { serializeTicket } from '../utils/serializers';

const router = Router();

const optionalDateSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined))
  .refine((value) => !value || !Number.isNaN(value.getTime()), {
    message: 'Invalid date.',
  });

const reportQuerySchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from must be before to.',
  });

router.get(
  '/tickets',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { projectId, status, from, to } = req.query as unknown as z.infer<typeof reportQuerySchema>;

    if (projectId) {
      await assertProjectAccess(req.user!, projectId);
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        ...ticketScopeForUser(req.user!),
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
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
        createdAt: 'desc',
      },
    });

    res.json(tickets.map((ticket) => serializeTicket(ticket)));
  }),
);

export default router;
