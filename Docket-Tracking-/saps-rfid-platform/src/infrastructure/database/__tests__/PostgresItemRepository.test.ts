
import { ok, err } from 'neverthrow';
import { PostgresItemRepository } from '../repositories/PostgresItemRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { Item, ItemStatus, ItemCategory } from '../../../domain/entities/Item';
import { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import { ReferenceId } from '../../../domain/value-objects/ReferenceId';
import { DuplicateItemNumberError } from '../../../domain/errors/DuplicateItemNumberError';
import { DuplicateEpcError } from '../../../domain/errors/DuplicateEpcError';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';

/**
 * PostgresItemRepository Unit Tests
 *
 * @description
 * Tests for the PostgreSQL implementation of IItemRepository covering:
 * - CRUD operations (save, findById, findByItemNumber, findByEpc, update, delete)
 * - Search functionality with various criteria
 * - Zone-based queries
 * - Stale item detection
 * - Duplicate detection
 * - Error handling
 * - Edge cases
 */
describe('PostgresItemRepository', () => {
  let repository: PostgresItemRepository;
  let mockDb: PostgresConnection;
  let mockLogger: ILogger;

  // Test fixtures
  const createTestItem = () => {
    const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
    const rfidEpc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
    const referenceId = ReferenceId.create('PO-2025-12345')._unsafeUnwrap();

    return Item.create({
      id: 'item-001',
      itemNumber,
      rfidEpc,
      referenceId,
      description: 'Dell Laptop Computer',
      category: ItemCategory.ELECTRONIC,
      serialNumber: 'SN-123456',
    })._unsafeUnwrap();
  };

  const createMockItemRow = (overrides: Partial<any> = {}) => ({
    id: 'item-001',
    item_number: 'INV-2025-000123',
    rfid_tag_epc: 'E280116060002004DECA48DA',
    reference_id: 'PO-2025-12345',
    serial_number: 'SN-123456',
    description: 'Dell Laptop Computer',
    category: 'electronic',
    current_zone_id: null,
    last_seen_at: null,
    last_seen_reader_id: null,
    location_confidence: null,
    status: 'registered',
    is_active: true,
    received_by: null,
    received_at: null,
    handled_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    // Mock PostgresConnection
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      transaction: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      getPoolStats: jest.fn(),
      healthCheck: jest.fn(),
    } as unknown as PostgresConnection;

    // Mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ILogger;

    repository = new PostgresItemRepository(mockDb, mockLogger);
  });

  // ============================================================================
  // save()
  // ============================================================================
  describe('save()', () => {
    it('should save a new item successfully', async () => {
      const item = createTestItem();

      // Mock duplicate checks (both return false)
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ exists: false })) // item number check
        .mockResolvedValueOnce(ok({ exists: false })); // EPC check

      // Mock insert
      jest.mocked(mockDb.query).mockResolvedValue(ok([{ rowCount: 1 }]));

      const result = await repository.save(item);

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        expect.arrayContaining(['item-001', 'INV-2025-000123'])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item saved',
        expect.objectContaining({ id: 'item-001' })
      );
    });

    it('should reject duplicate item number', async () => {
      const item = createTestItem();

      // Mock duplicate check (item number exists)
      jest.mocked(mockDb.queryOne).mockResolvedValueOnce(ok({ exists: true }));

      const result = await repository.save(item);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateItemNumberError);
      expect(result._unsafeUnwrapErr().message).toContain('INV-2025-000123');
    });

    it('should reject duplicate RFID EPC', async () => {
      const item = createTestItem();

      // Mock duplicate checks (item number OK, EPC exists)
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ exists: false })) // item number check
        .mockResolvedValueOnce(ok({ exists: true })); // EPC check - exists!

      const result = await repository.save(item);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateEpcError);
    });

    it('should handle database constraint violation for item number', async () => {
      const item = createTestItem();

      // Mock duplicate checks pass
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ exists: false }))
        .mockResolvedValueOnce(ok({ exists: false }));

      // Mock insert failure due to unique constraint
      const dbError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        constraint: 'items_item_number_key',
      };
      jest.mocked(mockDb.query).mockResolvedValue(err(dbError as any));

      const result = await repository.save(item);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateItemNumberError);
    });

    it('should handle database constraint violation for EPC', async () => {
      const item = createTestItem();

      // Mock duplicate checks pass
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ exists: false }))
        .mockResolvedValueOnce(ok({ exists: false }));

      // Mock insert failure due to unique constraint
      const dbError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint on rfid_tag_epc',
        constraint: 'items_rfid_tag_epc_key',
      };
      jest.mocked(mockDb.query).mockResolvedValue(err(dbError as any));

      const result = await repository.save(item);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateEpcError);
    });

    it('should handle generic database errors', async () => {
      const item = createTestItem();

      // Mock duplicate checks pass
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ exists: false }))
        .mockResolvedValueOnce(ok({ exists: false }));

      // Mock generic error
      jest.mocked(mockDb.query).mockResolvedValue(err(new Error('Connection lost')));

      const result = await repository.save(item);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Connection lost');
    });
  });

  // ============================================================================
  // findById()
  // ============================================================================
  describe('findById()', () => {
    it('should find item by ID', async () => {
      const mockRow = createMockItemRow();
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const result = await repository.findById('item-001');

      expect(result.isOk()).toBe(true);
      const item = result._unsafeUnwrap();
      expect(item).not.toBeNull();
      expect(item!.getId()).toBe('item-001');
      expect(item!.getItemNumber().getValue()).toBe('INV-2025-000123');
    });

    it('should return null for non-existent item', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const result = await repository.findById('non-existent');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it('should handle database errors', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(err(new Error('DB error')));

      const result = await repository.findById('item-001');

      expect(result.isErr()).toBe(true);
    });
  });

  // ============================================================================
  // findByItemNumber()
  // ============================================================================
  describe('findByItemNumber()', () => {
    it('should find item by item number', async () => {
      const mockRow = createMockItemRow();
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const result = await repository.findByItemNumber(itemNumber);

      expect(result.isOk()).toBe(true);
      const item = result._unsafeUnwrap();
      expect(item.getId()).toBe('item-001');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE item_number = $1'),
        ['INV-2025-000123']
      );
    });

    it('should return ItemNotFoundError for non-existent item number', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const itemNumber = ItemNumber.create('INV-2025-999999')._unsafeUnwrap();
      const result = await repository.findByItemNumber(itemNumber);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ItemNotFoundError);
    });
  });

  // ============================================================================
  // findByEpc()
  // ============================================================================
  describe('findByEpc()', () => {
    it('should find item by RFID EPC', async () => {
      const mockRow = createMockItemRow();
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const epc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
      const result = await repository.findByEpc(epc);

      expect(result.isOk()).toBe(true);
      const item = result._unsafeUnwrap();
      expect(item.getRfidEpc().getValue()).toBe('E280116060002004DECA48DA');
    });

    it('should return ItemNotFoundError for non-existent EPC', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const epc = RfidEpc.create('FFFFFFFFFFFFFFFFFFFFFFFF')._unsafeUnwrap();
      const result = await repository.findByEpc(epc);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ItemNotFoundError);
    });
  });

  // ============================================================================
  // search()
  // ============================================================================
  describe('search()', () => {
    it('should search with default parameters', async () => {
      const mockRows = [createMockItemRow()];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({});

      expect(result.isOk()).toBe(true);
      const searchResult = result._unsafeUnwrap();
      expect(searchResult.items).toHaveLength(1);
      expect(searchResult.total).toBe(1);
    });

    it('should search with text query', async () => {
      const mockRows = [createMockItemRow()];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({ query: 'laptop' });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%laptop%'])
      );
    });

    it('should filter by status', async () => {
      const mockRows = [createMockItemRow({ status: 'missing' })];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({ status: ItemStatus.MISSING });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining([ItemStatus.MISSING])
      );
    });

    it('should filter by zone', async () => {
      const mockRows = [createMockItemRow({ current_zone_id: 'zone-001' })];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({ zoneId: 'zone-001' });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('current_zone_id = $'),
        expect.arrayContaining(['zone-001'])
      );
    });

    it('should filter by category', async () => {
      const mockRows = [createMockItemRow({ category: 'electronic' })];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({ category: ItemCategory.ELECTRONIC });

      expect(result.isOk()).toBe(true);
    });

    it('should filter by date range', async () => {
      const mockRows = [createMockItemRow()];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const createdAfter = new Date('2025-01-01');
      const createdBefore = new Date('2025-12-31');

      const result = await repository.search({ createdAfter, createdBefore });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.arrayContaining([createdAfter, createdBefore])
      );
    });

    it('should filter active only', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '0' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.search({ activeOnly: true });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status NOT IN'),
        expect.any(Array)
      );
    });

    it('should handle pagination', async () => {
      const mockRows = [createMockItemRow()];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '100' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({ limit: 20, offset: 40 });

      expect(result.isOk()).toBe(true);
      const searchResult = result._unsafeUnwrap();
      expect(searchResult.limit).toBe(20);
      expect(searchResult.offset).toBe(40);
      expect(searchResult.hasMore).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([20, 40])
      );
    });

    it('should handle sorting', async () => {
      const mockRows = [createMockItemRow()];
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '1' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.search({
        sortBy: 'itemNumber',
        sortOrder: 'asc',
      });

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY item_number ASC'),
        expect.any(Array)
      );
    });

    it('should enforce maximum limit', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '0' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.search({ limit: 500 }); // exceeds max

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100]) // should be capped at 100
      );
    });

    it('should handle empty results', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '0' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.search({ query: 'nonexistent' });

      expect(result.isOk()).toBe(true);
      const searchResult = result._unsafeUnwrap();
      expect(searchResult.items).toHaveLength(0);
      expect(searchResult.total).toBe(0);
      expect(searchResult.hasMore).toBe(false);
    });
  });

  // ============================================================================
  // findByZone()
  // ============================================================================
  describe('findByZone()', () => {
    it('should find all items in a zone', async () => {
      const mockRows = [
        createMockItemRow({ current_zone_id: 'zone-001' }),
        createMockItemRow({ id: 'item-002', item_number: 'INV-2025-000124', current_zone_id: 'zone-001' }),
      ];
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.findByZone('zone-001');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE current_zone_id = $1'),
        ['zone-001']
      );
    });

    it('should return empty array for zone with no items', async () => {
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.findByZone('empty-zone');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(0);
    });
  });

  // ============================================================================
  // findRecentByZone()
  // ============================================================================
  describe('findRecentByZone()', () => {
    it('should find recent items in a zone', async () => {
      const mockRows = [createMockItemRow({ last_seen_at: new Date() })];
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.findRecentByZone('zone-001', 10);

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE current_zone_id = $1'),
        ['zone-001', 10]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('last_seen_at IS NOT NULL'),
        expect.any(Array)
      );
    });

    it('should use default limit of 10', async () => {
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      await repository.findRecentByZone('zone-001');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['zone-001', 10]
      );
    });
  });

  // ============================================================================
  // findAllActive()
  // ============================================================================
  describe('findAllActive()', () => {
    it('should find all active items', async () => {
      const mockRows = [
        createMockItemRow({ status: 'registered' }),
        createMockItemRow({ id: 'item-002', status: 'in_transit' }),
      ];
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.findAllActive();

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status IN'),
        [ItemStatus.REGISTERED, ItemStatus.IN_TRANSIT, ItemStatus.IN_PROCESSING]
      );
    });
  });

  // ============================================================================
  // findAllMissing()
  // ============================================================================
  describe('findAllMissing()', () => {
    it('should find all missing items', async () => {
      const mockRows = [createMockItemRow({ status: 'missing' })];
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.findAllMissing();

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        [ItemStatus.MISSING]
      );
    });
  });

  // ============================================================================
  // findStale()
  // ============================================================================
  describe('findStale()', () => {
    it('should find items not seen beyond threshold', async () => {
      const mockRows = [createMockItemRow({ last_seen_at: new Date(Date.now() - 72 * 60 * 60 * 1000) })];
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.findStale(48); // 48 hours threshold

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '48 hours'"),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // update()
  // ============================================================================
  describe('update()', () => {
    it('should update an existing item', async () => {
      const item = createTestItem();
      jest.mocked(mockDb.query).mockResolvedValue(ok([{ rowCount: 1 }]));

      const result = await repository.update(item);

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items SET'),
        expect.arrayContaining(['item-001'])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item updated',
        expect.objectContaining({ id: 'item-001' })
      );
    });

    it('should handle update errors', async () => {
      const item = createTestItem();
      jest.mocked(mockDb.query).mockResolvedValue(err(new Error('Update failed')));

      const result = await repository.update(item);

      expect(result.isErr()).toBe(true);
    });
  });

  // ============================================================================
  // delete()
  // ============================================================================
  describe('delete()', () => {
    it('should soft delete an item', async () => {
      jest.mocked(mockDb.query).mockResolvedValue(ok([{ rowCount: 1 }]));

      const result = await repository.delete('item-001');

      expect(result.isOk()).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items'),
        ['item-001', ItemStatus.DISPOSED]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("is_active = false"),
        expect.any(Array)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item deleted (soft)',
        expect.objectContaining({ id: 'item-001' })
      );
    });
  });

  // ============================================================================
  // countActive()
  // ============================================================================
  describe('countActive()', () => {
    it('should count active items', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '42' }));

      const result = await repository.countActive();

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(42);
    });

    it('should return 0 when no active items', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '0' }));

      const result = await repository.countActive();

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(0);
    });
  });

  // ============================================================================
  // existsByItemNumber()
  // ============================================================================
  describe('existsByItemNumber()', () => {
    it('should return true when item number exists', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: true }));

      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const result = await repository.existsByItemNumber(itemNumber);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(true);
    });

    it('should return false when item number does not exist', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: false }));

      const itemNumber = ItemNumber.create('INV-2025-999999')._unsafeUnwrap();
      const result = await repository.existsByItemNumber(itemNumber);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(false);
    });
  });

  // ============================================================================
  // existsByEpc()
  // ============================================================================
  describe('existsByEpc()', () => {
    it('should return true when EPC exists', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: true }));

      const epc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
      const result = await repository.existsByEpc(epc);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(true);
    });

    it('should return false when EPC does not exist', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: false }));

      const epc = RfidEpc.create('FFFFFFFFFFFFFFFFFFFFFFFF')._unsafeUnwrap();
      const result = await repository.existsByEpc(epc);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle items with all optional fields populated', async () => {
      const mockRow = createMockItemRow({
        serial_number: 'SN-123456',
        current_zone_id: 'zone-001',
        last_seen_at: new Date(),
        last_seen_reader_id: 'reader-001',
        location_confidence: 0.95,
        received_by: 'John Smith',
        received_at: new Date(),
        handled_by: 'Jane Doe',
        metadata: { department: 'IT', purchaseOrder: 'PO-001' },
      });
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const result = await repository.findById('item-001');

      expect(result.isOk()).toBe(true);
      const item = result._unsafeUnwrap()!;
      expect(item.getSerialNumber()).toBe('SN-123456');
      expect(item.getCurrentZoneId()).toBe('zone-001');
      expect(item.getLocationConfidence()).toBe(0.95);
    });

    it('should handle metadata as JSON string', async () => {
      const mockRow = createMockItemRow({
        metadata: JSON.stringify({ key: 'value' }),
      });
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const result = await repository.findById('item-001');

      expect(result.isOk()).toBe(true);
    });

    it('should handle invalid metadata gracefully', async () => {
      const mockRow = createMockItemRow({
        metadata: 'invalid-json{',
      });
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const result = await repository.findById('item-001');

      // Should still return item, with empty metadata
      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to parse metadata JSON',
        expect.any(Object)
      );
    });

    it('should handle concurrent search requests', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '10' }));
      jest.mocked(mockDb.query).mockResolvedValue(ok([createMockItemRow()]));

      // Simulate concurrent requests
      const results = await Promise.all([
        repository.search({ query: 'laptop' }),
        repository.search({ status: ItemStatus.REGISTERED }),
        repository.search({ zoneId: 'zone-001' }),
      ]);

      expect(results.every((r) => r.isOk())).toBe(true);
    });
  });
});
