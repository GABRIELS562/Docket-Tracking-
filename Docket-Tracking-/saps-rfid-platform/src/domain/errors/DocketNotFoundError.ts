import { DomainError } from './DomainError';

/**
 * Error thrown when a docket cannot be found
 */
export class DocketNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'labNumber' | 'epc' | 'id') {
    super(
      `Docket not found with ${identifierType}: ${identifier}`,
      'DOCKET_NOT_FOUND',
      { identifier, identifierType }
    );
  }
}
