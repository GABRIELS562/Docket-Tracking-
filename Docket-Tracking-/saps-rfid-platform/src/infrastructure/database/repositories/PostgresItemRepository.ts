import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  IItemRepository,
  ItemSearchCriteria,
  ItemSearchResult,
} from '../../../domain/repositories/IItemRepository';
import { Item, ItemStatus } from '../../../domain/entities/Item';
import type { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import { ItemNumber as ItemNumberVO } from '../../../domain/value-objects/ItemNumber';
import type { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import { RfidEpc as RfidEpcVO } from '../../../domain/value-objects/RfidEpc';
import { ReferenceId as ReferenceIdVO } from '../../../domain/value-objects/ReferenceId';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { DuplicateItemNumberError } from '../../../domain/errors/DuplicateItemNumberError';
import { DuplicateEpcError } from '../../../domain/errors/DuplicateEpcError';
import { BaseRepository } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Database row interface
 *
 * @description
 * Represents the structure of an item row in PostgreSQL.
 * Maps database snake_case to application camelCase.
 */
interface ItemRow {
  id: string;
  item_number: string;
  rfid_tag_epc: string;
  reference_id: string;
  serial_number: string | null;
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
 * PostgreSQL Implementation of IItemRepository
 *
 * @description
 * Concrete repository implementation using PostgreSQL with TimescaleDB.
 * Provides optimized queries for time-series data and location tracking.
 *
 * **Features:**
 * - Full-text search across multiple fields
 * - Dynamic query building for flexible search
 * - Optimized indexes for common queries
 * - Duplicate detection (item number and EPC)
 * - Soft deletes (status = DISPOSED)
 * - Time-series queries for stale detection
 *
 * **Database Schema Expected:**
 * ```sql
 * CREATE TABLE items (
 *   id VARCHAR(36) PRIMARY KEY,
 *   item_number VARCHAR(50) UNIQUE NOT NULL,
 *   rfid_tag_epc VARCHAR(24) UNIQUE NOT NULL,
 *   reference_id VARCHAR(100) NOT NULL,
 *   serial_number VARCHAR(100),
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
 * CREATE INDEX idx_items_status ON items(status);
 * CREATE INDEX idx_items_zone ON items(current_zone_id);
 * CREATE INDEX idx_items_last_seen ON items(last_seen_at DESC);
 * CREATE INDEX idx_items_created_at ON items(created_at DESC);
 * CREATE INDEX idx_items_reference_id ON items(reference_id);
 * CREATE INDEX idx_items_search ON items USING gin(to_tsvector('english', item_number || ' ' || reference_id || ' ' || description));
 * ```
 *
 * @example
 * ```typescript
 * const repository = new PostgresItemRepository(db, logger);
 *
 * // Save new item
 * const saveResult = await repository.save(item);
 *
 * // Search items
 * const searchResult = await repository.search({
 *   query: 'laptop',
 *   status: ItemStatus.REGISTERED,
 *   limit: 20
 * });
 * ```
 */
@injectable()
export class PostgresItemRepository extends BaseRepository implements IItemRepository {
  constructor(
    @inject('PostgresConnection') db: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(db, logger);
  }

  /**
   * Saves a new item to the database
   *
   * @param item - Item entity to save
   * @returns Result indicating success or error
   *
   * @description
   * Performs duplicate checks before insertion:
   * - Checks if item_number already exists
   * - Checks if rfid_tag_epc already exists
   *
   * Uses INSERT with all item fields.
   */
  async save(
    item: Item
  ): Promise<Result<void, DuplicateItemNumberError | DuplicateEpcError | Error>> {
    try {
      // Check for duplicate item number
      const itemNumberExists = await this.existsByItemNumber(item.getItemNumber());
      if (itemNumberExists.isErr()) {
        return err(itemNumberExists.error);
      }
      if (itemNumberExists.value) {
        return err(new DuplicateItemNumberError(item.getItemNumber().getValue()));
      }

      // Check for duplicate EPC
      const epcExists = await this.existsByEpc(item.getRfidEpc());
      if (epcExists.isErr()) {
        return err(epcExists.error);
      }
      if (epcExists.value) {
        return err(new DuplicateEpcError(item.getRfidEpc().getValue()));
      }

      const props = item.toPersistence();

      const sql = `
        INSERT INTO items (
          id,
          item_number,
          rfid_tag_epc,
          reference_id,
          serial_number,
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
        props.itemNumber.getValue(),
        props.rfidEpc.getValue(),
        props.referenceId.getValue(),
        props.serialNumber ?? null,
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
        if (error.message.includes('item_number') && error.message.includes('unique')) {
          return err(new DuplicateItemNumberError(props.itemNumber.getValue()));
        }
        if (error.message.includes('rfid_tag_epc') && error.message.includes('unique')) {
          return err(new DuplicateEpcError(props.rfidEpc.getValue()));
        }
        return err(error);
      }

      this.logger.info('Item saved', {
        id: props.id,
        itemNumber: props.itemNumber.getValue(),
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to save item', { error });
      return err(error as Error);
    }
  }

  /**
   * Finds an item by its unique ID
   *
   * @param id - Item ID
   * @returns Result containing item or null if not found
   */
  async findById(id: string): Promise<Result<Item | null, Error>> {
    const sql = `
      SELECT * FROM items
      WHERE id = $1
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return this.rowToDomain(result.value);
  }

  /**
   * Finds an item by its item number
   *
   * @param itemNumber - Item number value object
   * @returns Result containing item or ItemNotFoundError
   */
  async findByItemNumber(itemNumber: ItemNumber): Promise<Result<Item, ItemNotFoundError>> {
    const sql = `
      SELECT * FROM items
      WHERE item_number = $1
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [itemNumber.getValue()]);

    if (result.isErr()) {
      return err(new ItemNotFoundError(itemNumber.getValue()));
    }

    if (!result.value) {
      return err(new ItemNotFoundError(itemNumber.getValue()));
    }

    const itemResult = this.rowToDomain(result.value);
    if (itemResult.isErr()) {
      return err(new ItemNotFoundError(itemNumber.getValue()));
    }

    return ok(itemResult.value);
  }

  /**
   * Finds an item by its RFID EPC
   *
   * @param epc - RFID EPC value object
   * @returns Result containing item or ItemNotFoundError
   */
  async findByEpc(epc: RfidEpc): Promise<Result<Item, ItemNotFoundError>> {
    const sql = `
      SELECT * FROM items
      WHERE rfid_tag_epc = $1
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [epc.getValue()]);

    if (result.isErr()) {
      return err(new ItemNotFoundError(epc.getValue()));
    }

    if (!result.value) {
      return err(new ItemNotFoundError(epc.getValue()));
    }

    const itemResult = this.rowToDomain(result.value);
    if (itemResult.isErr()) {
      return err(new ItemNotFoundError(epc.getValue()));
    }

    return ok(itemResult.value);
  }

  /**
   * Searches for items using flexible criteria
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
  async search(criteria: ItemSearchCriteria): Promise<Result<ItemSearchResult, Error>> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Full-text search across multiple fields
      if (criteria.query && criteria.query.trim().length > 0) {
        conditions.push(
          `(
            item_number ILIKE $${paramIndex} OR
            reference_id ILIKE $${paramIndex} OR
            serial_number ILIKE $${paramIndex} OR
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
        conditions.push(`status NOT IN ('${ItemStatus.ARCHIVED}', '${ItemStatus.DISPOSED}')`);
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
        FROM items
        ${whereClause}
      `;

      const countResult = await this.executeQueryOne<{ count: string }>(countSql, params);

      if (countResult.isErr()) {
        return err(countResult.error);
      }

      const total = parseInt(countResult.value?.count || '0', 10);

      // Data query
      const dataSql = `
        SELECT * FROM items
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataResult = await this.executeQuery<ItemRow>(dataSql, [
        ...params,
        limit,
        offset,
      ]);

      if (dataResult.isErr()) {
        return err(dataResult.error);
      }

      // Convert rows to domain entities
      const items: Item[] = [];
      for (const row of dataResult.value) {
        const itemResult = this.rowToDomain(row);
        if (itemResult.isOk()) {
          items.push(itemResult.value);
        } else {
          this.logger.warn('Failed to convert row to domain entity', {
            itemNumber: row.item_number,
            error: itemResult.error.message,
          });
        }
      }

      const hasMore = offset + items.length < total;

      return ok({
        items,
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
   * Finds all items in a specific zone
   *
   * @param zoneId - Zone ID
   * @returns Result containing array of items in the zone
   */
  async findByZone(zoneId: string): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE current_zone_id = $1
        AND is_active = true
      ORDER BY last_seen_at DESC NULLS LAST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [zoneId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const items: Item[] = [];
    for (const row of result.value) {
      const itemResult = this.rowToDomain(row);
      if (itemResult.isOk()) {
        items.push(itemResult.value);
      }
    }

    return ok(items);
  }

  /**
   * Finds recently detected items in a zone
   *
   * @param zoneId - Zone ID
   * @param limit - Maximum number of results (default: 10)
   * @returns Result containing array of recently seen items
   *
   * @description
   * Returns only active items that have been seen at least once,
   * sorted by most recent first.
   */
  async findRecentByZone(zoneId: string, limit: number = 10): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE current_zone_id = $1
        AND is_active = true
        AND last_seen_at IS NOT NULL
      ORDER BY last_seen_at DESC
      LIMIT $2
    `;

    const result = await this.executeQuery<ItemRow>(sql, [zoneId, limit]);

    if (result.isErr()) {
      return err(result.error);
    }

    const items: Item[] = [];
    for (const row of result.value) {
      const itemResult = this.rowToDomain(row);
      if (itemResult.isOk()) {
        items.push(itemResult.value);
      }
    }

    return ok(items);
  }

  /**
   * Finds all active items
   *
   * @returns Result containing array of active items
   *
   * @description
   * Returns items with status REGISTERED, IN_TRANSIT, or IN_PROCESSING.
   * Excludes ARCHIVED, DISPOSED, and MISSING items.
   */
  async findAllActive(): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE status IN ($1, $2, $3)
        AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<ItemRow>(sql, [
      ItemStatus.REGISTERED,
      ItemStatus.IN_TRANSIT,
      ItemStatus.IN_PROCESSING,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    const items: Item[] = [];
    for (const row of result.value) {
      const itemResult = this.rowToDomain(row);
      if (itemResult.isOk()) {
        items.push(itemResult.value);
      }
    }

    return ok(items);
  }

  /**
   * Finds all items marked as missing
   *
   * @returns Result containing array of missing items
   */
  async findAllMissing(): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE status = $1
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [ItemStatus.MISSING]);

    if (result.isErr()) {
      return err(result.error);
    }

    const items: Item[] = [];
    for (const row of result.value) {
      const itemResult = this.rowToDomain(row);
      if (itemResult.isOk()) {
        items.push(itemResult.value);
      }
    }

    return ok(items);
  }

  /**
   * Finds items that haven't been seen within the threshold
   *
   * @param thresholdHours - Hours without detection before considered stale
   * @returns Result containing array of stale items
   *
   * @description
   * Returns items where:
   * - Status is REGISTERED, IN_TRANSIT, or IN_PROCESSING
   * - lastSeenAt is older than thresholdHours OR is null
   *
   * Used by background jobs to identify items that should be marked missing.
   */
  async findStale(thresholdHours: number): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE status IN ($1, $2, $3)
        AND is_active = true
        AND (
          last_seen_at < NOW() - INTERVAL '${thresholdHours} hours'
          OR last_seen_at IS NULL
        )
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [
      ItemStatus.REGISTERED,
      ItemStatus.IN_TRANSIT,
      ItemStatus.IN_PROCESSING,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    const items: Item[] = [];
    for (const row of result.value) {
      const itemResult = this.rowToDomain(row);
      if (itemResult.isOk()) {
        items.push(itemResult.value);
      }
    }

    return ok(items);
  }

  /**
   * Updates an existing item
   *
   * @param item - Item entity with updated values
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields. Item is identified by ID.
   * Item number and RFID EPC cannot be changed (immutable).
   */
  async update(item: Item): Promise<Result<void, Error>> {
    const props = item.toPersistence();

    const sql = `
      UPDATE items SET
        reference_id = $2,
        serial_number = $3,
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
      props.referenceId.getValue(),
      props.serialNumber ?? null,
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

    this.logger.info('Item updated', {
      id: props.id,
      itemNumber: props.itemNumber.getValue(),
    });

    return ok(undefined);
  }

  /**
   * Deletes an item (soft delete)
   *
   * @param id - Item ID to delete
   * @returns Result indicating success or failure
   *
   * @description
   * Performs soft delete by setting status to DISPOSED and is_active to false.
   * Does not physically remove the record from the database.
   */
  async delete(id: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE items
      SET status = $2,
          is_active = false,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = await this.executeQuery(sql, [id, ItemStatus.DISPOSED]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Item deleted (soft)', { id });

    return ok(undefined);
  }

  /**
   * Counts the total number of active items
   *
   * @returns Result containing the count
   *
   * @description
   * Returns count of items with status REGISTERED, IN_TRANSIT, or IN_PROCESSING.
   * Excludes ARCHIVED, DISPOSED, and MISSING items.
   */
  async countActive(): Promise<Result<number, Error>> {
    const sql = `
      SELECT COUNT(*) as count
      FROM items
      WHERE status IN ($1, $2, $3)
        AND is_active = true
    `;

    const result = await this.executeQueryOne<{ count: string }>(sql, [
      ItemStatus.REGISTERED,
      ItemStatus.IN_TRANSIT,
      ItemStatus.IN_PROCESSING,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.count || '0', 10));
  }

  /**
   * Checks if an item number already exists
   *
   * @param itemNumber - Item number to check
   * @returns Result containing boolean (true if exists)
   */
  async existsByItemNumber(itemNumber: ItemNumber): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM items WHERE item_number = $1
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [itemNumber.getValue()]);

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
        SELECT 1 FROM items WHERE rfid_tag_epc = $1
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
   * Maps a database row to an Item domain entity
   *
   * @param row - Database row
   * @returns Result containing Item or Error
   *
   * @description
   * Converts snake_case database columns to domain entity.
   * Validates and creates value objects (ItemNumber, RfidEpc, ReferenceId).
   * Parses JSON metadata.
   */
  private rowToDomain(row: ItemRow): Result<Item, Error> {
    try {
      // Create ItemNumber value object
      const itemNumberResult = ItemNumberVO.create(row.item_number);
      if (itemNumberResult.isErr()) {
        return err(itemNumberResult.error);
      }

      // Create ReferenceId value object
      const referenceIdResult = ReferenceIdVO.create(row.reference_id);
      if (referenceIdResult.isErr()) {
        return err(referenceIdResult.error);
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
              itemNumber: row.item_number,
              error: e,
            });
            metadata = {};
          }
        } else {
          metadata = row.metadata;
        }
      }

      // Reconstitute domain entity
      const item = Item.fromPersistence({
        id: row.id,
        itemNumber: itemNumberResult.value,
        rfidEpc: epcResult.value,
        referenceId: referenceIdResult.value,
        serialNumber: row.serial_number ?? undefined,
        description: row.description,
        category: row.category as any,
        currentZoneId: row.current_zone_id,
        lastSeenAt: row.last_seen_at,
        lastSeenReaderId: row.last_seen_reader_id,
        locationConfidence: row.location_confidence,
        status: row.status as ItemStatus,
        isActive: row.is_active,
        receivedBy: row.received_by ?? undefined,
        receivedAt: row.received_at ?? undefined,
        handledBy: row.handled_by ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata,
      });

      return ok(item);
    } catch (error) {
      this.logger.error('Failed to map row to domain', {
        itemNumber: row.item_number,
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
      itemNumber: 'item_number',
      referenceId: 'reference_id',
      createdAt: 'created_at',
      lastSeenAt: 'last_seen_at',
      updatedAt: 'updated_at',
    };

    return mapping[field] || 'created_at';
  }
}
