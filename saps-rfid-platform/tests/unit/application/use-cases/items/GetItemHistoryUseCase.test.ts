import { ok, err } from 'neverthrow';
import { GetItemHistoryUseCase } from '@application/use-cases/items/GetItemHistoryUseCase';
import type { IItemRepository } from '@domain/repositories/IItemRepository';
import type { ILocationHistoryRepository, LocationHistoryEntry } from '@domain/repositories/ILocationHistoryRepository';
import type { ILogger } from '@application/interfaces/ILogger';
import { Item, ItemCategory, ItemStatus } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { ReferenceId } from '@domain/value-objects/ReferenceId';
import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { ItemNotFoundError } from '@domain/errors/ItemNotFoundError';

/**
 * GetItemHistoryUseCase Unit Tests
 *
 * @description
 * Tests for the item history retrieval use case covering:
 * - History retrieval with hours-based range
 * - History retrieval with custom date range
 * - Time range validation
 * - Limit enforcement
 * - DTO mapping
 * - Error handling
 */
describe('GetItemHistoryUseCase', () => {
  let useCase: GetItemHistoryUseCase;
  let mockItemRepo: jest.Mocked<IItemRepository>;
  let mockHistoryRepo: jest.Mocked<ILocationHistoryRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Fixed "now" for consistent testing
  const NOW = new Date('2025-01-15T12:00:00Z');

  // Test item factory
  const createTestItem = (overrides: Partial<{
    id: string;
    itemNumber: string;
  }> = {}): Item => {
    const itemNumber = ItemNumber.create(overrides.itemNumber ?? 'INV-2025-000001').value!;
    const referenceId = ReferenceId.create('REF-001').value!;
    const rfidEpc = RfidEpc.create('E280116060002004DECA48DA').value!;

    return Item.reconstitute({
      id: overrides.id ?? 'item-123',
      itemNumber,
      referenceId,
      rfidEpc,
      description: 'Test Item',
      category: ItemCategory.ELECTRONIC,
      status: ItemStatus.REGISTERED,
      currentZoneId: null,
      lastSeenReaderId: null,
      lastSeenAt: null,
      locationConfidence: null,
      receivedBy: null,
      receivedAt: null,
      serialNumber: null,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-15'),
      metadata: {},
    });
  };

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
    // Mock current time
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

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

    useCase = new GetItemHistoryUseCase(mockItemRepo, mockHistoryRepo, mockLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Successful History Retrieval', () => {
    it('should retrieve history successfully', async () => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({
          time: new Date('2025-01-15T10:00:00Z'),
          zoneName: 'Storage A',
          eventType: 'tag_read',
        }),
        createMockHistoryEntry({
          time: new Date('2025-01-15T09:30:00Z'),
          zoneName: 'Lab Processing',
          eventType: 'zone_entry',
        }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.itemNumber).toBe('INV-2025-000001');
      expect(output.itemId).toBe('item-123');
      expect(output.history.length).toBe(2);
      expect(output.totalEntries).toBe(2);
    });

    it('should map history entries to DTOs correctly', async () => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({
          time: new Date('2025-01-15T10:30:00Z'),
          readerId: 'reader-001',
          readerName: 'Storage Reader 1',
          zoneId: 'zone-001',
          zoneName: 'Storage A',
          rssi: -42,
          antennaPort: 2,
          readCount: 10,
          locationConfidence: 0.98,
          eventType: 'zone_entry',
        }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      const entry = output.history[0];

      expect(entry.timestamp).toBe('2025-01-15T10:30:00.000Z');
      expect(entry.readerId).toBe('reader-001');
      expect(entry.readerName).toBe('Storage Reader 1');
      expect(entry.zoneId).toBe('zone-001');
      expect(entry.zoneName).toBe('Storage A');
      expect(entry.rssi).toBe(-42);
      expect(entry.antennaPort).toBe(2);
      expect(entry.readCount).toBe(10);
      expect(entry.locationConfidence).toBe(0.98);
      expect(entry.eventType).toBe('zone_entry');
    });

    it('should include time range in response', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
        hours: 24,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.startTime).toBeDefined();
      expect(output.endTime).toBeDefined();
    });
  });

  describe('Hours-Based Range', () => {
    it('should use default 24 hours when not specified', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      // Expected: endTime = NOW, startTime = NOW - 24 hours
      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        new Date('2025-01-14T12:00:00Z'), // 24 hours ago
        new Date('2025-01-15T12:00:00Z'), // NOW
        100 // DEFAULT_LIMIT
      );
    });

    it('should respect custom hours parameter', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        hours: 48,
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        new Date('2025-01-13T12:00:00Z'), // 48 hours ago
        new Date('2025-01-15T12:00:00Z'), // NOW
        100
      );
    });

    it('should handle small hour values', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        hours: 1,
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        new Date('2025-01-15T11:00:00Z'), // 1 hour ago
        new Date('2025-01-15T12:00:00Z'),
        100
      );
    });
  });

  describe('Custom Date Range', () => {
    it('should use custom start and end times when provided', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-10T23:59:59Z',
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-10T23:59:59Z'),
        100
      );
    });

    it('should override hours when custom range is provided', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        hours: 24, // Should be ignored
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-31T23:59:59Z',
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        'item-123',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-31T23:59:59Z'),
        100
      );
    });

    it('should reject start time after end time', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
        startTime: '2025-01-31T00:00:00Z',
        endTime: '2025-01-01T00:00:00Z',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Start time must be before end time');
    });

    it('should reject same start and end time', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
        startTime: '2025-01-15T00:00:00Z',
        endTime: '2025-01-15T00:00:00Z',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Start time must be before end time');
    });
  });

  describe('Limit Handling', () => {
    it('should use default limit of 100', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        100 // DEFAULT_LIMIT
      );
    });

    it('should respect custom limit', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        limit: 50,
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        50
      );
    });

    it('should cap limit at maximum of 1000', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        limit: 5000, // Exceeds max
      });

      expect(mockHistoryRepo.getHistoryForDocket).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        1000 // MAX_LIMIT
      );
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid item number format', async () => {
      const result = await useCase.execute({
        itemNumber: '-invalid',
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
    it('should handle history fetch errors', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(
        err(new Error('TimescaleDB timeout'))
      );

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('TimescaleDB timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch item history',
        expect.any(Object)
      );
    });

    it('should handle unexpected exceptions', async () => {
      mockItemRepo.findByItemNumber.mockRejectedValue(
        new Error('Unexpected crash')
      );

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to get item history');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log successful history retrieval', async () => {
      const item = createTestItem();
      const historyEntries = [createMockHistoryEntry(), createMockHistoryEntry()];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      await useCase.execute({
        itemNumber: 'INV-2025-000001',
        hours: 24,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item history retrieved',
        expect.objectContaining({
          itemNumber: 'INV-2025-000001',
          entriesCount: 2,
          startTime: expect.any(String),
          endTime: expect.any(String),
        })
      );
    });
  });

  describe('Event Types', () => {
    const eventTypes: LocationHistoryEntry['eventType'][] = [
      'tag_read',
      'zone_entry',
      'zone_exit',
      'movement',
    ];

    it.each(eventTypes)('should correctly map %s event type', async (eventType) => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({ eventType }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.history[0].eventType).toBe(eventType);
    });
  });

  describe('Empty History', () => {
    it('should handle empty history gracefully', async () => {
      const item = createTestItem();

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.history).toEqual([]);
      expect(output.totalEntries).toBe(0);
    });
  });

  describe('Null Values in History', () => {
    it('should handle null zone ID in history entry', async () => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({ zoneId: null as any }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.history[0].zoneId).toBeNull();
    });

    it('should handle null location confidence', async () => {
      const item = createTestItem();
      const historyEntries = [
        createMockHistoryEntry({ locationConfidence: null }),
      ];

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.history[0].locationConfidence).toBeNull();
    });
  });

  describe('Large History Sets', () => {
    it('should handle many history entries', async () => {
      const item = createTestItem();
      const historyEntries = Array.from({ length: 500 }, (_, i) =>
        createMockHistoryEntry({
          time: new Date(NOW.getTime() - i * 60000), // 1 minute apart
        })
      );

      mockItemRepo.findByItemNumber.mockResolvedValue(ok(item));
      mockHistoryRepo.getHistoryForDocket.mockResolvedValue(ok(historyEntries));

      const result = await useCase.execute({
        itemNumber: 'INV-2025-000001',
        limit: 1000,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.history.length).toBe(500);
      expect(output.totalEntries).toBe(500);
    });
  });
});
