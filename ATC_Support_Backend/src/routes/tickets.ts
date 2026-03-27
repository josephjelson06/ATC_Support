import { rm } from 'fs/promises';
import { MessageType, Prisma, Role, ScopeMode, TicketPriority, TicketStatus, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { notifyTicketAssigned, notifyTicketEscalated, notifyTicketReopened, notifyTicketResolved } from '../services/notifications';
import { sendReopenedTicketEmail, sendResolvedTicketEmail, sendWaitingOnCustomerEmail } from '../services/ticketEmails';
import { createWidgetTicket } from '../services/tickets';
import type { AuthenticatedUser } from '../types/auth';
import { assertTicketAccess, ticketScopeForUser } from '../utils/access';
import { asyncHandler, badRequest, forbidden, notFound, parseId } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { parseSearchEntityId } from '../utils/search';
import { serializeChatSession, serializeEscalationHistory, serializeTicket, serializeTicketEmail, serializeTicketMessage } from '../utils/serializers';
import { resolveTicketAttachmentPath } from '../utils/ticketAttachments';
import { canAssignTicketsToOthers, safeUserSelect } from '../utils/userModel';
import { assertWidgetOriginAllowed, getWidgetProjectAccess } from '../utils/widgetAccess';

const router = Router();

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
  emailEvents: {
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
      chatSession: true,
    },
  });

  if (!ticket) {
    throw notFound('Ticket not found.');
  }

  return ticket;
};

const assertTicketWorkflowPermission = (
  user: AuthenticatedUser | undefined,
  ticket: Awaited<ReturnType<typeof getTicketForWorkflow>>,
  options: {
    allowQueueRelease?: boolean;
    nextAssigneeId?: number | null;
  } = {},
) => {
  if (!user) {
    throw forbidden('You do not have permission to perform this action.');
  }

  if (user.role === Role.PM || canAssignTicketsToOthers(user)) {
    return;
  }

  if (options.nextAssigneeId === null) {
    if (options.allowQueueRelease && (ticket.assignedToId === user.id || ticket.assignedToId === null)) {
      return;
    }

    throw forbidden('You can only return your own tickets to the queue.');
  }

  const effectiveAssigneeId = options.nextAssigneeId ?? ticket.assignedToId ?? user.id;

  if (effectiveAssigneeId !== user.id) {
    throw forbidden('You can only work on tickets assigned to you.');
  }
};

const assertTicketAssigneeEligibility = async (
  ticket: Awaited<ReturnType<typeof getTicketForWorkflow>>,
  assigneeId: number,
) => {
  const assignee = await prisma.user.findUnique({
    where: {
      id: assigneeId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      scopeMode: true,
      status: true,
      projectMemberships: {
        where: {
          projectId: ticket.projectId,
        },
        select: {
          projectId: true,
        },
      },
    },
  });

  if (!assignee) {
    throw badRequest('assignedToId must reference an existing user.');
  }

  if (assignee.status !== UserStatus.ACTIVE) {
    throw badRequest('assignedToId must reference an active user.');
  }

  if (assignee.role === Role.SE && assignee.scopeMode === ScopeMode.PROJECT_SCOPED && assignee.projectMemberships.length === 0) {
    throw badRequest('Project-scoped engineers can only be assigned tickets from their linked projects.');
  }

  return assignee;
};

router.post(
  '/',
  validate(publicCreateTicketSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof publicCreateTicketSchema>;
    const project = await getWidgetProjectAccess(payload.widgetKey);
    assertWidgetOriginAllowed(req, project);
    const ticket = await createWidgetTicket(payload);
    res.status(201).json(serializeTicket(ticket));
  }),
);

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const searchId = parseSearchEntityId(search);
    const normalizedSearch = search.toUpperCase().replace(/\s+/g, '_');
    const matchedStatus = Object.values(TicketStatus).find((value) => value === normalizedSearch);
    const matchedPriority = Object.values(TicketPriority).find((value) => value === normalizedSearch);
    const status = req.query.status ? String(req.query.status) : undefined;
    const priority = req.query.priority ? String(req.query.priority) : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const assignedTo = req.query.assignedTo ? String(req.query.assignedTo).toLowerCase() : undefined;
    const createdWithinDays = req.query.createdWithinDays ? Number(req.query.createdWithinDays) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const createdAfter =
      Number.isFinite(createdWithinDays) && createdWithinDays && createdWithinDays > 0
        ? new Date(Date.now() - createdWithinDays * 24 * 60 * 60 * 1000)
        : null;

    const whereConditions: Prisma.TicketWhereInput[] = [ticketScopeForUser(req.user!)];

    if (status) {
      whereConditions.push({ status: status as TicketStatus });
    }

    if (priority) {
      whereConditions.push({ priority: priority as TicketPriority });
    }

    if (projectId) {
      whereConditions.push({ projectId });
    }

    if (clientId) {
      whereConditions.push({
        project: {
          clientId,
        },
      });
    }

    if (assignedTo === 'me') {
      whereConditions.push({ assignedToId: req.user!.id });
    } else if (assignedTo === 'unassigned') {
      whereConditions.push({ assignedToId: null });
    } else if (assignedTo === 'assigned') {
      whereConditions.push({
        assignedToId: {
          not: null,
        },
      });
    }

    if (createdAfter) {
      whereConditions.push({
        createdAt: {
          gte: createdAfter,
        },
      });
    }

    if (search) {
      whereConditions.push({
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { project: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { project: { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
          ...(searchId ? [{ id: searchId }] : []),
          ...(matchedStatus ? [{ status: matchedStatus }] : []),
          ...(matchedPriority ? [{ priority: matchedPriority }] : []),
        ],
      });
    }

    const where: Prisma.TicketWhereInput = whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions };

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
      emailEvents: ticket.emailEvents.map((emailEvent) => serializeTicketEmail(emailEvent)),
    });
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM, Role.SE),
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

