import { KnowledgeStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';
import { serializeRunbook } from '../utils/serializers';

const router = Router();

const createRunbookSchema = z.object({
  title: z.string().trim().min(2),
  content: z.string().trim().min(10),
  category: z.string().trim().optional(),
  status: z.nativeEnum(KnowledgeStatus).optional(),
});

const updateRunbookSchema = createRunbookSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const runbookInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const runbooks = await prisma.runbook.findMany({
      where: {
        ...(status ? { status: status as KnowledgeStatus } : {}),
      },
      include: runbookInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(runbooks.map((runbook) => serializeRunbook(runbook)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');
    const runbook = await prisma.runbook.findUnique({
      where: {
        id: runbookId,
      },
      include: runbookInclude,
    });

    if (!runbook) {
      throw notFound('Runbook not found.');
    }

    res.json(serializeRunbook(runbook));
  }),
);

router.post(
  '/',
  validate(createRunbookSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createRunbookSchema>;
    const runbook = await prisma.runbook.create({
      data: {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        status: payload.status ?? KnowledgeStatus.PUBLISHED,
        publishedAt: (payload.status ?? KnowledgeStatus.PUBLISHED) === KnowledgeStatus.PUBLISHED ? new Date() : null,
        createdById: req.user!.id,
      },
      include: runbookInclude,
    });

    res.status(201).json(serializeRunbook(runbook));
  }),
);

router.patch(
  '/:id',
  validate(updateRunbookSchema),
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');
    const payload = req.body as z.infer<typeof updateRunbookSchema>;
    const runbook = await prisma.runbook.update({
      where: {
        id: runbookId,
      },
      data: {
        ...payload,
        ...(payload.status === KnowledgeStatus.PUBLISHED ? { publishedAt: new Date() } : payload.status === KnowledgeStatus.DRAFT ? { publishedAt: null } : {}),
      },
      include: runbookInclude,
    });

    res.json(serializeRunbook(runbook));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');

    await prisma.runbook.delete({
      where: {
        id: runbookId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
