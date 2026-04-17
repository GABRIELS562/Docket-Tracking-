import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { InvalidItemNumberError } from '@domain/errors/InvalidItemNumberError';

describe('ItemNumber', () => {
  describe('create', () => {
    it('should create valid item number with prefix-year-sequence format', () => {
      const result = ItemNumber.create('INV-2025-000123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('INV-2025-000123');
      }
    });

    it('should create valid item number with simple alphanumeric', () => {
      const result = ItemNumber.create('ABC123456');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ABC123456');
      }
    });

    it('should create valid item number with numeric only', () => {
      const result = ItemNumber.create('12345');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('12345');
      }
    });

    it('should create valid item number with slash format', () => {
      const result = ItemNumber.create('12345/25');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('12345/25');
      }
    });

    it('should create valid item number with underscores', () => {
      const result = ItemNumber.create('ITEM_2025_001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ITEM_2025_001');
      }
    });

    it('should create valid item number with mixed format', () => {
      const result = ItemNumber.create('ASSET-001/2025_A');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ASSET-001/2025_A');
      }
    });

    it('should reject empty string', () => {
      const result = ItemNumber.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidItemNumberError);
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = ItemNumber.create('   ');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number exceeding 50 characters', () => {
      const longString = 'A' + 'B'.repeat(50);
      const result = ItemNumber.create(longString);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot exceed 50 characters');
      }
    });

    it('should reject item number starting with hyphen', () => {
      const result = ItemNumber.create('-INVALID');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must start with alphanumeric');
      }
    });

    it('should reject item number starting with slash', () => {
      const result = ItemNumber.create('/INVALID');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number starting with underscore', () => {
      const result = ItemNumber.create('_INVALID');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number with special characters', () => {
      const result = ItemNumber.create('INV@2025#001');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number with spaces', () => {
      const result = ItemNumber.create('INV 2025 001');

      expect(result.isErr()).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = ItemNumber.create('  INV-2025-000123  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('INV-2025-000123');
      }
    });

    it('should accept minimum length item number', () => {
      const result = ItemNumber.create('A');

      expect(result.isOk()).toBe(true);
    });

    it('should accept maximum length item number', () => {
      const maxString = 'A' + 'B'.repeat(49);
      const result = ItemNumber.create(maxString);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should be alias for create', () => {
      const result = ItemNumber.fromString('INV-2025-000123');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('getYear', () => {
    it('should extract 4-digit year from INV-YYYY-NNNNNN format', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2025);
    });

    it('should extract 4-digit year from any position', () => {
      const itemNumber = ItemNumber.create('ASSET-001-2026')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2026);
    });

    it('should extract 2-digit year from slash format', () => {
      const itemNumber = ItemNumber.create('12345/25')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2025);
    });

    it('should return null when no year detected', () => {
      const itemNumber = ItemNumber.create('ABC123456')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBeNull();
    });

    it('should not extract year from 2019 (too low)', () => {
      const itemNumber = ItemNumber.create('INV-2019-000001')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBeNull();
    });
  });

  describe('getNumericPortion', () => {
    it('should extract numeric portion from prefix format', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber.getNumericPortion()).toBe('2025');
    });

    it('should extract numeric portion from simple format', () => {
      const itemNumber = ItemNumber.create('12345')._unsafeUnwrap();

      expect(itemNumber.getNumericPortion()).toBe('12345');
    });

    it('should return null for non-numeric item number', () => {
      const itemNumber = ItemNumber.create('ABCDEF')._unsafeUnwrap();

      expect(itemNumber.getNumericPortion()).toBeNull();
    });
  });

  describe('getPrefix', () => {
    it('should extract prefix from INV-YYYY-NNNNNN format', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber.getPrefix()).toBe('INV');
    });

    it('should extract prefix from ASSET-XXX format', () => {
      const itemNumber = ItemNumber.create('ASSET-001')._unsafeUnwrap();

      expect(itemNumber.getPrefix()).toBe('ASSET');
    });

    it('should return null for numeric-only item number', () => {
      const itemNumber = ItemNumber.create('12345')._unsafeUnwrap();

      expect(itemNumber.getPrefix()).toBeNull();
    });
  });

  describe('equals', () => {
    it('should return true for equal item numbers', () => {
      const itemNumber1 = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const itemNumber2 = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber1.equals(itemNumber2)).toBe(true);
    });

    it('should return false for different item numbers', () => {
      const itemNumber1 = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const itemNumber2 = ItemNumber.create('INV-2025-000456')._unsafeUnwrap();

      expect(itemNumber1.equals(itemNumber2)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const itemNumber1 = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const itemNumber2 = ItemNumber.create('inv-2025-000123')._unsafeUnwrap();

      expect(itemNumber1.equals(itemNumber2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber.toString()).toBe('INV-2025-000123');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      expect(itemNumber.toJSON()).toBe('INV-2025-000123');
    });
  });
});
