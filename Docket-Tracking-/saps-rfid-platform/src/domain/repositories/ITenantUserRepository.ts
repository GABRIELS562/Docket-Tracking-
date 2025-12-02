import type { Result } from 'neverthrow';

import type { TenantUser, UserRole } from '../entities/TenantUser';

/**
 * User search criteria
 */
export interface TenantUserSearchCriteria {
  /**
   * Filter by tenant ID
   */
  readonly tenantId: string;

  /**
   * Search by name or email
   */
  readonly query?: string;

  /**
   * Filter by role
   */
  readonly role?: UserRole;

  /**
   * Only return active users
   */
  readonly activeOnly?: boolean;

  /**
   * Only return verified users
   */
  readonly verifiedOnly?: boolean;

  /**
   * Sort field
   */
  readonly sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt';

  /**
   * Sort order
   */
  readonly sortOrder?: 'asc' | 'desc';

  /**
   * Pagination limit
   */
  readonly limit?: number;

  /**
   * Pagination offset
   */
  readonly offset?: number;
}

/**
 * TenantUser Repository Interface
 *
 * Defines the contract for persisting and retrieving tenant users.
 */
export interface ITenantUserRepository {
  /**
   * Saves a new user
   */
  save(user: TenantUser): Promise<Result<void, Error>>;

  /**
   * Finds a user by ID
   */
  findById(id: string): Promise<Result<TenantUser | null, Error>>;

  /**
   * Finds a user by email (globally unique)
   */
  findByEmail(email: string): Promise<Result<TenantUser | null, Error>>;

  /**
   * Finds a user by email within a tenant
   */
  findByEmailAndTenant(email: string, tenantId: string): Promise<Result<TenantUser | null, Error>>;

  /**
   * Finds all users for a tenant
   */
  findByTenant(tenantId: string): Promise<Result<TenantUser[], Error>>;

  /**
   * Searches users by criteria
   */
  search(criteria: TenantUserSearchCriteria): Promise<Result<{ users: TenantUser[]; total: number }, Error>>;

  /**
   * Finds users by role within a tenant
   */
  findByRole(tenantId: string, role: UserRole): Promise<Result<TenantUser[], Error>>;

  /**
   * Finds the owner of a tenant
   */
  findOwner(tenantId: string): Promise<Result<TenantUser | null, Error>>;

  /**
   * Updates an existing user
   */
  update(user: TenantUser): Promise<Result<void, Error>>;

  /**
   * Deletes a user
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Checks if an email exists within a tenant
   */
  existsByEmailAndTenant(email: string, tenantId: string): Promise<Result<boolean, Error>>;

  /**
   * Counts users by tenant
   */
  countByTenant(tenantId: string): Promise<Result<number, Error>>;

  /**
   * Counts users by role within a tenant
   */
  countByRole(tenantId: string): Promise<Result<Map<UserRole, number>, Error>>;

  /**
   * Finds users who haven't logged in for a specified period
   */
  findInactiveUsers(tenantId: string, daysSinceLastLogin: number): Promise<Result<TenantUser[], Error>>;

  /**
   * Finds locked out users
   */
  findLockedUsers(tenantId: string): Promise<Result<TenantUser[], Error>>;
}
