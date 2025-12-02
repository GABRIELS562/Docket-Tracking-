import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  ILocationHistoryRepository,
  LocationHistoryEntry,
  ZoneVisitSummary,
  ReadStatistics,
  AnalyticsQueryOptions,
} from '../../../domain/repositories/ILocationHistoryRepository';
import type { TagRead } from '../../../domain/value-objects/TagRead';
import type { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import type { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import { RfidEpc as RfidEpcVO } from '../../../domain/value-objects/RfidEpc';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Database row interface for location history
 *
 * @description
 * Represents the structure of a location history row in TimescaleDB.
 * Maps database snake_case to application camelCase.
 */
interface LocationHistoryRow {
  time: Date;
  tenant_id: string;
  item_id: string;
  item_number: string;
  zone_id: string | null;
  zone_name: string | null;
  reader_id: string;
  reader_name: string;
  rfid_epc: string;
  antenna_port: number;
  rssi: number;
  read_count: number;
  location_confidence: number | null;
  event_type: string;
}

/**
 * Batch insert item for queue
 */
interface BatchItem {
  tagRead: TagRead;
  itemId: string;
  tenantId: string;
  zoneId: string | null;
  eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
}

/**
 * TimescaleDB Implementation of ILocationHistoryRepository
 *
 * @description
 * High-performance time-series repository using TimescaleDB hypertables.
 * Designed to handle 100k+ inserts/day with minimal performance impact.
 *
 * **Performance Optimizations:**
 * - Automatic batching (100 inserts per batch, 1-second timeout)
 * - TimescaleDB hypertable for automatic time-based partitioning
 * - Continuous aggregates for analytics queries
 * - Efficient chunk-based data retention
 * - Denormalized zone/reader names for query performance
 *
 * **TimescaleDB Features Used:**
 * - time_bucket() for time-series aggregation
 * - first() and last() for window functions
 * - Automatic compression after 7 days
 * - Chunk retention policy
 *
 * **Database Schema Expected:**
 * ```sql
 * CREATE TABLE location_history (
 *   time TIMESTAMPTZ NOT NULL,
 *   tenant_id UUID NOT NULL REFERENCES tenants(id),
 *   item_id VARCHAR(36) NOT NULL,
 *   item_number VARCHAR(50) NOT NULL,
 *   zone_id VARCHAR(36),
 *   zone_name VARCHAR(100),
 *   reader_id VARCHAR(36) NOT NULL,
 *   reader_name VARCHAR(100) NOT NULL,
 *   rfid_epc VARCHAR(24) NOT NULL,
 *   antenna_port INTEGER NOT NULL,
 *   rssi DECIMAL(5,2) NOT NULL,
 *   read_count INTEGER NOT NULL DEFAULT 1,
 *   location_confidence DECIMAL(3,2),
 *   event_type VARCHAR(20) NOT NULL,
 *   CONSTRAINT pk_location_history PRIMARY KEY (time, tenant_id, item_id, reader_id)
 * );
 *
 * -- Convert to hypertable (time-series optimized)
 * SELECT create_hypertable('location_history', 'time');
 *
 * -- Create indexes for common queries (all include tenant_id for multi-tenant isolation)
 * CREATE INDEX idx_location_history_tenant_item ON location_history (tenant_id, item_id, time DESC);
 * CREATE INDEX idx_location_history_tenant_item_number ON location_history (tenant_id, item_number, time DESC);
 * CREATE INDEX idx_location_history_tenant_zone ON location_history (tenant_id, zone_id, time DESC) WHERE zone_id IS NOT NULL;
 * CREATE INDEX idx_location_history_tenant_epc ON location_history (tenant_id, rfid_epc, time DESC);
 *
 * -- Enable compression after 7 days
 * ALTER TABLE location_history SET (
 *   timescaledb.compress,
 *   timescaledb.compress_segmentby = 'tenant_id, item_id',
 *   timescaledb.compress_orderby = 'time DESC'
 * );
 *
 * SELECT add_compression_policy('location_history', INTERVAL '7 days');
 *
 * -- Retention policy: keep 2 years
 * SELECT add_retention_policy('location_history', INTERVAL '2 years');
 * ```
 *
 * @example
 * ```typescript
 * const repository = new TimescaleLocationHistoryRepository(db, logger);
 *
 * // Single insert (batched automatically)
 * await repository.recordTagRead(tagRead, 'item-001', 'zone-001', 'tag_read');
 *
 * // Batch insert (immediate)
 * await repository.saveBatch(tagReads);
 *
 * // Analytics with time bucketing
 * const stats = await repository.getAnalytics({
 *   startTime: yesterday,
 *   endTime: now,
 *   bucketSize: '1 hour'
 * });
 * ```
 */
@injectable()
export class TimescaleLocationHistoryRepository
  extends BaseRepository
  implements ILocationHistoryRepository
{
  // Batching configuration
  private batchQueue: BatchItem[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 1000; // 1 second

  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  /**
   * Records a single tag read event
   *
   * @param tagRead - The tag read value object
   * @param itemId - The item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param zoneId - The zone where tag was detected (null if unknown)
   * @param eventType - Type of location event
   * @returns Result indicating success or failure
   *
   * @description
   * Adds the read to batch queue. Automatically flushes when:
   * - Batch size reaches BATCH_SIZE (100 items)
   * - BATCH_TIMEOUT_MS (1 second) elapses since first item
   */
  async recordTagRead(
    tagRead: TagRead,
    itemId: string,
    tenantId: string,
    zoneId: string | null,
    eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement'
  ): Promise<Result<void, Error>> {
    // Add to batch queue
    this.batchQueue.push({ tagRead, itemId, tenantId, zoneId, eventType });

    // If batch is full, flush immediately
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      return this.flushBatch();
    }

    // Otherwise, schedule flush if not already scheduled
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch().catch((error) => {
          this.logger.error('Failed to flush batch on timer', { error });
        });
      }, this.BATCH_TIMEOUT_MS);
    }

    return ok(undefined);
  }

  /**
   * Records multiple tag reads in a batch
   *
   * @param reads - Array of tag reads with associated metadata
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Performance-optimized: Single INSERT with multiple VALUES.
   * Bypasses batching queue for immediate insertion.
   */
  async saveBatch(
    reads: Array<{
      tagRead: TagRead;
      itemId: string;
      zoneId: string | null;
      eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
    }>,
    tenantId: string
  ): Promise<Result<void, Error>> {
    if (reads.length === 0) {
      return ok(undefined);
    }

    try {
      // Build multi-value INSERT
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const { tagRead, itemId, zoneId, eventType } of reads) {
        // Fetch zone/reader names for denormalization (in production, these would be cached)
        const zoneName = zoneId ? await this.getZoneName(zoneId, tenantId) : null;
        const readerName = await this.getReaderName(tagRead.getReaderId(), tenantId);

        values.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13})`
        );

        const locationConfidence = this.calculateLocationConfidence(tagRead.getRssi());

        params.push(
          tagRead.getTimestamp(),
          tenantId,
          itemId,
          await this.getItemNumber(itemId, tenantId),
          zoneId,
          zoneName,
          tagRead.getReaderId(),
          readerName,
          tagRead.getEpc().getValue(),
          tagRead.getAntennaPort(),
          tagRead.getRssi(),
          tagRead.getReadCount(),
          locationConfidence,
          eventType
        );

        paramIndex += 14;
      }

      const sql = `
        INSERT INTO location_history (
          time,
          tenant_id,
          item_id,
          item_number,
          zone_id,
          zone_name,
          reader_id,
          reader_name,
          rfid_epc,
          antenna_port,
          rssi,
          read_count,
          location_confidence,
          event_type
        ) VALUES ${values.join(', ')}
        ON CONFLICT (time, tenant_id, item_id, reader_id) DO NOTHING
      `;

      const result = await this.executeQuery(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      this.logger.debug('Location history batch saved', {
        count: reads.length,
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to save location history batch', {
        batchSize: reads.length,
        error,
      });
      return err(error as Error);
    }
  }

  /**
   * Gets location history for a specific item
   *
   * @param itemId - The item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   */
  async getHistoryForItem(
    itemId: string,
    tenantId: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 100
  ): Promise<Result<LocationHistoryEntry[], Error>> {
    try {
      const conditions: string[] = ['tenant_id = $1', 'item_id = $2'];
      const params: any[] = [tenantId, itemId];
      let paramIndex = 3;

      if (startTime) {
        conditions.push(`time >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      }

      if (endTime) {
        conditions.push(`time <= $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      }

      const sql = `
        SELECT *
        FROM location_history
        WHERE ${conditions.join(' AND ')}
        ORDER BY time DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);

      const result = await this.executeQuery<LocationHistoryRow>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      return ok(result.value.map(this.rowToDomain));
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Gets location history for an item by item number
   *
   * @param itemNumber - The item number value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   */
  async getHistoryByItemNumber(
    itemNumber: ItemNumber,
    tenantId: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 100
  ): Promise<Result<LocationHistoryEntry[], Error>> {
    try {
      const conditions: string[] = ['tenant_id = $1', 'item_number = $2'];
      const params: any[] = [tenantId, itemNumber.getValue()];
      let paramIndex = 3;

      if (startTime) {
        conditions.push(`time >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      }

      if (endTime) {
        conditions.push(`time <= $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      }

      const sql = `
        SELECT *
        FROM location_history
        WHERE ${conditions.join(' AND ')}
        ORDER BY time DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);

      const result = await this.executeQuery<LocationHistoryRow>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      return ok(result.value.map(this.rowToDomain));
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Gets location history for a specific zone
   *
   * @param zoneId - The zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range (optional)
   * @param endTime - End of time range (optional)
   * @param limit - Maximum number of records (default: 100)
   * @returns Result containing array of history entries
   */
  async getHistoryForZone(
    zoneId: string,
    tenantId: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 100
  ): Promise<Result<LocationHistoryEntry[], Error>> {
    try {
      const conditions: string[] = ['tenant_id = $1', 'zone_id = $2'];
      const params: any[] = [tenantId, zoneId];
      let paramIndex = 3;

      if (startTime) {
        conditions.push(`time >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      }

      if (endTime) {
        conditions.push(`time <= $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      }

      const sql = `
        SELECT *
        FROM location_history
        WHERE ${conditions.join(' AND ')}
        ORDER BY time DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);

      const result = await this.executeQuery<LocationHistoryRow>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      return ok(result.value.map(this.rowToDomain));
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Gets recent tag reads for an EPC
   *
   * @param epc - The RFID EPC value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param withinMs - Time window in milliseconds (default: 3000ms)
   * @returns Result containing array of recent reads
   */
  async getRecentReadsForEpc(
    epc: RfidEpc,
    tenantId: string,
    withinMs: number = 3000
  ): Promise<Result<LocationHistoryEntry[], Error>> {
    const sql = `
      SELECT *
      FROM location_history
      WHERE tenant_id = $1
        AND rfid_epc = $2
        AND time >= NOW() - INTERVAL '${withinMs} milliseconds'
      ORDER BY time DESC
    `;

    const result = await this.executeQuery<LocationHistoryRow>(sql, [tenantId, epc.getValue()]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map(this.rowToDomain));
  }

  /**
   * Gets the last known location of an item
   *
   * @param itemId - The item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the most recent location entry or null
   */
  async getLastKnownLocation(
    itemId: string,
    tenantId: string
  ): Promise<Result<LocationHistoryEntry | null, Error>> {
    const sql = `
      SELECT *
      FROM location_history
      WHERE tenant_id = $1 AND item_id = $2
      ORDER BY time DESC
      LIMIT 1
    `;

    const result = await this.executeQueryOne<LocationHistoryRow>(sql, [tenantId, itemId]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return ok(this.rowToDomain(result.value));
  }

  /**
   * Gets zone visit summary for an item
   *
   * @param itemId - The item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing array of zone visits
   *
   * @description
   * Uses window functions to determine zone entry/exit times.
   * Calculates duration and aggregates reads per visit.
   */
  async getZoneVisits(
    itemId: string,
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Result<ZoneVisitSummary[], Error>> {
    const sql = `
      WITH zone_changes AS (
        SELECT
          zone_id,
          zone_name,
          time,
          LAG(zone_id) OVER (ORDER BY time) as prev_zone_id,
          LEAD(zone_id) OVER (ORDER BY time) as next_zone_id,
          rssi
        FROM location_history
        WHERE tenant_id = $1
          AND item_id = $2
          AND time >= $3
          AND time <= $4
          AND zone_id IS NOT NULL
        ORDER BY time
      ),
      zone_entries AS (
        SELECT
          zone_id,
          zone_name,
          time as entered_at,
          LEAD(time) OVER (PARTITION BY zone_id ORDER BY time) as exited_at
        FROM zone_changes
        WHERE zone_id != prev_zone_id OR prev_zone_id IS NULL
      )
      SELECT
        ze.zone_id,
        ze.zone_name,
        ze.entered_at,
        ze.exited_at,
        CASE
          WHEN ze.exited_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ze.exited_at - ze.entered_at))::integer
          ELSE NULL
        END as duration_seconds,
        COUNT(lh.time) as read_count,
        AVG(lh.rssi) as average_rssi
      FROM zone_entries ze
      LEFT JOIN location_history lh
        ON lh.tenant_id = $1
        AND lh.item_id = $2
        AND lh.zone_id = ze.zone_id
        AND lh.time >= ze.entered_at
        AND (ze.exited_at IS NULL OR lh.time < ze.exited_at)
      GROUP BY ze.zone_id, ze.zone_name, ze.entered_at, ze.exited_at
      ORDER BY ze.entered_at DESC
    `;

    const result = await this.executeQuery<{
      zone_id: string;
      zone_name: string;
      entered_at: Date;
      exited_at: Date | null;
      duration_seconds: string | null;
      read_count: string;
      average_rssi: string;
    }>(sql, [tenantId, itemId, startTime, endTime]);

    if (result.isErr()) {
      return err(result.error);
    }

    const visits: ZoneVisitSummary[] = result.value.map((row) => ({
      zoneId: row.zone_id,
      zoneName: row.zone_name,
      enteredAt: row.entered_at,
      exitedAt: row.exited_at,
      durationSeconds: row.duration_seconds ? parseInt(row.duration_seconds, 10) : null,
      readCount: parseInt(row.read_count, 10),
      averageRssi: parseFloat(row.average_rssi),
    }));

    return ok(visits);
  }

  /**
   * Gets tag read count statistics by zone
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing Map of zone ID to read count
   */
  async getReadCountByZone(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Result<Map<string, number>, Error>> {
    const sql = `
      SELECT
        zone_id,
        COUNT(*) as read_count
      FROM location_history
      WHERE tenant_id = $1
        AND time >= $2
        AND time <= $3
        AND zone_id IS NOT NULL
      GROUP BY zone_id
      ORDER BY read_count DESC
    `;

    const result = await this.executeQuery<{
      zone_id: string;
      read_count: string;
    }>(sql, [tenantId, startTime, endTime]);

    if (result.isErr()) {
      return err(result.error);
    }

    const counts = new Map<string, number>();
    for (const row of result.value) {
      counts.set(row.zone_id, parseInt(row.read_count, 10));
    }

    return ok(counts);
  }

  /**
   * Gets tag read count statistics by reader
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Result containing Map of reader ID to read count
   */
  async getReadCountByReader(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Result<Map<string, number>, Error>> {
    const sql = `
      SELECT
        reader_id,
        COUNT(*) as read_count
      FROM location_history
      WHERE tenant_id = $1
        AND time >= $2
        AND time <= $3
      GROUP BY reader_id
      ORDER BY read_count DESC
    `;

    const result = await this.executeQuery<{
      reader_id: string;
      read_count: string;
    }>(sql, [tenantId, startTime, endTime]);

    if (result.isErr()) {
      return err(result.error);
    }

    const counts = new Map<string, number>();
    for (const row of result.value) {
      counts.set(row.reader_id, parseInt(row.read_count, 10));
    }

    return ok(counts);
  }

  /**
   * Gets time-series analytics
   *
   * @param options - Analytics query options (includes tenantId)
   * @returns Result containing array of read statistics
   *
   * @description
   * Uses TimescaleDB's time_bucket() for efficient time-series aggregation.
   */
  async getAnalytics(
    options: AnalyticsQueryOptions
  ): Promise<Result<ReadStatistics[], Error>> {
    try {
      const bucketSize = options.bucketSize || '1 hour';
      const conditions: string[] = ['tenant_id = $1', 'time >= $2', 'time <= $3'];
      const params: any[] = [options.tenantId, options.startTime, options.endTime];
      let paramIndex = 4;

      if (options.zoneIds && options.zoneIds.length > 0) {
        const placeholders = options.zoneIds.map((_, i) => `$${paramIndex + i}`).join(', ');
        conditions.push(`zone_id IN (${placeholders})`);
        params.push(...options.zoneIds);
        paramIndex += options.zoneIds.length;
      }

      if (options.readerIds && options.readerIds.length > 0) {
        const placeholders = options.readerIds.map((_, i) => `$${paramIndex + i}`).join(', ');
        conditions.push(`reader_id IN (${placeholders})`);
        params.push(...options.readerIds);
        paramIndex += options.readerIds.length;
      }

      const sql = `
        SELECT
          time_bucket('${bucketSize}', time) as time_bucket,
          COUNT(*) as total_reads,
          COUNT(DISTINCT item_id) as unique_items,
          COUNT(DISTINCT zone_id) FILTER (WHERE zone_id IS NOT NULL) as active_zones,
          AVG(rssi) as average_rssi
        FROM location_history
        WHERE ${conditions.join(' AND ')}
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `;

      const result = await this.executeQuery<{
        time_bucket: Date;
        total_reads: string;
        unique_items: string;
        active_zones: string;
        average_rssi: string;
      }>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      const statistics: ReadStatistics[] = result.value.map((row) => ({
        timeBucket: row.time_bucket,
        totalReads: parseInt(row.total_reads, 10),
        uniqueItems: parseInt(row.unique_items, 10),
        activeZones: parseInt(row.active_zones, 10),
        averageRssi: parseFloat(row.average_rssi),
      }));

      return ok(statistics);
    } catch (error) {
      this.logger.error('Analytics query failed', { error, options });
      return err(error as Error);
    }
  }

  /**
   * Deletes location history older than the specified date
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param olderThan - Delete records older than this date
   * @returns Result containing number of records deleted
   *
   * @description
   * In production with TimescaleDB, use drop_chunks() for efficiency:
   * SELECT drop_chunks('location_history', older_than => INTERVAL '2 years');
   */
  async deleteOlderThan(tenantId: string, olderThan: Date): Promise<Result<number, Error>> {
    try {
      // For TimescaleDB, this is better done with drop_chunks()
      // But we'll use DELETE for compatibility
      const sql = `
        DELETE FROM location_history
        WHERE tenant_id = $1 AND time < $2
      `;

      const result = await this.executeQuery(sql, [tenantId, olderThan]);

      if (result.isErr()) {
        return err(result.error);
      }

      this.logger.info('Old location history deleted', {
        tenantId,
        beforeDate: olderThan.toISOString(),
      });

      // PostgreSQL doesn't easily return delete count with Result type
      // In production, you'd query pg_stat_user_tables for the count
      return ok(0);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Gets database statistics for a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing storage and performance metrics
   */
  async getStorageStats(tenantId: string): Promise<
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
  > {
    try {
      // Get record statistics for tenant
      const statsSql = `
        SELECT
          COUNT(*) as total_records,
          MIN(time) as oldest_record,
          MAX(time) as newest_record
        FROM location_history
        WHERE tenant_id = $1
      `;

      const statsResult = await this.executeQueryOne<{
        total_records: string;
        oldest_record: Date | null;
        newest_record: Date | null;
      }>(statsSql, [tenantId]);

      if (statsResult.isErr()) {
        return err(statsResult.error);
      }

      // Get table size (total for all tenants - can't easily partition by tenant)
      const sizeSql = `
        SELECT pg_total_relation_size('location_history') as table_size_bytes
      `;

      const sizeResult = await this.executeQueryOne<{
        table_size_bytes: string;
      }>(sizeSql);

      if (sizeResult.isErr()) {
        return err(sizeResult.error);
      }

      // Get TimescaleDB compression ratio (if available)
      const compressionSql = `
        SELECT
          CASE
            WHEN compressed_size > 0 THEN
              uncompressed_size::float / NULLIF(compressed_size, 0)
            ELSE NULL
          END as compression_ratio
        FROM (
          SELECT
            SUM(pg_total_relation_size(format('%I.%I', chunk_schema, chunk_name))) as compressed_size,
            SUM(uncompressed_total_bytes) as uncompressed_size
          FROM timescaledb_information.compressed_chunk_stats
          WHERE hypertable_name = 'location_history'
        ) s
      `;

      const compressionResult = await this.executeQueryOne<{
        compression_ratio: string | null;
      }>(compressionSql);

      const stats = statsResult.value;
      const size = sizeResult.value;
      const compression = compressionResult.isOk() ? compressionResult.value : null;

      return ok({
        totalRecords: parseInt(stats?.total_records || '0', 10),
        oldestRecord: stats?.oldest_record || null,
        newestRecord: stats?.newest_record || null,
        tableSizeBytes: parseInt(size?.table_size_bytes || '0', 10),
        compressionRatio: compression?.compression_ratio
          ? parseFloat(compression.compression_ratio)
          : null,
      });
    } catch (error) {
      this.logger.error('Failed to get storage stats', { error, tenantId });
      return err(error as Error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Flushes pending batch to database
   *
   * @returns Result indicating success or failure
   *
   * @description
   * Clears timer, extracts batch, groups by tenant, and calls saveBatch() for each tenant.
   */
  private async flushBatch(): Promise<Result<void, Error>> {
    if (this.batchQueue.length === 0) {
      return ok(undefined);
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get current batch and clear queue
    const batch = [...this.batchQueue];
    this.batchQueue = [];

    this.logger.debug('Flushing batch', { count: batch.length });

    // Group by tenant
    const batchesByTenant = new Map<string, BatchItem[]>();
    for (const item of batch) {
      const tenantBatch = batchesByTenant.get(item.tenantId) || [];
      tenantBatch.push(item);
      batchesByTenant.set(item.tenantId, tenantBatch);
    }

    // Save batches per tenant
    for (const [tenantId, tenantBatch] of batchesByTenant) {
      const reads = tenantBatch.map(({ tagRead, itemId, zoneId, eventType }) => ({
        tagRead,
        itemId,
        zoneId,
        eventType,
      }));
      const result = await this.saveBatch(reads, tenantId);
      if (result.isErr()) {
        return result;
      }
    }

    return ok(undefined);
  }

  /**
   * Maps a database row to a LocationHistoryEntry
   *
   * @param row - Database row
   * @returns LocationHistoryEntry domain object
   */
  private rowToDomain(row: LocationHistoryRow): LocationHistoryEntry {
    return {
      time: row.time,
      itemId: row.item_id,
      itemNumber: row.item_number,
      zoneId: row.zone_id,
      zoneName: row.zone_name,
      readerId: row.reader_id,
      readerName: row.reader_name,
      rfidEpc: row.rfid_epc,
      antennaPort: row.antenna_port,
      rssi: row.rssi,
      readCount: row.read_count,
      locationConfidence: row.location_confidence,
      eventType: row.event_type as any,
    };
  }

  /**
   * Calculates location confidence score based on RSSI
   *
   * @param rssi - Signal strength in dBm
   * @returns Confidence score (0.0 to 1.0)
   *
   * @description
   * RSSI ranges:
   * - Excellent (> -40 dBm): 0.95 - 1.00
   * - Very Good (-40 to -55 dBm): 0.85 - 0.95
   * - Good (-55 to -70 dBm): 0.65 - 0.85
   * - Fair (-70 to -80 dBm): 0.40 - 0.65
   * - Poor (-80 to -90 dBm): 0.15 - 0.40
   * - Very Poor (< -90 dBm): 0.00 - 0.15
   */
  private calculateLocationConfidence(rssi: number): number {
    if (rssi > -40) {
      // Excellent
      return Math.min(1.0, 0.95 + (rssi + 40) / 40);
    } else if (rssi >= -55) {
      // Very Good
      return 0.85 + ((rssi + 55) / 15) * 0.1;
    } else if (rssi >= -70) {
      // Good
      return 0.65 + ((rssi + 70) / 15) * 0.2;
    } else if (rssi >= -80) {
      // Fair
      return 0.4 + ((rssi + 80) / 10) * 0.25;
    } else if (rssi >= -90) {
      // Poor
      return 0.15 + ((rssi + 90) / 10) * 0.25;
    } else {
      // Very Poor
      return Math.max(0, 0.15 + ((rssi + 100) / 10) * 0.15);
    }
  }

  /**
   * Gets zone name for denormalization
   *
   * @param zoneId - Zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Zone name
   *
   * @description
   * In production, this should use a cache to avoid repeated queries.
   */
  private async getZoneName(zoneId: string, tenantId: string): Promise<string> {
    const sql = 'SELECT name FROM zones WHERE id = $1 AND tenant_id = $2';
    const result = await this.executeQueryOne<{ name: string }>(sql, [zoneId, tenantId]);
    return result.isOk() && result.value ? result.value.name : 'Unknown';
  }

  /**
   * Gets reader name for denormalization
   *
   * @param readerId - Reader ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Reader name
   *
   * @description
   * In production, this should use a cache to avoid repeated queries.
   */
  private async getReaderName(readerId: string, tenantId: string): Promise<string> {
    const sql = 'SELECT name FROM readers WHERE id = $1 AND tenant_id = $2';
    const result = await this.executeQueryOne<{ name: string }>(sql, [readerId, tenantId]);
    return result.isOk() && result.value ? result.value.name : 'Unknown';
  }

  /**
   * Gets item number for an item ID
   *
   * @param itemId - Item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Item number string
   *
   * @description
   * In production, this should use a cache to avoid repeated queries.
   */
  private async getItemNumber(itemId: string, tenantId: string): Promise<string> {
    // Query from items table for item_number
    const sql = 'SELECT item_number FROM items WHERE id = $1 AND tenant_id = $2';
    const result = await this.executeQueryOne<{ item_number: string }>(sql, [itemId, tenantId]);
    return result.isOk() && result.value ? result.value.item_number : 'UNKNOWN';
  }

  /**
   * Graceful shutdown - flushes pending batches
   *
   * @description
   * Should be called on application shutdown to ensure no data loss.
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down TimescaleLocationHistoryRepository');

    // Flush any pending batches
    const flushResult = await this.flushBatch();
    if (flushResult.isErr()) {
      this.logger.error('Failed to flush batch on shutdown', {
        error: flushResult.error,
      });
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.logger.info('TimescaleLocationHistoryRepository shutdown complete');
  }
}
