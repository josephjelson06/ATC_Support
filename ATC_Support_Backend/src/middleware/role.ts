import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';

import { forbidden, unauthorized } from '../utils/http';

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw forbidden('You do not have permission to perform this action.');
    }

    next();
  };
