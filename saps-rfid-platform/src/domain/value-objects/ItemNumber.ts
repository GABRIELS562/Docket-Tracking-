import { ok, err } from 'neverthrow';

import { InvalidItemNumberError } from '../errors/InvalidItemNumberError';

import type { Result } from 'neverthrow';

/**
 * Value Object representing an inventory item number
 *
 * Flexible format supporting multiple patterns:
 * - Simple numeric: 12345
 * - Year-based: 2025-000001 or 25-000001
 * - Prefix-based: INV-2025-000001
 * - Slash-based: 12345/25
 * - Alphanumeric: ABC123456
 *
 * @description
 * Immutable value object that ensures item numbers are always valid.
 * Validation Rules:
 * - Must not be empty
 * - Must be 1-50 characters
 * - Must contain only alphanumeric characters, hyphens, slashes, or underscores
 * - Must start with alphanumeric character
 *
 * @example
 * ```typescript
 * const result = ItemNumber.create('INV-2025-000001');
 * if (result.isOk()) {
 *   const itemNumber = result.value;
 *   console.log(itemNumber.getValue()); // "INV-2025-000001"
 * }
 * ```
 */
export class ItemNumber {
  // Flexible pattern: alphanumeric with hyphens, slashes, underscores
  private static readonly PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-\/_]{0,49}$/;
  private static readonly MAX_LENGTH = 50;

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates an ItemNumber from a string value
   *
   * @param value - The item number string to validate and create
   * @returns Result containing ItemNumber or InvalidItemNumberError
   *
   * @example
   * ```typescript
   * const result = ItemNumber.create('INV-2025-000001');
   * ```
   */
  static create(value: string): Result<ItemNumber, InvalidItemNumberError> {
    // Trim whitespace
    const trimmed = value.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return err(new InvalidItemNumberError(value, 'Item number cannot be empty'));
    }

    // Check length
    if (trimmed.length > ItemNumber.MAX_LENGTH) {
      return err(
        new InvalidItemNumberError(
          value,
          `Item number cannot exceed ${ItemNumber.MAX_LENGTH} characters`
        )
      );
    }

    // Check format with regex
    if (!ItemNumber.PATTERN.test(trimmed)) {
      return err(
        new InvalidItemNumberError(
          value,
          'Item number must start with alphanumeric and contain only alphanumeric characters, hyphens, slashes, or underscores'
        )
      );
    }

    return ok(new ItemNumber(trimmed));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<ItemNumber, InvalidItemNumberError> {
    return ItemNumber.create(value);
  }

  /**
   * Returns the raw string value of the item number
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Extracts the year if present in common formats
   *
   * Supports formats like:
   * - INV-2025-000001 -> 2025
   * - 12345/25 -> 2025
   * - 2025-000001 -> 2025
   *
   * @returns The 4-digit year if detected, or null
   */
  getYear(): number | null {
    // Try to find 4-digit year
    const fourDigitMatch = this.value.match(/\b(20[2-9]\d)\b/);
    if (fourDigitMatch) {
      return parseInt(fourDigitMatch[1]!, 10);
    }

    // Try to find 2-digit year after slash (e.g., 12345/25)
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
   * Extracts the numeric portion if present
   *
   * @returns The numeric sequence if found, or null
   */
  getNumericPortion(): string | null {
    const match = this.value.match(/(\d+)/);
    return match ? match[1]! : null;
  }

  /**
   * Extracts the prefix if present
   *
   * @returns The prefix (e.g., "INV" from "INV-2025-000001"), or null
   */
  getPrefix(): string | null {
    const match = this.value.match(/^([A-Za-z]+)/);
    return match ? match[1]! : null;
  }

  /**
   * Checks equality with another ItemNumber
   *
   * @param other - The ItemNumber to compare with
   * @returns true if both item numbers have the same value
   */
  equals(other: ItemNumber): boolean {
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
