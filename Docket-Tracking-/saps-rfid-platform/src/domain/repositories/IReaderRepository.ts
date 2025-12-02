import type { Result } from 'neverthrow';

import type { Reader, ReaderStatus } from '../entities/Reader';
import type { IpAddress } from '../value-objects/IpAddress';
import type { ReaderNotFoundError } from '../errors/ReaderNotFoundError';

/**
 * Reader health statistics
 *
 * @description
 * Aggregated health metrics for a reader.
 * Used for monitoring and alerting.
 */
export interface ReaderHealthStats {
  /**
   * Reader ID
   */
  readonly readerId: string;

  /**
   * Reader name
   */
  readonly readerName: string;

  /**
   * Current status
   */
  readonly status: ReaderStatus;

  /**
   * Zone where reader is located
   */
  readonly zoneId: string;

  /**
   * Total tag reads performed
   */
  readonly totalReads: number;

  /**
   * Successful tag reads
   */
  readonly successfulReads: number;

  /**
   * Failed tag reads
   */
  readonly failedReads: number;

  /**
   * Success rate percentage (0-100)
   */
  readonly successRate: number;

  /**
   * Uptime in seconds
   */
  readonly uptimeSeconds: number;

  /**
   * Seconds since last connection
   */
  readonly secondsSinceLastConnection: number | null;

  /**
   * Whether the reader is considered healthy
   */
  readonly isHealthy: boolean;

  /**
   * Last error message (if any)
   */
  readonly lastError: string | null;
}

/**
 * Bulk status update for readers
 */
export interface ReaderStatusUpdate {
  /**
   * Reader ID to update
   */
  readonly readerId: string;

  /**
   * New status
   */
  readonly status: ReaderStatus;

  /**
   * Optional error message
   */
  readonly errorMessage?: string;

  /**
   * Timestamp of status change
   */
  readonly timestamp?: Date;
}

/**
 * Search criteria for readers
 */
export interface ReaderSearchCriteria {
  /**
   * Search by reader name or ID
   */
  readonly query?: string;

  /**
   * Filter by status
   */
  readonly status?: ReaderStatus;

  /**
   * Filter by zone
   */
  readonly zoneId?: string;

  /**
   * Filter by reader model
   */
  readonly readerModel?: string;

  /**
   * Only return active readers
   */
  readonly activeOnly?: boolean;

  /**
   * Only return healthy readers (online and functioning)
   */
  readonly healthyOnly?: boolean;

  /**
   * Sort field
   */
  readonly sortBy?: 'name' | 'status' | 'lastConnectedAt' | 'zone';

  /**
   * Sort order
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Reader Repository Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for persisting and retrieving RFID readers.
 * This is an interface defined in the domain layer; implementations
 * will be provided by the infrastructure layer.
 *
 * Responsibilities:
 * - Persist readers to storage
 * - Query readers by various criteria
 * - Track reader health and status
 * - Support bulk status updates for performance
 *
 * All methods are async and return Result<T, Error> for functional error handling.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class PostgresReaderRepository implements IReaderRepository {
 *   async findById(id: string): Promise<Result<Reader, ReaderNotFoundError>> {
 *     // Implementation with PostgreSQL
 *   }
 * }
 * ```
 */
export interface IReaderRepository {
  /**
   * Saves a new reader to the repository
   *
   * @param reader - The reader entity to save
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const ipAddress = IpAddress.create('192.168.1.100').unwrap();
   * const reader = Reader.create({
   *   id: 'reader-001',
   *   name: 'Storage Reader A1',
   *   ipAddress,
   *   port: 5084,
   *   zoneId: 'zone-001',
   *   antennaCount: 4,
   *   configuration: defaultConfig
   * }).unwrap();
   *
   * const result = await repository.save(reader);
   * ```
   */
  save(reader: Reader): Promise<Result<void, Error>>;

  /**
   * Finds a reader by its unique ID
   *
   * @param id - The reader ID
   * @returns Result containing the reader or null if not found
   */
  findById(id: string): Promise<Result<Reader | null, Error>>;

  /**
   * Finds a reader by its IP address
   *
   * @param ipAddress - The IP address value object
   * @returns Result containing the reader or ReaderNotFoundError
   *
   * @example
   * ```typescript
   * const ipAddress = IpAddress.create('192.168.1.100').unwrap();
   * const result = await repository.findByIpAddress(ipAddress);
   *
   * if (result.isOk()) {
   *   const reader = result.value;
   *   console.log(`Reader: ${reader.getName()}`);
   * }
   * ```
   */
  findByIpAddress(ipAddress: IpAddress): Promise<Result<Reader, ReaderNotFoundError>>;

  /**
   * Finds all readers
   *
   * @returns Result containing array of all readers
   */
  findAll(): Promise<Result<Reader[], Error>>;

  /**
   * Finds all active readers
   *
   * @returns Result containing array of active readers
   *
   * @description
   * Returns readers where isActive is true.
   */
  findAllActive(): Promise<Result<Reader[], Error>>;

