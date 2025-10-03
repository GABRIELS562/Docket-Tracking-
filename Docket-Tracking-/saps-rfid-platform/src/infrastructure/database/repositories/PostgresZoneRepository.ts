import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  IZoneRepository,
  ZoneOccupancyInfo,
  ZoneSearchCriteria,
} from '../../../domain/repositories/IZoneRepository';
import { Zone, ZoneType } from '../../../domain/entities/Zone';
import { ZoneNotFoundError } from '../../../domain/errors/ZoneNotFoundError';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Database row interface
 *
 * @description
 * Represents the structure of a zone row in PostgreSQL.
 * Maps database snake_case to application camelCase.
 */
interface ZoneRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  zone_type: string;
  capacity: number;
  current_occupancy: number;
  floor_number: number | null;
  building: string | null;
  coordinates: any;
  parent_zone_id: string | null;
  reader_ids: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * PostgreSQL Implementation of IZoneRepository
 *
 * @description
 * Concrete repository implementation using PostgreSQL.
 * Includes caching for performance optimization.
 *
 * **Features:**
 * - In-memory caching (1-minute TTL)
 * - Aggregated occupancy queries
 * - Optimized bulk operations
 * - Hierarchical zone support
 * - Dynamic search with multiple criteria
 *
 * **Caching Strategy:**
 * Zones change infrequently, so we cache the entire zone list for 1 minute.
 * Cache is invalidated on any write operation (save, update, delete).
 *
 * **Database Schema Expected:**
 * ```sql
 * CREATE TABLE zones (
 *   id VARCHAR(36) PRIMARY KEY,
 *   name VARCHAR(100) NOT NULL,
 *   code VARCHAR(50) UNIQUE NOT NULL,
 *   description TEXT,
 *   zone_type VARCHAR(20) NOT NULL,
 *   capacity INTEGER NOT NULL DEFAULT 0,
 *   current_occupancy INTEGER NOT NULL DEFAULT 0,
 *   floor_number INTEGER,
 *   building VARCHAR(100),
 *   coordinates JSONB,
 *   parent_zone_id VARCHAR(36),
 *   is_active BOOLEAN NOT NULL DEFAULT true,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   FOREIGN KEY (parent_zone_id) REFERENCES zones(id),
 *   CHECK (current_occupancy >= 0),
 *   CHECK (current_occupancy <= capacity)
 * );
 *
 * CREATE INDEX idx_zones_code ON zones(code);
 * CREATE INDEX idx_zones_type ON zones(zone_type);
 * CREATE INDEX idx_zones_parent ON zones(parent_zone_id);
 * CREATE INDEX idx_zones_active ON zones(is_active);
 * ```
 *
 * @example
 * ```typescript
 * const repository = new PostgresZoneRepository(db, logger);
 *
 * // Find all zones (uses cache if valid)
 * const zones = await repository.findAll();
 *
 * // Get occupancy for all zones (single query)
 * const occupancies = await repository.getAllOccupancies();
 * ```
 */
@injectable()
export class PostgresZoneRepository extends BaseRepository implements IZoneRepository {
  // In-memory cache for zones (they change rarely)
  private zoneCache: Map<string, Zone> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  /**
   * Saves a new zone to the database
   *
   * @param zone - Zone entity to save
   * @returns Result indicating success or failure
   *
   * @description
   * Invalidates cache after successful save.
   */
  async save(zone: Zone): Promise<Result<void, Error>> {
    const props = zone.toPersistence();

    const sql = `
      INSERT INTO zones (
        id,
        name,
        code,
        description,
        zone_type,
        capacity,
        current_occupancy,
        floor_number,
        building,
        coordinates,
        parent_zone_id,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;

    const params = [
      props.id,
      props.name,
      props.code,
      props.description ?? null,
      props.zoneType,
      props.capacity,
      props.currentOccupancy,
      props.floorNumber ?? null,
      props.building ?? null,
      props.coordinates ? JSON.stringify(props.coordinates) : null,
      props.parentZoneId,
      props.isActive,
      props.createdAt,
      props.updatedAt,
    ];

    const result = await this.executeQuery(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Zone saved', {
      id: props.id,
      code: props.code,
      name: props.name,
    });

    // Invalidate cache
    this.invalidateCache();

    return ok(undefined);
  }

  /**
   * Finds a zone by its unique ID
   *
   * @param id - Zone ID
   * @returns Result containing zone or null if not found
   *
   * @description
   * Checks cache first. If cache miss, queries database.
   */
  async findById(id: string): Promise<Result<Zone | null, Error>> {
    // Check cache first
    if (this.isCacheValid() && this.zoneCache.has(id)) {
      return ok(this.zoneCache.get(id)!);
    }

    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.id = $1
      GROUP BY z.id
    `;

    const result = await this.executeQueryOne<ZoneRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    const zoneResult = this.rowToDomain(result.value);
    if (zoneResult.isErr()) {
      return err(zoneResult.error);
    }

    // Update cache
    this.zoneCache.set(id, zoneResult.value);

    return ok(zoneResult.value);
  }

