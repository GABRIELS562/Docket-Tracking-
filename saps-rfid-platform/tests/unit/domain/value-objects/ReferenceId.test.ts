import { ReferenceId } from '@domain/value-objects/ReferenceId';
import { InvalidReferenceIdError } from '@domain/errors/InvalidReferenceIdError';

describe('ReferenceId', () => {
  describe('create', () => {
    it('should create valid reference ID with order format', () => {
      const result = ReferenceId.create('ORD-2025-001234');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ORD-2025-001234');
      }
    });

    it('should create valid reference ID with simple string', () => {
      const result = ReferenceId.create('Project Alpha');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Project Alpha');
      }
    });

    it('should create valid reference ID with special characters', () => {
      const result = ReferenceId.create('PO#2025-001 (Q1)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('PO#2025-001 (Q1)');
      }
    });

    it('should create valid reference ID with batch format', () => {
      const result = ReferenceId.create('BATCH-A123-2025');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('BATCH-A123-2025');
      }
    });

    it('should reject empty string', () => {
      const result = ReferenceId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidReferenceIdError);
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = ReferenceId.create('   ');

      expect(result.isErr()).toBe(true);
    });

    it('should reject reference ID exceeding 100 characters', () => {
      const longString = 'A'.repeat(101);
      const result = ReferenceId.create(longString);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot exceed 100 characters');
      }
    });

    it('should reject reference ID with control characters', () => {
      const result = ReferenceId.create('Invalid\x00Ref');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('printable characters');
      }
    });

    it('should reject reference ID with newline', () => {
      const result = ReferenceId.create('Invalid\nRef');

      expect(result.isErr()).toBe(true);
    });

    it('should reject reference ID with tab', () => {
      const result = ReferenceId.create('Invalid\tRef');

      expect(result.isErr()).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = ReferenceId.create('  ORD-2025-001234  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ORD-2025-001234');
      }
    });

    it('should accept minimum length reference ID', () => {
      const result = ReferenceId.create('A');

      expect(result.isOk()).toBe(true);
    });

    it('should accept maximum length reference ID', () => {
      const maxString = 'A'.repeat(100);
      const result = ReferenceId.create(maxString);

      expect(result.isOk()).toBe(true);
    });

    it('should accept reference ID with all printable ASCII', () => {
      // Test various printable characters
      const result = ReferenceId.create('ABC-123_xyz!@#$%^&*()');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should be alias for create', () => {
      const result = ReferenceId.fromString('ORD-2025-001234');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('none', () => {
    it('should create N/A reference ID', () => {
      const referenceId = ReferenceId.none();

      expect(referenceId.getValue()).toBe('N/A');
      expect(referenceId.isNone()).toBe(true);
    });
  });

  describe('isNone', () => {
    it('should return true for N/A reference', () => {
      const referenceId = ReferenceId.none();

      expect(referenceId.isNone()).toBe(true);
    });

    it('should return false for normal reference', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(referenceId.isNone()).toBe(false);
    });

    it('should return false even if value contains N/A', () => {
      const referenceId = ReferenceId.create('N/A-Extended')._unsafeUnwrap();

      expect(referenceId.isNone()).toBe(false);
    });
  });

  describe('getPrefix', () => {
    it('should extract prefix from order format', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(referenceId.getPrefix()).toBe('ORD');
    });

    it('should extract prefix from batch format', () => {
      const referenceId = ReferenceId.create('BATCH-A123')._unsafeUnwrap();

      expect(referenceId.getPrefix()).toBe('BATCH');
    });

    it('should return null for numeric-only reference', () => {
      const referenceId = ReferenceId.create('123456')._unsafeUnwrap();

      expect(referenceId.getPrefix()).toBeNull();
    });

    it('should return null for reference starting with number', () => {
      const referenceId = ReferenceId.create('2025-ORD-001')._unsafeUnwrap();

      expect(referenceId.getPrefix()).toBeNull();
    });
  });

  describe('getYear', () => {
    it('should extract 4-digit year from ORD-YYYY-NNN format', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2025);
    });

    it('should extract 4-digit year from any position', () => {
      const referenceId = ReferenceId.create('Project-2026-Alpha')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2026);
    });

    it('should extract 2-digit year from slash format', () => {
      const referenceId = ReferenceId.create('25/34/25')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2025);
    });

    it('should return null when no year detected', () => {
      const referenceId = ReferenceId.create('Project Alpha')._unsafeUnwrap();

      expect(referenceId.getYear()).toBeNull();
    });

    it('should not extract year from 2019 (too low)', () => {
      const referenceId = ReferenceId.create('ORD-2019-001')._unsafeUnwrap();

      expect(referenceId.getYear()).toBeNull();
    });
  });

  describe('equals', () => {
    it('should return true for equal reference IDs', () => {
      const ref1 = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();
      const ref2 = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(ref1.equals(ref2)).toBe(true);
    });

    it('should return false for different reference IDs', () => {
      const ref1 = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();
      const ref2 = ReferenceId.create('ORD-2025-005678')._unsafeUnwrap();

      expect(ref1.equals(ref2)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const ref1 = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();
      const ref2 = ReferenceId.create('ord-2025-001234')._unsafeUnwrap();

      expect(ref1.equals(ref2)).toBe(false);
    });

    it('should handle N/A comparison', () => {
      const ref1 = ReferenceId.none();
      const ref2 = ReferenceId.none();

      expect(ref1.equals(ref2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(referenceId.toString()).toBe('ORD-2025-001234');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();

      expect(referenceId.toJSON()).toBe('ORD-2025-001234');
    });

    it('should serialize correctly with JSON.stringify', () => {
      const referenceId = ReferenceId.create('ORD-2025-001234')._unsafeUnwrap();
      const obj = { referenceId };

      expect(JSON.stringify(obj)).toBe('{"referenceId":"ORD-2025-001234"}');
    });
  });

  describe('getValue', () => {
    it('should return the raw value', () => {
      const referenceId = ReferenceId.create('TEST-REF-001')._unsafeUnwrap();

      expect(referenceId.getValue()).toBe('TEST-REF-001');
    });
  });

  describe('edge cases', () => {
    it('should handle year 2030', () => {
      const referenceId = ReferenceId.create('ORD-2030-000001')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2030);
    });

    it('should handle year 2099', () => {
      const referenceId = ReferenceId.create('ORD-2099-000001')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2099);
    });

    it('should not extract 2-digit year below 20 from slash format', () => {
      const referenceId = ReferenceId.create('12345/19')._unsafeUnwrap();

      expect(referenceId.getYear()).toBeNull();
    });

    it('should extract 2-digit year 99 from slash format', () => {
      const referenceId = ReferenceId.create('12345/99')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2099);
    });

    it('should extract 2-digit year 20 from slash format', () => {
      const referenceId = ReferenceId.create('12345/20')._unsafeUnwrap();

      expect(referenceId.getYear()).toBe(2020);
    });

    it('should handle reference with complex special characters', () => {
      const result = ReferenceId.create('PO#2025-001 (Q1) @Region:A');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('PO#2025-001 (Q1) @Region:A');
      }
    });

    it('should handle reference with quotes', () => {
      const result = ReferenceId.create('Project "Alpha" v1.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Project "Alpha" v1.0');
      }
    });

    it('should handle exactly 100 character reference', () => {
      const maxString = 'A'.repeat(100);
      const result = ReferenceId.create(maxString);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue().length).toBe(100);
      }
    });

    it('should reject reference with 101 characters', () => {
      const tooLong = 'A'.repeat(101);
      const result = ReferenceId.create(tooLong);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot exceed 100 characters');
      }
    });

    it('should reject reference with backspace control character', () => {
      const result = ReferenceId.create('Invalid\x08Ref');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('printable characters');
      }
    });

    it('should reject reference with escape control character', () => {
      const result = ReferenceId.create('Invalid\x1BRef');

      expect(result.isErr()).toBe(true);
    });

    it('should reject reference with carriage return', () => {
      const result = ReferenceId.create('Invalid\rRef');

      expect(result.isErr()).toBe(true);
    });

    it('should handle prefix extraction with special characters', () => {
      const referenceId = ReferenceId.create('ABC-123#456')._unsafeUnwrap();

      expect(referenceId.getPrefix()).toBe('ABC');
    });

    it('should handle reference starting with special character', () => {
      const result = ReferenceId.create('#2025-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrefix()).toBeNull();
      }
    });

    it('should handle reference with multiple years', () => {
      const referenceId = ReferenceId.create('2025-2026-Budget')._unsafeUnwrap();

      // Should extract the first year
      expect(referenceId.getYear()).toBe(2025);
    });
  });

  describe('error validation', () => {
    it('should return InvalidReferenceIdError for invalid input', () => {
      const result = ReferenceId.create('Invalid\x00Control');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidReferenceIdError);
        expect(result.error.name).toBe('InvalidReferenceIdError');
      }
    });
  });
});
