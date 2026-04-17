import { ok, err } from 'neverthrow';
import { GetItemDetailsUseCase } from '@application/use-cases/items/GetItemDetailsUseCase';
import type { IItemRepository } from '@domain/repositories/IItemRepository';
import type { IZoneRepository } from '@domain/repositories/IZoneRepository';
import type { ILocationHistoryRepository, LocationHistoryEntry } from '@domain/repositories/ILocationHistoryRepository';
import type { ILogger } from '@application/interfaces/ILogger';
import { Item, ItemCategory, ItemStatus } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { ReferenceId } from '@domain/value-objects/ReferenceId';
import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { ItemNotFoundError } from '@domain/errors/ItemNotFoundError';

/**
 * GetItemDetailsUseCase Unit Tests
 *
 * @description
 * Tests for the item details retrieval use case covering:
 * - Successful detail retrieval
 * - Zone information enrichment
 * - Location history fetching
 * - Derived field calculations
 * - Error handling
 * - Invalid input handling
 */
describe('GetItemDetailsUseCase', () => {
  let useCase: GetItemDetailsUseCase;
  let mockItemRepo: jest.Mocked<IItemRepository>;
  let mockZoneRepo: jest.Mocked<IZoneRepository>;
  let mockHistoryRepo: jest.Mocked<ILocationHistoryRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test item factory
  const createTestItem = (overrides: Partial<{
    id: string;
    itemNumber: string;
    referenceId: string;
    rfidEpc: string;
    description: string;
    category: ItemCategory;
    status: ItemStatus;
    zoneId: string | null;
    lastSeenAt: Date | null;
    locationConfidence: number | null;
    receivedBy: string | null;
    serialNumber: string | null;
  }> = {}): Item => {
    const itemNumber = ItemNumber.create(overrides.itemNumber ?? 'INV-2025-000001').value!;
    const referenceId = ReferenceId.create(overrides.referenceId ?? 'PO-12345').value!;
    const rfidEpc = RfidEpc.create(overrides.rfidEpc ?? 'E280116060002004DECA48DA').value!;

    return Item.reconstitute({
      id: overrides.id ?? 'item-123',
      itemNumber,
      referenceId,
      rfidEpc,
      description: overrides.description ?? 'Dell Laptop Computer',
      category: overrides.category ?? ItemCategory.ELECTRONIC,
      status: overrides.status ?? ItemStatus.REGISTERED,
      currentZoneId: overrides.zoneId ?? null,
      lastSeenReaderId: overrides.zoneId ? 'reader-001' : null,
      lastSeenAt: overrides.lastSeenAt ?? null,
      locationConfidence: overrides.locationConfidence ?? null,
      receivedBy: overrides.receivedBy ?? null,
      receivedAt: overrides.receivedBy ? new Date('2025-01-15') : null,
      serialNumber: overrides.serialNumber ?? null,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-15'),
      metadata: { department: 'IT' },
    });
  };

  // Mock zone factory
  const createMockZone = (id: string, name: string, code: string) => ({
    getId: () => id,
    getName: () => name,
    getCode: () => code,
    getCapacity: () => 100,
  });

  // Mock history entry factory
  const createMockHistoryEntry = (overrides: Partial<LocationHistoryEntry> = {}): LocationHistoryEntry => ({
    time: overrides.time ?? new Date('2025-01-15T10:30:00Z'),
    readerId: overrides.readerId ?? 'reader-001',
    readerName: overrides.readerName ?? 'Storage A - North',
    zoneId: overrides.zoneId ?? 'zone-001',
    zoneName: overrides.zoneName ?? 'Storage A',
    rssi: overrides.rssi ?? -45,
    antennaPort: overrides.antennaPort ?? 1,
    readCount: overrides.readCount ?? 5,
    locationConfidence: overrides.locationConfidence ?? 0.95,
    eventType: overrides.eventType ?? 'tag_read',
  });

  beforeEach(() => {
    // Mock item repository
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByItemNumber: jest.fn(),
      findByEpc: jest.fn(),
      search: jest.fn(),
      findByZone: jest.fn(),
      findRecentByZone: jest.fn(),
      findAllActive: jest.fn(),
      findAllMissing: jest.fn(),
      findStale: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countActive: jest.fn(),
      existsByItemNumber: jest.fn(),
      existsByEpc: jest.fn(),
    } as unknown as jest.Mocked<IItemRepository>;

    // Mock zone repository
    mockZoneRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByCode: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IZoneRepository>;

    // Mock history repository
    mockHistoryRepo = {
      getHistoryForDocket: jest.fn(),
      recordMovement: jest.fn(),
      getMovementsByZone: jest.fn(),
      getRecentMovements: jest.fn(),
    } as unknown as jest.Mocked<ILocationHistoryRepository>;

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    useCase = new GetItemDetailsUseCase(mockItemRepo, mockZoneRepo, mockHistoryRepo, mockLogger);
  });

  describe('Successful Retrieval', () => {
    it('should retrieve item details successfully', async () => {
      const item = createTestItem({
        serialNumber: 'SN-12345',
        receivedBy: 'John Smith',
      });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.itemNumber).toBe('INV-2025-000001');
      expect(dto.referenceId).toBe('PO-12345');
      expect(dto.description).toBe('Dell Laptop Computer');
      expect(dto.category).toBe('electronic');
      expect(dto.serialNumber).toBe('SN-12345');
      expect(dto.receivedBy).toBe('John Smith');
      expect(dto.metadata).toEqual({ department: 'IT' });
    });

    it('should include RFID EPC in response', async () => {
      const item = createTestItem();
      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.rfidEpc).toBe('E280116060002004DECA48DA');
    });

    it('should include timestamps in ISO format', async () => {
      const item = createTestItem({
        lastSeenAt: new Date('2025-01-15T14:30:00Z'),
        receivedBy: 'Jane Doe',
      });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2025-01-15T00:00:00.000Z');
      expect(dto.lastSeenAt).toBe('2025-01-15T14:30:00.000Z');
      expect(dto.receivedAt).toContain('2025-01-15');
    });

    it('should handle null optional fields', async () => {
      const item = createTestItem({
        serialNumber: null,
        receivedBy: null,
        zoneId: null,
        lastSeenAt: null,
      });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.serialNumber).toBeNull();
      expect(dto.receivedBy).toBeNull();
      expect(dto.receivedAt).toBeNull();
      expect(dto.currentZone).toBeNull();
      expect(dto.lastSeenAt).toBeNull();
    });
  });

  describe('Zone Enrichment', () => {
    it('should enrich with zone information when item has zone', async () => {
      const item = createTestItem({ zoneId: 'zone-001' });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockZoneRepo.findById.mockResolvedValue(
        ok(createMockZone('zone-001', 'Storage A', 'STA') as any)
      );
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.currentZone).toEqual({
        id: 'zone-001',
        name: 'Storage A',
        code: 'STA',
      });
    });

    it('should handle zone lookup returning null', async () => {
      const item = createTestItem({ zoneId: 'zone-001' });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockZoneRepo.findById.mockResolvedValue(ok(null));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.currentZone).toBeNull();
    });

    it('should skip zone lookup when item has no zone', async () => {
      const item = createTestItem({ zoneId: null });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      expect(mockZoneRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('Location History', () => {
    it('should fetch and include recent location history', async () => {
      const item = createTestItem({ zoneId: 'zone-001' });
      const historyEntries = [
        createMockHistoryEntry({
          time: new Date('2025-01-15T14:30:00Z'),
          zoneName: 'Storage A',
          rssi: -42,
          locationConfidence: 0.98,
        }),
        createMockHistoryEntry({
          time: new Date('2025-01-15T14:00:00Z'),
          zoneName: 'Lab Processing',
          rssi: -50,
          locationConfidence: 0.85,
        }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockZoneRepo.findById.mockResolvedValue(
        ok(createMockZone('zone-001', 'Storage A', 'STA') as any)
      );
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.recentHistory.length).toBe(2);
      expect(dto.recentHistory[0]).toEqual({
        timestamp: '2025-01-15T14:30:00.000Z',
        zoneName: 'Storage A',
        rssi: -42,
        confidence: 0.98,
      });
    });

    it('should limit history to 10 entries', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        undefined,
        undefined,
        10 // HISTORY_LIMIT
      );
    });

    it('should handle empty history gracefully', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.recentHistory).toEqual([]);
    });

    it('should handle history fetch failure gracefully', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(
        err(new Error('History fetch failed'))
      );

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      // Should still succeed but with empty history
      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.recentHistory).toEqual([]);
    });

    it('should handle null zone names in history', async () => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({
          zoneName: null as any,
          locationConfidence: null,
        }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.recentHistory[0].zoneName).toBe('Unknown');
      expect(dto.recentHistory[0].confidence).toBe(0);
    });
  });

  describe('Derived Fields', () => {
    it('should calculate daysSinceLastSeen', async () => {
      // Item last seen 5 days ago
      const lastSeenDate = new Date();
      lastSeenDate.setDate(lastSeenDate.getDate() - 5);

      const item = createTestItem({ lastSeenAt: lastSeenDate });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.daysSinceLastSeen).toBeGreaterThanOrEqual(4);
      expect(dto.daysSinceLastSeen).toBeLessThanOrEqual(6);
    });

    it('should return null daysSinceLastSeen when never seen', async () => {
      const item = createTestItem({ lastSeenAt: null });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.daysSinceLastSeen).toBeNull();
    });

    it('should calculate isMissing correctly', async () => {
      const item = createTestItem({ status: ItemStatus.MISSING });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.isMissing).toBe(true);
    });

    it('should calculate hasReliableLocation', async () => {
      const item = createTestItem({
        zoneId: 'zone-001',
        lastSeenAt: new Date(),
        locationConfidence: 0.9,
      });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockZoneRepo.findById.mockResolvedValue(
        ok(createMockZone('zone-001', 'Storage A', 'STA') as any)
      );
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.hasReliableLocation).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid item number format', async () => {
      const result = await useCase.execute({
        itemNumber: '-invalid-number',
      });

      expect(result.isErr()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid item number format',
        expect.any(Object)
      );
    });

    it('should reject empty item number', async () => {
      const result = await useCase.execute({
        itemNumber: '',
      });

      expect(result.isErr()).toBe(true);
    });

    it('should reject whitespace-only item number', async () => {
      const result = await useCase.execute({
        itemNumber: '   ',
      });

      expect(result.isErr()).toBe(true);
    });
  });

  describe('Item Not Found', () => {
    it('should return ItemNotFoundError when item does not exist', async () => {
      mockItemRepo.findByItemNumber.mockResolvedValue(
        err(new ItemNotFoundError('INV-NONEXISTENT', 'itemNumber'))
      );

      const result = await useCase.execute({
        itemNumber: 'INV-NONEXISTENT',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ItemNotFoundError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Item not found',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors', async () => {
      mockItemRepo.findByItemNumber.mockResolvedValue(
        err(new Error('Database connection failed'))
      );

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isErr()).toBe(true);
    });

    it('should handle unexpected exceptions', async () => {
      mockItemRepo.findByItemNumber.mockRejectedValue(
        new Error('Unexpected crash')
      );

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to get item details');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log successful retrieval', async () => {
      const item = createTestItem({ zoneId: 'zone-001' });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockZoneRepo.findById.mockResolvedValue(
        ok(createMockZone('zone-001', 'Storage A', 'STA') as any)
      );
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item details retrieved',
        expect.objectContaining({
          itemNumber: 'INV-2025-000001',
          status: 'registered',
          hasLocation: true,
        })
      );
    });
  });

  describe('Item Status Types', () => {
    const statuses: ItemStatus[] = [
      ItemStatus.REGISTERED,
      ItemStatus.IN_TRANSIT,
      ItemStatus.IN_PROCESSING,
      ItemStatus.ARCHIVED,
      ItemStatus.DISPOSED,
      ItemStatus.MISSING,
    ];

    it.each(statuses)('should return correct status for %s', async (status) => {
      const item = createTestItem({ status });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.status).toBe(status);
    });
  });

  describe('Category Types', () => {
    const categories: ItemCategory[] = [
      ItemCategory.EQUIPMENT,
      ItemCategory.CONSUMABLE,
      ItemCategory.ELECTRONIC,
      ItemCategory.DOCUMENT,
      ItemCategory.MATERIAL,
      ItemCategory.TOOL,
      ItemCategory.APPAREL,
      ItemCategory.CONTAINER,
      ItemCategory.SAMPLE,
      ItemCategory.OTHER,
    ];

    it.each(categories)('should return correct category for %s', async (category) => {
      const item = createTestItem({ category });

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.category).toBe(category);
    });
  });
});
