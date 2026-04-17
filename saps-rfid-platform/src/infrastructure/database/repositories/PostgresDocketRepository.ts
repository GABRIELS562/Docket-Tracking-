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
import { CaseNumber as CaseNumberVO } from '../../../domain/value-objects/CaseNumber';
import { DocketNotFoundError } from '../../../domain/errors/DocketNotFoundError';
import { DuplicateLabNumberError } from '../../../domain/errors/DuplicateLabNumberError';
import { DuplicateEpcError } from '../../../domain/errors/DuplicateEpcError';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

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
  metadata: unknown;
}

const ACTIVE_STATUSES = [
  DocketStatus.REGISTERED,
  DocketStatus.IN_TRANSIT,
  DocketStatus.IN_EXAMINATION,
] as const;

const SORT_FIELD_MAP: Record<string, string> = {
  labNumber: 'lab_number',
  caseNumber: 'case_number',
  createdAt: 'created_at',
  lastSeenAt: 'last_seen_at',
  updatedAt: 'updated_at',
};

@injectable()
export class PostgresDocketRepository extends BaseRepository implements IDocketRepository {
  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  async save(
    docket: Docket
  ): Promise<Result<void, DuplicateLabNumberError | DuplicateEpcError | Error>> {
    try {
      const duplicateError = await this.checkForDuplicates(docket);
      if (duplicateError) {
        return err(duplicateError);
      }

      const props = docket.toPersistence();
      const { sql, params } = this.buildInsertQuery(props);
      const result = await this.executeQuery(sql, params);

      if (result.isErr()) {
        return this.handleConstraintViolation(result.error, props);
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

  async findById(id: string): Promise<Result<Docket | null, Error>> {
    const result = await this.executeQueryOne<DocketRow>(
      'SELECT * FROM dockets WHERE id = $1',
      [id]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return this.rowToDomain(result.value);
  }

  async findByLabNumber(labNumber: LabNumber): Promise<Result<Docket, DocketNotFoundError>> {
    const result = await this.executeQueryOne<DocketRow>(
      'SELECT * FROM dockets WHERE lab_number = $1',
      [labNumber.getValue()]
    );

    if (result.isErr() || !result.value) {
      return err(new DocketNotFoundError(labNumber.getValue(), 'labNumber'));
    }

    const docketResult = this.rowToDomain(result.value);
    if (docketResult.isErr()) {
      return err(new DocketNotFoundError(labNumber.getValue(), 'labNumber'));
    }

    return ok(docketResult.value);
  }

  async findByEpc(epc: RfidEpc): Promise<Result<Docket, DocketNotFoundError>> {
    const result = await this.executeQueryOne<DocketRow>(
      'SELECT * FROM dockets WHERE rfid_tag_epc = $1',
      [epc.getValue()]
    );

    if (result.isErr() || !result.value) {
      return err(new DocketNotFoundError(epc.getValue(), 'epc'));
    }

    const docketResult = this.rowToDomain(result.value);
    if (docketResult.isErr()) {
      return err(new DocketNotFoundError(epc.getValue(), 'epc'));
    }

    return ok(docketResult.value);
  }

  async search(criteria: DocketSearchCriteria): Promise<Result<DocketSearchResult, Error>> {
    try {
      const { whereClause, params } = this.buildSearchConditions(criteria);
      const orderBy = this.buildOrderBy(criteria);
      const limit = Math.min(criteria.limit || 10, 100);
      const offset = criteria.offset || 0;

      const total = await this.getSearchCount(whereClause, params);
      if (total.isErr()) {
        return err(total.error);
      }

      const dockets = await this.getSearchResults(whereClause, orderBy, params, limit, offset);
      if (dockets.isErr()) {
        return err(dockets.error);
      }

      return ok({
        dockets: dockets.value,
        total: total.value,
        limit,
        offset,
        hasMore: offset + dockets.value.length < total.value,
      });
    } catch (error) {
      this.logger.error('Search failed', { error, criteria });
      return err(error as Error);
    }
  }

  async findByZone(zoneId: string): Promise<Result<Docket[], Error>> {
    const result = await this.executeQuery<DocketRow>(
      `SELECT * FROM dockets
       WHERE current_zone_id = $1 AND is_active = true
       ORDER BY last_seen_at DESC NULLS LAST`,
      [zoneId]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  async findRecentByZone(zoneId: string, limit: number = 10): Promise<Result<Docket[], Error>> {
    const result = await this.executeQuery<DocketRow>(
      `SELECT * FROM dockets
       WHERE current_zone_id = $1 AND is_active = true AND last_seen_at IS NOT NULL
       ORDER BY last_seen_at DESC
       LIMIT $2`,
      [zoneId, limit]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  async findAllActive(): Promise<Result<Docket[], Error>> {
    const inClause = this.buildInClause('status', [...ACTIVE_STATUSES], 1);
    const result = await this.executeQuery<DocketRow>(
      `SELECT * FROM dockets WHERE ${inClause.sql} AND is_active = true ORDER BY created_at DESC`,
      inClause.params
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  async findAllMissing(): Promise<Result<Docket[], Error>> {
    const result = await this.executeQuery<DocketRow>(
      'SELECT * FROM dockets WHERE status = $1 ORDER BY last_seen_at ASC NULLS FIRST',
      [DocketStatus.MISSING]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  async findStale(thresholdHours: number): Promise<Result<Docket[], Error>> {
    const inClause = this.buildInClause('status', [...ACTIVE_STATUSES], 1);
    const result = await this.executeQuery<DocketRow>(
      `SELECT * FROM dockets
       WHERE ${inClause.sql}
         AND is_active = true
         AND (last_seen_at < NOW() - INTERVAL '1 hour' * $${inClause.params.length + 1} OR last_seen_at IS NULL)
       ORDER BY last_seen_at ASC NULLS FIRST`,
      [...inClause.params, thresholdHours]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  async update(docket: Docket): Promise<Result<void, Error>> {
    const props = docket.toPersistence();
    const { sql, params } = this.buildUpdateQuery(props);
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

  async delete(id: string): Promise<Result<void, Error>> {
    const result = await this.executeQuery(
      `UPDATE dockets SET status = $2, is_active = false, updated_at = NOW() WHERE id = $1`,
      [id, DocketStatus.DISPOSED]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Docket deleted (soft)', { id });
    return ok(undefined);
  }

  async countActive(): Promise<Result<number, Error>> {
    const inClause = this.buildInClause('status', [...ACTIVE_STATUSES], 1);
    const result = await this.executeQueryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM dockets WHERE ${inClause.sql} AND is_active = true`,
      inClause.params
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.count || '0', 10));
  }

  async existsByLabNumber(labNumber: LabNumber): Promise<Result<boolean, Error>> {
    return this.exists('dockets', { lab_number: labNumber.getValue() });
  }

  async existsByEpc(epc: RfidEpc): Promise<Result<boolean, Error>> {
    return this.exists('dockets', { rfid_tag_epc: epc.getValue() });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async checkForDuplicates(
    docket: Docket
  ): Promise<DuplicateLabNumberError | DuplicateEpcError | Error | null> {
    const labNumberExists = await this.existsByLabNumber(docket.getLabNumber());
    if (labNumberExists.isErr()) {
      return labNumberExists.error;
    }
    if (labNumberExists.value) {
      return new DuplicateLabNumberError(docket.getLabNumber().getValue());
    }

    const epcExists = await this.existsByEpc(docket.getRfidEpc());
    if (epcExists.isErr()) {
      return epcExists.error;
    }
    if (epcExists.value) {
      return new DuplicateEpcError(docket.getRfidEpc().getValue());
    }

    return null;
  }

  private buildInsertQuery(props: ReturnType<Docket['toPersistence']>): {
    sql: string;
    params: unknown[];
  } {
    const columns = [
      'id', 'lab_number', 'rfid_tag_epc', 'case_number', 'exhibit_number',
      'description', 'category', 'current_zone_id', 'last_seen_at',
      'last_seen_reader_id', 'location_confidence', 'status', 'is_active',
      'received_by', 'received_at', 'handled_by', 'created_at', 'updated_at', 'metadata',
    ];
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    return {
      sql: `INSERT INTO dockets (${columns.join(', ')}) VALUES (${placeholders})`,
      params: [
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
      ],
    };
  }

  private buildUpdateQuery(props: ReturnType<Docket['toPersistence']>): {
    sql: string;
    params: unknown[];
  } {
    return {
      sql: `UPDATE dockets SET
        case_number = $2, exhibit_number = $3, description = $4, category = $5,
        current_zone_id = $6, last_seen_at = $7, last_seen_reader_id = $8,
        location_confidence = $9, status = $10, is_active = $11, received_by = $12,
        received_at = $13, handled_by = $14, updated_at = $15, metadata = $16
        WHERE id = $1`,
      params: [
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
      ],
    };
  }

  private handleConstraintViolation(
    error: Error,
    props: ReturnType<Docket['toPersistence']>
  ): Result<void, DuplicateLabNumberError | DuplicateEpcError | Error> {
    if (error.message.includes('lab_number') && error.message.includes('unique')) {
      return err(new DuplicateLabNumberError(props.labNumber.getValue()));
    }
    if (error.message.includes('rfid_tag_epc') && error.message.includes('unique')) {
      return err(new DuplicateEpcError(props.rfidEpc.getValue()));
    }
    return err(error);
  }

  private buildSearchConditions(criteria: DocketSearchCriteria): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (criteria.query?.trim()) {
      conditions.push(`(
        lab_number ILIKE $${paramIndex} OR case_number ILIKE $${paramIndex} OR
        exhibit_number ILIKE $${paramIndex} OR description ILIKE $${paramIndex}
      )`);
      params.push(`%${criteria.query.trim()}%`);
      paramIndex++;
    }

    const simpleFilters: Array<{ field: string; value: unknown }> = [
      { field: 'status', value: criteria.status },
      { field: 'current_zone_id', value: criteria.zoneId },
      { field: 'category', value: criteria.category },
    ];

    for (const { field, value } of simpleFilters) {
      if (value !== undefined) {
        conditions.push(`${field} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    const dateFilters: Array<{ field: string; op: string; value: Date | undefined }> = [
      { field: 'created_at', op: '>=', value: criteria.createdAfter },
      { field: 'created_at', op: '<=', value: criteria.createdBefore },
      { field: 'last_seen_at', op: '>=', value: criteria.lastSeenAfter },
      { field: 'last_seen_at', op: '<=', value: criteria.lastSeenBefore },
    ];

    for (const { field, op, value } of dateFilters) {
      if (value !== undefined) {
        conditions.push(`${field} ${op} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (criteria.activeOnly) {
      conditions.push(`status NOT IN ('${DocketStatus.ARCHIVED}', '${DocketStatus.DISPOSED}')`);
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  private buildOrderBy(criteria: DocketSearchCriteria): string {
    const field = SORT_FIELD_MAP[criteria.sortBy || 'createdAt'] || 'created_at';
    const order = (criteria.sortOrder || 'desc').toUpperCase();
    return `ORDER BY ${field} ${order}`;
  }

  private async getSearchCount(whereClause: string, params: unknown[]): Promise<Result<number, Error>> {
    const result = await this.executeQueryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM dockets ${whereClause}`,
      params
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.count || '0', 10));
  }

  private async getSearchResults(
    whereClause: string,
    orderBy: string,
    params: unknown[],
    limit: number,
    offset: number
  ): Promise<Result<Docket[], Error>> {
    const paramIndex = params.length + 1;
    const result = await this.executeQuery<DocketRow>(
      `SELECT * FROM dockets ${whereClause} ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return this.rowsToDomainList(result.value);
  }

  private rowsToDomainList(rows: DocketRow[]): Result<Docket[], Error> {
    const dockets: Docket[] = [];

    for (const row of rows) {
      const result = this.rowToDomain(row);
      if (result.isOk()) {
        dockets.push(result.value);
      } else {
        this.logger.warn('Failed to convert row to domain entity', {
          labNumber: row.lab_number,
          error: result.error.message,
        });
      }
    }

    return ok(dockets);
  }

  private rowToDomain(row: DocketRow): Result<Docket, Error> {
    try {
      const labNumberResult = LabNumberVO.create(row.lab_number);
      if (labNumberResult.isErr()) {
        return err(labNumberResult.error);
      }

      const caseNumberResult = CaseNumberVO.create(row.case_number);
      if (caseNumberResult.isErr()) {
        return err(caseNumberResult.error);
      }

      const epcResult = RfidEpcVO.create(row.rfid_tag_epc);
      if (epcResult.isErr()) {
        return err(epcResult.error);
      }

      const metadata = this.parseMetadata(row.metadata, row.lab_number);

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

  private parseMetadata(metadata: unknown, labNumber: string): Record<string, unknown> {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch (e) {
        this.logger.warn('Failed to parse metadata JSON', { labNumber, error: e });
        return {};
      }
    }

    return metadata as Record<string, unknown>;
  }
}
