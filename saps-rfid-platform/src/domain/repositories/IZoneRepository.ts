import type { Zone, ZoneType } from '../entities/Zone';
import type { ZoneNotFoundError } from '../errors/ZoneNotFoundError';
import type { Result } from 'neverthrow';

/**
 * Zone occupancy information
 *
 * @description
 * Combines zone metadata with current occupancy statistics.
 * Used for dashboard displays and capacity monitoring.
 */
export interface ZoneOccupancyInfo {
  /**
   * Zone ID
   */
  readonly zoneId: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

  /**
   * Current number of items in the zone
   */
  readonly currentOccupancy: number;

  /**
   * Maximum capacity
   */
  readonly capacity: number;

  /**
   * Occupancy percentage (0-100)
   */
  readonly occupancyPercentage: number;

  /**
   * Occupancy status classification
   */
  readonly occupancyStatus: 'normal' | 'warning' | 'critical' | 'full';
}

/**
 * Search criteria for zones
 */
export interface ZoneSearchCriteria {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Search by zone name or code
   */
  readonly query?: string;

  /**
   * Filter by zone type
   */
  readonly zoneType?: ZoneType;

  /**
   * Filter by parent zone
   */
  readonly parentZoneId?: string;

  /**
   * Filter by building
   */
  readonly building?: string;

  /**
   * Filter by floor number
   */
  readonly floorNumber?: number;

  /**
   * Only return active zones
   */
  readonly activeOnly?: boolean;

  /**
   * Sort field
   */
  readonly sortBy?: 'name' | 'code' | 'occupancy' | 'capacity';

