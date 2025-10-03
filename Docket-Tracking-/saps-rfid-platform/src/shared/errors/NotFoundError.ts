/**
 * NotFoundError - Resource not found
 *
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Error.captureStackTrace(this, this.constructor);
  }
}
