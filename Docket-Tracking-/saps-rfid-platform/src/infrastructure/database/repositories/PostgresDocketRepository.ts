import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  IDocketRepository,
  DocketSearchCriteria,
  DocketSearchResult,
} from '../../../domain/repositories/IDocketRepository';
import { Docket, DocketStatus } from '../../../domain/entities/Docket';
import type { LabNumber } from '../../../domain/value-objects/LabNumber';
import { LabNumber as LabNumberVO } from '../../../domain/value-objects/LabNumber';
import type { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import { RfidEpc as RfidEpcVO } from '../../../domain/value-objects/RfidEpc';
import type { CaseNumber } from '../../../domain/value-objects/CaseNumber';
import { CaseNumber as CaseNumberVO } from '../../../domain/value-objects/CaseNumber';
import { DocketNotFoundError } from '../../../domain/errors/DocketNotFoundError';
import { DuplicateLabNumberError } from '../../../domain/errors/DuplicateLabNumberError';
import { DuplicateEpcError } from '../../../domain/errors/DuplicateEpcError';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Database row interface
 *
 * @description
 * Represents the structure of a docket row in PostgreSQL.
 * Maps database snake_case to application camelCase.
 */
interface DocketRow {
  id: string;
  lab_number: string;
  rfid_tag_epc: string;
  case_number: string;
  exhibit_number: string | null;
  description: string;
  category: string;
  current_zone_id: string | null;
  last_seen_at: Date | null;
  last_seen_reader_id: string | null;
  location_confidence: number | null;
  status: string;
  is_active: boolean;
  received_by: string | null;
  received_at: Date | null;
  handled_by: string | null;
  created_at: Date;
  updated_at: Date;
  metadata: any;
}

/**
 * PostgreSQL Implementation of IDocketRepository
 *
 * @description
 * Concrete repository implementation using PostgreSQL with TimescaleDB.
 * Provides optimized queries for time-series data and location tracking.
 *
 * **Features:**
 * - Full-text search across multiple fields
 * - Dynamic query building for flexible search
 * - Optimized indexes for common queries
 * - Duplicate detection (lab number and EPC)
 * - Soft deletes (status = DISPOSED)
 * - Time-series queries for stale detection
 *
 * **Database Schema Expected:**
 * ```sql
 * CREATE TABLE dockets (
 *   id VARCHAR(36) PRIMARY KEY,
 *   lab_number VARCHAR(50) UNIQUE NOT NULL,
 *   rfid_tag_epc VARCHAR(24) UNIQUE NOT NULL,
 *   case_number VARCHAR(50) NOT NULL,
 *   exhibit_number VARCHAR(50),
 *   description TEXT NOT NULL,
 *   category VARCHAR(20) NOT NULL,
 *   current_zone_id VARCHAR(36),
 *   last_seen_at TIMESTAMPTZ,
 *   last_seen_reader_id VARCHAR(36),
 *   location_confidence DECIMAL(3,2),
 *   status VARCHAR(20) NOT NULL,
 *   is_active BOOLEAN NOT NULL DEFAULT true,
 *   received_by VARCHAR(100),
 *   received_at TIMESTAMPTZ,
 *   handled_by VARCHAR(100),
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   metadata JSONB DEFAULT '{}'::jsonb,
 *   FOREIGN KEY (current_zone_id) REFERENCES zones(id),
 *   FOREIGN KEY (last_seen_reader_id) REFERENCES readers(id)
 * );
 *
 * CREATE INDEX idx_dockets_status ON dockets(status);
 * CREATE INDEX idx_dockets_zone ON dockets(current_zone_id);
 * CREATE INDEX idx_dockets_last_seen ON dockets(last_seen_at DESC);
 * CREATE INDEX idx_dockets_created_at ON dockets(created_at DESC);
 * CREATE INDEX idx_dockets_case_number ON dockets(case_number);
 * CREATE INDEX idx_dockets_search ON dockets USING gin(to_tsvector('english', lab_number || ' ' || case_number || ' ' || description));
 * ```
 *
 * @example
 * ```typescript
 * const repository = new PostgresDocketRepository(db, logger);
 *
 * // Save new docket
 * const saveResult = await repository.save(docket);
 *
 * // Search dockets
 * const searchResult = await repository.search({
 *   query: 'firearm',
 *   status: DocketStatus.REGISTERED,
 *   limit: 20
 * });
 * ```
 */
@injectable()
export class PostgresDocketRepository extends BaseRepository implements IDocketRepository {
  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  /**
   * Saves a new docket to the database
   *
   * @param docket - Docket entity to save
   * @returns Result indicating success or error
   *
   * @description
   * Performs duplicate checks before insertion:
   * - Checks if lab_number already exists
   * - Checks if rfid_tag_epc already exists
   *
   * Uses INSERT with all docket fields.
   */
  async save(
    docket: Docket
  ): Promise<Result<void, DuplicateLabNumberError | DuplicateEpcError | Error>> {
    try {
      // Check for duplicate lab number
      const labNumberExists = await this.existsByLabNumber(docket.getLabNumber());
      if (labNumberExists.isErr()) {
        return err(labNumberExists.error);
      }
      if (labNumberExists.value) {
        return err(new DuplicateLabNumberError(docket.getLabNumber().getValue()));
      }

      // Check for duplicate EPC
      const epcExists = await this.existsByEpc(docket.getRfidEpc());
      if (epcExists.isErr()) {
        return err(epcExists.error);
      }
      if (epcExists.value) {
        return err(new DuplicateEpcError(docket.getRfidEpc().getValue()));
      }

      const props = docket.toPersistence();

      const sql = `
        INSERT INTO dockets (
          id,
          lab_number,
          rfid_tag_epc,
          case_number,
          exhibit_number,
          description,
          category,
          current_zone_id,
          last_seen_at,
          last_seen_reader_id,
          location_confidence,
          status,
          is_active,
          received_by,
          received_at,
          handled_by,
          created_at,
          updated_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `;

      const params = [
        props.id,
        props.labNumber.getValue(),
        props.rfidEpc.getValue(),
        props.caseNumber.getValue(),
        props.exhibitNumber ?? null,
        props.description,
        props.category,
        props.currentZoneId,
        props.lastSeenAt,
        props.lastSeenReaderId,
        props.locationConfidence,
        props.status,
        props.isActive,
        props.receivedBy ?? null,
        props.receivedAt ?? null,
        props.handledBy ?? null,
        props.createdAt,
        props.updatedAt,
        JSON.stringify(props.metadata),
      ];

      const result = await this.executeQuery(sql, params);

      if (result.isErr()) {
        // Check for database constraint violations
        const error = result.error;
        if (error.message.includes('lab_number') && error.message.includes('unique')) {
          return err(new DuplicateLabNumberError(props.labNumber.getValue()));
        }
        if (error.message.includes('rfid_tag_epc') && error.message.includes('unique')) {
          return err(new DuplicateEpcError(props.rfidEpc.getValue()));
        }
        return err(error);
      }

      this.logger.info('Docket saved', {
        id: props.id,
        labNumber: props.labNumber.getValue(),
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to save docket', { error });
      return err(error as Error);
    }
  }

  /**
   * Finds a docket by its unique ID
   *
   * @param id - Docket ID
   * @returns Result containing docket or null if not found
   */
  async findById(id: string): Promise<Result<Docket | null, Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE id = $1
    `;

    const result = await this.executeQueryOne<DocketRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return this.rowToDomain(result.value);
  }

  /**
   * Finds a docket by its lab number
   *
   * @param labNumber - Lab number value object
   * @returns Result containing docket or DocketNotFoundError
   */
  async findByLabNumber(labNumber: LabNumber): Promise<Result<Docket, DocketNotFoundError>> {
    const sql = `
      SELECT * FROM dockets
      WHERE lab_number = $1
    `;

    const result = await this.executeQueryOne<DocketRow>(sql, [labNumber.getValue()]);

    if (result.isErr()) {
      return err(new DocketNotFoundError(labNumber.getValue()));
    }

    if (!result.value) {
      return err(new DocketNotFoundError(labNumber.getValue()));
    }

    const docketResult = this.rowToDomain(result.value);
    if (docketResult.isErr()) {
      return err(new DocketNotFoundError(labNumber.getValue()));
    }

    return ok(docketResult.value);
  }

  /**
   * Finds a docket by its RFID EPC
   *
   * @param epc - RFID EPC value object
   * @returns Result containing docket or DocketNotFoundError
   */
  async findByEpc(epc: RfidEpc): Promise<Result<Docket, DocketNotFoundError>> {
    const sql = `
      SELECT * FROM dockets
      WHERE rfid_tag_epc = $1
    `;

    const result = await this.executeQueryOne<DocketRow>(sql, [epc.getValue()]);

    if (result.isErr()) {
      return err(new DocketNotFoundError(epc.getValue()));
    }

    if (!result.value) {
      return err(new DocketNotFoundError(epc.getValue()));
    }

    const docketResult = this.rowToDomain(result.value);
    if (docketResult.isErr()) {
      return err(new DocketNotFoundError(epc.getValue()));
    }

    return ok(docketResult.value);
  }

  /**
   * Searches for dockets using flexible criteria
   *
   * @param criteria - Search criteria with filters and pagination
   * @returns Result containing paginated search results
   *
   * @description
   * Builds dynamic SQL query based on provided criteria.
   * Supports:
   * - Full-text search (query)
   * - Status filtering
   * - Zone filtering
   * - Category filtering
   * - Date range filtering (created, last seen)
   * - Active-only filtering
   * - Sorting (multiple fields)
   * - Pagination
   */
  async search(criteria: DocketSearchCriteria): Promise<Result<DocketSearchResult, Error>> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Full-text search across multiple fields
      if (criteria.query && criteria.query.trim().length > 0) {
        conditions.push(
          `(
            lab_number ILIKE $${paramIndex} OR
            case_number ILIKE $${paramIndex} OR
            exhibit_number ILIKE $${paramIndex} OR
            description ILIKE $${paramIndex}
          )`
        );
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
        conditions.push(`current_zone_id = $${paramIndex}`);
        params.push(criteria.zoneId);
        paramIndex++;
      }

      // Category filter
      if (criteria.category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(criteria.category);
        paramIndex++;
      }

      // Date filters
      if (criteria.createdAfter) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(criteria.createdAfter);
        paramIndex++;
      }

      if (criteria.createdBefore) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(criteria.createdBefore);
        paramIndex++;
      }

      if (criteria.lastSeenAfter) {
        conditions.push(`last_seen_at >= $${paramIndex}`);
        params.push(criteria.lastSeenAfter);
        paramIndex++;
      }

      if (criteria.lastSeenBefore) {
        conditions.push(`last_seen_at <= $${paramIndex}`);
        params.push(criteria.lastSeenBefore);
        paramIndex++;
      }

      // Active-only filter
      if (criteria.activeOnly) {
        conditions.push(`status NOT IN ('${DocketStatus.ARCHIVED}', '${DocketStatus.DISPOSED}')`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const sortBy = criteria.sortBy || 'createdAt';
      const sortOrder = criteria.sortOrder || 'desc';
      const orderByField = this.mapSortField(sortBy);
      const orderBy = `ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;

      // Pagination
      const limit = Math.min(criteria.limit || 10, 100);
      const offset = criteria.offset || 0;

      // Count query
      const countSql = `
        SELECT COUNT(*) as count
        FROM dockets
        ${whereClause}
      `;

      const countResult = await this.executeQueryOne<{ count: string }>(countSql, params);

      if (countResult.isErr()) {
        return err(countResult.error);
      }

      const total = parseInt(countResult.value?.count || '0', 10);

      // Data query
      const dataSql = `
        SELECT * FROM dockets
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataResult = await this.executeQuery<DocketRow>(dataSql, [
        ...params,
        limit,
        offset,
      ]);

      if (dataResult.isErr()) {
        return err(dataResult.error);
      }

      // Convert rows to domain entities
      const dockets: Docket[] = [];
      for (const row of dataResult.value) {
        const docketResult = this.rowToDomain(row);
        if (docketResult.isOk()) {
          dockets.push(docketResult.value);
        } else {
          this.logger.warn('Failed to convert row to domain entity', {
            labNumber: row.lab_number,
            error: docketResult.error.message,
          });
        }
      }

      const hasMore = offset + dockets.length < total;

      return ok({
        dockets,
        total,
        limit,
        offset,
        hasMore,
      });
    } catch (error) {
      this.logger.error('Search failed', { error, criteria });
      return err(error as Error);
    }
  }

  /**
   * Finds all dockets in a specific zone
   *
   * @param zoneId - Zone ID
   * @returns Result containing array of dockets in the zone
   */
  async findByZone(zoneId: string): Promise<Result<Docket[], Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE current_zone_id = $1
        AND is_active = true
      ORDER BY last_seen_at DESC NULLS LAST
    `;

    const result = await this.executeQuery<DocketRow>(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const dockets: Docket[] = [];
    for (const row of result.value) {
      const docketResult = this.rowToDomain(row);
      if (docketResult.isOk()) {
        dockets.push(docketResult.value);
      }
    }

    return ok(dockets);
  }

  /**
   * Finds recently detected dockets in a zone
   *
   * @param zoneId - Zone ID
   * @param limit - Maximum number of results (default: 10)
   * @returns Result containing array of recently seen dockets
   *
   * @description
   * Returns only active dockets that have been seen at least once,
   * sorted by most recent first.
   */
  async findRecentByZone(zoneId: string, limit: number = 10): Promise<Result<Docket[], Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE current_zone_id = $1
        AND is_active = true
        AND last_seen_at IS NOT NULL
      ORDER BY last_seen_at DESC
      LIMIT $2
    `;

    const result = await this.executeQuery<DocketRow>(sql, [zoneId, limit]);

    if (result.isErr()) {
      return err(result.error);
    }

    const dockets: Docket[] = [];
    for (const row of result.value) {
      const docketResult = this.rowToDomain(row);
      if (docketResult.isOk()) {
        dockets.push(docketResult.value);
      }
    }

    return ok(dockets);
  }

  /**
   * Finds all active dockets
   *
   * @returns Result containing array of active dockets
   *
   * @description
   * Returns dockets with status REGISTERED, IN_TRANSIT, or IN_EXAMINATION.
   * Excludes ARCHIVED, DISPOSED, and MISSING dockets.
   */
  async findAllActive(): Promise<Result<Docket[], Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE status IN ($1, $2, $3)
        AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<DocketRow>(sql, [
      DocketStatus.REGISTERED,
      DocketStatus.IN_TRANSIT,
      DocketStatus.IN_EXAMINATION,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    const dockets: Docket[] = [];
    for (const row of result.value) {
      const docketResult = this.rowToDomain(row);
      if (docketResult.isOk()) {
        dockets.push(docketResult.value);
      }
    }

    return ok(dockets);
  }

  /**
   * Finds all dockets marked as missing
   *
   * @returns Result containing array of missing dockets
   */
  async findAllMissing(): Promise<Result<Docket[], Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE status = $1
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<DocketRow>(sql, [DocketStatus.MISSING]);

    if (result.isErr()) {
      return err(result.error);
    }

    const dockets: Docket[] = [];
    for (const row of result.value) {
      const docketResult = this.rowToDomain(row);
      if (docketResult.isOk()) {
        dockets.push(docketResult.value);
      }
    }

    return ok(dockets);
  }

  /**
   * Finds dockets that haven't been seen within the threshold
   *
   * @param thresholdHours - Hours without detection before considered stale
   * @returns Result containing array of stale dockets
   *
   * @description
   * Returns dockets where:
   * - Status is REGISTERED, IN_TRANSIT, or IN_EXAMINATION
   * - lastSeenAt is older than thresholdHours OR is null
   *
   * Used by background jobs to identify dockets that should be marked missing.
   */
  async findStale(thresholdHours: number): Promise<Result<Docket[], Error>> {
    const sql = `
      SELECT * FROM dockets
      WHERE status IN ($1, $2, $3)
        AND is_active = true
        AND (
          last_seen_at < NOW() - INTERVAL '${thresholdHours} hours'
          OR last_seen_at IS NULL
        )
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<DocketRow>(sql, [
      DocketStatus.REGISTERED,
      DocketStatus.IN_TRANSIT,
      DocketStatus.IN_EXAMINATION,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    const dockets: Docket[] = [];
    for (const row of result.value) {
      const docketResult = this.rowToDomain(row);
      if (docketResult.isOk()) {
        dockets.push(docketResult.value);
      }
    }

    return ok(dockets);
  }

  /**
   * Updates an existing docket
   *
   * @param docket - Docket entity with updated values
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields. Docket is identified by ID.
   * Lab number and RFID EPC cannot be changed (immutable).
   */
  async update(docket: Docket): Promise<Result<void, Error>> {
    const props = docket.toPersistence();

    const sql = `
      UPDATE dockets SET
        case_number = $2,
        exhibit_number = $3,
        description = $4,
        category = $5,
        current_zone_id = $6,
        last_seen_at = $7,
        last_seen_reader_id = $8,
        location_confidence = $9,
        status = $10,
        is_active = $11,
        received_by = $12,
        received_at = $13,
        handled_by = $14,
        updated_at = $15,
        metadata = $16
      WHERE id = $1
    `;

    const params = [
      props.id,
      props.caseNumber,
      props.exhibitNumber ?? null,
      props.description,
      props.category,
      props.currentZoneId,
      props.lastSeenAt,
      props.lastSeenReaderId,
      props.locationConfidence,
      props.status,
      props.isActive,
      props.receivedBy ?? null,
      props.receivedAt ?? null,
      props.handledBy ?? null,
      props.updatedAt,
      JSON.stringify(props.metadata),
    ];

    const result = await this.executeQuery(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Docket updated', {
      id: props.id,
      labNumber: props.labNumber.getValue(),
    });

    return ok(undefined);
  }

  /**
   * Deletes a docket (soft delete)
   *
   * @param id - Docket ID to delete
   * @returns Result indicating success or failure
   *
   * @description
   * Performs soft delete by setting status to DISPOSED and is_active to false.
   * Does not physically remove the record from the database.
   */
  async delete(id: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE dockets
      SET status = $2,
          is_active = false,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [id, DocketStatus.DISPOSED]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Docket deleted (soft)', { id });

    return ok(undefined);
  }

  /**
   * Counts the total number of active dockets
   *
   * @returns Result containing the count
   *
   * @description
   * Returns count of dockets with status REGISTERED, IN_TRANSIT, or IN_EXAMINATION.
   * Excludes ARCHIVED, DISPOSED, and MISSING dockets.
   */
  async countActive(): Promise<Result<number, Error>> {
    const sql = `
      SELECT COUNT(*) as count
      FROM dockets
      WHERE status IN ($1, $2, $3)
        AND is_active = true
    `;

    const result = await this.executeQueryOne<{ count: string }>(sql, [
      DocketStatus.REGISTERED,
      DocketStatus.IN_TRANSIT,
      DocketStatus.IN_EXAMINATION,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.count || '0', 10));
  }

  /**
   * Checks if a lab number already exists
   *
   * @param labNumber - Lab number to check
   * @returns Result containing boolean (true if exists)
   */
  async existsByLabNumber(labNumber: LabNumber): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM dockets WHERE lab_number = $1
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [labNumber.getValue()]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  /**
   * Checks if an RFID EPC is already assigned
   *
   * @param epc - RFID EPC to check
   * @returns Result containing boolean (true if assigned)
   */
  async existsByEpc(epc: RfidEpc): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM dockets WHERE rfid_tag_epc = $1
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [epc.getValue()]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Maps a database row to a Docket domain entity
   *
   * @param row - Database row
   * @returns Result containing Docket or Error
   *
   * @description
   * Converts snake_case database columns to domain entity.
   * Validates and creates value objects (LabNumber, RfidEpc).
   * Parses JSON metadata.
   */
  private rowToDomain(row: DocketRow): Result<Docket, Error> {
    try {
      // Create LabNumber value object
      const labNumberResult = LabNumberVO.create(row.lab_number);
      if (labNumberResult.isErr()) {
        return err(labNumberResult.error);
      }

      // Create CaseNumber value object
      const caseNumberResult = CaseNumberVO.create(row.case_number);
      if (caseNumberResult.isErr()) {
        return err(caseNumberResult.error);
      }

      // Create RfidEpc value object
      const epcResult = RfidEpcVO.create(row.rfid_tag_epc);
      if (epcResult.isErr()) {
        return err(epcResult.error);
      }

      // Parse metadata
      let metadata: Record<string, unknown> = {};
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (e) {
            this.logger.warn('Failed to parse metadata JSON', {
              labNumber: row.lab_number,
              error: e,
            });
            metadata = {};
          }
        } else {
          metadata = row.metadata;
        }
      }

      // Reconstitute domain entity
      const docket = Docket.fromPersistence({
        id: row.id,
        labNumber: labNumberResult.value,
        rfidEpc: epcResult.value,
        caseNumber: caseNumberResult.value,
        exhibitNumber: row.exhibit_number ?? undefined,
        description: row.description,
        category: row.category as any,
        currentZoneId: row.current_zone_id,
        lastSeenAt: row.last_seen_at,
        lastSeenReaderId: row.last_seen_reader_id,
        locationConfidence: row.location_confidence,
        status: row.status as DocketStatus,
        isActive: row.is_active,
        receivedBy: row.received_by ?? undefined,
        receivedAt: row.received_at ?? undefined,
        handledBy: row.handled_by ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata,
      });

      return ok(docket);
    } catch (error) {
      this.logger.error('Failed to map row to domain', {
        labNumber: row.lab_number,
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
      labNumber: 'lab_number',
      caseNumber: 'case_number',
      createdAt: 'created_at',
      lastSeenAt: 'last_seen_at',
      updatedAt: 'updated_at',
    };

    return mapping[field] || 'created_at';
  }
}
