import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let message = error.message || 'Internal Server Error';
  let statusCode = error.statusCode || 500;

  // Log the error
  logger.error(`Error ${statusCode}: ${message}`);
  logger.error('Stack trace:', error.stack);

  // Handle specific PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        statusCode = 409;
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key constraint violation
        statusCode = 400;
        message = 'Invalid reference to related resource';
        break;
      case '23502': // Not null constraint violation
        statusCode = 400;
        message = 'Required field is missing';
        break;
      case '42P01': // Undefined table
        statusCode = 500;
        message = 'Database table not found';
        break;
      default:
        break;
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code 
      })
    }
  });
};