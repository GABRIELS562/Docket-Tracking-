import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { InvalidEpcError } from '@domain/errors/InvalidEpcError';

describe('RfidEpc', () => {
  const validEpc = 'E280116060002004DECA48DA';

  describe('create', () => {
    it('should create valid EPC', () => {
      const result = RfidEpc.create(validEpc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should normalize to uppercase', () => {
      const result = RfidEpc.create('e280116060002004deca48da');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should accept mixed case', () => {
      const result = RfidEpc.create('E280116060002004deca48DA');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });

    it('should trim whitespace', () => {
      const result = RfidEpc.create('  E280116060002004DECA48DA  ');

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
      const result = RfidEpc.create('E280116060002004DECA48DA12345');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exactly 24 characters');
      }
    });

    it('should reject non-hex characters', () => {
      const result = RfidEpc.create('G280116060002004DECA48DA');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('hexadecimal characters');
      }
    });

    it('should reject special characters', () => {
      const result = RfidEpc.create('E280116060002004DECA4-DA');

      expect(result.isErr()).toBe(true);
    });

    it('should reject spaces in EPC', () => {
      const result = RfidEpc.create('E280 1160 6000 2004 DECA 48DA');

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

      expect(epc.format()).toBe('E280-1160-6000-2004-DECA-48DA');
    });

    it('should format with custom separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.format(' ')).toBe('E280 1160 6000 2004 DECA 48DA');
    });

    it('should format with colon separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc.format(':')).toBe('E280:1160:6000:2004:DECA:48DA');
    });
  });

  describe('equals', () => {
    it('should return true for equal EPCs', () => {
      const epc1 = RfidEpc.create(validEpc)._unsafeUnwrap();
      const epc2 = RfidEpc.create(validEpc)._unsafeUnwrap();

      expect(epc1.equals(epc2)).toBe(true);
    });

    it('should return true for case-insensitive equal EPCs', () => {
      const epc1 = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
      const epc2 = RfidEpc.create('e280116060002004deca48da')._unsafeUnwrap();

      expect(epc1.equals(epc2)).toBe(true);
    });

    it('should return false for different EPCs', () => {
      const epc1 = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
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

    it('should serialize correctly with JSON.stringify', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();
      const obj = { epc };

      expect(JSON.stringify(obj)).toBe(`{"epc":"${validEpc}"}`);
    });
  });

  describe('fromString', () => {
    it('should be an alias for create', () => {
      const createResult = RfidEpc.create(validEpc);
      const fromStringResult = RfidEpc.fromString(validEpc);

      expect(createResult.isOk()).toBe(true);
      expect(fromStringResult.isOk()).toBe(true);
      if (createResult.isOk() && fromStringResult.isOk()) {
        expect(createResult.value.getValue()).toBe(fromStringResult.value.getValue());
      }
    });

    it('should reject invalid EPC like create', () => {
      const result = RfidEpc.fromString('invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidEpcError);
      }
    });

    it('should normalize lowercase to uppercase', () => {
      const result = RfidEpc.fromString('e280116060002004deca48da');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validEpc);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle EPC with all zeros', () => {
      const zeroEpc = '000000000000000000000000';
      const result = RfidEpc.create(zeroEpc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(zeroEpc);
      }
    });

    it('should handle EPC with all Fs', () => {
      const maxEpc = 'FFFFFFFFFFFFFFFFFFFFFFFF';
      const result = RfidEpc.create(maxEpc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(maxEpc);
      }
    });

    it('should handle EPC with lowercase letters', () => {
      const lowerEpc = 'abcdef123456abcdef123456';
      const result = RfidEpc.create(lowerEpc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('ABCDEF123456ABCDEF123456');
      }
    });

    it('should reject EPC with exactly 23 characters', () => {
      const shortEpc = 'E280116060002004DECA48D';
      const result = RfidEpc.create(shortEpc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exactly 24 characters');
        expect(result.error.message).toContain('got 23');
      }
    });

    it('should reject EPC with exactly 25 characters', () => {
      const longEpc = 'E280116060002004DECA48DAA';
      const result = RfidEpc.create(longEpc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exactly 24 characters');
        expect(result.error.message).toContain('got 25');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = RfidEpc.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject EPC with lowercase g (non-hex)', () => {
      const result = RfidEpc.create('g280116060002004DECA48DA');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('hexadecimal characters');
      }
    });

    it('should format with empty separator', () => {
      const epc = RfidEpc.create(validEpc)._unsafeUnwrap();

      // With empty separator, the groups are joined without any separator
      expect(epc.format('')).toBe('E280116060002004DECA48DA');
    });

    it('should convert mixed hex to proper byte array', () => {
      const epc = RfidEpc.create('A1B2C3D4E5F6A1B2C3D4E5F6')._unsafeUnwrap();
      const bytes = epc.toByteArray();

      expect(bytes).toHaveLength(12);
      expect(bytes[0]).toBe(0xa1);
      expect(bytes[1]).toBe(0xb2);
      expect(bytes[2]).toBe(0xc3);
      expect(bytes[3]).toBe(0xd4);
      expect(bytes[4]).toBe(0xe5);
      expect(bytes[5]).toBe(0xf6);
    });
  });
});
