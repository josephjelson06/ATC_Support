import { ChatRole, ChatSessionStatus, KnowledgeStatus, TicketPriority } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { generateJuliaReply } from '../services/julia';
import { createWidgetTicket } from '../services/tickets';
import { buildJuliaReadiness } from '../utils/juliaReadiness';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { serializeTicket } from '../utils/serializers';
import { assertWidgetOriginAllowed, getWidgetProjectAccess } from '../utils/widgetAccess';

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

const getProjectByWidgetKey = async (req: Parameters<typeof assertWidgetOriginAllowed>[0], widgetKey: string) => {
  const project = await getWidgetProjectAccess(widgetKey);
  assertWidgetOriginAllowed(req, project);
  return project;
};

router.get(
  '/:widgetKey/faqs',
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req, req.params.widgetKey);
    const [faqs, publishedDocCount] = await Promise.all([
      prisma.faq.findMany({
        where: {
          projectId: project.id,
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      prisma.projectDoc.count({
        where: {
          projectId: project.id,
          status: KnowledgeStatus.PUBLISHED,
        },
      }),
    ]);
    const juliaReadiness = buildJuliaReadiness({
      status: project.status,
      widgetEnabled: project.widgetEnabled,
      allowedDomainCount: project.widgetAllowedDomains.length,
      faqCount: faqs.length,
      publishedDocCount,
      juliaFallbackMessage: project.juliaFallbackMessage,
      juliaEscalationHint: project.juliaEscalationHint,
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        widgetEnabled: project.widgetEnabled,
        juliaReadiness,
      },
      faqs,
    });
  }),
);

router.post(
  '/:widgetKey/chat/start',
  validate(startChatSchema),
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req, req.params.widgetKey);
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
    const project = await getProjectByWidgetKey(req, req.params.widgetKey);
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
    await getProjectByWidgetKey(req, req.params.widgetKey);
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
    const project = await getProjectByWidgetKey(req, req.params.widgetKey);
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
