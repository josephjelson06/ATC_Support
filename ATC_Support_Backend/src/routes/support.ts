import {
  HardwareCategory,
  KnowledgeStatus,
  MessageType,
  SupportSessionMessageRole,
  SupportSessionSource,
  SupportSessionStatus,
  SupportType,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { generateSupportSessionReply } from '../services/julia';
import { buildTicketThreadToken, sendTicketCreatedAcknowledgement } from '../services/ticketEmails';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { parseSearchEntityId } from '../utils/search';
import {
  serializeClient,
  serializeHardwareAsset,
  serializeProject,
  serializeSupportSession,
  serializeSupportSessionMessage,
  serializeSupportTopic,
  serializeTicket,
} from '../utils/serializers';
import { assertWidgetOriginAllowed, getWidgetProjectAccess } from '../utils/widgetAccess';

const router = Router();

const supportTypeSchema = z.nativeEnum(SupportType).optional().default(SupportType.GENERAL);

const startSupportSessionSchema = z.object({
  widgetKey: z.string().trim().min(1).optional(),
  clientId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  hardwareAssetId: z.number().int().positive().optional(),
  selectedTopicId: z.number().int().positive().optional(),
  supportType: supportTypeSchema,
  requesterName: z.string().trim().min(2).optional(),
  requesterEmail: z.string().email().optional(),
  requesterPhone: z.string().trim().min(5).optional(),
  issueSummary: z.string().trim().min(3).optional(),
});

const messageSchema = z.object({
  message: z.string().trim().min(1),
});

const endSessionSchema = z.object({
  supportSummary: z.string().trim().min(3).optional(),
});

const escalateSessionSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  supportSummary: z.string().trim().min(3).optional(),
});

