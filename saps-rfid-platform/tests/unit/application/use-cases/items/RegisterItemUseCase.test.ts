import { ok, err } from 'neverthrow';
import { RegisterItemUseCase } from '@application/use-cases/items/RegisterItemUseCase';
import type { IItemRepository } from '@domain/repositories/IItemRepository';
import type { IEventBus } from '@application/interfaces/IEventBus';
import type { ILogger } from '@application/interfaces/ILogger';
import { ItemCategory } from '@domain/entities/Item';
import { DuplicateItemNumberError } from '@domain/errors/DuplicateItemNumberError';
import { DuplicateEpcError } from '@domain/errors/DuplicateEpcError';

/**
 * RegisterItemUseCase Unit Tests
 *
 * @description
 * Tests for the item registration use case covering:
 * - Successful registration with all fields
 * - Validation of input data
 * - Duplicate detection (item number and EPC)
 * - Event publishing
 * - Error handling
 */
describe('RegisterItemUseCase', () => {
  let useCase: RegisterItemUseCase;
  let mockItemRepo: jest.Mocked<IItemRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: jest.Mocked<ILogger>;

  const validInput = {
    itemNumber: 'INV-2025-000001',
    rfidEpc: 'E280116060002004DECA48DA',
    referenceId: 'PO-2025-12345',
    description: 'Dell Laptop Computer',
    category: ItemCategory.ELECTRONIC,
    serialNumber: 'SN-123456',
    receivedBy: 'John Smith',
    metadata: { department: 'IT' },
  };

  beforeEach(() => {
    // Mock repository
    mockItemRepo = {
      save: jest.fn().mockResolvedValue(ok(undefined)),
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
      existsByItemNumber: jest.fn().mockResolvedValue(ok(false)),
      existsByEpc: jest.fn().mockResolvedValue(ok(false)),
    } as unknown as jest.Mocked<IItemRepository>;

    // Mock event bus
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<IEventBus>;

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    useCase = new RegisterItemUseCase(mockItemRepo, mockEventBus, mockLogger);
  });

  describe('Successful Registration', () => {
    it('should register item with all fields', async () => {
      const result = await useCase.execute(validInput);

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.itemNumber).toBe('INV-2025-000001');
      expect(dto.referenceId).toBe('PO-2025-12345');
      expect(dto.description).toBe('Dell Laptop Computer');
      expect(dto.category).toBe('electronic');
      expect(dto.serialNumber).toBe('SN-123456');
      expect(dto.status).toBe('registered');
    });

    it('should register item with minimal fields', async () => {
      const minimalInput = {
        itemNumber: 'INV-001',
        rfidEpc: 'E280116060002004DECA48DA',
        description: 'Test Item',
        category: ItemCategory.OTHER,
      };

      const result = await useCase.execute(minimalInput);

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.itemNumber).toBe('INV-001');
      expect(dto.referenceId).toBe('N/A'); // Default
    });

    it('should save item to repository', async () => {
      await useCase.execute(validInput);

      expect(mockItemRepo.save).toHaveBeenCalledTimes(1);
      expect(mockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getItemNumber: expect.any(Function),
        })
      );
    });

    it('should publish ItemRegisteredEvent', async () => {
      await useCase.execute(validInput);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ItemRegistered',
        })
      );
    });

    it('should log successful registration', async () => {
      await useCase.execute(validInput);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Item registered successfully',
        expect.objectContaining({
          itemNumber: 'INV-2025-000001',
        })
      );
    });

    it('should generate unique ID for item', async () => {
      const result = await useCase.execute(validInput);

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.id).toBeDefined();
      expect(dto.id.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid item number format', async () => {
      const invalidInput = {
        ...validInput,
        itemNumber: '-invalid', // Cannot start with hyphen
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('item number');
    });

    it('should reject empty item number', async () => {
      const invalidInput = {
        ...validInput,
        itemNumber: '',
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
    });

    it('should reject invalid RFID EPC', async () => {
      const invalidInput = {
        ...validInput,
        rfidEpc: 'INVALID',
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('EPC');
    });

    it('should reject EPC with wrong length', async () => {
      const invalidInput = {
        ...validInput,
        rfidEpc: 'E28011606000', // Too short
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
    });

    it('should reject empty description', async () => {
      const invalidInput = {
        ...validInput,
        description: '',
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
    });

    it('should reject whitespace-only description', async () => {
      const invalidInput = {
        ...validInput,
        description: '   ',
      };

      const result = await useCase.execute(invalidInput);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    it('should reject duplicate item number', async () => {
      mockItemRepo.save.mockResolvedValue(
        err(new DuplicateItemNumberError('INV-2025-000001'))
      );

      const result = await useCase.execute(validInput);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateItemNumberError);
    });

    it('should reject duplicate RFID EPC', async () => {
      mockItemRepo.save.mockResolvedValue(
        err(new DuplicateEpcError('E280116060002004DECA48DA'))
      );

      const result = await useCase.execute(validInput);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateEpcError);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors', async () => {
      mockItemRepo.save.mockResolvedValue(
        err(new Error('Database connection failed'))
      );

      const result = await useCase.execute(validInput);

      expect(result.isErr()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle event bus errors gracefully', async () => {
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      // Should still succeed (event publishing is non-blocking)
      const result = await useCase.execute(validInput);

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle unexpected exceptions', async () => {
      mockItemRepo.save.mockRejectedValue(new Error('Unexpected error'));

      const result = await useCase.execute(validInput);

      expect(result.isErr()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Category Handling', () => {
    it('should accept all valid categories', async () => {
      const categories = Object.values(ItemCategory);

      for (const category of categories) {
        mockItemRepo.save.mockResolvedValue(ok(undefined));

        // Use valid 24-char EPCs with unique suffix per category
        const categoryIndex = categories.indexOf(category).toString(16).toUpperCase().padStart(2, '0');
        const input = {
          ...validInput,
          itemNumber: `ITEM-${category}`,
          rfidEpc: `E280116060002004DECA48${categoryIndex}`,
          category,
        };

        const result = await useCase.execute(input);
        expect(result.isOk()).toBe(true);
      }
    });
  });

  describe('Metadata Handling', () => {
    it('should preserve metadata in registration', async () => {
      const inputWithMetadata = {
        ...validInput,
        metadata: {
          department: 'IT',
          purchaseOrder: 'PO-001',
          customField: { nested: 'value' },
        },
      };

      const result = await useCase.execute(inputWithMetadata);

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.metadata).toEqual(inputWithMetadata.metadata);
    });

    it('should default to empty metadata when not provided', async () => {
      const inputWithoutMetadata = {
        itemNumber: 'INV-001',
        rfidEpc: 'E280116060002004DECA48DA',
        description: 'Test',
        category: ItemCategory.OTHER,
      };

      const result = await useCase.execute(inputWithoutMetadata);

      expect(result.isOk()).toBe(true);
      const dto = result._unsafeUnwrap();
      expect(dto.metadata).toEqual({});
    });
  });
});
