import { Prisma } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';

import { env } from './config/env';
import { prisma } from './lib/prisma';
import { authMiddleware } from './middleware/auth';
import { AppError } from './utils/http';
import amcsRouter from './routes/amcs';
import authRouter from './routes/auth';
import chatSessionsRouter from './routes/chatSessions';
import clientContactsRouter from './routes/clientContacts';
import clientsRouter from './routes/clients';
import consigneeContactsRouter from './routes/consigneeContacts';
import consigneesRouter from './routes/consignees';
import dashboardRouter from './routes/dashboard';
import faqsRouter from './routes/faqs';
import projectDocsRouter from './routes/projectDocs';
import projectsRouter from './routes/projects';
import reportsRouter from './routes/reports';
import runbooksRouter from './routes/runbooks';
import ticketMessagesRouter from './routes/ticketMessages';
import ticketsRouter from './routes/tickets';
import usersRouter from './routes/users';
import widgetRouter from './routes/widget';

const app = express();

const corsOrigin =
  env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/widget', widgetRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/runbooks', authMiddleware, runbooksRouter);
app.use('/api/chat-sessions', authMiddleware, chatSessionsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api', authMiddleware, clientContactsRouter);
app.use('/api', authMiddleware, consigneesRouter);
app.use('/api', authMiddleware, consigneeContactsRouter);
app.use('/api', authMiddleware, amcsRouter);
app.use('/api', authMiddleware, projectDocsRouter);
app.use('/api', authMiddleware, faqsRouter);
app.use('/api', authMiddleware, ticketMessagesRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      details: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'A unique constraint was violated.',
        details: error.meta,
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'Operation blocked by related records.',
        details: error.meta,
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Requested record was not found.',
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    message: 'Internal server error.',
  });
});

const startServer = async () => {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`ATC Support backend listening on port ${env.PORT}`);
  });
};

void startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

export default app;
