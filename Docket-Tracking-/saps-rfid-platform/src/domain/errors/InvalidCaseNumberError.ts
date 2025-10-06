import { DomainError } from './DomainError';

/**
 * Error thrown when a case number fails validation
 */
export class InvalidCaseNumberError extends DomainError {
  constructor(
    public readonly invalidValue: string,
    public readonly validationMessage: string
  ) {
    super(
      `Invalid case number "${invalidValue}": ${validationMessage}`,
      'INVALID_CASE_NUMBER'
    );
  }
}
