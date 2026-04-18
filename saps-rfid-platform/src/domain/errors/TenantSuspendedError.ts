import { DomainError } from './DomainError';

/**
 * Error thrown when attempting to access a suspended tenant
 */
export class TenantSuspendedError extends DomainError {
  constructor(tenantId: string) {
    super(`Tenant "${tenantId}" is suspended and cannot be accessed`, 'TENANT_SUSPENDED', {
      tenantId,
    });
  }
}
