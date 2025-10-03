import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../../../application/interfaces/ILogger';
import { DomainError } from '../../../shared/errors/DomainError';
import { ValidationError } from '../../../shared/errors/ValidationError';
import { NotFoundError } from '../../../shared/errors/NotFoundError';

/**
 * Global Error Handler middleware
 *
 * Handles all errors thrown in the application and formats
 * them into consistent JSON responses
 *
 * Error Types:
 * - ValidationError: 400 Bad Request
 * - NotFoundError: 404 Not Found
 * - DomainError: 400 Bad Request
 * - Other errors: 500 Internal Server Error
 *
 * Response Format:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Error message",
 *     "details": [] // Optional, for validation errors
 *   },
 *   "meta": {
 *     "timestamp": "ISO timestamp",
 *     "requestId": "correlation ID"
 *   }
 * }
 * ```
 *
 * @param logger - Logger instance for error logging
 * @returns Express error handler middleware
 */
export const errorHandler = (logger: ILogger) => {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string;

    // Log error with full context
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId,
      body: req.body,
    });

    // Handle ValidationError (400)
    if (err instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Handle NotFoundError (404)
    if (err instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: err.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Handle DomainError (400)
    if (err instanceof DomainError) {
      res.status(400).json({
        success: false,
        error: {
          code: err.code || 'DOMAIN_ERROR',
          message: err.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Default 500 Internal Server Error
    // Hide error details in production
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  };
};
