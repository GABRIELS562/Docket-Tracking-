/**
 * Logger Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for application logging.
 * This is an interface defined in the application layer; implementations
 * will be provided by the infrastructure layer.
 *
 * Supports structured logging with context for better observability.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class WinstonLogger implements ILogger {
 *   info(message: string, context?: Record<string, unknown>): void {
 *     // Implementation with Winston
 *   }
 * }
 * ```
 */
export interface ILogger {
  /**
   * Logs a debug message
   *
   * @param message - The log message
   * @param context - Optional context data
   *
   * @description
   * Used for detailed debugging information.
   * Typically disabled in production.
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs an info message
   *
   * @param message - The log message
   * @param context - Optional context data
   *
   * @description
   * Used for general informational messages about system operation.
   *
   * @example
   * ```typescript
   * logger.info('Item registered successfully', {
   *   labNumber: 'FSL-2025-000123',
   *   epc: 'E280116060002004DECA48DA'
   * });
   * ```
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs a warning message
   *
   * @param message - The log message
   * @param context - Optional context data
   *
   * @description
   * Used for potentially harmful situations that should be reviewed.
   *
   * @example
   * ```typescript
   * logger.warn('Duplicate EPC attempted', {
   *   epc: 'E280116060002004DECA48DA'
   * });
   * ```
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs an error message
   *
   * @param message - The log message
   * @param context - Optional context data
   *
   * @description
   * Used for error events that require immediate attention.
   *
   * @example
   * ```typescript
   * logger.error('Failed to save item', {
   *   labNumber: 'FSL-2025-000123',
   *   error: error.message
   * });
   * ```
   */
  error(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs a fatal error message
   *
   * @param message - The log message
   * @param context - Optional context data
   *
   * @description
   * Used for critical errors that may cause system failure.
   * Should trigger immediate alerts.
   */
  fatal(message: string, context?: Record<string, unknown>): void;
}
