import { DomainError } from './DomainError';

/**
 * Error thrown when a lab number fails validation
 *
 * Lab numbers must follow the format: FSL-YYYY-NNNNNN
 * - FSL prefix
 * - 4-digit year (2020-2099)
 * - 6-digit sequence number (000001-999999)
 */
export class InvalidLabNumberError extends DomainError {
  constructor(value: string, reason: string) {
    super(
      `Invalid lab number "${value}": ${reason}`,
      'INVALID_LAB_NUMBER',
      { value, reason }
    );
  }
}
