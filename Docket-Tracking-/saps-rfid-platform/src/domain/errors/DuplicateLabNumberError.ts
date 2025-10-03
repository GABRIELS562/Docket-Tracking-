import { DomainError } from './DomainError';

/**
 * Error thrown when attempting to create a docket with a lab number that already exists
 */
export class DuplicateLabNumberError extends DomainError {
  constructor(labNumber: string) {
    super(
      `A docket with lab number "${labNumber}" already exists`,
      'DUPLICATE_LAB_NUMBER',
      { labNumber }
    );
  }
}
