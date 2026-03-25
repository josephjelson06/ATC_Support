import { KnowledgeStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import type { AuthenticatedUser } from '../types/auth';
import { assertProjectAccess } from '../utils/access';
import { asyncHandler, forbidden, parseId, notFound } from '../utils/http';
import { serializeUser } from '../utils/serializers';
import { canManageProjectKnowledge, safeUserSelect } from '../utils/userModel';

const router = Router();

const createDocSchema = z.object({
  title: z.string().trim().min(2),
  content: z.string().trim().min(10),
  status: z.nativeEnum(KnowledgeStatus).optional(),
});

const updateDocSchema = createDocSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const docInclude = {
  createdBy: {
    select: safeUserSelect,
  },
} as const;

const assertProjectKnowledgePermission = (user: AuthenticatedUser | undefined) => {
  if (!user || !canManageProjectKnowledge(user)) {
    throw forbidden('You do not have permission to manage project docs.');
  }
};

router.get(
  '/projects/:id/docs',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const status = req.query.status ? String(req.query.status) : undefined;
    const docs = await prisma.projectDoc.findMany({
      where: {
        projectId,
        ...(status ? { status: status as KnowledgeStatus } : {}),
      },
      include: docInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(
      docs.map((doc) => ({
        ...doc,
        createdBy: serializeUser(doc.createdBy),
      })),
    );
  }),
);

router.post(
  '/projects/:id/docs',
  validate(createDocSchema),
  asyncHandler(async (req, res) => {
    assertProjectKnowledgePermission(req.user);
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const payload = req.body as z.infer<typeof createDocSchema>;
    const doc = await prisma.projectDoc.create({
      data: {
        projectId,
        title: payload.title,
        content: payload.content,
        status: payload.status ?? KnowledgeStatus.PUBLISHED,
        publishedAt: (payload.status ?? KnowledgeStatus.PUBLISHED) === KnowledgeStatus.PUBLISHED ? new Date() : null,
        createdById: req.user!.id,
      },
      include: docInclude,
    });

    res.status(201).json({
      ...doc,
      createdBy: serializeUser(doc.createdBy),
    });
  }),
);

router.patch(
  '/docs/:id',
  validate(updateDocSchema),
  asyncHandler(async (req, res) => {
    assertProjectKnowledgePermission(req.user);
    const docId = parseId(req.params.id, 'doc id');
    const payload = req.body as z.infer<typeof updateDocSchema>;
    const existingDoc = await prisma.projectDoc.findUnique({
      where: {
        id: docId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingDoc) {
      throw notFound('Project document not found.');
    }

    await assertProjectAccess(req.user!, existingDoc.projectId);

    const doc = await prisma.projectDoc.update({
      where: {
        id: docId,
      },
      data: {
        ...payload,
        ...(payload.status === KnowledgeStatus.PUBLISHED ? { publishedAt: new Date() } : payload.status === KnowledgeStatus.DRAFT ? { publishedAt: null } : {}),
      },
      include: docInclude,
    });

    res.json({
      ...doc,
      createdBy: serializeUser(doc.createdBy),
    });
  }),
);

router.delete(
  '/docs/:id',
  asyncHandler(async (req, res) => {
    assertProjectKnowledgePermission(req.user);
    const docId = parseId(req.params.id, 'doc id');
    const existingDoc = await prisma.projectDoc.findUnique({
      where: {
        id: docId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingDoc) {
      throw notFound('Project document not found.');
    }

    await assertProjectAccess(req.user!, existingDoc.projectId);

    await prisma.projectDoc.delete({
      where: {
        id: docId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
