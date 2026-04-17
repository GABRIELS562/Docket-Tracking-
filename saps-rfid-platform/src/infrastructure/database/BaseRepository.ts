import { Result, ok, err } from 'neverthrow';
import { PoolClient } from 'pg';
import type { PostgresConnection } from './PostgresConnection';
import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Query Building Helper
 */
export interface WhereClause {
  sql: string;
  params: any[];
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Pagination Result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Base Repository - Common Database Operations
 *
 * @description
 * Abstract base class providing common database operations for all repositories.
 * Includes error handling, query building, and transaction support.
 *
 * **Features:**
 * - Consistent error handling across all repositories
 * - PostgreSQL-specific error code mapping
 * - Query building helpers (WHERE clauses, pagination)
 * - Transaction support with type safety
 * - Logging integration
 *
 * **PostgreSQL Error Handling:**
 * Maps PostgreSQL error codes to meaningful error messages:
 * - 23505: Unique constraint violation
 * - 23503: Foreign key violation
 * - 23502: NOT NULL violation
 * - 22P02: Invalid text representation
 * - 42P01: Undefined table
 * - And many more...
 *
 * **Usage:**
 * All concrete repository implementations should extend this class.
 *
 * @example
 * ```typescript
 * export class ItemRepository extends BaseRepository implements IItemRepository {
 *   constructor(db: PostgresConnection, logger: ILogger) {
 *     super(db, logger);
 *   }
 *
 *   async findById(id: string): Promise<Result<Item | null, Error>> {
 *     const result = await this.executeQueryOne<ItemRow>(
 *       'SELECT * FROM items WHERE id = $1',
 *       [id]
 *     );
 *
 *     if (result.isErr()) {
 *       return err(result.error);
 *     }
 *
 *     if (!result.value) {
 *       return ok(null);
 *     }
 *
 *     return ok(this.mapToDomain(result.value));
 *   }
 * }
 * ```
 */
export abstract class BaseRepository {
  constructor(protected db: PostgresConnection, protected logger: ILogger) {}