  /**
   * Finds all readers in a specific zone
   *
   * @param zoneId - The zone ID
   * @returns Result containing array of readers in the zone
   *
   * @example
   * ```typescript
   * const result = await repository.findByZone('zone-001');
   *
   * if (result.isOk()) {
   *   console.log(`Found ${result.value.length} readers in zone`);
   * }
   * ```
   */
  findByZone(zoneId: string): Promise<Result<Reader[], Error>>;

  /**
   * Finds all online readers
   *
   * @returns Result containing array of online readers
   *
   * @description
   * Returns readers with status ONLINE.
   * Used to get list of active readers for tag reading operations.
   */
  findAllOnline(): Promise<Result<Reader[], Error>>;

  /**
   * Finds all offline or error readers
   *
   * @returns Result containing array of unhealthy readers
   *
   * @description
   * Returns readers with status OFFLINE or ERROR.
   * Used for health monitoring and alerting.
   */
  findAllUnhealthy(): Promise<Result<Reader[], Error>>;

  /**
   * Finds readers that haven't been seen within the threshold
   *
   * @param thresholdSeconds - Seconds without connection before considered stale
   * @returns Result containing array of stale readers
   *
   * @description
   * Returns readers where:
   * - lastConnectedAt is older than thresholdSeconds
   * - OR lastConnectedAt is null
   *
   * Used to detect readers that may have lost connectivity.
   *
   * @example
   * ```typescript
   * // Find readers not seen in 5 minutes (300 seconds)
   * const result = await repository.findStale(300);
   *
   * if (result.isOk()) {
   *   for (const reader of result.value) {
   *     console.warn(`Reader ${reader.getName()} may be offline`);
   *     await reader.markOffline();
   *     await repository.update(reader);
   *   }
   * }
   * ```
   */
  findStale(thresholdSeconds: number): Promise<Result<Reader[], Error>>;

  /**
   * Searches for readers using flexible criteria
   *
   * @param criteria - Search criteria
   * @returns Result containing array of matching readers
   *
   * @example
   * ```typescript
   * const result = await repository.search({
   *   status: ReaderStatus.ONLINE,
   *   zoneId: 'zone-001',
   *   healthyOnly: true
   * });
   * ```
   */
  search(criteria: ReaderSearchCriteria): Promise<Result<Reader[], Error>>;

  /**
   * Gets health statistics for all readers
   *
   * @returns Result containing array of reader health stats
   *
   * @description
   * Returns aggregated health metrics for all readers.
   * More efficient than calling getHealth() for each reader individually.
   *
   * @example
   * ```typescript
   * const result = await repository.getAllHealthStats();
   *
   * if (result.isOk()) {
   *   for (const stats of result.value) {
   *     if (!stats.isHealthy) {
   *       console.warn(`${stats.readerName} is unhealthy`);
   *     }
   *   }
   * }
   * ```
   */
  getAllHealthStats(): Promise<Result<ReaderHealthStats[], Error>>;

  /**
   * Updates an existing reader
   *
   * @param reader - The reader entity with updated values
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields of the reader.
   * The reader is identified by its ID.
   * IP address should not be changed after creation.
   */
  update(reader: Reader): Promise<Result<void, Error>>;

  /**
   * Bulk updates reader statuses
   *
   * @param updates - Array of status updates to apply
   * @returns Result indicating success or failure
   *
   * @description
   * Efficiently updates multiple reader statuses in a single transaction.
   * Used during health check cycles to update many readers at once.
   *
   * @example
   * ```typescript
   * const updates: ReaderStatusUpdate[] = [
   *   { readerId: 'reader-001', status: ReaderStatus.ONLINE },
   *   { readerId: 'reader-002', status: ReaderStatus.OFFLINE },
   *   { readerId: 'reader-003', status: ReaderStatus.ERROR, errorMessage: 'Connection timeout' }
   * ];
   *
   * const result = await repository.updateStatuses(updates);
   * ```
   */
  updateStatuses(updates: ReaderStatusUpdate[]): Promise<Result<void, Error>>;

  /**
   * Deletes a reader
   *
   * @param id - The reader ID to delete
   * @returns Result indicating success or failure
   *
   * @description
   * Physical deletion is only allowed if the reader is not currently
   * assigned to any zone with active items.
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Checks if an IP address is already in use
   *
   * @param ipAddress - The IP address to check
   * @returns Result containing boolean (true if in use)
   *
   * @description
   * Used to prevent assigning duplicate IP addresses during reader creation.
   * Each reader must have a unique IP address on the network.
   */
  existsByIpAddress(ipAddress: IpAddress): Promise<Result<boolean, Error>>;

  /**
   * Records a heartbeat from a reader
   *
   * @param readerId - The reader ID
   * @returns Result indicating success or failure
   *
   * @description
   * Updates the lastConnectedAt timestamp for the reader.
   * Called periodically when the reader sends keepalive messages.
   * Lightweight operation optimized for high frequency.
   */
  recordHeartbeat(readerId: string): Promise<Result<void, Error>>;

  /**
   * Increments read counters for a reader
   *
   * @param readerId - The reader ID
   * @param successful - Number of successful reads to add
   * @param failed - Number of failed reads to add
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically updates the read counters for health statistics.
   * Called after each batch of tag reads is processed.
   */
  incrementReadCounters(
    readerId: string,
    successful: number,
    failed: number
  ): Promise<Result<void, Error>>;
}