const getClientLookupWhere = (clientLookup?: string) => {
  const search = clientLookup?.trim();

  if (!search) {
    return undefined;
  }

  const searchId = parseSearchEntityId(search);

  return {
    OR: [
      ...(searchId ? [{ id: searchId }] : []),
      { email: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
      {
        contacts: {
          some: {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        },
      },
    ],
  };
};

const buildTopicWhere = (input: {
  supportType?: SupportType;
  clientId?: number | null;
  projectId?: number | null;
  hardwareAssetId?: number | null;
  hardwareCategory?: HardwareCategory | null;
}) => {
  const scopedWhere = [
    { scope: 'GLOBAL' as const },
    ...(input.supportType === SupportType.HARDWARE ? [{ scope: 'HARDWARE_CATEGORY' as const }] : []),
    ...(input.clientId ? [{ clientId: input.clientId }] : []),
    ...(input.projectId ? [{ projectId: input.projectId }] : []),
    ...(input.hardwareAssetId ? [{ hardwareAssetId: input.hardwareAssetId }] : []),
    ...(input.hardwareCategory ? [{ hardwareCategory: input.hardwareCategory }] : []),
  ];

  return {
    status: KnowledgeStatus.PUBLISHED,
    supportType: {
      in: [SupportType.GENERAL, input.supportType || SupportType.GENERAL],
    },
    OR: scopedWhere,
  };
};

const supportSessionInclude = {
  client: true,
  project: {
    include: {
      client: true,
    },
  },
  hardwareAsset: {
    include: {
      client: true,
      project: true,
      amc: true,
      hardwareModel: {
        include: {
          hardwareBrand: true,
        },
      },
    },
  },
  selectedTopic: true,
  messages: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  ticket: {
    include: {
      client: true,
      project: {
        include: {
          client: true,
        },
      },
      hardwareAsset: true,
    },
  },
} as const;

router.get(
  '/context',
  asyncHandler(async (req, res) => {
    const widgetKey = req.query.widgetKey ? String(req.query.widgetKey) : undefined;
    const clientLookup = req.query.clientLookup ? String(req.query.clientLookup) : undefined;
    const supportType = req.query.supportType && Object.values(SupportType).includes(String(req.query.supportType) as SupportType)
      ? (String(req.query.supportType) as SupportType)
      : SupportType.GENERAL;

    let project = null;
    let client = null;

    if (widgetKey) {
      const widgetProject = await getWidgetProjectAccess(widgetKey);
      assertWidgetOriginAllowed(req, widgetProject);
      project = await prisma.project.findUnique({
        where: {
          id: widgetProject.id,
        },
        include: {
          client: true,
        },
      });
      client = project?.client ?? null;
    } else if (clientLookup) {
      client = await prisma.client.findFirst({
        where: getClientLookupWhere(clientLookup),
      });
    }

    const [clientDetail, topics, faqs] = await Promise.all([
      client
        ? prisma.client.findUnique({
            where: {
              id: client.id,
            },
            include: {
              projects: {
                where: {
                  status: 'ACTIVE',
                },
                orderBy: {
                  name: 'asc',
                },
              },
              hardwareAssets: {
                where: {
                  status: 'ACTIVE',
                },
                include: {
                  project: true,
                  amc: true,
                  hardwareModel: {
                    include: {
                      hardwareBrand: true,
                    },
                  },
                },
                orderBy: [{ category: 'asc' }, { id: 'asc' }],
              },
              amcs: true,
            },
          })
        : null,
      prisma.supportTopic.findMany({
        where: buildTopicWhere({
          supportType,
          clientId: client?.id,
          projectId: project?.id,
        }),
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      project
        ? prisma.faq.findMany({
            where: {
              projectId: project.id,
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          })
        : [],
    ]);

    res.json({
      mode: widgetKey ? 'PROJECT_WIDGET' : 'GENERAL_WIDGET',
      project: project ? serializeProject(project) : null,
      client: clientDetail ? serializeClient(clientDetail) : null,
      projects: clientDetail?.projects.map((item) => serializeProject(item)) || [],
      hardwareAssets: clientDetail?.hardwareAssets.map((item) => serializeHardwareAsset(item)) || [],
      amcs: clientDetail?.amcs || [],
      topics: topics.map((topic) => serializeSupportTopic(topic)),
      faqs,
      supportTypes: Object.values(SupportType),
      hardwareCategories: Object.values(HardwareCategory),
    });
  }),
);

router.post(
  '/sessions',
  validate(startSupportSessionSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof startSupportSessionSchema>;
    let projectId = payload.projectId ?? null;
    let clientId = payload.clientId ?? null;
    let source: SupportSessionSource = SupportSessionSource.GENERAL_WIDGET;

    if (payload.widgetKey) {
      const widgetProject = await getWidgetProjectAccess(payload.widgetKey);
      assertWidgetOriginAllowed(req, widgetProject);
      projectId = widgetProject.id;
      clientId = widgetProject.clientId;
      source = SupportSessionSource.PROJECT_WIDGET;
    }

    if (projectId && !clientId) {
      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          clientId: true,
        },
      });

      if (!project) {
        throw notFound('Project not found.');
      }

      clientId = project.clientId;
    }

    if (payload.hardwareAssetId) {
      const hardwareAsset = await prisma.hardwareAsset.findUnique({
        where: {
          id: payload.hardwareAssetId,
        },
      });

      if (!hardwareAsset) {
        throw notFound('Hardware asset not found.');
      }

      if (clientId && hardwareAsset.clientId !== clientId) {
        throw badRequest('Hardware asset does not belong to the selected client.');
      }

      clientId = hardwareAsset.clientId;
      projectId = projectId ?? hardwareAsset.projectId;
    }

    const supportSession = await prisma.supportSession.create({
      data: {
        source,
        status: SupportSessionStatus.ACTIVE,
        supportType: payload.supportType,
        clientId,
        projectId,
        hardwareAssetId: payload.hardwareAssetId,
        selectedTopicId: payload.selectedTopicId,
        requesterName: payload.requesterName,
        requesterEmail: payload.requesterEmail?.toLowerCase(),
        requesterPhone: payload.requesterPhone,
        issueSummary: payload.issueSummary,
        messages: {
          create: {
            role: SupportSessionMessageRole.SYSTEM,
            content: `Support session started from ${source}.`,
          },
        },
      },
      include: supportSessionInclude,
    });

    res.status(201).json(serializeSupportSession(supportSession));
  }),
);

router.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const supportSessionId = parseId(req.params.id, 'support session id');
    const supportSession = await prisma.supportSession.findUnique({
      where: {
        id: supportSessionId,
      },
      include: supportSessionInclude,
    });

    if (!supportSession) {
      throw notFound('Support session not found.');
    }

    res.json(serializeSupportSession(supportSession));
  }),
);

router.post(
  '/sessions/:id/message',
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const supportSessionId = parseId(req.params.id, 'support session id');
    const payload = req.body as z.infer<typeof messageSchema>;
    const supportSession = await prisma.supportSession.findUnique({
      where: {
        id: supportSessionId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!supportSession) {
      throw notFound('Support session not found.');
    }

    if (supportSession.status !== SupportSessionStatus.ACTIVE) {
      throw badRequest('This support session is no longer active.');
    }

    const conversation = [
      ...supportSession.messages.map((message) => ({ role: message.role, content: message.content })),
      { role: SupportSessionMessageRole.USER, content: payload.message },
    ];

    const { reply, sourceRefs } = await generateSupportSessionReply(supportSession.id, conversation);

    const [, juliaMessage] = await prisma.$transaction([
      prisma.supportSessionMessage.create({
        data: {
          supportSessionId: supportSession.id,
          role: SupportSessionMessageRole.USER,
          content: payload.message,
        },
      }),
      prisma.supportSessionMessage.create({
        data: {
          supportSessionId: supportSession.id,
          role: SupportSessionMessageRole.JULIA,
          content: reply,
          sourceRefs,
        },
      }),
    ]);

    res.json({
      sessionId: supportSession.id,
      reply,
      message: serializeSupportSessionMessage(juliaMessage),
    });
  }),
);

