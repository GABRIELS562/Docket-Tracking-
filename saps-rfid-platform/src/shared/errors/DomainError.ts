/**
 * DomainError - Base class for domain-specific errors
 *
 * Used for business rule violations and domain-specific failures
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }
}
