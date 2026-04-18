import { ZodError } from 'zod';

import { ValidationError } from '../../../shared/errors/ValidationError';

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Request Validation middleware
 *
 * Validates request body against Zod schema
 *
 * Features:
 * - Schema-based validation using Zod
 * - Detailed field-level error messages
 * - Type-safe request body after validation
 *
 * Usage:
 * ```typescript
 * router.post('/', validate(mySchema), handler);
 * ```
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and transform request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod errors to our ValidationError format
        const validationError = new ValidationError(
          'Validation failed',
          error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        next(validationError);
      } else {
        // Unexpected error
        next(error);
      }
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Query parameter validation failed',
          error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'URL parameter validation failed',
          error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};
