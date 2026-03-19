import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().optional(),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().optional(),
});

const updateContactSchema = contactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/consignees/:id/contacts',
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const consignee = await prisma.consignee.findUnique({
      where: {
        id: consigneeId,
      },
      select: {
        id: true,
        contacts: true,
      },
    });

    if (!consignee) {
      throw notFound('Consignee not found.');
    }

    res.json(consignee.contacts);
  }),
);

router.post(
  '/consignees/:id/contacts',
  requireRole(Role.PM),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const payload = req.body as z.infer<typeof contactSchema>;
    const contact = await prisma.consigneeContact.create({
      data: {
        consigneeId,
        ...payload,
      },
    });

    res.status(201).json(contact);
  }),
);

router.patch(
  '/consignee-contacts/:id',
  requireRole(Role.PM),
  validate(updateContactSchema),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'consignee contact id');
    const payload = req.body as z.infer<typeof updateContactSchema>;
    const contact = await prisma.consigneeContact.update({
      where: {
        id: contactId,
      },
      data: payload,
    });

    res.json(contact);
  }),
);

router.delete(
  '/consignee-contacts/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'consignee contact id');

    await prisma.consigneeContact.delete({
      where: {
        id: contactId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
