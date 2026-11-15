import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: string[];

  constructor(statusCode: number, message: string, details?: string[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';

  // Map database constraint errors to meaningful HTTP status codes
  if (
    message.includes('UNIQUE constraint failed') ||
    message.includes('ER_DUP_ENTRY')
  ) {
    return res.status(409).json({
      error: 'A record with the same unique identifier already exists.',
      details: [message],
    });
  }

  if (
    message.includes('FOREIGN KEY constraint failed') ||
    message.includes('ER_ROW_IS_REFERENCED')
  ) {
    return res.status(409).json({
      error: 'Operation blocked by referential integrity constraints.',
      details: [message],
    });
  }

  if (message.includes('CHECK constraint failed') || message.includes('ER_CHECK_CONSTRAINT_VIOLATED')) {
    return res.status(400).json({
      error: 'Data failed database validation constraints.',
      details: [message],
    });
  }

  if (
    message.includes('Database connection is unavailable') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ER_ACCESS_DENIED_ERROR')
  ) {
    return res.status(503).json({
      error: 'Database service unavailable. Please verify connection configuration.',
      details: [message],
    });
  }

  console.error('[API Error]', err);
  return res.status(500).json({
    error: 'Internal server error while processing request.',
    details: [message],
  });
}
