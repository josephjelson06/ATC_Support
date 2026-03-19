import { ChatRole, ChatSessionStatus, TicketPriority } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { generateJuliaReply } from '../services/julia';
import { createWidgetTicket } from '../services/tickets';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { serializeTicket } from '../utils/serializers';

const router = Router();

const startChatSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
});

const chatMessageSchema = z.object({
  sessionId: z.number().int().positive(),
  message: z.string().trim().min(1),
});

const escalateSchema = z.object({
  sessionId: z.number().int().positive().optional(),
  name: z.string().trim().min(2),
  email: z.string().email(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

const getProjectByWidgetKey = async (widgetKey: string) => {
  const project = await prisma.project.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      name: true,
      status: true,
      widgetEnabled: true,
    },
  });

  if (!project) {
    throw notFound('Widget project not found.');
  }

  if (project.status !== 'ACTIVE') {
    throw badRequest('This widget is not active.');
  }

  if (!project.widgetEnabled) {
    throw badRequest('This widget is disabled.');
  }

  return project;
};

router.get(
  '/:widgetKey/faqs',
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const faqs = await prisma.faq.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    res.json({
      project,
      faqs,
    });
  }),
);

router.post(
  '/:widgetKey/chat/start',
  validate(startChatSchema),
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const payload = req.body as z.infer<typeof startChatSchema>;
    const chatSession = await prisma.chatSession.create({
      data: {
        projectId: project.id,
        clientName: payload.name,
        clientEmail: payload.email,
        status: ChatSessionStatus.ACTIVE,
      },
    });

    res.status(201).json({
      sessionId: chatSession.id,
    });
  }),
);

router.post(
  '/:widgetKey/chat/message',
  validate(chatMessageSchema),
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const payload = req.body as z.infer<typeof chatMessageSchema>;
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: payload.sessionId,
        projectId: project.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!chatSession) {
      throw notFound('Chat session not found.');
    }

    if (chatSession.status !== ChatSessionStatus.ACTIVE) {
      throw badRequest('This chat session is no longer active.');
    }

    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: ChatRole.USER,
        content: payload.message,
      },
    });

    const conversation = await prisma.chatMessage.findMany({
      where: {
        chatSessionId: chatSession.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const { reply, sourceRefs } = await generateJuliaReply(project.id, conversation.map((message) => ({ role: message.role, content: message.content })));

    const juliaMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: ChatRole.JULIA,
        content: reply,
        sourceRefs,
      },
    });

    res.json({
      sessionId: chatSession.id,
      reply,
      message: juliaMessage,
    });
  }),
);

router.post(
  '/:widgetKey/escalate',
  validate(escalateSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof escalateSchema>;
    const ticket = await createWidgetTicket({
      widgetKey: req.params.widgetKey,
      sessionId: payload.sessionId,
      name: payload.name,
      email: payload.email,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
    });

    res.status(201).json(serializeTicket(ticket));
  }),
);

router.get(
  '/:widgetKey/chat/:sessionId',
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const sessionId = parseId(req.params.sessionId, 'session id');
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        projectId: project.id,
      },
      include: {
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

    res.json(chatSession);
  }),
);

export default router;
