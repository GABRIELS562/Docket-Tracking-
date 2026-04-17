import { DomainError } from './DomainError';

/**
 * Error thrown when a zone cannot be found
 */
export class ZoneNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'id' | 'code' = 'id') {
    super(`Zone not found with ${identifierType}: ${identifier}`, 'ZONE_NOT_FOUND', {
      identifier,
      identifierType,
    });
  }
}
