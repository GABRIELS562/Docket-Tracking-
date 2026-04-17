import { DomainError } from './DomainError';

/**
 * Error thrown when an item number fails validation
 *
 * Item numbers must follow the flexible format:
 * - Alphanumeric characters, hyphens, slashes, or underscores
 * - 1-50 characters
 * - Must start with alphanumeric character
 */
export class InvalidItemNumberError extends DomainError {
  constructor(value: string, reason: string) {
    super(
      `Invalid item number "${value}": ${reason}`,
      'INVALID_ITEM_NUMBER',
      { value, reason }
    );
  }
}
