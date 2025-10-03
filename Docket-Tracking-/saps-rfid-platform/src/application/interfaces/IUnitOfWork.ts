import type { Result } from 'neverthrow';

/**
 * Unit of Work Interface (Port in Hexagonal Architecture)
 *
 * @description
 * Defines the contract for managing database transactions.
 * This is an interface defined in the application layer; implementations
 * will be provided by the infrastructure layer.
 *
 * The Unit of Work pattern maintains a list of objects affected by a business
 * transaction and coordinates the writing out of changes and the resolution
 * of concurrency problems.
 *
 * @example
 * ```typescript
 * // Implementation will be in infrastructure layer
 * class PostgresUnitOfWork implements IUnitOfWork {
 *   async execute<T>(work: () => Promise<T>): Promise<Result<T, Error>> {
 *     // Implementation with PostgreSQL transaction
 *   }
 * }
 * ```
 */
export interface IUnitOfWork {
  /**
   * Executes work within a transaction
   *
   * @param work - The work to execute within the transaction
   * @returns Result containing the work result or error
   *
   * @description
   * All database operations within the work function are executed
   * in a single transaction. If the work function throws an error
   * or returns an error Result, the transaction is rolled back.
   *
   * @example
   * ```typescript
   * const result = await unitOfWork.execute(async () => {
   *   // All operations here are transactional
   *   await docketRepo.save(docket);
   *   await historyRepo.recordMove(move);
   *   return docket;
   * });
   *
   * if (result.isErr()) {
   *   // Transaction was rolled back
   *   console.error('Transaction failed:', result.error);
   * }
   * ```
   */
  execute<T>(work: () => Promise<T>): Promise<Result<T, Error>>;

  /**
   * Begins a new transaction
   *
   * @returns Promise that resolves when transaction is started
   *
   * @description
   * Used for manual transaction management when auto-commit
   * behavior of execute() is not suitable.
   */
  begin(): Promise<void>;

  /**
   * Commits the current transaction
   *
   * @returns Promise that resolves when transaction is committed
   */
  commit(): Promise<void>;

  /**
   * Rolls back the current transaction
   *
   * @returns Promise that resolves when transaction is rolled back
   */
  rollback(): Promise<void>;

  /**
   * Checks if a transaction is currently active
   *
   * @returns true if transaction is active
   */
  isActive(): boolean;
}
