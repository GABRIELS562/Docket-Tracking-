import { ok, err } from 'neverthrow';
import { SearchItemsUseCase } from '@application/use-cases/items/SearchItemsUseCase';
import type { IItemRepository, ItemSearchResult } from '@domain/repositories/IItemRepository';
import type { IZoneRepository } from '@domain/repositories/IZoneRepository';
import type { ILogger } from '@application/interfaces/ILogger';
import { Item, ItemCategory, ItemStatus } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { ReferenceId } from '@domain/value-objects/ReferenceId';
import { RfidEpc } from '@domain/value-objects/RfidEpc';

/**
 * SearchItemsUseCase Unit Tests
 *
 * @description
 * Tests for the item search use case covering:
 * - Search query handling
 * - Filter combinations
 * - Pagination
 * - Sorting
 * - Zone enrichment
 * - Error handling
 */
describe('SearchItemsUseCase', () => {
  let useCase: SearchItemsUseCase;
  let mockItemRepo: jest.Mocked<IItemRepository>;
  let mockZoneRepo: jest.Mocked<IZoneRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test items factory
  const createTestItem = (overrides: Partial<{
    id: string;
    itemNumber: string;
    rfidEpc: string;
    description: string;
    category: ItemCategory;
    status: ItemStatus;
    zoneId: string | null;
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
      currentZoneId: overrides.zoneId ?? null,
      lastSeenReaderId: null,
      lastSeenAt: null,
      locationConfidence: null,
      receivedBy: null,
      receivedAt: null,
      serialNumber: null,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      metadata: {},
    });
  };

  // Mock zone factory
  const createMockZone = (id: string, name: string, code: string) => ({
    getId: () => id,
    getName: () => name,
    getCode: () => code,
    getCapacity: () => 100,
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

    useCase = new SearchItemsUseCase(mockItemRepo, mockZoneRepo, mockLogger);
  });

  describe('Successful Search', () => {
    it('should search with query and return results', async () => {
      const items = [
        createTestItem({ id: 'item-1', itemNumber: 'INV-001', description: 'Dell Laptop' }),
        createTestItem({ id: 'item-2', itemNumber: 'INV-002', rfidEpc: 'E280116060002004DECA48DB', description: 'HP Laptop' }),
      ];

      const searchResult: ItemSearchResult = {
        items,
        total: 2,
        hasMore: false,
      };

      mockItemRepo.search.mockResolvedValue(ok(searchResult));

      const result = await useCase.execute({
        query: 'laptop',
        limit: 10,
        offset: 0,
      });

      expect(result.isOk()).toBe(true);
      const response = result._unsafeUnwrap();
      expect(response.items.length).toBe(2);
      expect(response.total).toBe(2);
      expect(response.hasMore).toBe(false);
    });

    it('should search with status filter', async () => {
      const items = [
        createTestItem({ status: ItemStatus.REGISTERED }),
      ];

      mockItemRepo.search.mockResolvedValue(ok({
        items,
        total: 1,
        hasMore: false,
      }));

      const result = await useCase.execute({
        status: 'registered',
      });

      expect(result.isOk()).toBe(true);
      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ItemStatus.REGISTERED,
        })
      );
    });

    it('should search with category filter', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        category: 'electronic',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronic',
        })
      );
    });

    it('should search with zone filter', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        zoneId: 'zone-123',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          zoneId: 'zone-123',
        })
      );
    });

    it('should search with date range filters', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      const createdAfter = '2025-01-01T00:00:00Z';
      const createdBefore = '2025-12-31T23:59:59Z';

      await useCase.execute({
        createdAfter,
        createdBefore,
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAfter: new Date(createdAfter),
          createdBefore: new Date(createdBefore),
        })
      );
    });

    it('should search with activeOnly filter', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        activeOnly: true,
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          activeOnly: true,
        })
      );
    });

    it('should enrich results with zone information', async () => {
      const items = [
        createTestItem({ zoneId: 'zone-001' }),
      ];

      mockItemRepo.search.mockResolvedValue(ok({
        items,
        total: 1,
        hasMore: false,
      }));

      mockZoneRepo.findById.mockResolvedValue(
        ok(createMockZone('zone-001', 'Storage A', 'STA') as any)
      );

      const result = await useCase.execute({});

      expect(result.isOk()).toBe(true);
      const response = result._unsafeUnwrap();
      expect(response.items[0].currentZone).toEqual({
        id: 'zone-001',
        name: 'Storage A',
        code: 'STA',
      });
    });

    it('should batch fetch zones for multiple items', async () => {
      const items = [
        createTestItem({ id: 'item-1', itemNumber: 'INV-001', zoneId: 'zone-001' }),
        createTestItem({ id: 'item-2', itemNumber: 'INV-002', rfidEpc: 'E280116060002004DECA48DB', zoneId: 'zone-001' }),
        createTestItem({ id: 'item-3', itemNumber: 'INV-003', rfidEpc: 'E280116060002004DECA48DC', zoneId: 'zone-002' }),
      ];

      mockItemRepo.search.mockResolvedValue(ok({
        items,
        total: 3,
        hasMore: false,
      }));

      mockZoneRepo.findById.mockImplementation(async (id: string) => {
        if (id === 'zone-001') {
          return ok(createMockZone('zone-001', 'Storage A', 'STA') as any);
        }
        if (id === 'zone-002') {
          return ok(createMockZone('zone-002', 'Storage B', 'STB') as any);
        }
        return ok(null);
      });

      const result = await useCase.execute({});

      expect(result.isOk()).toBe(true);
      // Should deduplicate zone requests (zone-001 appears twice but only fetched once)
      expect(mockZoneRepo.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pagination', () => {
    it('should use default limit when not provided', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({});

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10, // Default limit
          offset: 0,
        })
      );
    });

    it('should respect provided limit and offset', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        limit: 25,
        offset: 50,
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 50,
        })
      );
    });

    it('should cap limit at maximum of 100', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        limit: 500, // Exceeds max
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Capped at max
        })
      );
    });

    it('should prevent negative offset', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        offset: -10,
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0, // Converted to 0
        })
      );
    });

    it('should return hasMore indicator correctly', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [createTestItem()],
        total: 100,
        hasMore: true,
      }));

      const result = await useCase.execute({ limit: 10 });

      expect(result.isOk()).toBe(true);
      const response = result._unsafeUnwrap();
      expect(response.hasMore).toBe(true);
      expect(response.total).toBe(100);
    });
  });

  describe('Sorting', () => {
    it('should default to createdAt DESC', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({});

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('should accept sortBy itemNumber', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        sortBy: 'itemNumber',
        sortOrder: 'asc',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'itemNumber',
          sortOrder: 'asc',
        })
      );
    });

    it('should accept sortBy lastSeenAt', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        sortBy: 'lastSeenAt',
        sortOrder: 'desc',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'lastSeenAt',
        })
      );
    });

    it('should accept sortBy referenceId', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        sortBy: 'referenceId',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'referenceId',
        })
      );
    });
  });

  describe('Query Handling', () => {
    it('should trim query whitespace', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        query: '  laptop  ',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'laptop',
        })
      );
    });

    it('should handle empty query', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        query: '',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
        })
      );
    });

    it('should handle undefined query', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({});

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: undefined,
        })
      );
    });
  });

  describe('Status Mapping', () => {
    const statusMappings: Array<[string, ItemStatus]> = [
      ['registered', ItemStatus.REGISTERED],
      ['in_transit', ItemStatus.IN_TRANSIT],
      ['in_processing', ItemStatus.IN_PROCESSING],
      ['archived', ItemStatus.ARCHIVED],
      ['disposed', ItemStatus.DISPOSED],
      ['missing', ItemStatus.MISSING],
    ];

    it.each(statusMappings)('should map %s to correct enum', async (inputStatus, expectedEnum) => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        status: inputStatus as any,
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expectedEnum,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle repository search errors', async () => {
      mockItemRepo.search.mockResolvedValue(
        err(new Error('Database timeout'))
      );

      const result = await useCase.execute({});

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Database timeout');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unexpected exceptions', async () => {
      mockItemRepo.search.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await useCase.execute({});

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Search failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should continue even if zone lookup fails', async () => {
      const items = [
        createTestItem({ zoneId: 'zone-001' }),
      ];

      mockItemRepo.search.mockResolvedValue(ok({
        items,
        total: 1,
        hasMore: false,
      }));

      mockZoneRepo.findById.mockResolvedValue(
        err(new Error('Zone lookup failed'))
      );

      const result = await useCase.execute({});

      expect(result.isOk()).toBe(true);
      const response = result._unsafeUnwrap();
      expect(response.items.length).toBe(1);
      // Zone info should be null if lookup failed
      expect(response.items[0].currentZone).toBeNull();
    });
  });

  describe('Logging', () => {
    it('should log search criteria', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        query: 'test',
        status: 'registered',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Searching items',
        expect.objectContaining({
          criteria: expect.any(Object),
        })
      );
    });

    it('should log search completion', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [createTestItem()],
        total: 1,
        hasMore: false,
      }));

      await useCase.execute({ query: 'laptop' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item search completed',
        expect.objectContaining({
          query: 'laptop',
          resultsCount: 1,
          totalCount: 1,
        })
      );
    });
  });

  describe('Complex Filters', () => {
    it('should combine multiple filters', async () => {
      mockItemRepo.search.mockResolvedValue(ok({
        items: [],
        total: 0,
        hasMore: false,
      }));

      await useCase.execute({
        query: 'laptop',
        status: 'registered',
        category: 'electronic',
        zoneId: 'zone-001',
        activeOnly: true,
        createdAfter: '2025-01-01',
        createdBefore: '2025-12-31',
        limit: 20,
        offset: 10,
        sortBy: 'itemNumber',
        sortOrder: 'asc',
      });

      expect(mockItemRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'laptop',
          status: ItemStatus.REGISTERED,
          category: 'electronic',
          zoneId: 'zone-001',
          activeOnly: true,
          createdAfter: expect.any(Date),
          createdBefore: expect.any(Date),
          limit: 20,
          offset: 10,
          sortBy: 'itemNumber',
          sortOrder: 'asc',
        })
      );
    });
  });
});
