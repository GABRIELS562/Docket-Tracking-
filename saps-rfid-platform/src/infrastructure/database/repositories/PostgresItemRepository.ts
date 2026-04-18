import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import { Item, ItemStatus } from '../../../domain/entities/Item';
import { DuplicateEpcError } from '../../../domain/errors/DuplicateEpcError';
import { DuplicateItemNumberError } from '../../../domain/errors/DuplicateItemNumberError';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { ItemNumber as ItemNumberVO } from '../../../domain/value-objects/ItemNumber';
import { ReferenceId as ReferenceIdVO } from '../../../domain/value-objects/ReferenceId';
import { RfidEpc as RfidEpcVO } from '../../../domain/value-objects/RfidEpc';
import { BaseRepository } from '../BaseRepository';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type {
  IItemRepository,
  ItemSearchCriteria,
  ItemSearchResult,
} from '../../../domain/repositories/IItemRepository';

import type { ItemNumber } from '../../../domain/value-objects/ItemNumber';

import type { RfidEpc } from '../../../domain/value-objects/RfidEpc';

import type { PostgresConnection } from '../PostgresConnection';

/**
 * Database row interface
 *
 * @description
 * Represents the structure of an item row in PostgreSQL.
 * Maps database snake_case to application camelCase.
 * Includes tenant_id for multi-tenant isolation.
 */
