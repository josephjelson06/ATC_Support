import { NotificationType, Role, TicketPriority } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

type NotificationPayload = {
  userIds: Array<number | null | undefined>;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  excludeUserId?: number | null;
};

const buildTicketLink = (ticketId: number) => `/agent/tickets/${ticketId}/summary`;

const createNotifications = async (db: DbClient, payload: NotificationPayload) => {
  const recipientIds = Array.from(
    new Set(payload.userIds.filter((userId): userId is number => Boolean(userId && userId > 0))),
  ).filter((userId) => userId !== payload.excludeUserId);

  if (recipientIds.length === 0) {
    return;
  }

  await db.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
    })),
  });
};

export const notifyNewWidgetTicket = async (
  db: DbClient,
  input: {
    ticketId: number;
    ticketTitle: string;
    projectName: string;
    priority: TicketPriority;
    clientName: string;
    projectLeadId?: number | null;
  },
) => {
  const supportEngineers = await db.user.findMany({
    where: {
      role: Role.SE,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  await createNotifications(db, {
    userIds: [...supportEngineers.map((user) => user.id), input.projectLeadId],
    type: NotificationType.TICKET_CREATED,
    title: `New widget ticket: ${input.ticketTitle}`,
    body: `${input.clientName} opened a ${input.priority.toLowerCase()} priority ticket in ${input.projectName}.`,
    link: buildTicketLink(input.ticketId),
  });
};

export const notifyTicketAssigned = async (
  db: DbClient,
  input: {
    ticketId: number;
    ticketTitle: string;
    assigneeId?: number | null;
    actorUserId?: number | null;
    actorName: string;
  },
) => {
  await createNotifications(db, {
    userIds: [input.assigneeId],
    type: NotificationType.TICKET_ASSIGNED,
    title: `Ticket assigned: ${input.ticketTitle}`,
    body: `${input.actorName} assigned you to this ticket.`,
    link: buildTicketLink(input.ticketId),
    excludeUserId: input.actorUserId,
  });
};

export const notifyTicketEscalated = async (
  db: DbClient,
  input: {
    ticketId: number;
    ticketTitle: string;
    projectLeadId?: number | null;
    actorUserId?: number | null;
    actorName: string;
  },
) => {
  await createNotifications(db, {
    userIds: [input.projectLeadId],
    type: NotificationType.TICKET_ESCALATED,
    title: `Ticket escalated: ${input.ticketTitle}`,
    body: `${input.actorName} escalated this ticket to project lead review.`,
    link: buildTicketLink(input.ticketId),
    excludeUserId: input.actorUserId,
  });
};

export const notifyTicketResolved = async (
  db: DbClient,
  input: {
    ticketId: number;
    ticketTitle: string;
    recipientUserIds: Array<number | null | undefined>;
    actorUserId?: number | null;
    actorName: string;
  },
) => {
  await createNotifications(db, {
    userIds: input.recipientUserIds,
    type: NotificationType.TICKET_RESOLVED,
    title: `Ticket resolved: ${input.ticketTitle}`,
    body: `${input.actorName} marked this ticket as resolved.`,
    link: buildTicketLink(input.ticketId),
    excludeUserId: input.actorUserId,
  });
};

export const notifyTicketReopened = async (
  db: DbClient,
  input: {
    ticketId: number;
    ticketTitle: string;
    recipientUserIds: Array<number | null | undefined>;
    actorUserId?: number | null;
    actorName: string;
  },
) => {
  await createNotifications(db, {
    userIds: input.recipientUserIds,
    type: NotificationType.TICKET_REOPENED,
    title: `Ticket reopened: ${input.ticketTitle}`,
    body: `${input.actorName} reopened this ticket and it needs attention again.`,
    link: buildTicketLink(input.ticketId),
    excludeUserId: input.actorUserId,
  });
};
