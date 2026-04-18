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

    it('should serialize correctly with JSON.stringify', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
      const obj = { itemNumber };

      expect(JSON.stringify(obj)).toBe('{"itemNumber":"INV-2025-000123"}');
    });
  });

  describe('getValue', () => {
    it('should return the raw value', () => {
      const itemNumber = ItemNumber.create('TEST-001')._unsafeUnwrap();

      expect(itemNumber.getValue()).toBe('TEST-001');
    });
  });

  describe('edge cases', () => {
    it('should handle year 2030', () => {
      const itemNumber = ItemNumber.create('INV-2030-000001')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2030);
    });

    it('should handle year 2099', () => {
      const itemNumber = ItemNumber.create('INV-2099-000001')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2099);
    });

    it('should not extract 2-digit year below 20 from slash format', () => {
      const itemNumber = ItemNumber.create('12345/19')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBeNull();
    });

    it('should extract 2-digit year 99 from slash format', () => {
      const itemNumber = ItemNumber.create('12345/99')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2099);
    });

    it('should extract 2-digit year 20 from slash format', () => {
      const itemNumber = ItemNumber.create('12345/20')._unsafeUnwrap();

      expect(itemNumber.getYear()).toBe(2020);
    });

    it('should handle item number with only letters', () => {
      const itemNumber = ItemNumber.create('ABCDEFGH')._unsafeUnwrap();

      expect(itemNumber.getPrefix()).toBe('ABCDEFGH');
      expect(itemNumber.getNumericPortion()).toBeNull();
    });

    it('should handle item number with mixed delimiters', () => {
      const result = ItemNumber.create('A-B/C_D');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('A-B/C_D');
      }
    });

    it('should reject item number with dot', () => {
      const result = ItemNumber.create('INV.2025.001');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number with parentheses', () => {
      const result = ItemNumber.create('INV(2025)001');

      expect(result.isErr()).toBe(true);
    });

    it('should reject item number with asterisk', () => {
      const result = ItemNumber.create('INV*2025*001');

      expect(result.isErr()).toBe(true);
    });

    it('should extract first numeric portion only', () => {
      const itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();

      // The getNumericPortion extracts the first numeric match
      expect(itemNumber.getNumericPortion()).toBe('2025');
    });

    it('should handle exactly 50 character item number', () => {
      const maxString = 'A' + '0'.repeat(49);
      const result = ItemNumber.create(maxString);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue().length).toBe(50);
      }
    });

    it('should reject item number with 51 characters', () => {
      const tooLong = 'A' + '0'.repeat(50);
      const result = ItemNumber.create(tooLong);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot exceed 50 characters');
      }
    });
  });

  describe('error validation', () => {
    it('should return InvalidItemNumberError for invalid input', () => {
      const result = ItemNumber.create('@invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidItemNumberError);
        expect(result.error.name).toBe('InvalidItemNumberError');
      }
    });
  });
});
