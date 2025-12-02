import type { Result } from 'neverthrow';

import type { TagRead } from '../value-objects/TagRead';
import type { ItemNumber } from '../value-objects/ItemNumber';
import type { RfidEpc } from '../value-objects/RfidEpc';

/**
 * Location history entry from the time-series database
 *
 * @description
 * Represents a single historical location record.
 * Stored in TimescaleDB hypertable for efficient time-series queries.
 */
export interface LocationHistoryEntry {
  /**
   * Timestamp of the event
   */
  readonly time: Date;

  /**
   * Item ID (if known at time of read)
   */
  readonly itemId: string;

  /**
   * Lab number of the item
   */
  readonly labNumber: string;

  /**
   * Zone ID where tag was detected
   */
  readonly zoneId: string | null;

  /**
   * Zone name (denormalized for query performance)
   */
  readonly zoneName: string | null;

  /**
   * Reader ID that detected the tag
   */
  readonly readerId: string;

  /**
   * Reader name (denormalized for query performance)
   */
  readonly readerName: string;

  /**
   * RFID EPC value
   */
  readonly rfidEpc: string;

  /**
   * Antenna port that detected the tag
   */
  readonly antennaPort: number;

  /**
   * Signal strength (RSSI) in dBm
   */
  readonly rssi: number;

  /**
   * Number of reads aggregated (for batch inserts)
   */
  readonly readCount: number;

  /**
   * Location confidence score (0.0 to 1.0)
   */
  readonly locationConfidence: number | null;

  /**
   * Event type classification
   */
  readonly eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
}

/**
 * Zone visit summary for analytics
 *
 * @description
 * Aggregated information about a item's time spent in a zone.
 */
export interface ZoneVisitSummary {
  /**
   * Zone ID
   */
  readonly zoneId: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

  /**
   * Entry timestamp
   */
  readonly enteredAt: Date;

  /**
   * Exit timestamp (null if still in zone)
   */
  readonly exitedAt: Date | null;

  /**
   * Duration in seconds
   */
  readonly durationSeconds: number | null;

  /**
   * Number of tag reads while in zone
   */
  readonly readCount: number;

  /**
   * Average RSSI while in zone
   */
  readonly averageRssi: number;
}

/**
 * Read statistics for a time period
 */
export interface ReadStatistics {
  /**
   * Time bucket (e.g., hourly, daily)
   */
  readonly timeBucket: Date;

  /**
   * Total number of reads in this bucket
   */
  readonly totalReads: number;

  /**
   * Number of unique items detected
   */
  readonly uniqueItems: number;

  /**
   * Number of unique zones with activity
   */
  readonly activeZones: number;

  /**
   * Average RSSI across all reads
   */
  readonly averageRssi: number;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  /**
   * Start of time range
   */
  readonly startTime: Date;

  /**
   * End of time range
   */
  readonly endTime: Date;

  /**
   * Time bucket size for aggregation
   */
  readonly bucketSize?: '1 minute' | '5 minutes' | '1 hour' | '1 day';

  /**
   * Filter by zone IDs
   */
  readonly zoneIds?: string[];

  /**
   * Filter by reader IDs
   */
  readonly readerIds?: string[];
}

/**
 * Location History Repository Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for persisting and querying location history.
 * This is an interface defined in the domain layer; implementations
 * will be provided by the infrastructure layer.
 *
 * This repository is specifically designed for time-series data storage,
 * typically implemented using TimescaleDB hypertables for optimal
 * performance with large volumes of historical data.
 *
 * Responsibilities:
 * - Store tag read events as time-series data
 * - Query historical location data efficiently
 * - Provide analytics and aggregations over time
 * - Support data retention policies
 *
 * All methods are async and return Result<T, Error> for functional error handling.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class TimescaleLocationHistoryRepository implements ILocationHistoryRepository {
 *   async recordTagRead(tagRead: TagRead, itemId: string): Promise<Result<void, Error>> {
 *     // Implementation with TimescaleDB
 *   }
 * }
 * ```
 */
