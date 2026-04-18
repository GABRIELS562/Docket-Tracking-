import type { Item, ItemStatus } from '../entities/Item';
import type { DuplicateEpcError } from '../errors/DuplicateEpcError';
import type { DuplicateItemNumberError } from '../errors/DuplicateItemNumberError';
import type { ItemNotFoundError } from '../errors/ItemNotFoundError';
import type { ItemNumber } from '../value-objects/ItemNumber';
import type { RfidEpc } from '../value-objects/RfidEpc';
import type { Result } from 'neverthrow';

/**
 * Search criteria for items
 *
 * @description
 * Flexible search criteria allowing filtering by multiple attributes.
 * All criteria are optional and combined with AND logic.
 * tenantId is REQUIRED for multi-tenant data isolation.
 *
 * @example
 * ```typescript
 * const criteria: ItemSearchCriteria = {
 *   tenantId: 'tenant-uuid',
 *   query: 'INV-2025',
 *   status: ItemStatus.REGISTERED,
 *   zoneId: 'zone-001',
 *   limit: 20,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * };
 * ```
 */
export interface ItemSearchCriteria {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Full-text search in item number, reference ID, description, or serial number
   */
  readonly query?: string;

  /**
   * Filter by item status
   */
  readonly status?: ItemStatus;

  /**
   * Filter by current zone
   */
  readonly zoneId?: string;

  /**
   * Filter by item category
   */
  readonly category?: string;

  /**
   * Filter items created after this date
   */
  readonly createdAfter?: Date;

  /**
   * Filter items created before this date
   */
  readonly createdBefore?: Date;

  /**
   * Filter items last seen after this date
   */
  readonly lastSeenAfter?: Date;

  /**
   * Filter items last seen before this date
   */
  readonly lastSeenBefore?: Date;

  /**
   * Filter only active items (not archived or disposed)
   */
  readonly activeOnly?: boolean;

  /**
   * Maximum number of results to return
   * @default 10
   * @maximum 100
   */
  readonly limit?: number;

  /**
   * Number of results to skip (for pagination)
   * @default 0
   */
  readonly offset?: number;

  /**
   * Field to sort by
   * @default 'createdAt'
   */
  readonly sortBy?: 'itemNumber' | 'createdAt' | 'lastSeenAt' | 'referenceId';

  /**
   * Sort order
   * @default 'desc'
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated search result for items
 *
 * @description
 * Contains the matching items plus pagination metadata
 * for implementing infinite scroll or traditional pagination.
 */
export interface ItemSearchResult {
  /**
   * Array of items matching the search criteria
   */
  readonly items: Item[];

  /**
   * Total number of items matching the criteria (before pagination)
   */
  readonly total: number;

  /**
   * Number of results per page (from criteria)
   */
  readonly limit: number;

  /**
   * Number of results skipped (from criteria)
   */
  readonly offset: number;

  /**
   * Whether there are more results available
   */
  readonly hasMore: boolean;
}

/**
 * Item Repository Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for persisting and retrieving items.
 * This is an interface defined in the domain layer; implementations
 * will be provided by the infrastructure layer.
 *
 * Responsibilities:
 * - Persist items to storage
 * - Query items by various criteria
 * - Update item state
 * - Ensure data integrity (unique item numbers, unique EPCs)
 *
 * All methods are async and return Result<T, Error> for functional error handling.
 * Methods never throw exceptions - all errors are returned as Error values.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class PostgresItemRepository implements IItemRepository {
 *   async save(item: Item): Promise<Result<void, Error>> {
 *     // Implementation with PostgreSQL
 *   }
 * }
 * ```
 */
export interface IItemRepository {
  /**
   * Saves a new item to the repository
   *
   * @param item - The item entity to save
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @throws {DuplicateItemNumberError} If an item with this item number already exists
   * @throws {DuplicateEpcError} If an item with this RFID EPC already exists
   *
   * @example
   * ```typescript
   * const result = await repository.save(item, 'tenant-uuid');
   *
   * if (result.isErr()) {
   *   if (result.error instanceof DuplicateItemNumberError) {
   *     console.error('Item number already in use');
   *   }
   * }
   * ```
   */
  save(
    item: Item,
    tenantId: string
  ): Promise<Result<void, DuplicateItemNumberError | DuplicateEpcError | Error>>;

  /**
   * Finds an item by its unique ID
   *
   * @param id - The item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the item or null if not found
   */
  findById(id: string, tenantId: string): Promise<Result<Item | null, Error>>;

  /**
   * Finds an item by its item number
   *
   * @param itemNumber - The item number value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the item or ItemNotFoundError
   *
   * @example
   * ```typescript
   * const itemNumber = ItemNumber.create('INV-2025-000123').unwrap();
   * const result = await repository.findByItemNumber(itemNumber, 'tenant-uuid');
   *
   * if (result.isOk()) {
   *   const item = result.value;
   *   console.log(item.getReferenceId());
   * }
   * ```
   */
  findByItemNumber(
    itemNumber: ItemNumber,
    tenantId: string
  ): Promise<Result<Item, ItemNotFoundError>>;