interface ItemRow {
  id: string;
  tenant_id: string;
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
 * ALL queries are tenant-scoped for multi-tenant data isolation.
 *
 * **Multi-Tenant Isolation:**
 * - Every query includes tenant_id filter
 * - Duplicate checks are scoped to tenant
 * - No cross-tenant data access possible
 *
 * **Features:**
 * - Full-text search across multiple fields
 * - Dynamic query building for flexible search
 * - Optimized indexes for common queries
 * - Duplicate detection (item number and EPC within tenant)
 * - Soft deletes (status = DISPOSED)
 * - Time-series queries for stale detection
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
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or error
   *
   * @description
   * Performs duplicate checks within tenant before insertion:
   * - Checks if item_number already exists for this tenant
   * - Checks if rfid_tag_epc already exists for this tenant
   */
  async save(
    item: Item,
    tenantId: string
  ): Promise<Result<void, DuplicateItemNumberError | DuplicateEpcError | Error>> {
    try {
      // Check for duplicate item number within tenant
      const itemNumberExists = await this.existsByItemNumber(item.getItemNumber(), tenantId);
      if (itemNumberExists.isErr()) {
        return err(itemNumberExists.error);
      }
      if (itemNumberExists.value) {
        return err(new DuplicateItemNumberError(item.getItemNumber().getValue()));
      }

      // Check for duplicate EPC within tenant
      const epcExists = await this.existsByEpc(item.getRfidEpc(), tenantId);
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
          tenant_id,
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `;

      const params = [
        props.id,
        tenantId,
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
        tenantId,
        itemNumber: props.itemNumber.getValue(),
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to save item', { error, tenantId });
      return err(error as Error);
    }
  }

  /**
   * Finds an item by its unique ID within a tenant
   *
   * @param id - Item ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing item or null if not found
   */
  async findById(id: string, tenantId: string): Promise<Result<Item | null, Error>> {
    const sql = `
      SELECT * FROM items
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [id, tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok(null);
    }

    return this.rowToDomain(result.value);
  }

  /**
   * Finds an item by its item number within a tenant
   *
   * @param itemNumber - Item number value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing item or ItemNotFoundError
   */
  async findByItemNumber(
    itemNumber: ItemNumber,
    tenantId: string
  ): Promise<Result<Item, ItemNotFoundError>> {
    const sql = `
      SELECT * FROM items
      WHERE item_number = $1 AND tenant_id = $2
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [itemNumber.getValue(), tenantId]);

    if (result.isErr()) {
      return err(new ItemNotFoundError(itemNumber.getValue(), 'itemNumber'));
    }

    if (!result.value) {
      return err(new ItemNotFoundError(itemNumber.getValue(), 'itemNumber'));
    }

    const itemResult = this.rowToDomain(result.value);
    if (itemResult.isErr()) {
      return err(new ItemNotFoundError(itemNumber.getValue(), 'itemNumber'));
    }

    return ok(itemResult.value);
  }

  /**
   * Finds an item by its RFID EPC within a tenant
   *
   * @param epc - RFID EPC value object
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing item or ItemNotFoundError
   */
  async findByEpc(epc: RfidEpc, tenantId: string): Promise<Result<Item, ItemNotFoundError>> {
    const sql = `
      SELECT * FROM items
      WHERE rfid_tag_epc = $1 AND tenant_id = $2
    `;

    const result = await this.executeQueryOne<ItemRow>(sql, [epc.getValue(), tenantId]);

    if (result.isErr()) {
      return err(new ItemNotFoundError(epc.getValue(), 'epc'));
    }

    if (!result.value) {
      return err(new ItemNotFoundError(epc.getValue(), 'epc'));
    }

    const itemResult = this.rowToDomain(result.value);
    if (itemResult.isErr()) {
      return err(new ItemNotFoundError(epc.getValue(), 'epc'));
    }

    return ok(itemResult.value);
  }

  /**
   * Searches for items using flexible criteria within a tenant
   *
   * @param criteria - Search criteria with filters and pagination (tenantId required)
   * @returns Result containing paginated search results
   *
   * @description
   * Builds dynamic SQL query based on provided criteria.
   * All results are scoped to the specified tenant.
   */
  async search(criteria: ItemSearchCriteria): Promise<Result<ItemSearchResult, Error>> {
    try {
      // tenantId is REQUIRED - first condition
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [criteria.tenantId];
      let paramIndex = 2;

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
      if (criteria.status != null) {
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

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

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

      const dataResult = await this.executeQuery<ItemRow>(dataSql, [...params, limit, offset]);

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
            tenantId: criteria.tenantId,
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
      this.logger.error('Search failed', { error, tenantId: criteria.tenantId });
      return err(error as Error);
    }
  }

  /**
   * Finds all items in a specific zone within a tenant
   *
   * @param zoneId - Zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of items in the zone
   */
  async findByZone(zoneId: string, tenantId: string): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE current_zone_id = $1
        AND tenant_id = $2
        AND is_active = true
      ORDER BY last_seen_at DESC NULLS LAST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [zoneId, tenantId]);

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
   * Finds recently detected items in a zone within a tenant
   *
   * @param zoneId - Zone ID
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param limit - Maximum number of results (default: 10)
   * @returns Result containing array of recently seen items
   */
  async findRecentByZone(
    zoneId: string,
    tenantId: string,
    limit: number = 10
  ): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE current_zone_id = $1
        AND tenant_id = $2
        AND is_active = true
        AND last_seen_at IS NOT NULL
      ORDER BY last_seen_at DESC
      LIMIT $3
    `;

    const result = await this.executeQuery<ItemRow>(sql, [zoneId, tenantId, limit]);

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
   * Finds all active items within a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of active items
   */
  async findAllActive(tenantId: string): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE tenant_id = $1
        AND status IN ($2, $3, $4)
        AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<ItemRow>(sql, [
      tenantId,
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
   * Finds all items marked as missing within a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of missing items
   */
  async findAllMissing(tenantId: string): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE tenant_id = $1
        AND status = $2
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [tenantId, ItemStatus.MISSING]);

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
   * Finds items that haven't been seen within the threshold for a tenant
   *
   * @param thresholdHours - Hours without detection before considered stale
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing array of stale items
   */
  async findStale(thresholdHours: number, tenantId: string): Promise<Result<Item[], Error>> {
    const sql = `
      SELECT * FROM items
      WHERE tenant_id = $1
        AND status IN ($2, $3, $4)
        AND is_active = true
        AND (
          last_seen_at < NOW() - INTERVAL '${thresholdHours} hours'
          OR last_seen_at IS NULL
        )
      ORDER BY last_seen_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<ItemRow>(sql, [
      tenantId,
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
   * Updates an existing item within a tenant
   *
   * @param item - Item entity with updated values
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   *
   * @description
   * Updates all mutable fields. Item is identified by ID AND tenant_id.
   * This ensures no cross-tenant updates are possible.
   */
  async update(item: Item, tenantId: string): Promise<Result<void, Error>> {
    const props = item.toPersistence();

    const sql = `
      UPDATE items SET
        reference_id = $3,
        serial_number = $4,
        description = $5,
        category = $6,
        current_zone_id = $7,
        last_seen_at = $8,
        last_seen_reader_id = $9,
        location_confidence = $10,
        status = $11,
        is_active = $12,
        received_by = $13,
        received_at = $14,
        handled_by = $15,
        updated_at = $16,
        metadata = $17
      WHERE id = $1 AND tenant_id = $2
    `;

    const params = [
      props.id,
      tenantId,
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
      tenantId,
      itemNumber: props.itemNumber.getValue(),
    });

    return ok(undefined);
  }

  /**
   * Deletes an item (soft delete) within a tenant
   *
   * @param id - Item ID to delete
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result indicating success or failure
   */
  async delete(id: string, tenantId: string): Promise<Result<void, Error>> {
    const sql = `
      UPDATE items
      SET status = $3,
          is_active = false,
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await this.executeQuery(sql, [id, tenantId, ItemStatus.DISPOSED]);

    if (result.isErr()) {
      return err(result.error);
    }

    this.logger.info('Item deleted (soft)', { id, tenantId });

    return ok(undefined);
  }

  /**
   * Counts the total number of active items within a tenant
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing the count
   */
  async countActive(tenantId: string): Promise<Result<number, Error>> {
    const sql = `
      SELECT COUNT(*) as count
      FROM items
      WHERE tenant_id = $1
        AND status IN ($2, $3, $4)
        AND is_active = true
    `;

    const result = await this.executeQueryOne<{ count: string }>(sql, [
      tenantId,
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
   * Checks if an item number already exists within a tenant
   *
   * @param itemNumber - Item number to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing boolean (true if exists)
   */
  async existsByItemNumber(
    itemNumber: ItemNumber,
    tenantId: string
  ): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM items WHERE item_number = $1 AND tenant_id = $2
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [
      itemNumber.getValue(),
      tenantId,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  /**
   * Checks if an RFID EPC is already assigned within a tenant
   *
   * @param epc - RFID EPC to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Result containing boolean (true if assigned)
   */
  async existsByEpc(epc: RfidEpc, tenantId: string): Promise<Result<boolean, Error>> {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM items WHERE rfid_tag_epc = $1 AND tenant_id = $2
      ) as exists
    `;

    const result = await this.executeQueryOne<{ exists: boolean }>(sql, [epc.getValue(), tenantId]);

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
              tenantId: row.tenant_id,
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
        tenantId: row.tenant_id,
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