export interface ILocationHistoryRepository {
  /**
   * Records a single tag read event
   *
   * @param tagRead - The tag read value object
   * @param itemId - The item ID
   * @param zoneId - The zone where tag was detected (null if unknown)
   * @param eventType - Type of location event
   * @returns Result indicating success or failure
   *
   * @description
   * Stores a tag read in the time-series database.
   * This is the primary method for recording location data.
   *
   * @example
   * ```typescript
   * const tagRead = TagRead.create({
   *   epc: rfidEpc,
   *   rssi: -45.5,
   *   antennaPort: 1,
   *   readerId: 'reader-001',
   *   timestamp: new Date()
   * }).unwrap();
   *
   * const result = await repository.recordTagRead(
   *   tagRead,
   *   'item-001',
   *   'zone-001',
   *   'tag_read'
   * );
   * ```
   */
  recordTagRead(
    tagRead: TagRead,
    itemId: string,
    zoneId: string | null,
    eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement'
  ): Promise<Result<void, Error>>;

  /**
   * Records multiple tag reads in a batch
   *
   * @param reads - Array of tag reads with associated metadata
   * @returns Result indicating success or failure
   *
   * @description
   * Efficiently inserts multiple tag reads in a single transaction.
   * Significantly faster than calling recordTagRead() multiple times.
   * Used during high-volume tag read processing.
   *
   * @example
   * ```typescript
   * const batch = tagReads.map(tagRead => ({
   *   tagRead,
   *   itemId: 'item-001',
   *   zoneId: 'zone-001',
   *   eventType: 'tag_read' as const
   * }));
   *
   * const result = await repository.saveBatch(batch);
   * ```
   */
  saveBatch(
    reads: Array<{
      tagRead: TagRead;
      itemId: string;
      zoneId: string | null;
      eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
    }>
  ): Promise<Result<void, Error>>;

  /**
   * Gets location history for a specific item
   *
   * @param itemId - The item ID
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   *
   * @description
   * Returns historical location data for a item, ordered by time descending.
   * If no time range specified, returns most recent entries up to limit.
   *
   * @example
   * ```typescript
   * const result = await repository.getHistoryForItem(
   *   'item-001',
   *   new Date('2025-01-01'),
   *   new Date('2025-01-31'),
   *   50
   * );
   *
   * if (result.isOk()) {
   *   for (const entry of result.value) {
   *     console.log(`${entry.time}: ${entry.zoneName} (RSSI: ${entry.rssi})`);
   *   }
   * }
   * ```
   */
  getHistoryForItem(
    itemId: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number
  ): Promise<Result<LocationHistoryEntry[], Error>>;

  /**
   * Gets location history for an item by item number
   *
   * @param itemNumber - The item number value object
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   */
  getHistoryByItemNumber(
    itemNumber: ItemNumber,
    startTime?: Date,
    endTime?: Date,
    limit?: number
  ): Promise<Result<LocationHistoryEntry[], Error>>;

  /**
   * Gets location history for a specific zone
   *
   * @param zoneId - The zone ID
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   *
   * @description
   * Returns all tag reads that occurred in the specified zone.
   * Useful for zone activity reports and auditing.
   */
  getHistoryForZone(
    zoneId: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number
  ): Promise<Result<LocationHistoryEntry[], Error>>;

  /**
   * Gets recent tag reads for an EPC
   *
   * @param epc - The RFID EPC value object
   * @param withinMs - Time window in milliseconds (default: 3000ms)
   * @returns Result containing array of recent reads
   *
   * @description
   * Returns tag reads within the specified time window.
   * Used for deduplication and multi-reader correlation.
   * Ordered by time descending.
   *
   * @example
   * ```typescript
   * // Get reads from last 5 seconds for deduplication
   * const result = await repository.getRecentReadsForEpc(epc, 5000);
   *
   * if (result.isOk() && result.value.length > 1) {
   *   console.log('Duplicate reads detected - deduplicating...');
   * }
   * ```
   */
  getRecentReadsForEpc(
    epc: RfidEpc,
    withinMs?: number
  ): Promise<Result<LocationHistoryEntry[], Error>>;

