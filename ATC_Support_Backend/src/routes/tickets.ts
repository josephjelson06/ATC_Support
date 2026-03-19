import { MessageType, Prisma, Role, TicketPriority, TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { notifyTicketAssigned, notifyTicketEscalated, notifyTicketReopened, notifyTicketResolved } from '../services/notifications';
import { createWidgetTicket } from '../services/tickets';
import { assertTicketAccess, ticketScopeForUser } from '../utils/access';
import { asyncHandler, badRequest, forbidden, notFound, parseId } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { serializeChatSession, serializeEscalationHistory, serializeTicket, serializeTicketMessage } from '../utils/serializers';

const router = Router();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const publicCreateTicketSchema = z.object({
  widgetKey: z.string().min(1),
  sessionId: z.number().int().positive().optional(),
  name: z.string().trim().min(2),
  email: z.string().email(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).optional(),
    description: z.string().trim().min(3).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    resolutionSummary: z.string().trim().min(3).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

const assignTicketSchema = z.object({
  assignedToId: z.number().int().positive().nullable().optional(),
});

const escalateTicketSchema = z.object({
  note: z.string().trim().min(3).optional(),
});

const waitOnCustomerTicketSchema = z.object({
  note: z.string().trim().min(3).optional(),
});

const reopenTicketSchema = z.object({
  note: z.string().trim().min(3).optional(),
});

const resolveTicketSchema = z.object({
  resolutionSummary: z.string().trim().min(3),
});

const listInclude = {
  project: {
    include: {
      client: true,
      assignedTo: {
        select: safeUserSelect,
      },
    },
  },
  assignedTo: {
    select: safeUserSelect,
  },
} as const;

const detailInclude = {
  ...listInclude,
  messages: {
    include: {
      user: {
        select: safeUserSelect,
      },
      attachments: {
        include: {
          uploadedBy: {
            select: safeUserSelect,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  chatSession: {
    include: {
      project: {
        include: {
          client: true,
          assignedTo: {
            select: safeUserSelect,
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  },
  escalationHistory: {
    include: {
      createdBy: {
        select: safeUserSelect,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

const getTicketForWorkflow = async (ticketId: number) => {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      project: {
        include: {
          client: true,
          assignedTo: {
            select: safeUserSelect,
          },
        },
      },
      assignedTo: {
        select: safeUserSelect,
      },
    },
  });

  if (!ticket) {
    throw notFound('Ticket not found.');
  }

  return ticket;
};

const createSystemMessage = (ticketId: number, content: string) =>
  prisma.ticketMessage.create({
    data: {
      ticketId,
      userId: null,
      type: MessageType.SYSTEM,
      content,
    },
  });

router.post(
  '/',
  validate(publicCreateTicketSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof publicCreateTicketSchema>;
    const ticket = await createWidgetTicket(payload);
    res.status(201).json(serializeTicket(ticket));
  }),
);

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const normalizedSearch = search.toUpperCase().replace(/\s+/g, '_');
    const matchedStatus = Object.values(TicketStatus).find((value) => value === normalizedSearch);
    const matchedPriority = Object.values(TicketPriority).find((value) => value === normalizedSearch);
    const status = req.query.status ? String(req.query.status) : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const where: Prisma.TicketWhereInput = {
      ...ticketScopeForUser(req.user!),
      ...(status ? { status: status as TicketStatus } : {}),
      ...(projectId ? { projectId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { project: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              { project: { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
              ...(matchedStatus ? [{ status: matchedStatus }] : []),
              ...(matchedPriority ? [{ priority: matchedPriority }] : []),
            ],
          }
        : {}),
    };

    if (pagination) {
      const [tickets, total] = await prisma.$transaction([
        prisma.ticket.findMany({
          where,
          include: listInclude,
          orderBy: {
            createdAt: 'desc',
          },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.ticket.count({ where }),
      ]);

      res.json(createPaginatedResponse(tickets.map((ticket) => serializeTicket(ticket)), total, pagination));
      return;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: listInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tickets.map((ticket) => serializeTicket(ticket)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: detailInclude,
    });

    if (!ticket) {
      throw notFound('Ticket not found.');
    }

    res.json({
      ...serializeTicket(ticket),
      messages: ticket.messages.map((message) => serializeTicketMessage(message)),
      chatSession: ticket.chatSession ? serializeChatSession(ticket.chatSession) : null,
      escalationHistory: ticket.escalationHistory.map((event) => serializeEscalationHistory(event)),
    });
  }),
);

router.patch(
  '/:id',
  requireRole(Role.SE, Role.PL),
  validate(updateTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof updateTicketSchema>;
    const updatedTicket = await prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        ...(payload.resolutionSummary !== undefined ? { resolutionSummary: payload.resolutionSummary } : {}),
      },
      include: listInclude,
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/assign',
  requireRole(Role.SE, Role.PL),
  validate(assignTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof assignTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be reassigned.');
    }

    const nextAssigneeId = payload.assignedToId ?? req.user!.id;

    if (req.user!.role === Role.PL && nextAssigneeId !== req.user!.id) {
      throw forbidden('Project leads can only assign tickets to themselves.');
    }

    const assignee = await prisma.user.findUnique({
      where: {
        id: nextAssigneeId,
      },
      select: {
        id: true,
      },
    });

    if (!assignee) {
      throw badRequest('assignedToId must reference an existing user.');
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: nextAssigneeId,
          status: ticket.status === TicketStatus.NEW ? TicketStatus.ASSIGNED : ticket.status,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `ticket assigned to ${nextAssigneeId}; status changed to ${nextTicket.status}`,
        },
      });

      await notifyTicketAssigned(transaction, {
        ticketId,
        ticketTitle: ticket.title,
        assigneeId: nextAssigneeId,
        actorUserId: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/start',
  requireRole(Role.SE, Role.PL),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be started.');
    }

    const nextAssigneeId = ticket.assignedToId ?? req.user!.id;

    if (req.user!.role === Role.PL && nextAssigneeId !== req.user!.id) {
      throw forbidden('Project leads can only start tickets assigned to themselves.');
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: nextAssigneeId,
          status: TicketStatus.IN_PROGRESS,
          resolvedAt: null,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `work started by ${req.user!.name}; status changed to IN_PROGRESS`,
        },
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/escalate',
  requireRole(Role.SE),
  validate(escalateTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof escalateTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be escalated.');
    }

    if (!ticket.project.assignedToId) {
      throw badRequest('This project is not assigned to a project lead.');
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: ticket.project.assignedToId,
          status: TicketStatus.ESCALATED,
          resolvedAt: null,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `ticket escalated to project lead${payload.note ? `: ${payload.note}` : ''}`,
        },
      });

      await transaction.escalationHistory.create({
        data: {
          ticketId,
          createdById: req.user!.id,
          fromStatus: ticket.status,
          toStatus: TicketStatus.ESCALATED,
          fromAssigneeId: ticket.assignedToId,
          toAssigneeId: ticket.project.assignedToId,
          note: payload.note,
        },
      });

      await notifyTicketEscalated(transaction, {
        ticketId,
        ticketTitle: ticket.title,
        projectLeadId: ticket.project.assignedToId,
        actorUserId: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/waiting-on-customer',
  requireRole(Role.SE, Role.PL),
  validate(waitOnCustomerTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof waitOnCustomerTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be moved to waiting on customer.');
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: ticket.assignedToId ?? req.user!.id,
          status: TicketStatus.WAITING_ON_CUSTOMER,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `ticket moved to WAITING_ON_CUSTOMER by ${req.user!.name}${payload.note ? `: ${payload.note}` : ''}`,
        },
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/reopen',
  requireRole(Role.SE, Role.PL),
  validate(reopenTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof reopenTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw badRequest('Only resolved tickets can be reopened.');
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: ticket.assignedToId ?? req.user!.id,
          status: TicketStatus.REOPENED,
          resolutionSummary: null,
          resolvedAt: null,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `ticket reopened by ${req.user!.name}${payload.note ? `: ${payload.note}` : ''}`,
        },
      });

      await notifyTicketReopened(transaction, {
        ticketId,
        ticketTitle: ticket.title,
        recipientUserIds: [ticket.assignedToId, ticket.project.assignedToId],
        actorUserId: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/resolve',
  requireRole(Role.SE, Role.PL),
  validate(resolveTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof resolveTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: ticket.assignedToId ?? req.user!.id,
          status: TicketStatus.RESOLVED,
          resolutionSummary: payload.resolutionSummary,
          resolvedAt: new Date(),
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content: `ticket resolved by ${req.user!.name}`,
        },
      });

      await notifyTicketResolved(transaction, {
        ticketId,
        ticketTitle: ticket.title,
        recipientUserIds: [ticket.assignedToId, ticket.project.assignedToId],
        actorUserId: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

export default router;
