import { HardwareCategory, KnowledgeStatus, Role, SupportTopicKind, SupportTopicScope, SupportType } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, notFound, parseId } from '../utils/http';
import { serializeSupportTopic } from '../utils/serializers';

const router = Router();

const supportTopicSchema = z.object({
  scope: z.nativeEnum(SupportTopicScope).optional(),
  kind: z.nativeEnum(SupportTopicKind).optional(),
  supportType: z.nativeEnum(SupportType).optional(),
  status: z.nativeEnum(KnowledgeStatus).optional(),
  title: z.string().trim().min(3),
  summary: z.string().trim().optional(),
  content: z.string().trim().min(3),
  clientId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  hardwareCategory: z.nativeEnum(HardwareCategory).nullable().optional(),
  hardwareAssetId: z.number().int().positive().nullable().optional(),
  vendorUrl: z.string().url().or(z.literal('')).optional(),
  sortOrder: z.number().int().optional(),
});

const include = {
  client: true,
  project: true,
  hardwareAsset: true,
} as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const supportType = req.query.supportType && Object.values(SupportType).includes(String(req.query.supportType) as SupportType)
      ? (String(req.query.supportType) as SupportType)
      : undefined;
    const scope = req.query.scope && Object.values(SupportTopicScope).includes(String(req.query.scope) as SupportTopicScope)
      ? (String(req.query.scope) as SupportTopicScope)
      : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const hardwareAssetId = req.query.hardwareAssetId ? Number(req.query.hardwareAssetId) : undefined;

    const topics = await prisma.supportTopic.findMany({
      where: {
        ...(supportType ? { supportType } : {}),
        ...(scope ? { scope } : {}),
        ...(projectId ? { projectId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(hardwareAssetId ? { hardwareAssetId } : {}),
      },
      include,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json(topics.map((topic) => serializeSupportTopic(topic)));
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(supportTopicSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof supportTopicSchema>;
    const topic = await prisma.supportTopic.create({
      data: {
        scope: payload.scope ?? SupportTopicScope.GLOBAL,
        kind: payload.kind ?? SupportTopicKind.FAQ,
        supportType: payload.supportType ?? SupportType.GENERAL,
        status: payload.status ?? KnowledgeStatus.PUBLISHED,
        title: payload.title,
        summary: payload.summary || null,
        content: payload.content,
        clientId: payload.clientId ?? null,
        projectId: payload.projectId ?? null,
        hardwareCategory: payload.hardwareCategory ?? null,
        hardwareAssetId: payload.hardwareAssetId ?? null,
        vendorUrl: payload.vendorUrl || null,
        sortOrder: payload.sortOrder ?? 0,
      },
      include,
    });

    res.status(201).json(serializeSupportTopic(topic));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(supportTopicSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' })),
  asyncHandler(async (req, res) => {
    const topicId = parseId(req.params.id, 'support topic id');
    const payload = req.body as Partial<z.infer<typeof supportTopicSchema>>;
    const topic = await prisma.supportTopic.update({
      where: {
        id: topicId,
      },
      data: {
        ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
        ...(payload.kind !== undefined ? { kind: payload.kind } : {}),
        ...(payload.supportType !== undefined ? { supportType: payload.supportType } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary || null } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
        ...(payload.clientId !== undefined ? { clientId: payload.clientId } : {}),
        ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
        ...(payload.hardwareCategory !== undefined ? { hardwareCategory: payload.hardwareCategory } : {}),
        ...(payload.hardwareAssetId !== undefined ? { hardwareAssetId: payload.hardwareAssetId } : {}),
        ...(payload.vendorUrl !== undefined ? { vendorUrl: payload.vendorUrl || null } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
      },
      include,
    });

    res.json(serializeSupportTopic(topic));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const topicId = parseId(req.params.id, 'support topic id');
    const existingTopic = await prisma.supportTopic.findUnique({
      where: {
        id: topicId,
      },
      select: {
        id: true,
      },
    });

    if (!existingTopic) {
      throw notFound('Support topic not found.');
    }

    await prisma.supportTopic.delete({
      where: {
        id: topicId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
