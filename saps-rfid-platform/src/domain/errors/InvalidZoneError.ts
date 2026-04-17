import { DomainError } from './DomainError';

/**
 * Error thrown when zone validation fails
 */
export class InvalidZoneError extends DomainError {
  constructor(reason: string, metadata?: Record<string, unknown>) {
    super(`Invalid zone: ${reason}`, 'INVALID_ZONE', metadata);
  }
}
