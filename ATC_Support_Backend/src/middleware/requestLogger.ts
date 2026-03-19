import type { RequestHandler } from 'express';

const roundToMs = (value: number) => Math.round(value * 100) / 100;

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    const logEntry = {
      level: 'info',
      msg: 'request.completed',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: roundToMs(durationMs),
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
};

