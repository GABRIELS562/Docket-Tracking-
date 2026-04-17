import { ok, err } from 'neverthrow';

import { InvalidReferenceIdError } from '../errors/InvalidReferenceIdError';

import type { Result } from 'neverthrow';

/**
 * Value Object representing a reference identifier
 *
 * Generic reference ID that can link to external systems:
 * - Order numbers
 * - Project codes
 * - Batch numbers
 * - External system IDs
 * - Custom tenant-specific references
 *
 * @description
 * Immutable value object that ensures reference IDs are always valid.
 * Validation Rules:
 * - Must not be empty
 * - Must be 1-100 characters
 * - Must contain only printable characters (no control characters)
 *
 * @example
 * ```typescript
 * const result = ReferenceId.create('ORD-2025-001234');
 * if (result.isOk()) {
 *   const referenceId = result.value;
 *   console.log(referenceId.getValue()); // "ORD-2025-001234"
 * }
 * ```
 */
export class ReferenceId {
  // Allow any printable characters (no control chars)
  private static readonly PATTERN = /^[\x20-\x7E]+$/;
  private static readonly MAX_LENGTH = 100;

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates a ReferenceId from a string value
   *
   * @param value - The reference ID string to validate and create
   * @returns Result containing ReferenceId or InvalidReferenceIdError
   *
   * @example
   * ```typescript
   * const result = ReferenceId.create('ORD-2025-001234');
   * ```
   */
  static create(value: string): Result<ReferenceId, InvalidReferenceIdError> {
    // Trim whitespace
    const trimmed = value.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return err(new InvalidReferenceIdError(value, 'Reference ID cannot be empty'));
    }

    // Check length
    if (trimmed.length > ReferenceId.MAX_LENGTH) {
      return err(
        new InvalidReferenceIdError(
          value,
          `Reference ID cannot exceed ${ReferenceId.MAX_LENGTH} characters`
        )
      );
    }

    // Check for printable characters only
    if (!ReferenceId.PATTERN.test(trimmed)) {
      return err(
        new InvalidReferenceIdError(value, 'Reference ID must contain only printable characters')
      );
    }

    return ok(new ReferenceId(trimmed));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<ReferenceId, InvalidReferenceIdError> {
    return ReferenceId.create(value);
  }

  /**
   * Creates a ReferenceId that represents "no reference"
   * Useful for items that don't have an external reference
   */
  static none(): ReferenceId {
    return new ReferenceId('N/A');
  }

  /**
   * Returns the raw string value of the reference ID
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks if this reference ID represents "no reference"
   */
  isNone(): boolean {
    return this.value === 'N/A';
  }

  /**
   * Extracts the prefix if present (characters before first delimiter)
   *
   * @returns The prefix (e.g., "ORD" from "ORD-2025-001234"), or null
   */
  getPrefix(): string | null {
    const match = this.value.match(/^([A-Za-z]+)/);
    return match ? match[1]! : null;
  }

  /**
   * Extracts year if present in common formats
   *
   * @returns The 4-digit year if detected, or null
   */
  getYear(): number | null {
    // Try to find 4-digit year
    const fourDigitMatch = this.value.match(/\b(20[2-9]\d)\b/);
    if (fourDigitMatch) {
      return parseInt(fourDigitMatch[1]!, 10);
    }

    // Try to find 2-digit year after slash (e.g., 25/34/25)
    const slashMatch = this.value.match(/\/(\d{2})$/);
    if (slashMatch) {
      const yearSuffix = parseInt(slashMatch[1]!, 10);
      if (yearSuffix >= 20 && yearSuffix <= 99) {
        return 2000 + yearSuffix;
      }
    }

    return null;
  }

  /**
   * Checks equality with another ReferenceId
   *
   * @param other - The ReferenceId to compare with
   * @returns true if both reference IDs have the same value
   */
  equals(other: ReferenceId): boolean {
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
