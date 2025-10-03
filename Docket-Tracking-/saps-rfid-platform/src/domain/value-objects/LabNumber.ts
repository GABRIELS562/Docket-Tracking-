import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import { InvalidLabNumberError } from '../errors/InvalidLabNumberError';

/**
 * Value Object representing a forensic lab number
 *
 * Format: FSL-YYYY-NNNNNN
 * Example: FSL-2025-000123
 *
 * @description
 * Immutable value object that ensures lab numbers are always valid.
 * Validation Rules:
 * - Must start with "FSL-" prefix
 * - Year must be 4 digits (2020-2099)
 * - Sequence number must be exactly 6 digits (000001-999999)
 * - Total format: FSL-YYYY-NNNNNN
 *
 * @example
 * ```typescript
 * const result = LabNumber.create('FSL-2025-000123');
 * if (result.isOk()) {
 *   const labNumber = result.value;
 *   console.log(labNumber.getYear()); // 2025
 *   console.log(labNumber.getSequenceNumber()); // 123
 * }
 * ```
 */
export class LabNumber {
  private static readonly PREFIX = 'FSL';
  private static readonly PATTERN = /^FSL-(\d{4})-(\d{6})$/;
  private static readonly MIN_YEAR = 2020;
  private static readonly MAX_YEAR = 2099;

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates a LabNumber from a string value
   *
   * @param value - The lab number string to validate and create
   * @returns Result containing LabNumber or InvalidLabNumberError
   *
   * @example
   * ```typescript
   * const result = LabNumber.create('FSL-2025-000123');
   * ```
   */
  static create(value: string): Result<LabNumber, InvalidLabNumberError> {
    // Trim whitespace
    const trimmed = value.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return err(new InvalidLabNumberError(value, 'Lab number cannot be empty'));
    }

    // Check format with regex
    const match = trimmed.match(LabNumber.PATTERN);
    if (!match) {
      return err(
        new InvalidLabNumberError(
          value,
          'Must match format FSL-YYYY-NNNNNN (e.g., FSL-2025-000123)'
        )
      );
    }

    // Extract year and validate range
    const year = parseInt(match[1]!, 10);
    if (year < LabNumber.MIN_YEAR || year > LabNumber.MAX_YEAR) {
      return err(
        new InvalidLabNumberError(
          value,
          `Year must be between ${LabNumber.MIN_YEAR} and ${LabNumber.MAX_YEAR}`
        )
      );
    }

    // Extract sequence number and validate
    const sequenceNumber = parseInt(match[2]!, 10);
    if (sequenceNumber < 1 || sequenceNumber > 999999) {
      return err(
        new InvalidLabNumberError(value, 'Sequence number must be between 000001 and 999999')
      );
    }

    return ok(new LabNumber(trimmed));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<LabNumber, InvalidLabNumberError> {
    return LabNumber.create(value);
  }

  /**
   * Returns the raw string value of the lab number
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Extracts the year from the lab number
   *
   * @returns The 4-digit year (e.g., 2025)
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('FSL-2025-000123').unwrap();
   * console.log(labNumber.getYear()); // 2025
   * ```
   */
  getYear(): number {
    const match = this.value.match(LabNumber.PATTERN);
    return parseInt(match![1]!, 10);
  }

  /**
   * Extracts the sequence number from the lab number
   *
   * @returns The numeric sequence (e.g., 123 from FSL-2025-000123)
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('FSL-2025-000123').unwrap();
   * console.log(labNumber.getSequenceNumber()); // 123
   * ```
   */
  getSequenceNumber(): number {
    const match = this.value.match(LabNumber.PATTERN);
    return parseInt(match![2]!, 10);
  }

  /**
   * Gets the formatted sequence number with leading zeros
   *
   * @returns The 6-digit sequence string (e.g., "000123")
   */
  getFormattedSequence(): string {
    const match = this.value.match(LabNumber.PATTERN);
    return match![2]!;
  }

  /**
   * Checks equality with another LabNumber
   *
   * @param other - The LabNumber to compare with
   * @returns true if both lab numbers have the same value
   */
  equals(other: LabNumber): boolean {
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
