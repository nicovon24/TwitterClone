import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import env from '../env.js';

export interface AppError extends Error {
  status?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[error]', err);

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(', ');
    res.status(400).json({ error: message });
    return;
  }

  const status = err.status ?? 500;
  const message =
    status === 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

  res.status(status).json({ error: message });
}
