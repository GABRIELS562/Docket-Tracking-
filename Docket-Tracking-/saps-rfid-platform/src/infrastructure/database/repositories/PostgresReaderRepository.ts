import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  IReaderRepository,
  ReaderHealthStats,
  ReaderStatusUpdate,
  ReaderSearchCriteria,
} from '../../../domain/repositories/IReaderRepository';
import { Reader, ReaderStatus } from '../../../domain/entities/Reader';
import type { IpAddress } from '../../../domain/value-objects/IpAddress';
import { IpAddress as IpAddressVO } from '../../../domain/value-objects/IpAddress';
import { ReaderNotFoundError } from '../../../domain/errors/ReaderNotFoundError';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Database row interface
 *
 * @description
 * Represents the structure of a reader row in PostgreSQL.
 * Maps database snake_case to application camelCase.
 */
interface ReaderRow {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  zone_id: string;
  reader_model: string | null;
  serial_number: string | null;
  firmware_version: string | null;
  antenna_count: number;
  status: string;
  is_active: boolean;
  last_connected_at: Date | null;
  last_read_at: Date | null;
  configuration: any;
  total_reads: number;
  successful_reads: number;
  failed_reads: number;
  uptime_seconds: number;
  last_health_check_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * PostgreSQL Implementation of IReaderRepository
 *
 * @description
 * Concrete repository implementation using PostgreSQL.
 * Includes bulk operations and health statistics.
 *
 * **Features:**
 * - Bulk status updates (single transaction)
 * - Health statistics aggregation
 * - Lightweight heartbeat recording
 * - Atomic counter increments
 * - Comprehensive search
 *
 * **Performance Optimizations:**
 * - updateStatuses() uses VALUES clause for bulk updates
 * - getAllHealthStats() uses single query instead of N queries
 * - recordHeartbeat() is minimal UPDATE for high frequency
 * - incrementReadCounters() uses atomic operations
 *
 * **Database Schema Expected:**
 * ```sql
 * CREATE TABLE readers (
 *   id VARCHAR(36) PRIMARY KEY,
 *   name VARCHAR(100) NOT NULL,
 *   ip_address VARCHAR(15) UNIQUE NOT NULL,
 *   port INTEGER NOT NULL DEFAULT 5084,
 *   zone_id VARCHAR(36) NOT NULL,
 *   reader_model VARCHAR(50),
 *   serial_number VARCHAR(50),
 *   firmware_version VARCHAR(20),
 *   antenna_count INTEGER NOT NULL DEFAULT 4,
 *   status VARCHAR(20) NOT NULL,
 *   is_active BOOLEAN NOT NULL DEFAULT true,
 *   last_connected_at TIMESTAMPTZ,
 *   last_read_at TIMESTAMPTZ,
 *   configuration JSONB NOT NULL,
 *   total_reads BIGINT NOT NULL DEFAULT 0,
 *   successful_reads BIGINT NOT NULL DEFAULT 0,
 *   failed_reads BIGINT NOT NULL DEFAULT 0,
 *   uptime_seconds BIGINT NOT NULL DEFAULT 0,
 *   last_health_check_at TIMESTAMPTZ,
 *   error_message TEXT,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   FOREIGN KEY (zone_id) REFERENCES zones(id)
 * );
 *
 * CREATE INDEX idx_readers_zone ON readers(zone_id);
 * CREATE INDEX idx_readers_status ON readers(status);
 * CREATE INDEX idx_readers_ip ON readers(ip_address);
 * CREATE INDEX idx_readers_last_connected ON readers(last_connected_at DESC);
 * ```
 *
 * @example
 * ```typescript
 * const repository = new PostgresReaderRepository(db, logger);
 *
 * // Bulk status update
 * await repository.updateStatuses([
 *   { readerId: 'reader-001', status: ReaderStatus.ONLINE },
 *   { readerId: 'reader-002', status: ReaderStatus.OFFLINE }
 * ]);
 *
 * // Get all health stats (single query)
 * const stats = await repository.getAllHealthStats();
 * ```
 */
@injectable()
export class PostgresReaderRepository extends BaseRepository implements IReaderRepository {
  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  /**
   * Saves a new reader to the database
   *
   * @param reader - Reader entity to save
   * @returns Result indicating success or failure
   */
  async save(reader: Reader): Promise<Result<void, Error>> {
    const props = reader.toPersistence();

    const sql = `
      INSERT INTO readers (
        id,
        name,
        ip_address,
        port,
        zone_id,
        reader_model,
        serial_number,
        firmware_version,
        antenna_count,
        status,
        is_active,
        last_connected_at,
        last_read_at,
        configuration,
        total_reads,
        successful_reads,
        failed_reads,
        uptime_seconds,
        last_health_check_at,
        error_message,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `;

    const params = [
      props.id,
      props.name,
      props.ipAddress.getValue(),
      props.port,
      props.zoneId,
      props.readerModel ?? null,
      props.serialNumber ?? null,
      props.firmwareVersion ?? null,
      props.antennaCount,
      props.status,
      props.isActive,
      props.lastConnectedAt,
      props.lastReadAt,
      JSON.stringify(props.configuration),
      props.health.totalReads,
      props.health.successfulReads,
      props.health.failedReads,
      props.health.uptimeSeconds,
      props.health.lastHealthCheckAt,
      props.errorMessage,
      props.createdAt,
      props.updatedAt,
    ];

    const result = await this.executeQuery(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Reader saved', {
      id: props.id,
      name: props.name,
      ipAddress: props.ipAddress.getValue(),
    });

