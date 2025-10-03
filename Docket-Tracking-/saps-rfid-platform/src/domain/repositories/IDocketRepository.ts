import type { Result } from 'neverthrow';

import type { Docket, DocketStatus } from '../entities/Docket';
import type { LabNumber } from '../value-objects/LabNumber';
import type { RfidEpc } from '../value-objects/RfidEpc';
import type { DocketNotFoundError } from '../errors/DocketNotFoundError';
import type { DuplicateLabNumberError } from '../errors/DuplicateLabNumberError';
import type { DuplicateEpcError } from '../errors/DuplicateEpcError';

/**
 * Search criteria for dockets
 *
 * @description
 * Flexible search criteria allowing filtering by multiple attributes.
 * All criteria are optional and combined with AND logic.
 *
 * @example
 * ```typescript
 * const criteria: DocketSearchCriteria = {
 *   query: 'FSL-2025',
 *   status: DocketStatus.REGISTERED,
 *   zoneId: 'zone-001',
 *   limit: 20,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * };
 * ```
 */
export interface DocketSearchCriteria {
  /**
   * Full-text search in lab number, case number, description, or exhibit number
   */
  readonly query?: string;

  /**
   * Filter by docket status
   */
  readonly status?: DocketStatus;

  /**
   * Filter by current zone
   */
  readonly zoneId?: string;

  /**
   * Filter by docket category
   */
  readonly category?: string;

  /**
   * Filter dockets created after this date
   */
  readonly createdAfter?: Date;

  /**
   * Filter dockets created before this date
   */
  readonly createdBefore?: Date;

  /**
   * Filter dockets last seen after this date
   */
  readonly lastSeenAfter?: Date;

  /**
   * Filter dockets last seen before this date
   */
  readonly lastSeenBefore?: Date;

  /**
   * Filter only active dockets (not archived or disposed)
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
  readonly sortBy?: 'labNumber' | 'createdAt' | 'lastSeenAt' | 'caseNumber';

  /**
   * Sort order
   * @default 'desc'
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated search result for dockets
 *
 * @description
 * Contains the matching dockets plus pagination metadata
 * for implementing infinite scroll or traditional pagination.
 */
export interface DocketSearchResult {
  /**
   * Array of dockets matching the search criteria
   */
  readonly dockets: Docket[];

  /**
   * Total number of dockets matching the criteria (before pagination)
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
 * Docket Repository Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for persisting and retrieving dockets.
 * This is an interface defined in the domain layer; implementations
 * will be provided by the infrastructure layer.
 *
 * Responsibilities:
 * - Persist dockets to storage
 * - Query dockets by various criteria
 * - Update docket state
 * - Ensure data integrity (unique lab numbers, unique EPCs)
 *
 * All methods are async and return Result<T, Error> for functional error handling.
 * Methods never throw exceptions - all errors are returned as Error values.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class PostgresDocketRepository implements IDocketRepository {
 *   async save(docket: Docket): Promise<Result<void, Error>> {
 *     // Implementation with PostgreSQL
 *   }
 * }
 * ```
 */
export interface IDocketRepository {
  /**
   * Saves a new docket to the repository
   *
   * @param docket - The docket entity to save
   * @returns Result indicating success or failure
   *
   * @throws {DuplicateLabNumberError} If a docket with this lab number already exists
   * @throws {DuplicateEpcError} If a docket with this RFID EPC already exists
   *
   * @example
   * ```typescript
   * const result = await repository.save(docket);
   *
   * if (result.isErr()) {
   *   if (result.error instanceof DuplicateLabNumberError) {
   *     console.error('Lab number already in use');
   *   }
   * }
   * ```
   */
  save(docket: Docket): Promise<Result<void, DuplicateLabNumberError | DuplicateEpcError | Error>>;

  /**
   * Finds a docket by its unique ID
   *
   * @param id - The docket ID
   * @returns Result containing the docket or null if not found
   */
  findById(id: string): Promise<Result<Docket | null, Error>>;

  /**
   * Finds a docket by its lab number
   *
   * @param labNumber - The lab number value object
   * @returns Result containing the docket or DocketNotFoundError
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('FSL-2025-000123').unwrap();
   * const result = await repository.findByLabNumber(labNumber);
   *
   * if (result.isOk()) {
   *   const docket = result.value;
   *   console.log(docket.getCaseNumber());
   * }
   * ```
   */
  findByLabNumber(labNumber: LabNumber): Promise<Result<Docket, DocketNotFoundError>>;

