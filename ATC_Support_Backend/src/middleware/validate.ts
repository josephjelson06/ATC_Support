import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

import { badRequest } from '../utils/http';

type Source = 'body' | 'params' | 'query';

export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      throw badRequest('Validation failed.', parsed.error.flatten());
    }

    (req as unknown as Record<Source, unknown>)[source] = parsed.data;
    next();
  };