  /**
   * Sort order
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Zone Repository Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for persisting and retrieving zones.
 * This is an interface defined in the domain layer; implementations
 * will be provided by the infrastructure layer.
 *
 * Responsibilities:
 * - Persist zones to storage
 * - Query zones by various criteria
 * - Track zone occupancy (may use cached/aggregated values)
 * - Support hierarchical zone relationships
 *
 * All methods are async and return Result<T, Error> for functional error handling.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class PostgresZoneRepository implements IZoneRepository {
 *   async findById(zoneId: string): Promise<Result<Zone, ZoneNotFoundError>> {
 *     // Implementation with PostgreSQL
 *   }
 * }
 * ```
 */
export interface IZoneRepository {
  /**
   * Saves a new zone to the repository
   *
   * @param zone - The zone entity to save
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const zone = Zone.create({
   *   id: 'zone-001',
   *   name: 'Storage Area A',
   *   code: 'STOR-A',
   *   zoneType: ZoneType.STORAGE,
   *   capacity: 500
   * }).unwrap();
   *
   * const result = await repository.save(zone, 'tenant-uuid');
   * ```
   */
  save(zone: Zone, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Finds a zone by its unique ID
   *
   * @param id - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the zone or null if not found
   */
  findById(id: string, tenantId: string): Promise<Result<Zone | null, Error>>;

  /**
   * Finds a zone by its unique code
   *
   * @param code - The zone code (e.g., "STOR-A")
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the zone or ZoneNotFoundError
   *
   * @example
   * ```typescript
   * const result = await repository.findByCode('STOR-A', 'tenant-uuid');
   *
   * if (result.isOk()) {
   *   const zone = result.value;
   *   console.log(`Zone: ${zone.getName()}`);
   * }
   * ```
   */
  findByCode(code: string, tenantId: string): Promise<Result<Zone, ZoneNotFoundError>>;

  /**
   * Finds all zones for a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of all zones
   *
   * @description
   * Returns all zones for the tenant regardless of status.
   * For active zones only, use search() with activeOnly: true.
   */
  findAll(tenantId: string): Promise<Result<Zone[], Error>>;

  /**
   * Finds all active zones for a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of active zones
   *
   * @description
   * Returns zones where isActive is true for the given tenant.
   */
  findAllActive(tenantId: string): Promise<Result<Zone[], Error>>;

  /**
   * Finds zones by type
   *
   * @param zoneType - The type of zone to find
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of matching zones
   *
   * @example
   * ```typescript
   * const result = await repository.findByType(ZoneType.STORAGE, 'tenant-uuid');
   *
   * if (result.isOk()) {
   *   console.log(`Found ${result.value.length} storage zones`);
   * }
   * ```
   */
  findByType(zoneType: ZoneType, tenantId: string): Promise<Result<Zone[], Error>>;

  /**
   * Finds all child zones of a parent zone
   *
   * @param parentZoneId - The parent zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of child zones
   *
   * @description
   * Returns zones where parentZoneId matches the given ID.
   * Useful for hierarchical zone navigation.
   */
  findByParent(parentZoneId: string, tenantId: string): Promise<Result<Zone[], Error>>;

  /**
   * Searches for zones using flexible criteria
   *
   * @param criteria - Search criteria (includes tenantId)
   * @returns Result containing array of matching zones
   */
  search(criteria: ZoneSearchCriteria): Promise<Result<Zone[], Error>>;

  /**
   * Finds zones near capacity threshold
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param threshold - Occupancy percentage threshold (default: 80%)
   * @returns Result containing array of zones near capacity
   *
   * @description
   * Returns zones where occupancy percentage >= threshold.
   * Useful for capacity alerts and planning.
   *
   * @example
   * ```typescript
   * // Find zones at 90% capacity or higher
   * const result = await repository.findNearCapacity('tenant-uuid', 90);
   *
   * if (result.isOk()) {
   *   for (const zone of result.value) {
   *     console.log(`${zone.getName()} is at ${zone.getOccupancyPercentage()}%`);
   *   }
   * }
   * ```
   */
  findNearCapacity(tenantId: string, threshold?: number): Promise<Result<Zone[], Error>>;

  /**
   * Gets current occupancy count for a specific zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the current occupancy count
   *
   * @description
   * Returns the real-time count of items in the zone.
   * Implementation may use a cached/aggregated value for performance.
   * The count should be updated whenever:
   * - An item's location is updated
   * - An item is archived/disposed
   * - An item enters/leaves the zone
   */
  getOccupancy(zoneId: string, tenantId: string): Promise<Result<number, Error>>;

  /**
   * Gets current occupancy counts for all zones
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing Map of zone ID to occupancy count
   *
   * @description
   * Efficiently retrieves occupancy for all zones in a single query.
   * Used for dashboard displays showing all zone statuses.
   *
   * @example
   * ```typescript
   * const result = await repository.getAllOccupancies('tenant-uuid');
   *
   * if (result.isOk()) {
   *   const occupancies = result.value;
   *   for (const [zoneId, count] of occupancies) {
   *     console.log(`Zone ${zoneId}: ${count} items`);
   *   }
   * }
   * ```
   */
  getAllOccupancies(tenantId: string): Promise<Result<Map<string, number>, Error>>;

  /**
   * Gets occupancy information for all zones
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of zone occupancy info
   *
   * @description
   * Returns enriched occupancy data combining zone metadata
   * with current occupancy statistics. More efficient than
   * calling getOccupancy() for each zone individually.
   *
   * @example
   * ```typescript
   * const result = await repository.getAllOccupancyInfo('tenant-uuid');
   *
   * if (result.isOk()) {
   *   for (const info of result.value) {
   *     if (info.occupancyStatus === 'critical') {
   *       console.warn(`${info.zoneName} is at ${info.occupancyPercentage}%`);
   *     }
   *   }
   * }
   * ```
   */
  getAllOccupancyInfo(tenantId: string): Promise<Result<ZoneOccupancyInfo[], Error>>;

  /**
   * Updates an existing zone
   *
   * @param zone - The zone entity with updated values
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields of the zone.
   * The zone is identified by its ID.
   * Zone code cannot be changed (immutable identifier).
   */
  update(zone: Zone, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Deletes a zone
   *
   * @param id - The zone ID to delete
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Physical deletion is only allowed if:
   * - The zone has no items (occupancy = 0)
   * - The zone has no child zones
   *
   * Otherwise, the zone should be deactivated instead.
   */
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Checks if a zone code already exists for a tenant
   *
   * @param code - The zone code to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing boolean (true if exists)
   *
   * @description
   * Used to prevent duplicate zone codes during creation.
   * Zone codes must be unique within a tenant.
   */
  existsByCode(code: string, tenantId: string): Promise<Result<boolean, Error>>;

  /**
   * Increments the occupancy count for a zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically increments the occupancy counter.
   * Called when an item enters the zone.
   * Should fail if zone is at capacity.
   */
  incrementOccupancy(zoneId: string, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Decrements the occupancy count for a zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically decrements the occupancy counter.
   * Called when an item leaves the zone.
   * Should fail if occupancy is already 0.
   */
  decrementOccupancy(zoneId: string, tenantId: string): Promise<Result<void, Error>>;
}
