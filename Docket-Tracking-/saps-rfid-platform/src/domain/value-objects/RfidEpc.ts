import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import { InvalidEpcError } from '../errors/InvalidEpcError';

/**
 * Value Object for RFID EPC (Electronic Product Code)
 *
 * Format: 24 hexadecimal characters
 * Example: E28011606000204DECA48DA
 *
 * @description
 * Immutable value object representing an RFID tag's Electronic Product Code.
 * EPCs are normalized to uppercase and validated for correct format.
 *
 * Validation Rules:
 * - Exactly 24 characters
 * - Only hexadecimal characters (0-9, A-F)
 * - Case insensitive (normalized to uppercase)
 *
 * @example
 * ```typescript
 * const result = RfidEpc.create('e28011606000204deca48da');
 * if (result.isOk()) {
 *   console.log(result.value.getValue()); // "E28011606000204DECA48DA"
 * }
 * ```
 */
export class RfidEpc {
  private static readonly EPC_LENGTH = 24;
  private static readonly HEX_PATTERN = /^[0-9A-F]{24}$/;

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates an RfidEpc from a string value
   *
   * @param value - The EPC string to validate and create
   * @returns Result containing RfidEpc or InvalidEpcError
   *
   * @example
   * ```typescript
   * const result = RfidEpc.create('E28011606000204DECA48DA');
   * ```
   */
  static create(value: string): Result<RfidEpc, InvalidEpcError> {
    // Trim and normalize to uppercase
    const normalized = value.trim().toUpperCase();

    // Check if empty
    if (normalized.length === 0) {
      return err(new InvalidEpcError(value, 'EPC cannot be empty'));
    }

    // Check length
    if (normalized.length !== RfidEpc.EPC_LENGTH) {
      return err(
        new InvalidEpcError(
          value,
          `EPC must be exactly ${RfidEpc.EPC_LENGTH} characters (got ${normalized.length})`
        )
      );
    }

    // Check if valid hexadecimal
    if (!RfidEpc.HEX_PATTERN.test(normalized)) {
      return err(
        new InvalidEpcError(value, 'EPC must contain only hexadecimal characters (0-9, A-F)')
      );
    }

    return ok(new RfidEpc(normalized));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<RfidEpc, InvalidEpcError> {
    return RfidEpc.create(value);
  }

  /**
   * Returns the raw EPC value (normalized to uppercase)
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Returns the EPC as a byte array
   *
   * @returns Array of bytes representing the EPC
   */
  toByteArray(): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < this.value.length; i += 2) {
      const byte = parseInt(this.value.substring(i, i + 2), 16);
      bytes.push(byte);
    }
    return bytes;
  }

  /**
   * Returns the EPC formatted with separators for readability
   *
   * @param separator - The separator to use (default: '-')
   * @returns Formatted EPC (e.g., "E280-1160-6000-204D-ECA4-8DA")
   *
   * @example
   * ```typescript
   * const epc = RfidEpc.create('E28011606000204DECA48DA').unwrap();
   * console.log(epc.format('-')); // "E280-1160-6000-204D-ECA4-8DA"
   * console.log(epc.format(' ')); // "E280 1160 6000 204D ECA4 8DA"
   * ```
   */
  format(separator: string = '-'): string {
    return this.value.match(/.{1,4}/g)!.join(separator);
  }

  /**
   * Checks equality with another RfidEpc
   *
   * @param other - The RfidEpc to compare with
   * @returns true if both EPCs have the same value
   */
  equals(other: RfidEpc): boolean {
    return this.value === other.value;
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns a JSON representation
   */
  toJSON(): string {
    return this.value;
  }
}
