import { DomainError } from './DomainError';

/**
 * Error thrown when a reader cannot be found
 */
export class ReaderNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'id' | 'ipAddress' = 'id') {
    super(
      `Reader not found with ${identifierType}: ${identifier}`,
      'READER_NOT_FOUND',
      { identifier, identifierType }
    );
  }
}
