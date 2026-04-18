import type { ILogger } from '../../../application/interfaces/ILogger';
import type { Request, Response, NextFunction } from 'express';

/**
 * Request Logger middleware
 *
 * Logs all HTTP requests with timing and correlation ID
 *
 * Captures:
 * - HTTP method and path
 * - Response status code
 * - Duration in milliseconds
 * - Request ID for correlation
 * - User agent and IP
 */
export const requestLogger = (logger: ILogger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.headers['x-request-id'],
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    });

    next();
  };
};