    return ok(undefined);
  }

  /**
   * Finds a reader by its unique ID
   *
   * @param id - Reader ID
   * @returns Result containing reader or null if not found
   */
  async findById(id: string): Promise<Result<Reader | null, Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE id = $1
    `;

    const result = await this.executeQueryOne<ReaderRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return this.rowToDomain(result.value);
  }

  /**
   * Finds a reader by its IP address
   *
   * @param ipAddress - The IP address value object
   * @returns Result containing the reader or ReaderNotFoundError
   */
  async findByIpAddress(ipAddress: IpAddress): Promise<Result<Reader, ReaderNotFoundError>> {
    const sql = `
      SELECT * FROM readers
      WHERE ip_address = $1
    `;

    const result = await this.executeQueryOne<ReaderRow>(sql, [ipAddress.getValue()]);

    if (result.isErr()) {
      return err(new ReaderNotFoundError(ipAddress.getValue()));
    }

    if (!result.value) {
      return err(new ReaderNotFoundError(ipAddress.getValue()));
    }

    const readerResult = this.rowToDomain(result.value);
    if (readerResult.isErr()) {
      return err(new ReaderNotFoundError(ipAddress.getValue()));
    }

    return ok(readerResult.value);
  }

  /**
   * Finds all readers
   *
   * @returns Result containing array of all readers
   */
  async findAll(): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      ORDER BY name
    `;

    const result = await this.executeQuery<ReaderRow>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Finds all active readers
   *
   * @returns Result containing array of active readers
   */
  async findAllActive(): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await this.executeQuery<ReaderRow>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Finds all readers in a specific zone
   *
   * @param zoneId - The zone ID
   * @returns Result containing array of readers in the zone
   */
  async findByZone(zoneId: string): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE zone_id = $1
      ORDER BY name
    `;

    const result = await this.executeQuery<ReaderRow>(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Finds all online readers
   *
   * @returns Result containing array of online readers
   */
  async findAllOnline(): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE status = $1
        AND is_active = true
      ORDER BY name
    `;

