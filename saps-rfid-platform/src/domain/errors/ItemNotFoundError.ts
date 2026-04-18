import { DomainError } from './DomainError';

/**
 * Error thrown when an item cannot be found
 */
export class ItemNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'itemNumber' | 'epc' | 'id') {
    super(`Item not found with ${identifierType}: ${identifier}`, 'ITEM_NOT_FOUND', {
      identifier,
      identifierType,
    });
  }
}
