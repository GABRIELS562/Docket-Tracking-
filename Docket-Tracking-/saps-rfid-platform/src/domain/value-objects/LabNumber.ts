import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import { InvalidLabNumberError } from '../errors/InvalidLabNumberError';

/**
 * Value Object representing a forensic lab number
 *
 * Format: NNNNNN/YY
 * Example: 12345/25 (lab number 12345 registered in 2025)
 *
 * @description
 * Immutable value object that ensures lab numbers are always valid.
 * Validation Rules:
 * - Sequence number: 1-6 digits (1-999999)
 * - Year: 2 digits (20-99, representing 2020-2099)
 * - Format: NNNNNN/YY
 *
 * @example
 * ```typescript
 * const result = LabNumber.create('12345/25');
 * if (result.isOk()) {
 *   const labNumber = result.value;
 *   console.log(labNumber.getYear()); // 2025
 *   console.log(labNumber.getSequenceNumber()); // 12345
 * }
 * ```
 */
export class LabNumber {
  private static readonly PATTERN = /^(\d{1,6})\/(\d{2})$/;
  private static readonly MIN_YEAR = 20; // Represents 2020
  private static readonly MAX_YEAR = 99; // Represents 2099

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
   * const result = LabNumber.create('12345/25');
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
          'Must match format NNNNNN/YY (e.g., 12345/25)'
        )
      );
    }

    // Extract sequence number and validate
    const sequenceNumber = parseInt(match[1]!, 10);
    if (sequenceNumber < 1 || sequenceNumber > 999999) {
      return err(
        new InvalidLabNumberError(value, 'Sequence number must be between 1 and 999999')
      );
    }

    // Extract year and validate range
    const year = parseInt(match[2]!, 10);
    if (year < LabNumber.MIN_YEAR || year > LabNumber.MAX_YEAR) {
      return err(
        new InvalidLabNumberError(
          value,
          `Year must be between ${LabNumber.MIN_YEAR} and ${LabNumber.MAX_YEAR} (representing 2020-2099)`
        )
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
   * @returns The 4-digit year (e.g., 2025 from "12345/25")
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('12345/25').unwrap();
   * console.log(labNumber.getYear()); // 2025
   * ```
   */
  getYear(): number {
    const match = this.value.match(LabNumber.PATTERN);
    const yearSuffix = parseInt(match![2]!, 10);
    // Convert 2-digit year to 4-digit year (20-99 -> 2020-2099)
    return 2000 + yearSuffix;
  }

  /**
   * Extracts the 2-digit year suffix from the lab number
   *
   * @returns The 2-digit year (e.g., 25 from "12345/25")
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('12345/25').unwrap();
   * console.log(labNumber.getYearSuffix()); // 25
   * ```
   */
  getYearSuffix(): number {
    const match = this.value.match(LabNumber.PATTERN);
    return parseInt(match![2]!, 10);
  }

  /**
   * Extracts the sequence number from the lab number
   *
   * @returns The numeric sequence (e.g., 12345 from "12345/25")
   *
   * @example
   * ```typescript
   * const labNumber = LabNumber.create('12345/25').unwrap();
   * console.log(labNumber.getSequenceNumber()); // 12345
   * ```
   */
  getSequenceNumber(): number {
    const match = this.value.match(LabNumber.PATTERN);
    return parseInt(match![1]!, 10);
  }

  /**
   * Gets the formatted sequence number as string
   *
   * @returns The sequence string (e.g., "12345")
   */
  getFormattedSequence(): string {
    const match = this.value.match(LabNumber.PATTERN);
    return match![1]!;
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
