import { DomainError } from './DomainError';

/**
 * Error thrown when reader validation fails
 */
export class InvalidReaderError extends DomainError {
  constructor(reason: string, metadata?: Record<string, unknown>) {
    super(`Invalid reader: ${reason}`, 'INVALID_READER', metadata);
  }
}
