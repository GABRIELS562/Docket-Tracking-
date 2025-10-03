import { LabNumber } from '@domain/value-objects/LabNumber';
import { InvalidLabNumberError } from '@domain/errors/InvalidLabNumberError';

describe('LabNumber', () => {
  describe('create', () => {
    it('should create valid lab number', () => {
      const result = LabNumber.create('FSL-2025-000123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('FSL-2025-000123');
      }
    });

    it('should create with minimum sequence number', () => {
      const result = LabNumber.create('FSL-2025-000001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBe(1);
      }
    });

    it('should create with maximum sequence number', () => {
      const result = LabNumber.create('FSL-2025-999999');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBe(999999);
      }
    });

    it('should reject empty string', () => {
      const result = LabNumber.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidLabNumberError);
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = LabNumber.create('   ');

      expect(result.isErr()).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = LabNumber.create('INVALID');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Must match format');
      }
    });

    it('should reject wrong prefix', () => {
      const result = LabNumber.create('ABC-2025-000123');

      expect(result.isErr()).toBe(true);
    });

    it('should reject year too low', () => {
      const result = LabNumber.create('FSL-2019-000123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Year must be between');
      }
    });

    it('should reject year too high', () => {
      const result = LabNumber.create('FSL-2100-000123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Year must be between');
      }
    });

    it('should reject sequence number zero', () => {
      const result = LabNumber.create('FSL-2025-000000');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Sequence number must be between');
      }
    });

    it('should reject sequence number too high', () => {
      const result = LabNumber.create('FSL-2025-999999999');

      expect(result.isErr()).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = LabNumber.create('  FSL-2025-000123  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('FSL-2025-000123');
      }
    });

    it('should reject non-numeric year', () => {
      const result = LabNumber.create('FSL-ABCD-000123');

      expect(result.isErr()).toBe(true);
    });

    it('should reject non-numeric sequence', () => {
      const result = LabNumber.create('FSL-2025-ABCDEF');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should be alias for create', () => {
      const result = LabNumber.fromString('FSL-2025-000123');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('getYear', () => {
    it('should extract year correctly', () => {
      const labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber.getYear()).toBe(2025);
    });
  });

  describe('getSequenceNumber', () => {
    it('should extract sequence number correctly', () => {
      const labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber.getSequenceNumber()).toBe(123);
    });

    it('should handle leading zeros correctly', () => {
      const labNumber = LabNumber.create('FSL-2025-000001')._unsafeUnwrap();

      expect(labNumber.getSequenceNumber()).toBe(1);
    });
  });

  describe('getFormattedSequence', () => {
    it('should return formatted sequence with leading zeros', () => {
      const labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber.getFormattedSequence()).toBe('000123');
    });
  });

  describe('equals', () => {
    it('should return true for equal lab numbers', () => {
      const labNumber1 = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();
      const labNumber2 = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber1.equals(labNumber2)).toBe(true);
    });

    it('should return false for different lab numbers', () => {
      const labNumber1 = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();
      const labNumber2 = LabNumber.create('FSL-2025-000456')._unsafeUnwrap();

      expect(labNumber1.equals(labNumber2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber.toString()).toBe('FSL-2025-000123');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();

      expect(labNumber.toJSON()).toBe('FSL-2025-000123');
    });
  });
});
