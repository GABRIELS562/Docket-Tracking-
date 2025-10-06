import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import { InvalidCaseNumberError } from '../errors/InvalidCaseNumberError';

/**
 * Value Object representing a case number (CAS number)
 *
 * Format: DD/NN/YY
 * Example: 25/34/25 (registered on day 25, case number 34, in year 2025)
 *
 * @description
 * Immutable value object that ensures case numbers are always valid.
 * Validation Rules:
 * - Day: 1-31 (representing day of month)
 * - Case number: 1-999 (daily case sequence)
 * - Year: 2 digits (20-99, representing 2020-2099)
 * - Format: DD/NN/YY
 *
 * @example
 * ```typescript
 * const result = CaseNumber.create('25/34/25');
 * if (result.isOk()) {
 *   const caseNumber = result.value;
 *   console.log(caseNumber.getDay()); // 25
 *   console.log(caseNumber.getCaseSequence()); // 34
 *   console.log(caseNumber.getYear()); // 2025
 * }
 * ```
 */
export class CaseNumber {
  private static readonly PATTERN = /^(\d{1,2})\/(\d{1,3})\/(\d{2})$/;
  private static readonly MIN_DAY = 1;
  private static readonly MAX_DAY = 31;
  private static readonly MIN_CASE = 1;
  private static readonly MAX_CASE = 999;
  private static readonly MIN_YEAR = 20; // Represents 2020
  private static readonly MAX_YEAR = 99; // Represents 2099

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates a CaseNumber from a string value
   *
   * @param value - The case number string to validate and create
   * @returns Result containing CaseNumber or InvalidCaseNumberError
   *
   * @example
   * ```typescript
   * const result = CaseNumber.create('25/34/25');
   * ```
   */
  static create(value: string): Result<CaseNumber, InvalidCaseNumberError> {
    // Trim whitespace
    const trimmed = value.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return err(new InvalidCaseNumberError(value, 'Case number cannot be empty'));
    }

    // Check format with regex
    const match = trimmed.match(CaseNumber.PATTERN);
    if (!match) {
      return err(
        new InvalidCaseNumberError(
          value,
          'Must match format DD/NN/YY (e.g., 25/34/25)'
        )
      );
    }

    // Extract day and validate
    const day = parseInt(match[1]!, 10);
    if (day < CaseNumber.MIN_DAY || day > CaseNumber.MAX_DAY) {
      return err(
        new InvalidCaseNumberError(
          value,
          `Day must be between ${CaseNumber.MIN_DAY} and ${CaseNumber.MAX_DAY}`
        )
      );
    }

    // Extract case sequence and validate
    const caseSequence = parseInt(match[2]!, 10);
    if (caseSequence < CaseNumber.MIN_CASE || caseSequence > CaseNumber.MAX_CASE) {
      return err(
        new InvalidCaseNumberError(
          value,
          `Case sequence must be between ${CaseNumber.MIN_CASE} and ${CaseNumber.MAX_CASE}`
        )
      );
    }

    // Extract year and validate range
    const year = parseInt(match[3]!, 10);
    if (year < CaseNumber.MIN_YEAR || year > CaseNumber.MAX_YEAR) {
      return err(
        new InvalidCaseNumberError(
          value,
          `Year must be between ${CaseNumber.MIN_YEAR} and ${CaseNumber.MAX_YEAR} (representing 2020-2099)`
        )
      );
    }

    return ok(new CaseNumber(trimmed));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<CaseNumber, InvalidCaseNumberError> {
    return CaseNumber.create(value);
  }

  /**
   * Returns the raw string value of the case number
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Extracts the day from the case number
   *
   * @returns The day (1-31)
   *
   * @example
   * ```typescript
   * const caseNumber = CaseNumber.create('25/34/25').unwrap();
   * console.log(caseNumber.getDay()); // 25
   * ```
   */
  getDay(): number {
    const match = this.value.match(CaseNumber.PATTERN);
    return parseInt(match![1]!, 10);
  }

  /**
   * Extracts the case sequence number from the case number
   *
   * @returns The case sequence (1-999)
   *
   * @example
   * ```typescript
   * const caseNumber = CaseNumber.create('25/34/25').unwrap();
   * console.log(caseNumber.getCaseSequence()); // 34
   * ```
   */
  getCaseSequence(): number {
    const match = this.value.match(CaseNumber.PATTERN);
    return parseInt(match![2]!, 10);
  }

  /**
   * Extracts the year from the case number
   *
   * @returns The 4-digit year (e.g., 2025 from "25/34/25")
   *
   * @example
   * ```typescript
   * const caseNumber = CaseNumber.create('25/34/25').unwrap();
   * console.log(caseNumber.getYear()); // 2025
   * ```
   */
  getYear(): number {
    const match = this.value.match(CaseNumber.PATTERN);
    const yearSuffix = parseInt(match![3]!, 10);
    // Convert 2-digit year to 4-digit year (20-99 -> 2020-2099)
    return 2000 + yearSuffix;
  }

  /**
   * Extracts the 2-digit year suffix from the case number
   *
   * @returns The 2-digit year (e.g., 25 from "25/34/25")
   *
   * @example
   * ```typescript
   * const caseNumber = CaseNumber.create('25/34/25').unwrap();
   * console.log(caseNumber.getYearSuffix()); // 25
   * ```
   */
  getYearSuffix(): number {
    const match = this.value.match(CaseNumber.PATTERN);
    return parseInt(match![3]!, 10);
  }

  /**
   * Checks equality with another CaseNumber
   *
   * @param other - The CaseNumber to compare with
   * @returns true if both case numbers have the same value
   */
  equals(other: CaseNumber): boolean {
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