  /**
   * Handle database errors consistently
   *
   * @param error - Database error
   * @param operation - Operation name for logging
   * @returns Formatted error with meaningful message
   *
   * @description
   * Maps PostgreSQL error codes to user-friendly error messages.
   *
   * **Common Error Codes:**
   * - **23505** - unique_violation: Duplicate key value
   * - **23503** - foreign_key_violation: Referenced record doesn't exist
   * - **23502** - not_null_violation: Required field is NULL
   * - **22P02** - invalid_text_representation: Invalid data type
   * - **42P01** - undefined_table: Table doesn't exist
   * - **42703** - undefined_column: Column doesn't exist
   * - **42601** - syntax_error: SQL syntax error
   * - **42501** - insufficient_privilege: Permission denied
   * - **40001** - serialization_failure: Transaction conflict
   * - **40P01** - deadlock_detected: Deadlock
   * - **57014** - query_canceled: Query timeout
   *
   * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
   */
  protected handleDbError(error: any, operation: string): Error {
    // Check if error has PostgreSQL error code
    if (error.code) {
      const code = error.code;

      this.logger.error(`Database error in ${operation}`, {
        code,
        message: error.message,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        table: error.table,
        column: error.column,
        constraint: error.constraint,
      });

      // Map error codes to meaningful messages
      switch (code) {
        // Class 23 - Integrity Constraint Violation
        case '23505': // unique_violation
          return new Error(
            `Duplicate entry: ${error.detail || error.message}. ` +
              `Constraint: ${error.constraint || 'unknown'}`
          );

        case '23503': // foreign_key_violation
          return new Error(
            `Foreign key violation: ${error.detail || error.message}. ` +
              `Constraint: ${error.constraint || 'unknown'}`
          );

        case '23502': // not_null_violation
          return new Error(
            `Required field missing: ${error.column || 'unknown'}. ` +
              `Table: ${error.table || 'unknown'}`
          );

        case '23514': // check_violation
          return new Error(
            `Check constraint violation: ${error.detail || error.message}. ` +
              `Constraint: ${error.constraint || 'unknown'}`
          );

        // Class 22 - Data Exception
        case '22P02': // invalid_text_representation
          return new Error(`Invalid data format: ${error.message}`);

        case '22001': // string_data_right_truncation
          return new Error(`Value too long for column: ${error.column || 'unknown'}`);

        case '22003': // numeric_value_out_of_range
          return new Error(`Numeric value out of range: ${error.message}`);

        case '22007': // invalid_datetime_format
          return new Error(`Invalid date/time format: ${error.message}`);

        case '22008': // datetime_field_overflow
          return new Error(`Date/time value out of range: ${error.message}`);

        // Class 42 - Syntax Error or Access Rule Violation
        case '42P01': // undefined_table
          return new Error(
            `Table not found: ${error.message}. ` + `Check your database schema.`
          );

        case '42703': // undefined_column
          return new Error(
            `Column not found: ${error.message}. ` + `Check your query or schema.`
          );

        case '42601': // syntax_error
          return new Error(`SQL syntax error: ${error.message}`);

        case '42501': // insufficient_privilege
          return new Error(
            `Permission denied: ${error.message}. ` +
              `Check database user permissions.`
          );

        case '42P07': // duplicate_table
          return new Error(`Table already exists: ${error.message}`);

        case '42704': // undefined_object
          return new Error(`Database object not found: ${error.message}`);

        // Class 40 - Transaction Rollback
        case '40001': // serialization_failure
          return new Error(
            `Transaction conflict (serialization failure): ${error.message}. ` +
              `Retry the transaction.`
          );

        case '40P01': // deadlock_detected
          return new Error(
            `Deadlock detected: ${error.message}. ` + `Retry the transaction.`
          );

        // Class 57 - Operator Intervention
        case '57014': // query_canceled
          return new Error(`Query canceled (timeout): ${error.message}`);

        case '57P01': // admin_shutdown
          return new Error(`Database is shutting down: ${error.message}`);

        case '57P03': // cannot_connect_now
          return new Error(
            `Cannot connect to database: ${error.message}. ` +
              `Database may be starting up.`
          );

        // Class 08 - Connection Exception
        case '08000': // connection_exception
          return new Error(`Connection error: ${error.message}`);

        case '08003': // connection_does_not_exist
          return new Error(`Connection does not exist: ${error.message}`);

        case '08006': // connection_failure
          return new Error(`Connection failure: ${error.message}`);

        case '08P01': // protocol_violation
          return new Error(`Protocol violation: ${error.message}`);

        // Class 53 - Insufficient Resources
        case '53000': // insufficient_resources
          return new Error(
            `Insufficient resources: ${error.message}. ` +
              `Database may be overloaded.`
          );

        case '53100': // disk_full
          return new Error(`Disk full: ${error.message}`);

        case '53200': // out_of_memory
          return new Error(`Out of memory: ${error.message}`);

        case '53300': // too_many_connections
          return new Error(
            `Too many connections: ${error.message}. ` + `Connection pool exhausted.`
          );

        // Class 54 - Program Limit Exceeded
        case '54000': // program_limit_exceeded
          return new Error(`Program limit exceeded: ${error.message}`);

        case '54001': // statement_too_complex
          return new Error(`Statement too complex: ${error.message}`);

        default:
          return new Error(
            `Database error (${code}): ${error.message}. ` +
              `See PostgreSQL documentation for error code details.`
          );
      }
    }

    // Non-PostgreSQL error or error without code
    this.logger.error(`Unexpected error in ${operation}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return error instanceof Error
      ? error
      : new Error(`Unexpected error in ${operation}: ${String(error)}`);
  }

  /**
   * Execute query with error handling
   *
   * @param sql - SQL query
   * @param params - Query parameters
   * @returns Result containing rows or error
   *
   * @description
   * Wrapper around db.query() with consistent error handling.
   */
  protected async executeQuery<T>(
    sql: string,
    params?: any[]
  ): Promise<Result<T[], Error>> {
    const result = await this.db.query<T>(sql, params);

    if (result.isErr()) {
      return err(this.handleDbError(result.error, 'executeQuery'));
    }

    return result;
  }

  /**
   * Execute query expecting single row
   *
   * @param sql - SQL query
   * @param params - Query parameters
   * @returns Result containing single row or null
   *
   * @description
   * Wrapper around db.queryOne() with consistent error handling.
   */
  protected async executeQueryOne<T>(
    sql: string,
    params?: any[]
  ): Promise<Result<T | null, Error>> {
    const result = await this.db.queryOne<T>(sql, params);

    if (result.isErr()) {
      return err(this.handleDbError(result.error, 'executeQueryOne'));
    }

    return result;
  }

  /**
   * Execute transaction with error handling
   *
   * @param fn - Transaction function
   * @returns Result from transaction
   *
   * @description
   * Wrapper around db.transaction() with consistent error handling.
   */
  protected async executeTransaction<T>(
    fn: (client: PoolClient) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    const result = await this.db.transaction(fn);

    if (result.isErr()) {
      return err(this.handleDbError(result.error, 'transaction'));
    }

    return result;
  }

  /**
   * Build WHERE clause from criteria
   *
   * @param criteria - Object with field-value pairs
   * @param startIndex - Starting parameter index (default 1)
   * @returns WHERE clause SQL and parameters
   *
   * @description
   * Builds a parameterized WHERE clause from an object.
   * Handles NULL values and undefined values correctly.
   *
   * @example
   * ```typescript
   * const criteria = { status: 'active', zone_id: 'zone-001' };
   * const where = this.buildWhereClause(criteria);
   * // Returns: { sql: 'WHERE status = $1 AND zone_id = $2', params: ['active', 'zone-001'] }
   *
   * const sql = `SELECT * FROM items ${where.sql}`;
   * const result = await this.executeQuery(sql, where.params);
   * ```
   */
  protected buildWhereClause(
    criteria: Record<string, any>,
    startIndex: number = 1
  ): WhereClause {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = startIndex;

    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        if (value === null) {
          // Handle NULL values
          conditions.push(`${key} IS NULL`);
        } else {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
    }

    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { sql, params };
  }

  /**
   * Build WHERE clause with LIKE operator
   *
   * @param field - Field name
   * @param value - Search value
   * @param paramIndex - Parameter index
   * @returns WHERE clause part
   *
   * @description
   * Builds a LIKE clause for partial string matching.
   *
   * @example
   * ```typescript
   * const condition = this.buildLikeClause('item_number', 'INV', 1);
   * // Returns: { sql: 'item_number LIKE $1', params: ['%INV%'] }
   * ```
   */
  protected buildLikeClause(
    field: string,
    value: string,
    paramIndex: number
  ): WhereClause {
    return {
      sql: `${field} LIKE $${paramIndex}`,
      params: [`%${value}%`],
    };
  }

  /**
   * Build WHERE clause with IN operator
   *
   * @param field - Field name
   * @param values - Array of values
   * @param startIndex - Starting parameter index
   * @returns WHERE clause part
   *
   * @description
   * Builds an IN clause for matching against multiple values.
   *
   * @example
   * ```typescript
   * const condition = this.buildInClause('status', ['active', 'pending'], 1);
   * // Returns: { sql: 'status IN ($1, $2)', params: ['active', 'pending'] }
   * ```
   */
  protected buildInClause(
    field: string,
    values: any[],
    startIndex: number = 1
  ): WhereClause {
    if (values.length === 0) {
      return { sql: '1=0', params: [] }; // No match
    }

    const placeholders = values.map((_, i) => `$${startIndex + i}`).join(', ');

    return {
      sql: `${field} IN (${placeholders})`,
      params: values,
    };
  }

  /**
   * Build ORDER BY clause
   *
   * @param field - Field to sort by
   * @param direction - Sort direction (ASC or DESC)
   * @returns ORDER BY clause SQL
   *
   * @example
   * ```typescript
   * const orderBy = this.buildOrderByClause('created_at', 'DESC');
   * // Returns: 'ORDER BY created_at DESC'
   * ```
   */
  protected buildOrderByClause(
    field: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): string {
    return `ORDER BY ${field} ${direction}`;
  }

  /**
   * Build pagination clause
   *
   * @param options - Pagination options
   * @returns LIMIT and OFFSET clause
   *
   * @description
   * Builds LIMIT and OFFSET for pagination.
   *
   * @example
   * ```typescript
   * const pagination = this.buildPaginationClause({ page: 2, pageSize: 20 });
   * // Returns: 'LIMIT 20 OFFSET 20'
   * ```
   */
  protected buildPaginationClause(options: PaginationOptions): string {
    const offset = (options.page - 1) * options.pageSize;
    return `LIMIT ${options.pageSize} OFFSET ${offset}`;
  }

  /**
   * Execute paginated query
   *
   * @param sql - Base SQL query (without LIMIT/OFFSET)
   * @param countSql - SQL to count total rows
   * @param params - Query parameters
   * @param options - Pagination options
   * @returns Paginated result
   *
   * @description
   * Executes a query with pagination and returns results with metadata.
   *
   * @example
   * ```typescript
   * const result = await this.executePaginatedQuery<ItemRow>(
   *   'SELECT * FROM items WHERE status = $1 ORDER BY created_at DESC',
   *   'SELECT COUNT(*) FROM items WHERE status = $1',
   *   ['active'],
   *   { page: 1, pageSize: 20 }
   * );
   *
   * if (result.isOk()) {
   *   const { data, total, totalPages } = result.value;
   *   console.log(`Page 1 of ${totalPages}: ${data.length} items`);
   * }
   * ```
   */
  protected async executePaginatedQuery<T>(
    sql: string,
    countSql: string,
    params: any[],
    options: PaginationOptions
  ): Promise<Result<PaginatedResult<T>, Error>> {
    try {
      // Get total count
      const countResult = await this.executeQueryOne<{ count: string }>(
        countSql,
        params
      );

      if (countResult.isErr()) {
        return err(countResult.error);
      }

      const total = parseInt(countResult.value?.count || '0', 10);

      // Execute paginated query
      const paginationClause = this.buildPaginationClause(options);
      const dataResult = await this.executeQuery<T>(`${sql} ${paginationClause}`, params);

      if (dataResult.isErr()) {
        return err(dataResult.error);
      }

      const totalPages = Math.ceil(total / options.pageSize);

      return ok({
        data: dataResult.value,
        total,
        page: options.page,
        pageSize: options.pageSize,
        totalPages,
      });
    } catch (error) {
      return err(this.handleDbError(error, 'executePaginatedQuery'));
    }
  }

  /**
   * Check if record exists
   *
   * @param table - Table name
   * @param criteria - Search criteria
   * @returns True if record exists
   *
   * @example
   * ```typescript
   * const exists = await this.exists('items', { id: 'item-123' });
   * if (exists.isOk() && exists.value) {
   *   console.log('Item exists');
   * }
   * ```
   */
  protected async exists(
    table: string,
    criteria: Record<string, any>
  ): Promise<Result<boolean, Error>> {
    const where = this.buildWhereClause(criteria);

    const result = await this.executeQueryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ${table} ${where.sql}) as exists`,
      where.params
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value?.exists || false);
  }

  /**
   * Get count of records
   *
   * @param table - Table name
   * @param criteria - Search criteria (optional)
   * @returns Record count
   *
   * @example
   * ```typescript
   * const count = await this.count('items', { status: 'active' });
   * if (count.isOk()) {
   *   console.log(`Active items: ${count.value}`);
   * }
   * ```
   */
  protected async count(
    table: string,
    criteria?: Record<string, any>
  ): Promise<Result<number, Error>> {
    const where = criteria ? this.buildWhereClause(criteria) : { sql: '', params: [] };

    const result = await this.executeQueryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table} ${where.sql}`,
      where.params
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value?.count || '0', 10));
  }
}
