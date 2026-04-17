/**
 * Base class for all domain errors
 *
 * Domain errors represent violations of business rules or invariants.
 * They should be used within the domain layer to signal invalid operations.
 */
export abstract class DomainError extends Error {
  /**
   * Error code for categorization and logging
   */
  public readonly code: string;

  /**
   * Additional context data
   */
  public readonly metadata?: Record<string, unknown>;

  constructor(message: string, code: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}
