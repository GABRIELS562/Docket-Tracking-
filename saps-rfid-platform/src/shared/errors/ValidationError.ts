/**
 * ValidationError - Input validation failures
 *
 * Contains structured error details for field-level validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
