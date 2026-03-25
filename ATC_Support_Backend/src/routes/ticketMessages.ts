import { access } from 'fs/promises';

import { MessageType, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { sendTicketReplyEmail } from '../services/ticketEmails';
import { assertTicketAccess } from '../utils/access';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { serializeTicketAttachment, serializeTicketMessage } from '../utils/serializers';
import { resolveTicketAttachmentPath, ticketAttachmentUpload } from '../utils/ticketAttachments';
import { safeUserSelect } from '../utils/userModel';

const router = Router();

const createTicketMessageSchema = z.object({
  content: z.string().trim().optional().default(''),
  type: z.enum([MessageType.REPLY, MessageType.INTERNAL_NOTE]).default(MessageType.REPLY),
});

const messageInclude = {
  user: {
    select: safeUserSelect,
  },
  attachments: {
    include: {
      uploadedBy: {
        select: safeUserSelect,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

router.get(
  '/tickets/:id/messages',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId,
      },
      include: messageInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages.map((message) => serializeTicketMessage(message)));
  }),
);

router.post(
  '/tickets/:id/messages',
  requireRole(Role.PM, Role.SE),
  ticketAttachmentUpload.array('attachments', 5),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = createTicketMessageSchema.parse(req.body);
    const attachments = ((req.files as Express.Multer.File[] | undefined) ?? []).filter((file) => file.size > 0);

    if (!payload.content && attachments.length === 0) {
      throw badRequest('Message content or at least one attachment is required.');
    }

    const message = await prisma.$transaction(async (transaction) => {
      const createdMessage = await transaction.ticketMessage.create({
        data: {
          ticketId,
          userId: req.user!.id,
          content: payload.content,
          type: payload.type,
        },
      });

      if (attachments.length > 0) {
        await transaction.ticketAttachment.createMany({
          data: attachments.map((file) => ({
            ticketId,
            ticketMessageId: createdMessage.id,
            uploadedById: req.user!.id,
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype || 'application/octet-stream',
            sizeBytes: file.size,
          })),
        });
      }

      if (payload.type === MessageType.REPLY) {
        const ticket = await transaction.ticket.findUnique({
          where: {
            id: ticketId,
          },
          include: {
            project: {
              include: {
                client: true,
              },
            },
            chatSession: true,
          },
        });

        if (ticket) {
          await sendTicketReplyEmail(transaction, {
            ticket,
            message: createdMessage,
            senderName: req.user!.name,
            attachmentNames: attachments.map((file) => file.originalname),
            createdById: req.user!.id,
          });
        }
      }

      return transaction.ticketMessage.findUnique({
        where: {
          id: createdMessage.id,
        },
        include: messageInclude,
      });
    });

    res.status(201).json(serializeTicketMessage(message));
  }),
);

router.get(
  '/ticket-attachments/:attachmentId/download',
  asyncHandler(async (req, res) => {
    const attachmentId = parseId(req.params.attachmentId, 'attachment id');
    const attachment = await prisma.ticketAttachment.findUnique({
      where: {
        id: attachmentId,
      },
      include: {
        uploadedBy: {
          select: safeUserSelect,
        },
      },
    });

    if (!attachment) {
      throw notFound('Attachment not found.');
    }

    await assertTicketAccess(req.user!, attachment.ticketId);

    const attachmentPath = resolveTicketAttachmentPath(attachment.storedName);

    try {
      await access(attachmentPath);
    } catch {
      throw notFound('Attachment file not found.');
    }

    res.download(attachmentPath, attachment.originalName);
  }),
);

router.get(
  '/tickets/:id/attachments',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const attachments = await prisma.ticketAttachment.findMany({
      where: {
        ticketId,
      },
      include: {
        uploadedBy: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(attachments.map((attachment: (typeof attachments)[number]) => serializeTicketAttachment(attachment)));
  }),
);

export default router;
