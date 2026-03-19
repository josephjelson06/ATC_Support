import { Prisma } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { env } from './config/env';
import { prisma } from './lib/prisma';
import { authMiddleware } from './middleware/auth';
import { requestContextMiddleware } from './middleware/requestContext';
import { requestLoggerMiddleware } from './middleware/requestLogger';
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
import notificationsRouter from './routes/notifications';
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
    exposedHeaders: ['x-request-id'],
  }),
);
app.use(express.json());
app.use(requestContextMiddleware);
app.use(requestLoggerMiddleware);

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
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api', authMiddleware, clientContactsRouter);
app.use('/api', authMiddleware, consigneesRouter);
app.use('/api', authMiddleware, consigneeContactsRouter);
app.use('/api', authMiddleware, amcsRouter);
app.use('/api', authMiddleware, projectDocsRouter);
app.use('/api', authMiddleware, faqsRouter);
app.use('/api', authMiddleware, ticketMessagesRouter);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
    requestId: req.requestId,
  });
});

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = req.requestId;

  if (error instanceof AppError) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'request.failed',
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: error.statusCode,
        error: {
          name: error.name,
          message: error.message,
        },
      }),
    );

    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
      requestId,
    });
  }

  if (error instanceof ZodError) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'request.failed',
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: 400,
        error: {
          name: error.name,
          message: 'Validation failed.',
        },
      }),
    );

    return res.status(400).json({
      message: 'Validation failed.',
      details: error.flatten(),
      requestId,
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === 'LIMIT_FILE_SIZE' ? 'Attachment exceeds the 10 MB size limit.' : error.message,
      requestId,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'request.failed',
          requestId,
          method: req.method,
          path: req.originalUrl,
          status: 409,
          error: {
            name: error.name,
            message: 'A unique constraint was violated.',
            code: error.code,
          },
        }),
      );

      return res.status(409).json({
        message: 'A unique constraint was violated.',
        details: error.meta,
        requestId,
      });
    }

    if (error.code === 'P2003') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'request.failed',
          requestId,
          method: req.method,
          path: req.originalUrl,
          status: 409,
          error: {
            name: error.name,
            message: 'Operation blocked by related records.',
            code: error.code,
          },
        }),
      );

      return res.status(409).json({
        message: 'Operation blocked by related records.',
        details: error.meta,
        requestId,
      });
    }

    if (error.code === 'P2025') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'request.failed',
          requestId,
          method: req.method,
          path: req.originalUrl,
          status: 404,
          error: {
            name: error.name,
            message: 'Requested record was not found.',
            code: error.code,
          },
        }),
      );

      return res.status(404).json({
        message: 'Requested record was not found.',
        requestId,
      });
    }
  }

  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'request.failed',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: 500,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : { message: String(error) },
    }),
  );

  return res.status(500).json({
    message: 'Internal server error.',
    requestId,
  });
});

const startServer = async () => {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`ATC Support backend listening on port ${env.PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
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
}

export default app;
