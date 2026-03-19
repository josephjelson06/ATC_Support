import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { assertProjectAccess } from '../utils/access';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const createFaqSchema = z.object({
  question: z.string().trim().min(5),
  answer: z.string().trim().min(5),
  sortOrder: z.number().int().nonnegative().optional(),
});

const updateFaqSchema = createFaqSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/projects/:id/faqs',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const faqs = await prisma.faq.findMany({
      where: {
        projectId,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    res.json(faqs);
  }),
);

router.post(
  '/projects/:id/faqs',
  validate(createFaqSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const payload = req.body as z.infer<typeof createFaqSchema>;
    const faq = await prisma.faq.create({
      data: {
        projectId,
        question: payload.question,
        answer: payload.answer,
        sortOrder: payload.sortOrder ?? 0,
      },
    });

    res.status(201).json(faq);
  }),
);

router.patch(
  '/faqs/:id',
  validate(updateFaqSchema),
  asyncHandler(async (req, res) => {
    const faqId = parseId(req.params.id, 'faq id');
    const payload = req.body as z.infer<typeof updateFaqSchema>;
    const existingFaq = await prisma.faq.findUnique({
      where: {
        id: faqId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingFaq) {
      throw notFound('FAQ not found.');
    }

    await assertProjectAccess(req.user!, existingFaq.projectId);

    const faq = await prisma.faq.update({
      where: {
        id: faqId,
      },
      data: payload,
    });

    res.json(faq);
  }),
);

router.delete(
  '/faqs/:id',
  asyncHandler(async (req, res) => {
    const faqId = parseId(req.params.id, 'faq id');
    const existingFaq = await prisma.faq.findUnique({
      where: {
        id: faqId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingFaq) {
      throw notFound('FAQ not found.');
    }

    await assertProjectAccess(req.user!, existingFaq.projectId);

    await prisma.faq.delete({
      where: {
        id: faqId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
