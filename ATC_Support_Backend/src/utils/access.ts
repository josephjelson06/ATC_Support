import { Role } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { forbidden } from './http';

export const projectScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL ? { assignedToId: user.id } : {};

export const ticketScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL
    ? {
        project: {
          assignedToId: user.id,
        },
      }
    : {};

export const chatSessionScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL
    ? {
        project: {
          assignedToId: user.id,
        },
      }
    : {};

export const assertProjectAccess = async (user: AuthenticatedUser, projectId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      assignedToId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw forbidden('You do not have access to this project.');
  }
};

export const assertTicketAccess = async (user: AuthenticatedUser, ticketId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      project: {
        assignedToId: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!ticket) {
    throw forbidden('You do not have access to this ticket.');
  }
};

export const assertChatSessionAccess = async (user: AuthenticatedUser, chatSessionId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      project: {
        assignedToId: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!chatSession) {
    throw forbidden('You do not have access to this chat session.');
  }
};