  /**
   * Gets the last known location of a item
   *
   * @param itemId - The item ID
   * @returns Result containing the most recent location entry or null
   *
   * @description
   * Returns the most recent tag read for the item.
   * Useful for quick location lookup without loading full history.
   */
  getLastKnownLocation(itemId: string): Promise<Result<LocationHistoryEntry | null, Error>>;

  /**
   * Gets zone visit summary for a item
   *
   * @param itemId - The item ID
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing array of zone visits
   *
   * @description
   * Analyzes location history to determine when item entered/exited zones.
   * Returns aggregated visit information showing time spent in each zone.
   *
   * @example
   * ```typescript
   * const result = await repository.getZoneVisits(
   *   'item-001',
   *   new Date('2025-01-01'),
   *   new Date('2025-01-31')
   * );
   *
   * if (result.isOk()) {
   *   for (const visit of result.value) {
   *     const duration = visit.durationSeconds
   *       ? `${Math.floor(visit.durationSeconds / 60)} minutes`
   *       : 'still in zone';
   *     console.log(`${visit.zoneName}: ${duration}`);
   *   }
   * }
   * ```
   */
  getZoneVisits(
    itemId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Result<ZoneVisitSummary[], Error>>;

  /**
   * Gets tag read count statistics by zone
   *
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing Map of zone ID to read count
   *
   * @description
   * Returns aggregated read counts per zone for the time period.
   * Used for activity heat maps and zone utilization reports.
   */
  getReadCountByZone(
    startTime: Date,
    endTime: Date
  ): Promise<Result<Map<string, number>, Error>>;

  /**
   * Gets tag read count statistics by reader
   *
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing Map of reader ID to read count
   *
   * @description
   * Returns aggregated read counts per reader for the time period.
   * Used for reader performance monitoring.
   */
  getReadCountByReader(
    startTime: Date,
    endTime: Date
  ): Promise<Result<Map<string, number>, Error>>;

  /**
   * Gets time-series analytics
   *
   * @param options - Analytics query options
   * @returns Result containing array of read statistics
   *
   * @description
   * Returns time-bucketed statistics for dashboard charts and reports.
   * Supports various aggregation intervals (minute, hour, day).
   *
   * @example
   * ```typescript
   * const result = await repository.getAnalytics({
   *   startTime: new Date('2025-01-01'),
   *   endTime: new Date('2025-01-31'),
   *   bucketSize: '1 hour',
   *   zoneIds: ['zone-001', 'zone-002']
   * });
   *
   * if (result.isOk()) {
   *   for (const stat of result.value) {
   *     console.log(`${stat.timeBucket}: ${stat.totalReads} reads`);
   *   }
   * }
   * ```
   */
  getAnalytics(options: AnalyticsQueryOptions): Promise<Result<ReadStatistics[], Error>>;

  /**
   * Deletes location history older than the specified date
   *
   * @param olderThan - Delete records older than this date
   * @returns Result containing number of records deleted
   *
   * @description
   * Implements data retention policy by removing old historical data.
   * Typically run as a scheduled job (e.g., delete data older than 2 years).
   * Uses TimescaleDB's chunk-based deletion for efficiency.
   *
   * @example
   * ```typescript
   * // Delete data older than 2 years
   * const twoYearsAgo = new Date();
   * twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
   *
   * const result = await repository.deleteOlderThan(twoYearsAgo);
   *
   * if (result.isOk()) {
   *   console.log(`Deleted ${result.value} old records`);
   * }
   * ```
   */
  deleteOlderThan(olderThan: Date): Promise<Result<number, Error>>;

  /**
   * Gets database statistics
   *
   * @returns Result containing storage and performance metrics
   *
   * @description
   * Returns information about the location history storage:
   * - Total number of records
   * - Oldest record timestamp
   * - Newest record timestamp
   * - Database size
   * - Compression ratio (for TimescaleDB)
   *
   * Used for capacity planning and monitoring.
   */
  getStorageStats(): Promise<
    Result<
      {
        totalRecords: number;
        oldestRecord: Date | null;
        newestRecord: Date | null;
        tableSizeBytes: number;
        compressionRatio: number | null;
      },
      Error
    >
  >;
}
