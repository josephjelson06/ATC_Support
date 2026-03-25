import { type Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { forbidden } from './http';
import { hasProjectScopedAccess, isSe2 } from './userModel';

const projectMembershipScopeForUser = (user: AuthenticatedUser): Prisma.ProjectWhereInput => ({
  OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
});

export const projectScopeForUser = (user: AuthenticatedUser): Prisma.ProjectWhereInput =>
  hasProjectScopedAccess(user) ? projectMembershipScopeForUser(user) : {};

export const clientScopeForUser = (user: AuthenticatedUser): Prisma.ClientWhereInput =>
  hasProjectScopedAccess(user)
    ? {
        projects: {
          some: projectMembershipScopeForUser(user),
        },
      }
    : {};

export const ticketScopeForUser = (user: AuthenticatedUser): Prisma.TicketWhereInput => {
  if (hasProjectScopedAccess(user)) {
    return {
      project: projectMembershipScopeForUser(user),
    };
  }

  if (isSe2(user)) {
    return {
      OR: [{ assignedToId: user.id }, { assignedToId: null }],
    };
  }

  return {};
};

export const chatSessionScopeForUser = (user: AuthenticatedUser): Prisma.ChatSessionWhereInput =>
  hasProjectScopedAccess(user)
    ? {
        project: projectMembershipScopeForUser(user),
      }
    : {};

export const assertProjectAccess = async (user: AuthenticatedUser, projectId: number) => {
  if (!hasProjectScopedAccess(user)) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectMembershipScopeForUser(user),
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
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...ticketScopeForUser(user),
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
  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      ...chatSessionScopeForUser(user),
    },
    select: {
      id: true,
    },
  });

  if (!chatSession) {
    throw forbidden('You do not have access to this chat session.');
  }
};

export const assertClientAccess = async (user: AuthenticatedUser, clientId: number) => {
  if (!hasProjectScopedAccess(user)) {
    return;
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...clientScopeForUser(user),
    },
    select: {
      id: true,
    },
  });

  if (!client) {
    throw forbidden('You do not have access to this client.');
  }
};
