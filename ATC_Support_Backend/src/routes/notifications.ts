import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { asyncHandler, notFound, parseId } from '../utils/http';
import { serializeNotification } from '../utils/serializers';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 25) : 8;
    const unreadOnly = String(req.query.unreadOnly ?? 'false').toLowerCase() === 'true';
    const where = {
      userId: req.user!.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: req.user!.id,
          isRead: false,
        },
      }),
    ]);

    res.json({
      items: notifications.map((notification) => serializeNotification(notification)),
      unreadCount,
    });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      updatedCount: result.count,
    });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notificationId = parseId(req.params.id, 'notification id');
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: req.user!.id,
      },
    });

    if (!notification) {
      throw notFound('Notification not found.');
    }

    if (notification.isRead) {
      res.json(serializeNotification(notification));
      return;
    }

    const updated = await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(serializeNotification(updated));
  }),
);

export default router;
