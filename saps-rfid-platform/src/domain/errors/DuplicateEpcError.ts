import { DomainError } from './DomainError';

/**
 * Error thrown when attempting to assign an EPC that is already in use
 */
export class DuplicateEpcError extends DomainError {
  constructor(epc: string) {
    super(
      `The RFID EPC "${epc}" is already assigned to another item`,
      'DUPLICATE_EPC',
      { epc }
    );
  }
}