router.post(
  '/sessions/:id/end',
  validate(endSessionSchema),
  asyncHandler(async (req, res) => {
    const supportSessionId = parseId(req.params.id, 'support session id');
    const payload = req.body as z.infer<typeof endSessionSchema>;
    const supportSession = await prisma.supportSession.update({
      where: {
        id: supportSessionId,
      },
      data: {
        status: SupportSessionStatus.ENDED,
        endedAt: new Date(),
        supportSummary: payload.supportSummary,
        messages: {
          create: {
            role: SupportSessionMessageRole.SYSTEM,
            content: 'Support session ended without ticket escalation.',
          },
        },
      },
      include: supportSessionInclude,
    });

    res.json(serializeSupportSession(supportSession));
  }),
);

router.post(
  '/sessions/:id/escalate',
  validate(escalateSessionSchema),
  asyncHandler(async (req, res) => {
    const supportSessionId = parseId(req.params.id, 'support session id');
    const payload = req.body as z.infer<typeof escalateSessionSchema>;
    const supportSession = await prisma.supportSession.findUnique({
      where: {
        id: supportSessionId,
      },
      include: {
        ticket: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!supportSession) {
      throw notFound('Support session not found.');
    }

    if (supportSession.ticket) {
      throw badRequest('A ticket already exists for this support session.');
    }

    const userMessages = supportSession.messages
      .filter((message) => message.role === SupportSessionMessageRole.USER)
      .map((message) => message.content)
      .slice(-5)
      .join('\n\n');
    const supportSummary = payload.supportSummary || supportSession.supportSummary || userMessages || supportSession.issueSummary || 'Support escalation requested.';

    const ticket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.create({
        data: {
          clientId: supportSession.clientId,
          projectId: supportSession.projectId,
          hardwareAssetId: supportSession.hardwareAssetId,
          supportSessionId: supportSession.id,
          requesterName: supportSession.requesterName,
          requesterEmail: supportSession.requesterEmail?.toLowerCase(),
          emailThreadToken: buildTicketThreadToken(),
          title: payload.title || supportSession.issueSummary || 'Support escalation',
          description: payload.description?.trim() || supportSummary,
          source: supportSession.source === SupportSessionSource.PROJECT_WIDGET ? 'PROJECT_WIDGET' : 'GENERAL_WIDGET',
          supportType: supportSession.supportType,
          supportSummary,
          confidenceScore: payload.confidenceScore ?? supportSession.confidenceScore,
          priority: payload.priority ?? TicketPriority.MEDIUM,
          status: TicketStatus.NEW,
        },
        include: {
          client: true,
          project: {
            include: {
              client: true,
            },
          },
          hardwareAsset: true,
          supportSession: true,
          assignedTo: true,
        },
      });

      await transaction.supportSession.update({
        where: {
          id: supportSession.id,
        },
        data: {
          status: SupportSessionStatus.ESCALATED,
          escalatedAt: new Date(),
          endedAt: new Date(),
          supportSummary,
          confidenceScore: payload.confidenceScore ?? supportSession.confidenceScore,
          messages: {
            create: {
              role: SupportSessionMessageRole.SYSTEM,
              content: `Support session escalated into ticket ${nextTicket.id}.`,
            },
          },
        },
      });

      await transaction.ticketMessage.create({
        data: {
          ticketId: nextTicket.id,
          userId: null,
          type: MessageType.SYSTEM,
          content: `Ticket created from support session ${supportSession.id}.`,
        },
      });

      const pmUsers = await transaction.user.findMany({
        where: {
          role: 'PM',
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      if (pmUsers.length > 0) {
        await transaction.notification.createMany({
          data: pmUsers.map((user) => ({
            userId: user.id,
            type: 'TICKET_CREATED',
            title: `New support escalation: ${nextTicket.title}`,
            body: supportSummary.slice(0, 180),
            link: `/agent/tickets/${nextTicket.id}/summary`,
          })),
        });
      }

      await sendTicketCreatedAcknowledgement(transaction, nextTicket);

      return nextTicket;
    });

    res.status(201).json(serializeTicket(ticket));
  }),
);

export default router;
