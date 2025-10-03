import { DomainError } from './DomainError';

/**
 * Error thrown when an RFID EPC fails validation
 *
 * EPCs must be exactly 24 hexadecimal characters
 */
export class InvalidEpcError extends DomainError {
  constructor(value: string, reason: string) {
    super(`Invalid RFID EPC "${value}": ${reason}`, 'INVALID_EPC', { value, reason });
  }
}
