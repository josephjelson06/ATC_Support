import { MessageType, NotificationType, TicketEmailDirection, TicketEmailStatus, TicketStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { sendMail } from './mailer';
import { formatDisplayId } from '../utils/idPrefix';
import { badRequest, notFound, unauthorized } from '../utils/http';

type DbClient = Prisma.TransactionClient | typeof prisma;

type TicketForEmail = {
  id: number;
  title: string;
  description: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  emailThreadToken: string | null;
  status: TicketStatus;
  resolutionSummary: string | null;
  assignedToId: number | null;
  project: {
    name: string;
    assignedToId: number | null;
    client: {
      name: string;
    } | null;
  };
  chatSession?: {
    clientName: string;
    clientEmail: string;
  } | null;
};

type TicketMessageForEmail = {
  id: number;
  content: string;
};

type OutboundEmailInput = {
  ticket: TicketForEmail;
  subject: string;
  bodyText: string;
  createdById?: number | null;
  ticketMessageId?: number | null;
};

export const buildTicketThreadToken = () => randomUUID().replace(/-/g, '');

const THREAD_TOKEN_PATTERN = /\[ATC:([A-Za-z0-9]+)\]/i;

export const extractTicketThreadToken = (subject: string) => {
  const match = subject.match(THREAD_TOKEN_PATTERN);
  return match?.[1] || null;
};

const getTicketDisplayId = (ticketId: number) => formatDisplayId('TKT', ticketId);

const getTicketRecipient = (ticket: TicketForEmail) => {
  const name = ticket.requesterName || ticket.chatSession?.clientName || null;
  const email = ticket.requesterEmail || ticket.chatSession?.clientEmail || null;

  return {
    name,
    email,
  };
};

export const buildTicketEmailSubject = (ticket: Pick<TicketForEmail, 'id' | 'title' | 'emailThreadToken'>, lead: string) => {
  const ticketDisplayId = getTicketDisplayId(ticket.id);
  const threadSuffix = ticket.emailThreadToken ? ` [ATC:${ticket.emailThreadToken}]` : '';
  return `${lead} (${ticketDisplayId})${threadSuffix}`;
};

const buildTicketContextLine = (ticket: TicketForEmail) =>
  `${getTicketDisplayId(ticket.id)} | ${ticket.project.client?.name || 'Client'} | ${ticket.project.name}`;

const createOutboundTicketEmail = async (db: DbClient, input: OutboundEmailInput) => {
  const recipient = getTicketRecipient(input.ticket);

  if (!recipient.email) {
    return null;
  }

  const result = await sendMail({
    toEmail: recipient.email,
    toName: recipient.name,
    subject: input.subject,
    text: input.bodyText,
  });

  return db.ticketEmail.create({
    data: {
      ticketId: input.ticket.id,
      ticketMessageId: input.ticketMessageId,
      createdById: input.createdById ?? null,
      direction: TicketEmailDirection.OUTBOUND,
      status:
        result.status === 'SENT'
          ? TicketEmailStatus.SENT
          : result.status === 'FAILED'
            ? TicketEmailStatus.FAILED
            : TicketEmailStatus.LOGGED,
      subject: input.subject,
      bodyText: input.bodyText,
      fromName: env.MAIL_FROM_NAME,
      fromEmail: env.MAIL_FROM_EMAIL,
      toName: recipient.name,
      toEmail: recipient.email,
      providerMessageId: result.messageId,
      errorMessage: result.errorMessage,
      deliveredAt: result.deliveredAt,
    },
  });
};

export const sendTicketCreatedAcknowledgement = async (db: DbClient, ticket: TicketForEmail) => {
  const subject = buildTicketEmailSubject(ticket, 'We received your support request');
  const bodyText = [
    `Hello ${getTicketRecipient(ticket).name || 'there'},`,
    '',
    'Your support request has been received by ATC Support.',
    buildTicketContextLine(ticket),
    '',
    `Subject: ${ticket.title}`,
    ticket.description ? `Summary: ${ticket.description}` : null,
    '',
    'Reply to this email and keep the subject unchanged if you want to add more details.',
  ]
    .filter(Boolean)
    .join('\n');

  return createOutboundTicketEmail(db, {
    ticket,
    subject,
    bodyText,
  });
};

export const sendTicketReplyEmail = async (
  db: DbClient,
  input: {
    ticket: TicketForEmail;
    message: TicketMessageForEmail;
    senderName: string;
    attachmentNames?: string[];
    createdById?: number | null;
  },
) => {
  const subject = buildTicketEmailSubject(input.ticket, `Update on ${input.ticket.title}`);
  const bodyText = [
    `Hello ${getTicketRecipient(input.ticket).name || 'there'},`,
    '',
    `${input.senderName} replied to your ticket.`,
    buildTicketContextLine(input.ticket),
    '',
    input.message.content || '(No text message provided.)',
    input.attachmentNames?.length ? '' : null,
    input.attachmentNames?.length ? `Attachments: ${input.attachmentNames.join(', ')}` : null,
    '',
    'Reply to this email and keep the subject unchanged if you want to continue the conversation.',
  ]
    .filter(Boolean)
    .join('\n');

  return createOutboundTicketEmail(db, {
    ticket: input.ticket,
    subject,
    bodyText,
    createdById: input.createdById,
    ticketMessageId: input.message.id,
  });
};

export const sendWaitingOnCustomerEmail = async (
  db: DbClient,
  input: {
    ticket: TicketForEmail;
    note?: string | null;
    createdById?: number | null;
    actorName: string;
  },
) => {
  const subject = buildTicketEmailSubject(input.ticket, 'We need more information on your ticket');
  const bodyText = [
    `Hello ${getTicketRecipient(input.ticket).name || 'there'},`,
    '',
    `${input.actorName} marked your ticket as waiting on customer information.`,
    buildTicketContextLine(input.ticket),
    '',
    input.note || 'Please reply with any additional details that can help us continue.',
    '',
    'Reply to this email and keep the subject unchanged so your message threads back into the ticket.',
  ]
    .filter(Boolean)
    .join('\n');

  return createOutboundTicketEmail(db, {
    ticket: input.ticket,
    subject,
    bodyText,
    createdById: input.createdById,
  });
};

export const sendResolvedTicketEmail = async (
  db: DbClient,
  input: {
    ticket: TicketForEmail;
    createdById?: number | null;
    actorName: string;
  },
) => {
  const subject = buildTicketEmailSubject(input.ticket, 'Your ticket has been resolved');
  const bodyText = [
    `Hello ${getTicketRecipient(input.ticket).name || 'there'},`,
    '',
    `${input.actorName} marked your ticket as resolved.`,
    buildTicketContextLine(input.ticket),
    '',
    input.ticket.resolutionSummary || 'No resolution summary was provided.',
    '',
    'If the issue returns, reply to this email and keep the subject unchanged.',
  ]
    .filter(Boolean)
    .join('\n');

  return createOutboundTicketEmail(db, {
    ticket: input.ticket,
    subject,
    bodyText,
    createdById: input.createdById,
  });
};

export const sendReopenedTicketEmail = async (
  db: DbClient,
  input: {
    ticket: TicketForEmail;
    note?: string | null;
    createdById?: number | null;
    actorName: string;
  },
) => {
  const subject = buildTicketEmailSubject(input.ticket, 'Your ticket has been reopened');
  const bodyText = [
    `Hello ${getTicketRecipient(input.ticket).name || 'there'},`,
    '',
    `${input.actorName} reopened your ticket so we can continue working on it.`,
    buildTicketContextLine(input.ticket),
    '',
    input.note || 'We are reviewing the latest information on your request.',
    '',
    'You can reply to this email at any time while keeping the subject unchanged.',
  ]
    .filter(Boolean)
    .join('\n');

  return createOutboundTicketEmail(db, {
    ticket: input.ticket,
    subject,
    bodyText,
    createdById: input.createdById,
  });
};

export const handleInboundTicketEmail = async (
  db: typeof prisma,
  input: {
    fromEmail: string;
    fromName?: string | null;
    subject: string;
    text: string;
    threadToken?: string | null;
  },
) => {
  const threadToken = input.threadToken || extractTicketThreadToken(input.subject);

  if (!threadToken) {
    throw badRequest('Email subject does not contain a valid ATC thread token.');
  }

  const ticket = await db.ticket.findUnique({
    where: {
      emailThreadToken: threadToken,
    },
    include: {
      project: {
        include: {
          client: true,
        },
      },
      chatSession: true,
    },
  });

  if (!ticket) {
    throw notFound('Ticket for inbound email was not found.');
  }

  const expectedEmail = (ticket.requesterEmail || ticket.chatSession?.clientEmail || '').toLowerCase();

  if (expectedEmail && expectedEmail !== input.fromEmail.toLowerCase()) {
    throw unauthorized('Inbound email sender does not match the ticket requester.');
  }

  const createdAt = new Date();

  return db.$transaction(async (transaction) => {
    const customerMessage = await transaction.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: null,
        senderName: input.fromName?.trim() || ticket.requesterName || input.fromEmail,
        senderEmail: input.fromEmail.toLowerCase(),
        type: MessageType.REPLY,
        content: input.text.trim(),
      },
    });

    await transaction.ticketEmail.create({
      data: {
        ticketId: ticket.id,
        ticketMessageId: customerMessage.id,
        createdById: null,
        direction: TicketEmailDirection.INBOUND,
        status: TicketEmailStatus.RECEIVED,
        subject: input.subject,
        bodyText: input.text.trim(),
        fromName: input.fromName?.trim() || ticket.requesterName,
        fromEmail: input.fromEmail.toLowerCase(),
        toName: env.MAIL_FROM_NAME,
        toEmail: env.MAIL_FROM_EMAIL,
        deliveredAt: createdAt,
      },
    });

    let nextStatus = ticket.status;
    let shouldNotifyReply = false;
    let shouldNotifyReopen = false;

    if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER) {
      nextStatus = TicketStatus.IN_PROGRESS;
      shouldNotifyReply = true;
    } else if (ticket.status === TicketStatus.RESOLVED) {
      nextStatus = TicketStatus.REOPENED;
      shouldNotifyReopen = true;
    } else {
      shouldNotifyReply = true;
    }

    if (nextStatus !== ticket.status) {
      await transaction.ticket.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === TicketStatus.REOPENED ? null : ticket.resolvedAt,
          resolutionSummary: nextStatus === TicketStatus.REOPENED ? null : ticket.resolutionSummary,
        },
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: null,
          type: MessageType.SYSTEM,
          content:
            nextStatus === TicketStatus.REOPENED
              ? `customer replied by email; status changed to REOPENED`
              : `customer replied by email; status changed to IN_PROGRESS`,
        },
      });
    }

    const recipientUserIds = Array.from(new Set([ticket.assignedToId, ticket.project.assignedToId].filter((userId): userId is number => Boolean(userId))));

    if (shouldNotifyReopen && recipientUserIds.length > 0) {
      await transaction.notification.createMany({
        data: recipientUserIds.map((userId) => ({
          userId,
          type: NotificationType.TICKET_REOPENED,
          title: `Ticket reopened by customer reply: ${ticket.title}`,
          body: `${input.fromName?.trim() || input.fromEmail} replied by email and the ticket was reopened.`,
          link: `/agent/ticket/${ticket.id}`,
        })),
      });
    } else if (shouldNotifyReply && recipientUserIds.length > 0) {
      await transaction.notification.createMany({
        data: recipientUserIds.map((userId) => ({
          userId,
          type: NotificationType.TICKET_CUSTOMER_REPLIED,
          title: `Customer replied: ${ticket.title}`,
          body: `${input.fromName?.trim() || input.fromEmail} sent a reply by email.`,
          link: `/agent/ticket/${ticket.id}`,
        })),
      });
    }

    return {
      ticketId: ticket.id,
      ticketStatus: nextStatus,
      messageId: customerMessage.id,
    };
  });
};
