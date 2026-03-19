import { Router } from 'express';
import { z } from 'zod';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { handleInboundTicketEmail } from '../services/ticketEmails';
import { asyncHandler, unauthorized } from '../utils/http';
import { validate } from '../middleware/validate';

const router = Router();

const inboundEmailSchema = z.object({
  fromEmail: z.string().email(),
  fromName: z.string().trim().optional(),
  subject: z.string().trim().min(1),
  text: z.string().trim().min(1),
  threadToken: z.string().trim().optional(),
});

router.post(
  '/inbound',
  validate(inboundEmailSchema),
  asyncHandler(async (req, res) => {
    const providedSecret = String(req.headers['x-inbound-email-secret'] || '');

    if (!providedSecret || providedSecret !== env.INBOUND_EMAIL_SECRET) {
      throw unauthorized('Invalid inbound email secret.');
    }

    const payload = req.body as z.infer<typeof inboundEmailSchema>;
    const result = await handleInboundTicketEmail(prisma, {
      fromEmail: payload.fromEmail,
      fromName: payload.fromName,
      subject: payload.subject,
      text: payload.text,
      threadToken: payload.threadToken,
    });

    res.status(201).json(result);
  }),
);

export default router;