  /**
   * Finds a zone by its unique code
   *
   * @param code - Zone code
   * @returns Result containing zone or ZoneNotFoundError
   */
  async findByCode(code: string): Promise<Result<Zone, ZoneNotFoundError>> {
    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.code = $1
      GROUP BY z.id
    `;

    const result = await this.executeQueryOne<ZoneRow>(sql, [code.toUpperCase()]);

    if (result.isErr()) {
      return err(new ZoneNotFoundError(code));
    }

    if (!result.value) {
      return err(new ZoneNotFoundError(code));
    }

    const zoneResult = this.rowToDomain(result.value);
    if (zoneResult.isErr()) {
      return err(new ZoneNotFoundError(code));
    }

    return ok(zoneResult.value);
  }

  /**
   * Finds all zones
   *
   * @returns Result containing array of all zones
   *
   * @description
   * Uses cache if valid. Otherwise, fetches from database and populates cache.
   */
  async findAll(): Promise<Result<Zone[], Error>> {
    // Check cache first
    if (this.isCacheValid()) {
      return ok(Array.from(this.zoneCache.values()));
    }

    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      GROUP BY z.id
      ORDER BY z.name
    `;

    const result = await this.executeQuery<ZoneRow>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const zones: Zone[] = [];
    for (const row of result.value) {
      const zoneResult = this.rowToDomain(row);
      if (zoneResult.isOk()) {
        zones.push(zoneResult.value);
        this.zoneCache.set(row.id, zoneResult.value);
      }
    }

    this.cacheTimestamp = Date.now();
    return ok(zones);
  }

  /**
   * Finds all active zones
   *
   * @returns Result containing array of active zones
   */
  async findAllActive(): Promise<Result<Zone[], Error>> {
    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.is_active = true
      GROUP BY z.id
      ORDER BY z.name
    `;

    const result = await this.executeQuery<ZoneRow>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const zones: Zone[] = [];
    for (const row of result.value) {
      const zoneResult = this.rowToDomain(row);
      if (zoneResult.isOk()) {
        zones.push(zoneResult.value);
      }
    }

    return ok(zones);
  }

  /**
   * Finds zones by type
   *
   * @param zoneType - The type of zone to find
   * @returns Result containing array of matching zones
   */
  async findByType(zoneType: ZoneType): Promise<Result<Zone[], Error>> {
    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.zone_type = $1
      GROUP BY z.id
      ORDER BY z.name
    `;

    const result = await this.executeQuery<ZoneRow>(sql, [zoneType]);

    if (result.isErr()) {
      return err(result.error);
    }

    const zones: Zone[] = [];
    for (const row of result.value) {
      const zoneResult = this.rowToDomain(row);
      if (zoneResult.isOk()) {
        zones.push(zoneResult.value);
      }
    }

    return ok(zones);
  }

