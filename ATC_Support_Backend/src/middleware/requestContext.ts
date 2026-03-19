import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';

const MAX_REQUEST_ID_LENGTH = 128;

const normalizeHeaderValue = (value: string | string[] | undefined) => {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > MAX_REQUEST_ID_LENGTH) {
    return undefined;
  }

  return trimmed;
};

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const incomingRequestId = normalizeHeaderValue(req.headers['x-request-id']);
  const requestId = incomingRequestId ?? randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