  /**
   * Finds an item by its RFID EPC
   *
   * @param epc - The RFID EPC value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the item or ItemNotFoundError
   *
   * @example
   * ```typescript
   * const epc = RfidEpc.create('E280116060002004DECA48DA').unwrap();
   * const result = await repository.findByEpc(epc, 'tenant-uuid');
   * ```
   */
  findByEpc(epc: RfidEpc, tenantId: string): Promise<Result<Item, ItemNotFoundError>>;

  /**
   * Searches for items using flexible criteria
   *
   * @param criteria - Search criteria and pagination options
   * @returns Result containing paginated search results
   *
   * @example
   * ```typescript
   * const result = await repository.search({
   *   query: 'laptop',
   *   status: ItemStatus.REGISTERED,
   *   limit: 20,
   *   offset: 0
   * });
   *
   * if (result.isOk()) {
   *   const { items, total, hasMore } = result.value;
   *   console.log(`Found ${items.length} of ${total} total items`);
   * }
   * ```
   */
  search(criteria: ItemSearchCriteria): Promise<Result<ItemSearchResult, Error>>;

  /**
   * Finds all items in a specific zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of items in the zone
   */
  findByZone(zoneId: string, tenantId: string): Promise<Result<Item[], Error>>;

  /**
   * Finds recently detected items in a zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param limit - Maximum number of results (default: 10)
   * @returns Result containing array of recently seen items
   *
   * @description
   * Returns items sorted by lastSeenAt descending (most recent first).
   * Only includes items that have been seen at least once.
   */
  findRecentByZone(
    zoneId: string,
    tenantId: string,
    limit?: number
  ): Promise<Result<Item[], Error>>;

  /**
   * Finds all active items (not archived or disposed)
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of active items
   */
  findAllActive(tenantId: string): Promise<Result<Item[], Error>>;

  /**
   * Finds all items marked as missing
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of missing items
   */
  findAllMissing(tenantId: string): Promise<Result<Item[], Error>>;

  /**
   * Finds items that haven't been seen within the threshold
   *
   * @param thresholdHours - Hours without detection before considered stale
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of stale items
   *
   * @description
   * Returns items where:
   * - Status is REGISTERED or IN_TRANSIT or IN_PROCESSING
   * - lastSeenAt is older than thresholdHours
   * - OR lastSeenAt is null
   *
   * This is typically used by a background job to mark items as missing.
   *
   * @example
   * ```typescript
   * // Find items not seen in 48 hours
   * const result = await repository.findStale(48, 'tenant-uuid');
   *
   * if (result.isOk()) {
   *   for (const item of result.value) {
   *     await item.markAsMissing();
   *     await repository.update(item, 'tenant-uuid');
   *   }
   * }
   * ```
   */
  findStale(thresholdHours: number, tenantId: string): Promise<Result<Item[], Error>>;

  /**
   * Updates an existing item
   *
   * @param item - The item entity with updated values
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields of the item.
   * The item is identified by its ID.
   * Item number and RFID EPC cannot be changed (immutable identifiers).
   */
  update(item: Item, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Deletes an item (typically a soft delete)
   *
   * @param id - The item ID to delete
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * In most implementations, this performs a soft delete by setting
   * the item status to DISPOSED or ARCHIVED rather than physically
   * removing the record.
   */
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;

  /**
   * Counts the total number of active items
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the count
   *
   * @description
   * Returns the count of items with status REGISTERED, IN_TRANSIT, or IN_PROCESSING.
   * Excludes ARCHIVED, DISPOSED, and MISSING items.
   */
  countActive(tenantId: string): Promise<Result<number, Error>>;

  /**
   * Checks if an item number already exists
   *
   * @param itemNumber - The item number to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing boolean (true if exists)
   *
   * @example
   * ```typescript
   * const itemNumber = ItemNumber.create('INV-2025-000123').unwrap();
   * const result = await repository.existsByItemNumber(itemNumber, 'tenant-uuid');
   *
   * if (result.isOk() && result.value) {
   *   console.error('Item number already in use');
   * }
   * ```
   */
  existsByItemNumber(itemNumber: ItemNumber, tenantId: string): Promise<Result<boolean, Error>>;

  /**
   * Checks if an RFID EPC is already assigned
   *
   * @param epc - The RFID EPC to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing boolean (true if assigned)
   *
   * @description
   * Used to prevent assigning the same RFID tag to multiple items.
   */
  existsByEpc(epc: RfidEpc, tenantId: string): Promise<Result<boolean, Error>>;
}