    const result = await this.executeQuery<ReaderRow>(sql, [ReaderStatus.ONLINE]);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Finds all offline or error readers
   *
   * @returns Result containing array of unhealthy readers
   */
  async findAllUnhealthy(): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE status IN ($1, $2)
        AND is_active = true
      ORDER BY last_connected_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ReaderRow>(sql, [
      ReaderStatus.OFFLINE,
      ReaderStatus.ERROR,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Finds readers that haven't been seen within the threshold
   *
   * @param thresholdSeconds - Seconds without connection before considered stale
   * @returns Result containing array of stale readers
   */
  async findStale(thresholdSeconds: number): Promise<Result<Reader[], Error>> {
    const sql = `
      SELECT * FROM readers
      WHERE (
        last_connected_at < NOW() - INTERVAL '${thresholdSeconds} seconds'
        OR last_connected_at IS NULL
      )
      AND status != $1
      AND is_active = true
      ORDER BY last_connected_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ReaderRow>(sql, [ReaderStatus.OFFLINE]);

    if (result.isErr()) {
      return err(result.error);
    }

    const readers: Reader[] = [];
    for (const row of result.value) {
      const readerResult = this.rowToDomain(row);
      if (readerResult.isOk()) {
        readers.push(readerResult.value);
      }
    }

    return ok(readers);
  }

  /**
   * Searches for readers using flexible criteria
   *
   * @param criteria - Search criteria
   * @returns Result containing array of matching readers
   */
  async search(criteria: ReaderSearchCriteria): Promise<Result<Reader[], Error>> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Text search
      if (criteria.query && criteria.query.trim().length > 0) {
        conditions.push(`(name ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`);
        params.push(`%${criteria.query.trim()}%`);
        paramIndex++;
      }

      // Status filter
      if (criteria.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(criteria.status);
        paramIndex++;
      }

      // Zone filter
      if (criteria.zoneId) {
        conditions.push(`zone_id = $${paramIndex}`);
        params.push(criteria.zoneId);
        paramIndex++;
      }

      // Reader model filter
      if (criteria.readerModel) {
        conditions.push(`reader_model = $${paramIndex}`);
        params.push(criteria.readerModel);
        paramIndex++;
      }

      // Active-only filter
      if (criteria.activeOnly) {
        conditions.push('is_active = true');
      }

      // Healthy-only filter
      if (criteria.healthyOnly) {
        conditions.push(`status = '${ReaderStatus.ONLINE}'`);
        conditions.push('is_active = true');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const sortField = this.mapSortField(criteria.sortBy || 'name');
      const sortOrder = criteria.sortOrder || 'asc';
      const orderBy = `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;

      const sql = `
        SELECT * FROM readers
        ${whereClause}
        ${orderBy}
      `;

      const result = await this.executeQuery<ReaderRow>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      const readers: Reader[] = [];
      for (const row of result.value) {
        const readerResult = this.rowToDomain(row);
        if (readerResult.isOk()) {
          readers.push(readerResult.value);
        }
      }

      return ok(readers);
    } catch (error) {
      this.logger.error('Search failed', { error, criteria });
      return err(error as Error);
    }
  }

  /**
   * Gets health statistics for all readers
   *
   * @returns Result containing array of reader health stats
   *
   * @description
   * Performance-optimized: Single query instead of N queries.
   */
  async getAllHealthStats(): Promise<Result<ReaderHealthStats[], Error>> {
    const sql = `
      SELECT
        id as reader_id,
        name as reader_name,
        status,
        zone_id,
        total_reads,
        successful_reads,
        failed_reads,
        uptime_seconds,
        last_connected_at,
        error_message as last_error,
        CASE
          WHEN total_reads > 0 THEN (successful_reads::float / total_reads * 100)
          ELSE 0
        END as success_rate,
        CASE
          WHEN last_connected_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - last_connected_at))::integer
          ELSE NULL
        END as seconds_since_last_connection
      FROM readers
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await this.executeQuery<{
      reader_id: string;
      reader_name: string;
      status: string;
      zone_id: string;
      total_reads: string;
      successful_reads: string;
      failed_reads: string;
      uptime_seconds: string;
      success_rate: string;
      seconds_since_last_connection: string | null;
      last_error: string | null;
    }>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const stats: ReaderHealthStats[] = result.value.map((row) => {
      const totalReads = parseInt(row.total_reads, 10);
      const successfulReads = parseInt(row.successful_reads, 10);
      const failedReads = parseInt(row.failed_reads, 10);
      const successRate = parseFloat(row.success_rate);
      const isHealthy =
        row.status === ReaderStatus.ONLINE &&
        (totalReads === 0 || successRate >= 95) &&
        (row.seconds_since_last_connection === null ||
          parseInt(row.seconds_since_last_connection, 10) < 300);

      return {
        readerId: row.reader_id,
        readerName: row.reader_name,
        status: row.status as ReaderStatus,
        zoneId: row.zone_id,
        totalReads,
        successfulReads,
        failedReads,
        successRate,
        uptimeSeconds: parseInt(row.uptime_seconds, 10),
        secondsSinceLastConnection: row.seconds_since_last_connection
          ? parseInt(row.seconds_since_last_connection, 10)
          : null,
        isHealthy,
        lastError: row.last_error,
      };
    });

    return ok(stats);
  }

  /**
   * Updates an existing reader
   *
   * @param reader - The reader entity with updated values
   * @returns Result indicating success or failure
   */
  async update(reader: Reader): Promise<Result<void, Error>> {
    const props = reader.toPersistence();

    const sql = `
      UPDATE readers SET
        name = $2,
        zone_id = $3,
        reader_model = $4,
        serial_number = $5,
        firmware_version = $6,
        antenna_count = $7,
        status = $8,
        is_active = $9,
        last_connected_at = $10,
        last_read_at = $11,
        configuration = $12,
        total_reads = $13,
        successful_reads = $14,
        failed_reads = $15,
        uptime_seconds = $16,
        last_health_check_at = $17,
        error_message = $18,
        updated_at = $19
      WHERE id = $1
    `;

    const params = [
      props.id,
      props.name,
      props.zoneId,
      props.readerModel ?? null,
      props.serialNumber ?? null,
      props.firmwareVersion ?? null,
      props.antennaCount,
      props.status,
      props.isActive,
      props.lastConnectedAt,
      props.lastReadAt,
      JSON.stringify(props.configuration),
      props.health.totalReads,
      props.health.successfulReads,
      props.health.failedReads,
      props.health.uptimeSeconds,
      props.health.lastHealthCheckAt,
      props.errorMessage,
      props.updatedAt,
    ];

    const result = await this.executeQuery(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Reader updated', {
      id: props.id,
      name: props.name,
    });

    return ok(undefined);
  }

  /**
   * Bulk updates reader statuses
   *
   * @param updates - Array of status updates to apply
   * @returns Result indicating success or failure
   *
   * @description
   * Performance-optimized: Single transaction using VALUES clause.
   * Atomically updates multiple readers.
   */
  async updateStatuses(updates: ReaderStatusUpdate[]): Promise<Result<void, Error>> {
    if (updates.length === 0) {
      return ok(undefined);
    }

    try {
      // Build VALUES clause for bulk update
      const values = updates.map((_, index) => {
        const base = index * 4 + 1;
        return `($${base}, $${base + 1}, $${base + 2}, $${base + 3})`;
      }).join(', ');

      const params = updates.flatMap((u) => [
        u.readerId,
        u.status,
        u.errorMessage ?? null,
        u.timestamp ?? new Date(),
      ]);

      const sql = `
        UPDATE readers
        SET
          status = v.status,
          error_message = v.error_message,
          updated_at = v.timestamp
        FROM (VALUES ${values}) AS v(reader_id, status, error_message, timestamp)
        WHERE readers.id = v.reader_id
      `;

      const result = await this.executeQuery(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      this.logger.debug('Bulk status update completed', {
        count: updates.length,
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Bulk status update failed', { error, count: updates.length });
      return err(error as Error);
    }
  }

  /**
   * Deletes a reader
   *
   * @param id - The reader ID to delete
   * @returns Result indicating success or failure
   */
  async delete(id: string): Promise<Result<void, Error>> {
    const sql = `
      DELETE FROM readers
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Reader deleted', { id });

    return ok(undefined);
  }

  /**
   * Checks if an IP address is already in use
   *
   * @param ipAddress - The IP address to check
   * @returns Result containing boolean (true if in use)
   */
  async existsByIpAddress(ipAddress: IpAddress): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM readers WHERE ip_address = $1
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [ipAddress.getValue()]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  /**
   * Records a heartbeat from a reader
   *
   * @param readerId - The reader ID
   * @returns Result indicating success or failure
   *
   * @description
   * Lightweight operation optimized for high frequency.
   * Only updates last_connected_at timestamp.
   */
  async recordHeartbeat(readerId: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE readers
      SET last_connected_at = NOW()
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [readerId]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.debug('Heartbeat recorded', { readerId });

    return ok(undefined);
  }

  /**
   * Increments read counters for a reader
   *
   * @param readerId - The reader ID
   * @param successful - Number of successful reads to add
   * @param failed - Number of failed reads to add
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically updates the read counters.
   * Also updates last_read_at timestamp.
   */
  async incrementReadCounters(
    readerId: string,
    successful: number,
    failed: number
  ): Promise<Result<void, Error>> {
    const sql = `
      UPDATE readers
      SET
        total_reads = total_reads + $2 + $3,
        successful_reads = successful_reads + $2,
        failed_reads = failed_reads + $3,
        last_read_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [readerId, successful, failed]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.debug('Read counters incremented', {
      readerId,
      successful,
      failed,
    });

    return ok(undefined);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Maps a database row to a Reader domain entity
   *
   * @param row - Database row
   * @returns Result containing Reader or Error
   */
  private rowToDomain(row: ReaderRow): Result<Reader, Error> {
    try {
      // Create IpAddress value object
      const ipAddressResult = IpAddressVO.create(row.ip_address);
      if (ipAddressResult.isErr()) {
        return err(ipAddressResult.error);
      }

      // Parse configuration
      let configuration: any;
      if (typeof row.configuration === 'string') {
        try {
          configuration = JSON.parse(row.configuration);
        } catch (e) {
          this.logger.warn('Failed to parse configuration JSON', {
            readerId: row.id,
            error: e,
          });
          return err(new Error('Invalid configuration JSON'));
        }
      } else {
        configuration = row.configuration;
      }

      // Reconstitute domain entity
      const reader = Reader.fromPersistence({
        id: row.id,
        name: row.name,
        ipAddress: ipAddressResult.value,
        port: row.port,
        zoneId: row.zone_id,
        readerModel: row.reader_model ?? undefined,
        serialNumber: row.serial_number ?? undefined,
        firmwareVersion: row.firmware_version ?? undefined,
        antennaCount: row.antenna_count,
        status: row.status as ReaderStatus,
        isActive: row.is_active,
        lastConnectedAt: row.last_connected_at,
        lastReadAt: row.last_read_at,
        configuration,
        health: {
          totalReads: row.total_reads,
          successfulReads: row.successful_reads,
          failedReads: row.failed_reads,
          uptimeSeconds: row.uptime_seconds,
          lastHealthCheckAt: row.last_health_check_at,
        },
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });

      return ok(reader);
    } catch (error) {
      this.logger.error('Failed to map row to domain', {
        readerId: row.id,
        error,
      });
      return err(error as Error);
    }
  }

  /**
   * Maps API sort field names to database column names
   *
   * @param field - API field name
   * @returns Database column name
   */
  private mapSortField(field: string): string {
    const mapping: Record<string, string> = {
      name: 'name',
      status: 'status',
      lastConnectedAt: 'last_connected_at',
      zone: 'zone_id',
    };

    return mapping[field] || 'name';
  }
}
