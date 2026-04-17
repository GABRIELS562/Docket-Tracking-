import { ok, err } from 'neverthrow';
import { GetZoneItemsUseCase } from '@application/use-cases/items/GetZoneItemsUseCase';
import type { IItemRepository } from '@domain/repositories/IItemRepository';
import type { IZoneRepository } from '@domain/repositories/IZoneRepository';
import type { ILogger } from '@application/interfaces/ILogger';
import { Item, ItemCategory, ItemStatus } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { ReferenceId } from '@domain/value-objects/ReferenceId';
import { RfidEpc } from '@domain/value-objects/RfidEpc';

/**
 * GetZoneItemsUseCase Unit Tests
 *
 * @description
 * Tests for the zone items retrieval use case covering:
 * - Successful zone items retrieval
 * - Zone validation
 * - Recent items filtering
 * - Limit enforcement
 * - Occupancy metrics calculation
 * - Error handling
 */
describe('GetZoneItemsUseCase', () => {
  let useCase: GetZoneItemsUseCase;
  let mockItemRepo: jest.Mocked<IItemRepository>;
  let mockZoneRepo: jest.Mocked<IZoneRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test item factory
  const createTestItem = (overrides: Partial<{
    id: string;
    itemNumber: string;
    rfidEpc: string;
    description: string;
    category: ItemCategory;
    status: ItemStatus;
    zoneId: string | null;
    lastSeenAt: Date | null;
  }> = {}): Item => {
    const itemNumber = ItemNumber.create(overrides.itemNumber ?? 'INV-001').value!;
    const referenceId = ReferenceId.create('REF-001').value!;
    const rfidEpc = RfidEpc.create(overrides.rfidEpc ?? 'E280116060002004DECA48DA').value!;

    return Item.reconstitute({
      id: overrides.id ?? 'item-123',
      itemNumber,
      referenceId,
      rfidEpc,
      description: overrides.description ?? 'Test Item',
      category: overrides.category ?? ItemCategory.ELECTRONIC,
      status: overrides.status ?? ItemStatus.REGISTERED,
      currentZoneId: overrides.zoneId ?? 'zone-001',
      lastSeenReaderId: 'reader-001',
      lastSeenAt: overrides.lastSeenAt ?? new Date('2025-01-15'),
      locationConfidence: 0.95,
      receivedBy: null,
      receivedAt: null,
      serialNumber: null,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-15'),
      metadata: {},
    });
  };

  // Mock zone factory
  const createMockZone = (overrides: Partial<{
    id: string;
    name: string;
    code: string;
    capacity: number | null;
  }> = {}) => ({
    getId: () => overrides.id ?? 'zone-001',
    getName: () => overrides.name ?? 'Storage A',
    getCode: () => overrides.code ?? 'STA',
    getCapacity: () => overrides.capacity ?? 100,
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

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    useCase = new GetZoneItemsUseCase(mockItemRepo, mockZoneRepo, mockLogger);
  });

  describe('Successful Retrieval', () => {
    it('should retrieve zone items successfully', async () => {
      const zone = createMockZone();
      const items = [
        createTestItem({ id: 'item-1', itemNumber: 'INV-001' }),
        createTestItem({ id: 'item-2', itemNumber: 'INV-002', rfidEpc: 'E280116060002004DECA48DB' }),
      ];

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.zoneId).toBe('zone-001');
      expect(output.zoneName).toBe('Storage A');
      expect(output.zoneCode).toBe('STA');
      expect(output.items.length).toBe(2);
      expect(output.totalItems).toBe(2);
    });

    it('should include zone information in response', async () => {
      const zone = createMockZone({
        id: 'zone-storage-001',
        name: 'Evidence Storage A',
        code: 'EVS-A',
      });

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        zoneId: 'zone-storage-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.zoneId).toBe('zone-storage-001');
      expect(output.zoneName).toBe('Evidence Storage A');
      expect(output.zoneCode).toBe('EVS-A');
    });

    it('should enrich items with zone information', async () => {
      const zone = createMockZone();
      const items = [
        createTestItem({ zoneId: 'zone-001' }),
      ];

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.items[0].currentZone).toEqual({
        id: 'zone-001',
        name: 'Storage A',
        code: 'STA',
      });
    });
  });

  describe('Recent Items Only', () => {
    it('should fetch all items when recentOnly is false', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok([]));

      await useCase.execute({
        zoneId: 'zone-001',
        recentOnly: false,
      });

      expect(mockItemRepo.findByZone).toHaveBeenCalledWith('zone-001');
      expect(mockItemRepo.findRecentByZone).not.toHaveBeenCalled();
    });

    it('should fetch recent items when recentOnly is true', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findRecentByZone.mockResolvedValue(ok([]));

      await useCase.execute({
        zoneId: 'zone-001',
        recentOnly: true,
      });

      expect(mockItemRepo.findRecentByZone).toHaveBeenCalledWith('zone-001', 50); // DEFAULT_LIMIT
      expect(mockItemRepo.findByZone).not.toHaveBeenCalled();
    });

    it('should pass limit to findRecentByZone', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findRecentByZone.mockResolvedValue(ok([]));

      await useCase.execute({
        zoneId: 'zone-001',
        recentOnly: true,
        limit: 25,
      });

      expect(mockItemRepo.findRecentByZone).toHaveBeenCalledWith('zone-001', 25);
    });
  });

  describe('Limit Handling', () => {
    it('should use default limit of 50', async () => {
      const zone = createMockZone();
      const items = Array.from({ length: 100 }, (_, i) =>
        createTestItem({
          id: `item-${i}`,
          itemNumber: `INV-${String(i).padStart(3, '0')}`,
          rfidEpc: `E28011606000204DECA48${String(i).padStart(2, '0')}`,
        })
      );

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.items.length).toBe(50); // Limited to 50
      expect(output.totalItems).toBe(100); // Total count
    });

    it('should respect custom limit', async () => {
      const zone = createMockZone();
      const items = Array.from({ length: 50 }, (_, i) =>
        createTestItem({
          id: `item-${i}`,
          itemNumber: `INV-${String(i).padStart(3, '0')}`,
          rfidEpc: `E28011606000204DECA48${String(i).padStart(2, '0')}`,
        })
      );

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
        limit: 10,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.items.length).toBe(10);
    });

    it('should cap limit at maximum of 200', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findRecentByZone.mockResolvedValue(ok([]));

      await useCase.execute({
        zoneId: 'zone-001',
        recentOnly: true,
        limit: 500, // Exceeds max
      });

      expect(mockItemRepo.findRecentByZone).toHaveBeenCalledWith('zone-001', 200);
    });
  });

  describe('Occupancy Metrics', () => {
    it('should calculate occupancy percentage when zone has capacity', async () => {
      const zone = createMockZone({ capacity: 100 });
      const items = Array.from({ length: 45 }, (_, i) =>
        createTestItem({
          id: `item-${i}`,
          itemNumber: `INV-${String(i).padStart(3, '0')}`,
          rfidEpc: `E28011606000204DECA48${String(i).padStart(2, '0')}`,
        })
      );

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
        limit: 100,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.capacity).toBe(100);
      expect(output.occupancyPercent).toBe(45); // 45 / 100 = 45%
    });

    it('should return null occupancy when zone has no capacity', async () => {
      const zone = createMockZone({ capacity: null });

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.capacity).toBeNull();
      expect(output.occupancyPercent).toBeNull();
    });

    it('should round occupancy percentage', async () => {
      const zone = createMockZone({ capacity: 3 });
      const items = [createTestItem()]; // 1 item

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
        limit: 100,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.occupancyPercent).toBe(33); // 1/3 = 33.33... rounded to 33
    });

    it('should handle over-capacity zones', async () => {
      const zone = createMockZone({ capacity: 10 });
      const items = Array.from({ length: 15 }, (_, i) =>
        createTestItem({
          id: `item-${i}`,
          itemNumber: `INV-${String(i).padStart(3, '0')}`,
          rfidEpc: `E28011606000204DECA48${String(i).padStart(2, '0')}`,
        })
      );

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
        limit: 100,
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.occupancyPercent).toBe(150); // 15/10 = 150%
    });
  });

  describe('Zone Not Found', () => {
    it('should return error when zone does not exist', async () => {
      mockZoneRepo.findById.mockResolvedValue(ok(null));

      const result = await useCase.execute({
        zoneId: 'zone-nonexistent',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Zone not found');
    });

    it('should return error when zone lookup fails', async () => {
      mockZoneRepo.findById.mockResolvedValue(
        err(new Error('Database connection failed'))
      );

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isErr()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch zone',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle item fetch errors', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(
        err(new Error('Item query failed'))
      );

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isErr()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch zone items',
        expect.any(Object)
      );
    });

    it('should handle recent items fetch errors', async () => {
      const zone = createMockZone();

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findRecentByZone.mockResolvedValue(
        err(new Error('Recent items query failed'))
      );

      const result = await useCase.execute({
        zoneId: 'zone-001',
        recentOnly: true,
      });

      expect(result.isErr()).toBe(true);
    });

    it('should handle unexpected exceptions', async () => {
      mockZoneRepo.findById.mockRejectedValue(
        new Error('Unexpected crash')
      );

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to get zone items');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log successful retrieval', async () => {
      const zone = createMockZone({ capacity: 100 });
      const items = [createTestItem(), createTestItem({
        id: 'item-2',
        itemNumber: 'INV-002',
        rfidEpc: 'E280116060002004DECA48DB',
      })];

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Zone items retrieved',
        expect.objectContaining({
          zoneId: 'zone-001',
          zoneName: 'Storage A',
          itemsCount: 2,
          totalItems: 2,
          occupancyPercent: 2,
        })
      );
    });
  });

  describe('Empty Zone', () => {
    it('should handle zone with no items', async () => {
      const zone = createMockZone({ capacity: 100 });

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok([]));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      expect(output.items).toEqual([]);
      expect(output.totalItems).toBe(0);
      expect(output.occupancyPercent).toBe(0);
    });
  });

  describe('Item Categories in Zone', () => {
    it('should return items of various categories', async () => {
      const zone = createMockZone();
      const items = [
        createTestItem({ id: 'item-1', itemNumber: 'INV-001', category: ItemCategory.ELECTRONIC }),
        createTestItem({ id: 'item-2', itemNumber: 'INV-002', rfidEpc: 'E280116060002004DECA48DB', category: ItemCategory.EQUIPMENT }),
        createTestItem({ id: 'item-3', itemNumber: 'INV-003', rfidEpc: 'E280116060002004DECA48DC', category: ItemCategory.DOCUMENT }),
      ];

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      const categories = output.items.map(item => item.category);
      expect(categories).toContain('electronic');
      expect(categories).toContain('equipment');
      expect(categories).toContain('document');
    });
  });

  describe('Item Statuses in Zone', () => {
    it('should return items with various statuses', async () => {
      const zone = createMockZone();
      const items = [
        createTestItem({ id: 'item-1', itemNumber: 'INV-001', status: ItemStatus.REGISTERED }),
        createTestItem({ id: 'item-2', itemNumber: 'INV-002', rfidEpc: 'E280116060002004DECA48DB', status: ItemStatus.IN_PROCESSING }),
        createTestItem({ id: 'item-3', itemNumber: 'INV-003', rfidEpc: 'E280116060002004DECA48DC', status: ItemStatus.IN_TRANSIT }),
      ];

      mockZoneRepo.findById.mockResolvedValue(ok(zone as any));
      mockItemRepo.findByZone.mockResolvedValue(ok(items));

      const result = await useCase.execute({
        zoneId: 'zone-001',
      });

      expect(result.isOk()).toBe(true);
      const output = result._unsafeUnwrap();
      const statuses = output.items.map(item => item.status);
      expect(statuses).toContain('registered');
      expect(statuses).toContain('in_processing');
      expect(statuses).toContain('in_transit');
    });
  });
});