  /**
   * Finds all child zones of a parent zone
   *
   * @param parentZoneId - The parent zone ID
   * @returns Result containing array of child zones
   */
  async findByParent(parentZoneId: string): Promise<Result<Zone[], Error>> {
    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.parent_zone_id = $1
      GROUP BY z.id
      ORDER BY z.name
    `;

    const result = await this.executeQuery<ZoneRow>(sql, [parentZoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const zones: Zone[] = [];
    for (const row of result.value) {
      const zoneResult = this.rowToDomain(row);
      if (zoneResult.isOk()) {
        zones.push(zoneResult.value);
      }
    }

    return ok(zones);
  }

  /**
   * Searches for zones using flexible criteria
   *
   * @param criteria - Search criteria
   * @returns Result containing array of matching zones
   */
  async search(criteria: ZoneSearchCriteria): Promise<Result<Zone[], Error>> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Text search
      if (criteria.query && criteria.query.trim().length > 0) {
        conditions.push(`(z.name ILIKE $${paramIndex} OR z.code ILIKE $${paramIndex})`);
        params.push(`%${criteria.query.trim()}%`);
        paramIndex++;
      }

      // Zone type filter
      if (criteria.zoneType) {
        conditions.push(`z.zone_type = $${paramIndex}`);
        params.push(criteria.zoneType);
        paramIndex++;
      }

      // Parent zone filter
      if (criteria.parentZoneId) {
        conditions.push(`z.parent_zone_id = $${paramIndex}`);
        params.push(criteria.parentZoneId);
        paramIndex++;
      }

      // Building filter
      if (criteria.building) {
        conditions.push(`z.building = $${paramIndex}`);
        params.push(criteria.building);
        paramIndex++;
      }

      // Floor number filter
      if (criteria.floorNumber !== undefined) {
        conditions.push(`z.floor_number = $${paramIndex}`);
        params.push(criteria.floorNumber);
        paramIndex++;
      }

      // Active-only filter
      if (criteria.activeOnly) {
        conditions.push('z.is_active = true');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const sortField = this.mapSortField(criteria.sortBy || 'name');
      const sortOrder = criteria.sortOrder || 'asc';
      const orderBy = `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;

      const sql = `
        SELECT
          z.*,
          COALESCE(
            ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
            ARRAY[]::text[]
          ) as reader_ids
        FROM zones z
        LEFT JOIN readers r ON r.zone_id = z.id
        ${whereClause}
        GROUP BY z.id
        ${orderBy}
      `;

      const result = await this.executeQuery<ZoneRow>(sql, params);

      if (result.isErr()) {
        return err(result.error);
      }

      const zones: Zone[] = [];
      for (const row of result.value) {
        const zoneResult = this.rowToDomain(row);
        if (zoneResult.isOk()) {
          zones.push(zoneResult.value);
        }
      }

      return ok(zones);
    } catch (error) {
      this.logger.error('Search failed', { error, criteria });
      return err(error as Error);
    }
  }

  /**
   * Finds zones near capacity threshold
   *
   * @param threshold - Occupancy percentage threshold (default: 80%)
   * @returns Result containing array of zones near capacity
   */
  async findNearCapacity(threshold: number = 80): Promise<Result<Zone[], Error>> {
    const sql = `
      SELECT
        z.*,
        COALESCE(
          ARRAY_AGG(r.id) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::text[]
        ) as reader_ids,
        (z.current_occupancy::float / NULLIF(z.capacity, 0) * 100) as occupancy_pct
      FROM zones z
      LEFT JOIN readers r ON r.zone_id = z.id
      WHERE z.capacity > 0
        AND (z.current_occupancy::float / z.capacity * 100) >= $1
        AND z.is_active = true
      GROUP BY z.id
      ORDER BY occupancy_pct DESC
    `;

    const result = await this.executeQuery<ZoneRow>(sql, [threshold]);

    if (result.isErr()) {
      return err(result.error);
    }

    const zones: Zone[] = [];
    for (const row of result.value) {
      const zoneResult = this.rowToDomain(row);
      if (zoneResult.isOk()) {
        zones.push(zoneResult.value);
      }
    }

    return ok(zones);
  }

  /**
   * Gets current occupancy count for a specific zone
   *
   * @param zoneId - The zone ID
   * @returns Result containing the current occupancy count
   *
   * @description
   * Uses real-time count from dockets table.
   * Consider using getAllOccupancies() for bulk operations.
   */
  async getOccupancy(zoneId: string): Promise<Result<number, Error>> {
    const sql = `
      SELECT COUNT(*) as occupancy
      FROM dockets
      WHERE current_zone_id = $1
        AND status IN ('registered', 'in_transit', 'in_examination')
        AND is_active = true
    `;

    const result = await this.executeQueryOne<{ occupancy: string }>(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.occupancy || '0', 10));
  }

  /**
   * Gets current occupancy counts for all zones
   *
   * @returns Result containing Map of zone ID to occupancy count
   *
   * @description
   * Performance-optimized: Single query instead of N queries.
   * Returns real-time counts from dockets table.
   */
  async getAllOccupancies(): Promise<Result<Map<string, number>, Error>> {
    const sql = `
      SELECT
        current_zone_id as zone_id,
        COUNT(*) as occupancy
      FROM dockets
      WHERE current_zone_id IS NOT NULL
        AND status IN ('registered', 'in_transit', 'in_examination')
        AND is_active = true
      GROUP BY current_zone_id
    `;

    const result = await this.executeQuery<{
      zone_id: string;
      occupancy: string;
    }>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const occupancies = new Map<string, number>();
    for (const row of result.value) {
      occupancies.set(row.zone_id, parseInt(row.occupancy, 10));
    }

    return ok(occupancies);
  }

  /**
   * Gets occupancy information for all zones
   *
   * @returns Result containing array of zone occupancy info
   *
   * @description
   * Performance-optimized: Single query with JOIN.
   * Returns enriched occupancy data with metadata.
   */
  async getAllOccupancyInfo(): Promise<Result<ZoneOccupancyInfo[], Error>> {
    const sql = `
      SELECT
        z.id as zone_id,
        z.name as zone_name,
        z.capacity,
        COALESCE(d.occupancy, 0) as current_occupancy
      FROM zones z
      LEFT JOIN (
        SELECT
          current_zone_id,
          COUNT(*) as occupancy
        FROM dockets
        WHERE current_zone_id IS NOT NULL
          AND status IN ('registered', 'in_transit', 'in_examination')
          AND is_active = true
        GROUP BY current_zone_id
      ) d ON d.current_zone_id = z.id
      WHERE z.is_active = true
      ORDER BY z.name
    `;

    const result = await this.executeQuery<{
      zone_id: string;
      zone_name: string;
      capacity: number;
      current_occupancy: string;
    }>(sql);

    if (result.isErr()) {
      return err(result.error);
    }

    const infos: ZoneOccupancyInfo[] = result.value.map((row) => {
      const currentOccupancy = parseInt(row.current_occupancy, 10);
      const occupancyPercentage =
        row.capacity > 0 ? (currentOccupancy / row.capacity) * 100 : 0;

      let occupancyStatus: 'normal' | 'warning' | 'critical' | 'full' = 'normal';
      if (currentOccupancy >= row.capacity) {
        occupancyStatus = 'full';
      } else if (occupancyPercentage >= 90) {
        occupancyStatus = 'critical';
      } else if (occupancyPercentage >= 70) {
        occupancyStatus = 'warning';
      }

      return {
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        currentOccupancy,
        capacity: row.capacity,
        occupancyPercentage,
        occupancyStatus,
      };
    });

    return ok(infos);
  }

  /**
   * Updates an existing zone
   *
   * @param zone - The zone entity with updated values
   * @returns Result indicating success or failure
   *
   * @description
   * Invalidates cache after successful update.
   */
  async update(zone: Zone): Promise<Result<void, Error>> {
    const props = zone.toPersistence();

    const sql = `
      UPDATE zones SET
        name = $2,
        description = $3,
        zone_type = $4,
        capacity = $5,
        current_occupancy = $6,
        floor_number = $7,
        building = $8,
        coordinates = $9,
        parent_zone_id = $10,
        is_active = $11,
        updated_at = $12
      WHERE id = $1
    `;

    const params = [
      props.id,
      props.name,
      props.description ?? null,
      props.zoneType,
      props.capacity,
      props.currentOccupancy,
      props.floorNumber ?? null,
      props.building ?? null,
      props.coordinates ? JSON.stringify(props.coordinates) : null,
      props.parentZoneId,
      props.isActive,
      props.updatedAt,
    ];

    const result = await this.executeQuery(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Zone updated', {
      id: props.id,
      code: props.code,
    });

    // Invalidate cache
    this.invalidateCache();

    return ok(undefined);
  }

  /**
   * Deletes a zone
   *
   * @param id - The zone ID to delete
   * @returns Result indicating success or failure
   *
   * @description
   * Physical deletion only allowed if zone has no dockets and no child zones.
   * Invalidates cache after successful deletion.
   */
  async delete(id: string): Promise<Result<void, Error>> {
    // Check for child zones
    const childrenResult = await this.findByParent(id);
    if (childrenResult.isErr()) {
      return err(childrenResult.error);
    }

    if (childrenResult.value.length > 0) {
      return err(new Error('Cannot delete zone with child zones'));
    }

    // Check occupancy
    const occupancyResult = await this.getOccupancy(id);
    if (occupancyResult.isErr()) {
      return err(occupancyResult.error);
    }

    if (occupancyResult.value > 0) {
      return err(new Error('Cannot delete zone with dockets'));
    }

    const sql = `
      DELETE FROM zones
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Zone deleted', { id });

    // Invalidate cache
    this.invalidateCache();

    return ok(undefined);
  }

  /**
   * Checks if a zone code already exists
   *
   * @param code - The zone code to check
   * @returns Result containing boolean (true if exists)
   */
  async existsByCode(code: string): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM zones WHERE code = $1
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [code.toUpperCase()]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  /**
   * Increments the occupancy count for a zone
   *
   * @param zoneId - The zone ID
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically increments the occupancy counter.
   * Fails if zone is at capacity.
   */
  async incrementOccupancy(zoneId: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE zones
      SET current_occupancy = current_occupancy + 1,
          updated_at = NOW()
      WHERE id = $1
        AND current_occupancy < capacity
    `;

    const result = await this.executeQuery(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.debug('Zone occupancy incremented', { zoneId });

    // Invalidate cache
    this.invalidateCache();

    return ok(undefined);
  }

  /**
   * Decrements the occupancy count for a zone
   *
   * @param zoneId - The zone ID
   * @returns Result indicating success or failure
   *
   * @description
   * Atomically decrements the occupancy counter.
   * Fails if occupancy is already 0.
   */
  async decrementOccupancy(zoneId: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE zones
      SET current_occupancy = current_occupancy - 1,
          updated_at = NOW()
      WHERE id = $1
        AND current_occupancy > 0
    `;

    const result = await this.executeQuery(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.debug('Zone occupancy decremented', { zoneId });

    // Invalidate cache
    this.invalidateCache();

    return ok(undefined);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Maps a database row to a Zone domain entity
   *
   * @param row - Database row
   * @returns Result containing Zone or Error
   */
  private rowToDomain(row: ZoneRow): Result<Zone, Error> {
    try {
      // Parse coordinates
      let coordinates = undefined;
      if (row.coordinates) {
        if (typeof row.coordinates === 'string') {
          try {
            coordinates = JSON.parse(row.coordinates);
          } catch (e) {
            this.logger.warn('Failed to parse coordinates JSON', {
              zoneId: row.id,
              error: e,
            });
          }
        } else {
          coordinates = row.coordinates;
        }
      }

      // Reconstitute domain entity
      const zone = Zone.fromPersistence({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description ?? undefined,
        zoneType: row.zone_type as ZoneType,
        capacity: row.capacity,
        currentOccupancy: row.current_occupancy,
        floorNumber: row.floor_number ?? undefined,
        building: row.building ?? undefined,
        coordinates,
        parentZoneId: row.parent_zone_id,
        readerIds: row.reader_ids || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });

      return ok(zone);
    } catch (error) {
      this.logger.error('Failed to map row to domain', {
        zoneId: row.id,
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
      name: 'z.name',
      code: 'z.code',
      occupancy: 'z.current_occupancy',
      capacity: 'z.capacity',
    };

    return mapping[field] || 'z.name';
  }

  /**
   * Checks if cache is valid
   *
   * @returns true if cache is valid
   */
  private isCacheValid(): boolean {
    return this.zoneCache.size > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS;
  }

  /**
   * Invalidates cache
   */
  private invalidateCache(): void {
    this.zoneCache.clear();
    this.cacheTimestamp = 0;
    this.logger.debug('Zone cache invalidated');
  }
}
