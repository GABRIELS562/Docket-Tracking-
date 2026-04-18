import { randomUUID } from 'crypto';

import type { Request, Response, NextFunction } from 'express';

/**
 * Correlation ID middleware
 *
 * Adds a unique correlation ID to each request for tracing
 * across services and logs
 *
 * - Uses client-provided X-Request-ID if present
 * - Generates UUID if not provided
 * - Sets response header for client tracking
 */
export const correlationId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
