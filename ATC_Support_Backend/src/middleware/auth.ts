import type { RequestHandler } from 'express';

import { prisma } from '../lib/prisma';
import { asyncHandler, unauthorized } from '../utils/http';
import { verifyAccessToken } from '../utils/session';

export const authMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing bearer token.');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    throw unauthorized('Missing bearer token.');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('Invalid or expired token.');
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw unauthorized('Invalid token payload.');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw unauthorized('User is not authorized.');
  }

  req.user = user;
  next();
});
