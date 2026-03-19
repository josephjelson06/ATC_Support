import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, details);
export const conflict = (message: string, details?: unknown) => new AppError(409, message, details);
export const unauthorized = (message = 'Unauthorized') => new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);

export const parseId = (value: string, label = 'id') => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`Invalid ${label}.`);
  }

  return id;
};
