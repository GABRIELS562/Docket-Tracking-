import type { Result } from 'neverthrow';

import type { Tenant, SubscriptionTier, SubscriptionStatus } from '../entities/Tenant';

/**
 * Tenant search criteria
 */
export interface TenantSearchCriteria {
  /**
   * Search by name or slug
   */
  readonly query?: string;

  /**
   * Filter by subscription tier
   */
  readonly subscriptionTier?: SubscriptionTier;

  /**
   * Filter by subscription status
   */
  readonly subscriptionStatus?: SubscriptionStatus;

  /**
   * Only return active tenants
   */
  readonly activeOnly?: boolean;

  /**
   * Sort field
   */
  readonly sortBy?: 'name' | 'createdAt' | 'subscriptionTier';

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
 * Tenant usage statistics
 */
export interface TenantUsageStats {
  readonly tenantId: string;
  readonly itemCount: number;
  readonly userCount: number;
  readonly zoneCount: number;
  readonly readerCount: number;
  readonly apiRequestsToday: number;
  readonly apiRequestsThisMonth: number;
  readonly storageUsedBytes: number;
}

/**
 * Tenant Repository Interface
 *
 * Defines the contract for persisting and retrieving tenants.
 */
export interface ITenantRepository {
  /**
   * Saves a new tenant
   */
  save(tenant: Tenant): Promise<Result<void, Error>>;

  /**
   * Finds a tenant by ID
   */
  findById(id: string): Promise<Result<Tenant | null, Error>>;

  /**
   * Finds a tenant by slug
   */
  findBySlug(slug: string): Promise<Result<Tenant | null, Error>>;

  /**
   * Finds all tenants
   */
  findAll(): Promise<Result<Tenant[], Error>>;

  /**
   * Searches tenants by criteria
   */
  search(criteria: TenantSearchCriteria): Promise<Result<{ tenants: Tenant[]; total: number }, Error>>;

  /**
   * Finds tenants with expiring trials
   */
  findExpiringTrials(daysUntilExpiry: number): Promise<Result<Tenant[], Error>>;

  /**
   * Updates an existing tenant
   */
  update(tenant: Tenant): Promise<Result<void, Error>>;

  /**
   * Deletes a tenant
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Checks if a slug is already in use
   */
  existsBySlug(slug: string): Promise<Result<boolean, Error>>;

  /**
   * Gets usage statistics for a tenant
   */
  getUsageStats(tenantId: string): Promise<Result<TenantUsageStats, Error>>;

  /**
   * Gets count of tenants by subscription tier
   */
  countBySubscriptionTier(): Promise<Result<Map<SubscriptionTier, number>, Error>>;
}
