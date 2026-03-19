import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const consigneeSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(5),
});

const updateConsigneeSchema = consigneeSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/clients/:id/consignees',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
        consignees: {
          include: {
            contacts: true,
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

    res.json(client.consignees);
  }),
);

router.post(
  '/clients/:id/consignees',
  requireRole(Role.PM),
  validate(consigneeSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof consigneeSchema>;
    const consignee = await prisma.consignee.create({
      data: {
        clientId,
        ...payload,
      },
    });

    res.status(201).json(consignee);
  }),
);

router.patch(
  '/consignees/:id',
  requireRole(Role.PM),
  validate(updateConsigneeSchema),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const payload = req.body as z.infer<typeof updateConsigneeSchema>;
    const consignee = await prisma.consignee.update({
      where: {
        id: consigneeId,
      },
      data: payload,
      include: {
        contacts: true,
      },
    });

    res.json(consignee);
  }),
);

router.delete(
  '/consignees/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');

    await prisma.consignee.delete({
      where: {
        id: consigneeId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
