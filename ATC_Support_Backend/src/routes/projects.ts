import { AmcStatus, KnowledgeStatus, Prisma, ProjectStatus, Role, SupportLevel } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { assertProjectAccess, projectScopeForUser } from '../utils/access';
import { buildJuliaReadiness } from '../utils/juliaReadiness';
import { asyncHandler, badRequest, conflict, forbidden, parseId, notFound } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { parseSearchEntityId } from '../utils/search';
import { serializeProject } from '../utils/serializers';
import { canManageProjectKnowledge, safeUserSelect } from '../utils/userModel';
import { normalizeWidgetAllowedDomains } from '../utils/widgetAccess';
import { generateWidgetKey } from '../utils/widgetKey';

const router = Router();

const dateSchema = z
  .string()
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), { message: 'Invalid date.' });

const amcInputSchema = z
  .object({
    hoursIncluded: z.number().int().nonnegative(),
    hoursUsed: z.number().int().nonnegative().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    status: z.nativeEnum(AmcStatus).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  });

const createProjectSchema = z.object({
  clientId: z.number().int().positive(),
  assignedToId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  widgetEnabled: z.boolean().optional(),
  juliaGreeting: z.string().trim().optional(),
  juliaFallbackMessage: z.string().trim().optional(),
  juliaEscalationHint: z.string().trim().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  amc: amcInputSchema.nullable().optional(),
});

const updateProjectSchema = createProjectSchema.omit({ amc: true }).partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const updateJuliaConfigSchema = z
  .object({
    juliaGreeting: z.string().trim().min(1).max(500).nullable().optional(),
    juliaFallbackMessage: z.string().trim().min(5).max(2000).nullable().optional(),
    juliaEscalationHint: z.string().trim().min(5).max(2000).nullable().optional(),
    widgetAllowedDomains: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one Julia config field is required.',
  });

const projectInclude = {
  client: true,
  assignedTo: {
    select: safeUserSelect,
  },
} as const;

const assertProjectSpecialist = async (assignedToId: number | null | undefined) => {
  if (!assignedToId) {
    return;
  }

  const projectSpecialist = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      role: Role.SE,
      supportLevel: SupportLevel.SE3,
    },
    select: {
      id: true,
    },
  });

  if (!projectSpecialist) {
    throw badRequest('assignedToId must reference an SE3 project specialist.');
  }
};