router.delete(
  '/:id',
  requireRole(Role.PM, Role.SE),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);

    const attachments = await prisma.ticketAttachment.findMany({
      where: {
        ticketId,
      },
      select: {
        storedName: true,
      },
    });

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw notFound('Ticket not found.');
    }

    await prisma.ticket.delete({
      where: {
        id: ticketId,
      },
    });

    await Promise.allSettled(
      attachments.map((attachment) =>
        rm(resolveTicketAttachmentPath(attachment.storedName), {
          force: true,
        }),
      ),
    );

    res.status(204).send();
  }),
);

router.post(
  '/:id/assign',
  requireRole(Role.PM, Role.SE),
  validate(assignTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof assignTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be reassigned.');
    }

    const nextAssigneeId = payload.assignedToId === null ? null : payload.assignedToId ?? req.user!.id;
    assertTicketWorkflowPermission(req.user, ticket, {
      allowQueueRelease: true,
      nextAssigneeId,
    });

    if (nextAssigneeId !== null) {
      await assertTicketAssigneeEligibility(ticket, nextAssigneeId);
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextStatus = nextAssigneeId === null ? TicketStatus.NEW : ticket.status === TicketStatus.NEW ? TicketStatus.ASSIGNED : ticket.status;
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: nextAssigneeId,
          status: nextStatus,
          resolvedAt: null,
        },
        include: listInclude,
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: null,
          type: MessageType.SYSTEM,
          content:
            nextAssigneeId === null
              ? `ticket returned to queue by ${req.user!.name}; status changed to ${nextTicket.status}`
              : `ticket assigned to ${nextAssigneeId}; status changed to ${nextTicket.status}`,
        },
      });

      if (nextAssigneeId !== null) {
        await notifyTicketAssigned(transaction, {
          ticketId,
          ticketTitle: ticket.title,
          assigneeId: nextAssigneeId,
          actorUserId: req.user!.id,
          actorName: req.user!.name,
        });
      }

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/start',
  requireRole(Role.PM, Role.SE),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be started.');
    }

    const nextAssigneeId = ticket.assignedToId ?? req.user!.id;
    assertTicketWorkflowPermission(req.user, ticket, { nextAssigneeId });

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
  requireRole(Role.PM, Role.SE),
  validate(escalateTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof escalateTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be escalated.');
    }

    assertTicketWorkflowPermission(req.user, ticket);

    if (!ticket.project.assignedToId) {
      throw badRequest('This project is not assigned to a project specialist.');
    }

    await assertTicketAssigneeEligibility(ticket, ticket.project.assignedToId);

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
          content: `ticket escalated to project specialist${payload.note ? `: ${payload.note}` : ''}`,
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
        projectSpecialistId: ticket.project.assignedToId,
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
  requireRole(Role.PM, Role.SE),
  validate(waitOnCustomerTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof waitOnCustomerTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw badRequest('Resolved tickets cannot be moved to waiting on customer.');
    }

    assertTicketWorkflowPermission(req.user, ticket);

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

      await sendWaitingOnCustomerEmail(transaction, {
        ticket: {
          ...ticket,
          status: TicketStatus.WAITING_ON_CUSTOMER,
        },
        note: payload.note,
        createdById: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/reopen',
  requireRole(Role.PM, Role.SE),
  validate(reopenTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof reopenTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw badRequest('Only resolved tickets can be reopened.');
    }

    assertTicketWorkflowPermission(req.user, ticket);

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

      await sendReopenedTicketEmail(transaction, {
        ticket: {
          ...ticket,
          status: TicketStatus.REOPENED,
          resolutionSummary: null,
        },
        note: payload.note,
        createdById: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

router.post(
  '/:id/resolve',
  requireRole(Role.PM, Role.SE),
  validate(resolveTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof resolveTicketSchema>;
    const ticket = await getTicketForWorkflow(ticketId);
    assertTicketWorkflowPermission(req.user, ticket);

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

      await sendResolvedTicketEmail(transaction, {
        ticket: {
          ...ticket,
          status: TicketStatus.RESOLVED,
          resolutionSummary: payload.resolutionSummary,
        },
        createdById: req.user!.id,
        actorName: req.user!.name,
      });

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

export default router;