  /**
   * Finds a docket by its RFID EPC
   *
   * @param epc - The RFID EPC value object
   * @returns Result containing the docket or DocketNotFoundError
   *
   * @example
   * ```typescript
   * const epc = RfidEpc.create('E28011606000204DECA48DA').unwrap();
   * const result = await repository.findByEpc(epc);
   * ```
   */
  findByEpc(epc: RfidEpc): Promise<Result<Docket, DocketNotFoundError>>;

  /**
   * Searches for dockets using flexible criteria
   *
   * @param criteria - Search criteria and pagination options
   * @returns Result containing paginated search results
   *
   * @example
   * ```typescript
   * const result = await repository.search({
   *   query: 'firearm',
   *   status: DocketStatus.REGISTERED,
   *   limit: 20,
   *   offset: 0
   * });
   *
   * if (result.isOk()) {
   *   const { dockets, total, hasMore } = result.value;
   *   console.log(`Found ${dockets.length} of ${total} total dockets`);
   * }
   * ```
   */
  search(criteria: DocketSearchCriteria): Promise<Result<DocketSearchResult, Error>>;

  /**
   * Finds all dockets in a specific zone
   *
   * @param zoneId - The zone ID
   * @returns Result containing array of dockets in the zone
   */
  findByZone(zoneId: string): Promise<Result<Docket[], Error>>;

  /**
   * Finds recently detected dockets in a zone
   *
   * @param zoneId - The zone ID
   * @param limit - Maximum number of results (default: 10)
   * @returns Result containing array of recently seen dockets
   *
   * @description
   * Returns dockets sorted by lastSeenAt descending (most recent first).
   * Only includes dockets that have been seen at least once.
   */
  findRecentByZone(zoneId: string, limit?: number): Promise<Result<Docket[], Error>>;

  /**
   * Finds all active dockets (not archived or disposed)
   *
   * @returns Result containing array of active dockets
   */
  findAllActive(): Promise<Result<Docket[], Error>>;

  /**
   * Finds all dockets marked as missing
   *
   * @returns Result containing array of missing dockets
   */
  findAllMissing(): Promise<Result<Docket[], Error>>;

  /**
   * Finds dockets that haven't been seen within the threshold
   *
   * @param thresholdHours - Hours without detection before considered stale
   * @returns Result containing array of stale dockets
   *
   * @description
   * Returns dockets where:
   * - Status is REGISTERED or IN_TRANSIT or IN_EXAMINATION
   * - lastSeenAt is older than thresholdHours
   * - OR lastSeenAt is null
   *
   * This is typically used by a background job to mark dockets as missing.
   *
   * @example
   * ```typescript
   * // Find dockets not seen in 48 hours
   * const result = await repository.findStale(48);
   *
   * if (result.isOk()) {
   *   for (const docket of result.value) {
   *     await docket.markAsMissing();
   *     await repository.update(docket);
   *   }
   * }
   * ```
   */
  findStale(thresholdHours: number): Promise<Result<Docket[], Error>>;

  /**
   * Updates an existing docket
   *
   * @param docket - The docket entity with updated values
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields of the docket.
   * The docket is identified by its ID.
   * Lab number and RFID EPC cannot be changed (immutable identifiers).
   */
  update(docket: Docket): Promise<Result<void, Error>>;

  /**
   * Deletes a docket (typically a soft delete)
   *
   * @param id - The docket ID to delete
   * @returns Result indicating success or failure
   *
   * @description
   * In most implementations, this performs a soft delete by setting
   * the docket status to DISPOSED or ARCHIVED rather than physically
   * removing the record.
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Counts the total number of active dockets
   *
   * @returns Result containing the count
   *
   * @description
   * Returns the count of dockets with status REGISTERED, IN_TRANSIT, or IN_EXAMINATION.
   * Excludes ARCHIVED, DISPOSED, and MISSING dockets.
   */
  countActive(): Promise<Result<number, Error>>;

  /**
   * Checks if a lab number already exists
   *
   * @param labNumber - The lab number to check
   * @returns Result containing boolean (true if exists)
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('FSL-2025-000123').unwrap();
   * const result = await repository.existsByLabNumber(labNumber);
   *
   * if (result.isOk() && result.value) {
   *   console.error('Lab number already in use');
   * }
   * ```
   */
  existsByLabNumber(labNumber: LabNumber): Promise<Result<boolean, Error>>;

  /**
   * Checks if an RFID EPC is already assigned
   *
   * @param epc - The RFID EPC to check
   * @returns Result containing boolean (true if assigned)
   *
   * @description
   * Used to prevent assigning the same RFID tag to multiple dockets.
   */
  existsByEpc(epc: RfidEpc): Promise<Result<boolean, Error>>;
}
