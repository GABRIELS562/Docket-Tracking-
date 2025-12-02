import { DomainError } from './DomainError';

/**
 * Error thrown when a reference ID fails validation
 *
 * Reference IDs must:
 * - Not be empty
 * - Be 1-100 characters
 * - Contain only printable characters
 */
export class InvalidReferenceIdError extends DomainError {
  constructor(
    public readonly invalidValue: string,
    public readonly validationMessage: string
  ) {
    super(
      `Invalid reference ID "${invalidValue}": ${validationMessage}`,
      'INVALID_REFERENCE_ID'
    );
  }
}
