import { MessageType, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { assertTicketAccess } from '../utils/access';
import { asyncHandler, parseId } from '../utils/http';
import { serializeTicketMessage } from '../utils/serializers';

const router = Router();

const createTicketMessageSchema = z.object({
  content: z.string().trim().min(1),
  type: z.enum([MessageType.REPLY, MessageType.INTERNAL_NOTE]).default(MessageType.REPLY),
});

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

router.get(
  '/tickets/:id/messages',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId,
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages.map((message) => serializeTicketMessage(message)));
  }),
);

router.post(
  '/tickets/:id/messages',
  requireRole(Role.SE, Role.PL),
  validate(createTicketMessageSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof createTicketMessageSchema>;
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: req.user!.id,
        content: payload.content,
        type: payload.type,
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });

    res.status(201).json(serializeTicketMessage(message));
  }),
);

export default router;
