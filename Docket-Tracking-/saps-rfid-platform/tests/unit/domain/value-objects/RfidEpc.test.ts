import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { InvalidEpcError } from '@domain/errors/InvalidEpcError';

describe('RfidEpc', () => {
  const validEpc = 'E28011606000204DECA48DA';

  describe('create', () => {
    it('should create valid EPC', () => {
      const result = RfidEpc.create(validEpc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should normalize to uppercase', () => {
      const result = RfidEpc.create('e28011606000204deca48da');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should accept mixed case', () => {
      const result = RfidEpc.create('E28011606000204deca48DA');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should trim whitespace', () => {
      const result = RfidEpc.create('  E28011606000204DECA48DA  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should reject empty string', () => {
      const result = RfidEpc.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidEpcError);
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject too short EPC', () => {
      const result = RfidEpc.create('E280116060');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exactly 24 characters');
      }
    });

    it('should reject too long EPC', () => {
      const result = RfidEpc.create('E28011606000204DECA48DA12345');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exactly 24 characters');
      }
    });

    it('should reject non-hex characters', () => {
      const result = RfidEpc.create('G28011606000204DECA48DA');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('hexadecimal characters');
      }
    });

    it('should reject special characters', () => {
      const result = RfidEpc.create('E28011606000204DECA4-DA');

      expect(result.isErr()).toBe(true);
    });

    it('should reject spaces in EPC', () => {
      const result = RfidEpc.create('E280 1160 6000 204D ECA4 8DA');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('toByteArray', () => {
    it('should convert to byte array', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();
      const bytes = epc.toByteArray();

      expect(bytes).toHaveLength(12);
      expect(bytes[0]).toBe(0xe2);
      expect(bytes[1]).toBe(0x80);
    });

    it('should handle all hex values', () => {
      const epc = RfidEpc.create('000000000000000000000000')._unsafeUnwrap();
      const bytes = epc.toByteArray();

      expect(bytes).toEqual(new Array(12).fill(0));
    });

    it('should handle max hex values', () => {
      const epc = RfidEpc.create('FFFFFFFFFFFFFFFFFFFFFFFF')._unsafeUnwrap();
      const bytes = epc.toByteArray();

      expect(bytes).toEqual(new Array(12).fill(255));
    });
  });

  describe('format', () => {
    it('should format with default separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.format()).toBe('E280-1160-6000-204D-ECA4-8DA');
    });

    it('should format with custom separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.format(' ')).toBe('E280 1160 6000 204D ECA4 8DA');
    });

    it('should format with colon separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.format(':')).toBe('E280:1160:6000:204D:ECA4:8DA');
    });
  });

  describe('equals', () => {
    it('should return true for equal EPCs', () => {
      const epc1 = RfidEpc.create(validEpc)._unsafeUnwrap();
      const epc2 = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc1.equals(epc2)).toBe(true);
    });

    it('should return true for case-insensitive equal EPCs', () => {
      const epc1 = RfidEpc.create('E28011606000204DECA48DA')._unsafeUnwrap();
      const epc2 = RfidEpc.create('e28011606000204deca48da')._unsafeUnwrap();

      expect(epc1.equals(epc2)).toBe(true);
    });

    it('should return false for different EPCs', () => {
      const epc1 = RfidEpc.create('E28011606000204DECA48DA')._unsafeUnwrap();
      const epc2 = RfidEpc.create('000000000000000000000000')._unsafeUnwrap();

      expect(epc1.equals(epc2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.toString()).toBe(validEpc);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.toJSON()).toBe(validEpc);
    });
  });
});
