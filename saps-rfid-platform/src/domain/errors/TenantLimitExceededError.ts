import { DomainError } from './DomainError';

/**
 * Error thrown when a tenant exceeds their subscription limits
 */
export class TenantLimitExceededError extends DomainError {
  constructor(
    tenantId: string,
    resource: 'items' | 'users' | 'zones' | 'readers',
    limit: number,
    current: number
  ) {
    super(`Tenant limit exceeded: ${resource} (${current}/${limit})`, 'TENANT_LIMIT_EXCEEDED', {
      tenantId,
      resource,
      limit,
      current,
    });
  }
}
