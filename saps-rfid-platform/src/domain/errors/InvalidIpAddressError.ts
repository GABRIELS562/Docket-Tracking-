import { DomainError } from './DomainError';

/**
 * Error thrown when an IP address fails validation
 *
 * IP addresses must be valid IPv4 format (xxx.xxx.xxx.xxx)
 */
export class InvalidIpAddressError extends DomainError {
  constructor(value: string, reason: string) {
    super(`Invalid IP address "${value}": ${reason}`, 'INVALID_IP_ADDRESS', {
      value,
      reason,
    });
  }
}
