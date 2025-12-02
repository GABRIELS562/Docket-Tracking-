import { DomainError } from './DomainError';

/**
 * Error thrown when a user cannot be found
 */
export class UserNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'id' | 'email' = 'id') {
    super(
      `User with ${identifierType} "${identifier}" was not found`,
      'USER_NOT_FOUND',
      { [identifierType]: identifier }
    );
  }
}
