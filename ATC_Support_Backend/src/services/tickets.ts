import { ChatSessionStatus, MessageType, TicketPriority, TicketStatus } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { notifyNewWidgetTicket } from './notifications';
import { buildTicketThreadToken, sendTicketCreatedAcknowledgement } from './ticketEmails';
import { badRequest, notFound } from '../utils/http';
import { safeUserSelect } from '../utils/userModel';

type CreateWidgetTicketInput = {
  widgetKey: string;
  sessionId?: number;
  name: string;
  email: string;
  title: string;
  description?: string;
  priority?: TicketPriority;
};

export const createWidgetTicket = async (input: CreateWidgetTicketInput) => {
  const project = await prisma.project.findUnique({
    where: {
      widgetKey: input.widgetKey,
    },
    select: {
      id: true,
      name: true,
      widgetEnabled: true,
      assignedToId: true,
    },
  });

  if (!project) {
    throw notFound('Project not found.');
  }

  if (!project.widgetEnabled) {
    throw badRequest('This widget is disabled for the project.');
  }

  const chatSession = input.sessionId
    ? await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          projectId: project.id,
        },
        include: {
          ticket: true,
          messages: {
            where: {
              role: 'USER',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
      })
    : null;

  if (input.sessionId && !chatSession) {
    throw notFound('Chat session not found.');
  }

  if (chatSession?.ticket) {
    throw badRequest('A ticket already exists for this chat session.');
  }

  const fallbackDescription = chatSession?.messages
    .map((message) => message.content)
    .reverse()
    .join('\n\n');

  return prisma.$transaction(async (transaction) => {
    if (chatSession) {
      await transaction.chatSession.update({
        where: {
          id: chatSession.id,
        },
        data: {
          clientName: input.name,
          clientEmail: input.email,
          status: ChatSessionStatus.ESCALATED,
          endedAt: new Date(),
        },
      });
    }

    const ticket = await transaction.ticket.create({
      data: {
        projectId: project.id,
        chatSessionId: chatSession?.id,
        requesterName: input.name,
        requesterEmail: input.email.toLowerCase(),
        emailThreadToken: buildTicketThreadToken(),
        title: input.title,
        description: input.description?.trim() || fallbackDescription || `Support request for ${project.name}.`,
        source: 'WIDGET',
        priority: input.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.NEW,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: { select: safeUserSelect },
          },
        },
        assignedTo: { select: safeUserSelect },
        chatSession: true,
      },
    });

    await transaction.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: null,
        type: MessageType.SYSTEM,
        content: `Ticket created from widget escalation for ${input.name} (${input.email}).`,
      },
    });

    await notifyNewWidgetTicket(transaction, {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      projectName: project.name,
      priority: ticket.priority,
      clientName: input.name,
      projectSpecialistId: project.assignedToId,
    });

    await sendTicketCreatedAcknowledgement(transaction, ticket);

    return ticket;
  });
};