const getProjectJuliaReadiness = async (
  projectId: number,
  project: {
    status: ProjectStatus;
    widgetEnabled: boolean;
    widgetAllowedDomains: string[];
    juliaFallbackMessage?: string | null;
    juliaEscalationHint?: string | null;
  },
) => {
  const [faqCount, publishedDocCount] = await Promise.all([
    prisma.faq.count({
      where: {
        projectId,
      },
    }),
    prisma.projectDoc.count({
      where: {
        projectId,
        status: KnowledgeStatus.PUBLISHED,
      },
    }),
  ]);

  return buildJuliaReadiness({
    status: project.status,
    widgetEnabled: project.widgetEnabled,
    allowedDomainCount: project.widgetAllowedDomains.length,
    faqCount,
    publishedDocCount,
    juliaFallbackMessage: project.juliaFallbackMessage,
    juliaEscalationHint: project.juliaEscalationHint,
  });
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const searchId = parseSearchEntityId(search);
    const status = req.query.status ? String(req.query.status) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);
    const where: Prisma.ProjectWhereInput = {
      ...projectScopeForUser(req.user!),
      ...(status ? { status: status as ProjectStatus } : {}),
      ...(clientId ? { clientId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              { assignedTo: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              { widgetKey: { contains: search, mode: Prisma.QueryMode.insensitive } },
              ...(searchId ? [{ id: searchId }] : []),
            ],
          }
        : {}),
    };

    if (pagination) {
      const [projects, total] = await prisma.$transaction([
        prisma.project.findMany({
          where,
          include: projectInclude,
          orderBy: {
            id: 'asc',
          },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.project.count({ where }),
      ]);

      res.json(createPaginatedResponse(projects.map((project) => serializeProject(project)), total, pagination));
      return;
    }

    const projects = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: {
        id: 'asc',
      },
    });

    res.json(projects.map((project) => serializeProject(project)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: projectInclude,
    });

    if (!project) {
      throw notFound('Project not found.');
    }

    const juliaReadiness = await getProjectJuliaReadiness(projectId, project);

    res.json({
      ...serializeProject(project),
      juliaReadiness,
    });
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createProjectSchema>;
    await assertProjectSpecialist(payload.assignedToId);
    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          clientId: payload.clientId,
          assignedToId: payload.assignedToId ?? null,
          name: payload.name,
          description: payload.description,
          widgetKey: await generateWidgetKey(),
          widgetEnabled: payload.widgetEnabled ?? true,
          juliaGreeting: payload.juliaGreeting,
          juliaFallbackMessage: payload.juliaFallbackMessage,
          juliaEscalationHint: payload.juliaEscalationHint,
          status: payload.status ?? ProjectStatus.ACTIVE,
        },
        include: projectInclude,
      });

      if (payload.assignedToId) {
        await tx.projectMember.upsert({
          where: {
            userId_projectId: {
              userId: payload.assignedToId,
              projectId: createdProject.id,
            },
          },
          update: {},
          create: {
            userId: payload.assignedToId,
            projectId: createdProject.id,
          },
        });
      }

      if (payload.amc) {
        await tx.amc.create({
          data: {
            clientId: payload.clientId,
            projectId: createdProject.id,
            hoursIncluded: payload.amc.hoursIncluded,
            hoursUsed: payload.amc.hoursUsed ?? 0,
            startDate: payload.amc.startDate,
            endDate: payload.amc.endDate,
            status: payload.amc.status ?? AmcStatus.ACTIVE,
          },
        });
      }

      return createdProject;
    });

    res.status(201).json(serializeProject(project));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    const payload = req.body as z.infer<typeof updateProjectSchema>;
    await assertProjectSpecialist(payload.assignedToId);
    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: projectId,
        },
        data: {
          ...payload,
        },
        include: projectInclude,
      });

      if (payload.assignedToId) {
        await tx.projectMember.upsert({
          where: {
            userId_projectId: {
              userId: payload.assignedToId,
              projectId,
            },
          },
          update: {},
          create: {
            userId: payload.assignedToId,
            projectId,
          },
        });
      }

      return updatedProject;
    });

    res.json(serializeProject(project));
  }),
);

router.patch(
  '/:id/julia-config',
  validate(updateJuliaConfigSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');

    if (!req.user || !canManageProjectKnowledge(req.user)) {
      throw forbidden('You do not have permission to manage Julia configuration.');
    }

    await assertProjectAccess(req.user, projectId);
    const payload = req.body as z.infer<typeof updateJuliaConfigSchema>;
    const normalizedAllowedDomains =
      payload.widgetAllowedDomains !== undefined ? normalizeWidgetAllowedDomains(payload.widgetAllowedDomains) : undefined;
    const project = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...(payload.juliaGreeting !== undefined ? { juliaGreeting: payload.juliaGreeting } : {}),
        ...(payload.juliaFallbackMessage !== undefined ? { juliaFallbackMessage: payload.juliaFallbackMessage } : {}),
        ...(payload.juliaEscalationHint !== undefined ? { juliaEscalationHint: payload.juliaEscalationHint } : {}),
        ...(normalizedAllowedDomains !== undefined ? { widgetAllowedDomains: normalizedAllowedDomains } : {}),
      },
      include: projectInclude,
    });
    const juliaReadiness = await getProjectJuliaReadiness(projectId, project);

    res.json({
      ...serializeProject(project),
      juliaReadiness,
    });
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    const [ticketCount, docCount, faqCount, chatSessionCount, amcCount] = await Promise.all([
      prisma.ticket.count({
        where: {
          projectId,
        },
      }),
      prisma.projectDoc.count({
        where: {
          projectId,
        },
      }),
      prisma.faq.count({
        where: {
          projectId,
        },
      }),
      prisma.chatSession.count({
        where: {
          projectId,
        },
      }),
      prisma.amc.count({
        where: {
          projectId,
        },
      }),
    ]);

    const blockers = {
      tickets: ticketCount,
      docs: docCount,
      faqs: faqCount,
      chatSessions: chatSessionCount,
      amcs: amcCount,
    };

    if (Object.values(blockers).some((count) => count > 0)) {
      throw conflict('Delete blocked: remove linked tickets, docs, FAQs, chat sessions, and AMCs first.', blockers);
    }

    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
