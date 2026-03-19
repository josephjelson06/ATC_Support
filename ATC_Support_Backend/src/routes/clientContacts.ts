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
  isPrimary: z.boolean().optional(),
});

const updateContactSchema = contactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/clients/:id/contacts',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
        contacts: true,
      },
    });

    if (!client) {
      throw notFound('Client not found.');
    }

    res.json(client.contacts);
  }),
);

router.post(
  '/clients/:id/contacts',
  requireRole(Role.PM),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof contactSchema>;
    const contact = await prisma.$transaction(async (transaction) => {
      if (payload.isPrimary) {
        await transaction.clientContact.updateMany({
          where: {
            clientId,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return transaction.clientContact.create({
        data: {
          clientId,
          ...payload,
        },
      });
    });

    res.status(201).json(contact);
  }),
);

router.patch(
  '/contacts/:id',
  requireRole(Role.PM),
  validate(updateContactSchema),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'contact id');
    const payload = req.body as z.infer<typeof updateContactSchema>;
    const existingContact = await prisma.clientContact.findUnique({
      where: {
        id: contactId,
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!existingContact) {
      throw notFound('Contact not found.');
    }

    const contact = await prisma.$transaction(async (transaction) => {
      if (payload.isPrimary) {
        await transaction.clientContact.updateMany({
          where: {
            clientId: existingContact.clientId,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return transaction.clientContact.update({
        where: {
          id: contactId,
        },
        data: payload,
      });
    });

    res.json(contact);
  }),
);

router.delete(
  '/contacts/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'contact id');

    await prisma.clientContact.delete({
      where: {
        id: contactId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
