import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { assertChatSessionAccess, chatSessionScopeForUser } from '../utils/access';
import { asyncHandler, parseId, notFound } from '../utils/http';
import { serializeChatSession, serializeTicketMessage } from '../utils/serializers';

const router = Router();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const chatSessions = await prisma.chatSession.findMany({
      where: chatSessionScopeForUser(req.user!),
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        ticket: {
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
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(chatSessions.map((chatSession) => serializeChatSession(chatSession)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const chatSessionId = parseId(req.params.id, 'chat session id');
    await assertChatSessionAccess(req.user!, chatSessionId);
    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id: chatSessionId,
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
        ticket: {
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
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chatSession) {
      throw notFound('Chat session not found.');
    }

    res.json({
      ...serializeChatSession(chatSession),
      messages: chatSession.messages.map((message) => serializeTicketMessage(message as never)),
    });
  }),
);

export default router;
