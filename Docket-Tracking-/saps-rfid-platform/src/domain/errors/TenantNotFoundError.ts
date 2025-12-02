import { DomainError } from './DomainError';

/**
 * Error thrown when a tenant cannot be found
 */
export class TenantNotFoundError extends DomainError {
  constructor(identifier: string, identifierType: 'id' | 'slug' = 'id') {
    super(
      `Tenant with ${identifierType} "${identifier}" was not found`,
      'TENANT_NOT_FOUND',
      { [identifierType]: identifier }
    );
  }
}
