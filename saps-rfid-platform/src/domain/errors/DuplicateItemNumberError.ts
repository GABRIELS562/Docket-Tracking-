import { DomainError } from './DomainError';

/**
 * Error thrown when attempting to register an item with a duplicate item number
 */
export class DuplicateItemNumberError extends DomainError {
  constructor(itemNumber: string) {
    super(
      `Item number "${itemNumber}" is already in use`,
      'DUPLICATE_ITEM_NUMBER',
      { itemNumber }
    );
  }
}
