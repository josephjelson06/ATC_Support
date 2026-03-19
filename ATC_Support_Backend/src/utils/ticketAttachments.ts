import { mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import multer from 'multer';
import type { Request } from 'express';

const ticketAttachmentDirectory = path.resolve(process.cwd(), 'uploads', 'ticket-attachments');

const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
    void mkdir(ticketAttachmentDirectory, { recursive: true })
      .then(() => {
        callback(null, ticketAttachmentDirectory);
      })
      .catch((error) => {
        callback(error as Error, ticketAttachmentDirectory);
      });
  },
  filename: (_req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    const extension = path.extname(file.originalname || '');
    callback(null, `${randomUUID()}${extension}`);
  },
});

export const ticketAttachmentUpload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
});

export const resolveTicketAttachmentPath = (storedName: string) => path.join(ticketAttachmentDirectory, storedName);
