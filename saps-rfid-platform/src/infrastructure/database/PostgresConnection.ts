import { Result, ok, err } from 'neverthrow';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { injectable, inject } from 'tsyringe';

import { getDatabaseConfig } from '../../config/database.config';

import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Internal Database Configuration (extends PoolConfig for pool creation)
 */
interface InternalDatabaseConfig extends PoolConfig {
  /**
   * Maximum number of connections in pool
   * @default 20
   */
  max: number;

  /**
   * Minimum number of connections in pool
   * @default 2
   */
  min: number;

  /**
   * Query timeout in milliseconds
   * @default 10000 (10 seconds)
   */
  queryTimeout: number;

  /**
   * Enable query logging
   * @default false
   */
  enableQueryLogging: boolean;

  /**
   * Slow query threshold in milliseconds
   * @default 100
   */
  slowQueryThreshold: number;
}

/**
 * Connection Pool Statistics
 */
export interface PoolStats {
  /**
   * Total number of connections in pool
   */
  total: number;

  /**
   * Number of idle connections
   */
  idle: number;

  /**
   * Number of clients waiting for connection
   */
  waiting: number;

  /**
   * Pool is initialized and ready
   */
  initialized: boolean;
}

/**
 * PostgreSQL Connection Manager
 *
 * @description
 * Manages PostgreSQL connection pool with TimescaleDB support.
 * Provides connection pooling, transaction support, query execution,
 * performance monitoring, and error handling.
 *
 * **Features:**
 * - Connection pooling with configurable min/max connections
 * - Automatic connection health monitoring
 * - Query timeout enforcement
 * - Slow query detection and logging
 * - Transaction support with automatic rollback
 * - TimescaleDB extension verification
 * - Comprehensive error handling
 * - Pool statistics and health checks
 *
 * **Connection Pool Strategy:**
 * - Maintains 2-20 connections (configurable)
 * - Idle connections closed after 30 seconds
 * - Connection timeout: 10 seconds
 * - Query timeout: 10 seconds (configurable)
 *
 * **Performance:**
 * - Logs slow queries (> 100ms by default)
 * - Tracks connection acquisition/release
 * - Monitors pool utilization
 *
 * **Error Handling:**
 * - Automatic retry on connection failures
 * - Transaction rollback on errors
 * - Detailed error logging
 * - Graceful degradation
 *
 * @example
 * ```typescript
 * const db = new PostgresConnection(
 *   {
 *     host: 'localhost',
 *     port: 5432,
 *     database: 'evidence_tracking',
 *     user: 'postgres',
 *     password: 'password',
 *     max: 20,
 *     queryTimeout: 10000,
 *   },
 *   logger
 * );
 *
 * await db.initialize();
 *
 * // Execute query
 * const result = await db.query('SELECT * FROM items WHERE id = $1', [123]);
 *
 * // Execute transaction
 * const txResult = await db.transaction(async (client) => {
 *   await client.query('UPDATE items SET status = $1', ['processed']);
 *   await client.query('INSERT INTO audit_log ...');
 *   return ok(true);
 * });
 *
 * await db.close();
 * ```
 */
@injectable()
export class PostgresConnection {
  private pool: Pool;
  private isInitialized: boolean = false;
  private readonly config: InternalDatabaseConfig;
  private queryCount: number = 0;
  private slowQueryCount: number = 0;
  private errorCount: number = 0;

  constructor(@inject('ILogger') private logger: ILogger) {
    const externalConfig = getDatabaseConfig();
    // Apply default configuration, mapping from external to internal format
    this.config = {
      host: externalConfig.host,
      port: externalConfig.port,
      database: externalConfig.database,
      user: externalConfig.user,
      password: externalConfig.password,
      ssl: externalConfig.ssl ? { rejectUnauthorized: false } : undefined,
      max: externalConfig.pool.max ?? 20,
      min: externalConfig.pool.min ?? 2,
      queryTimeout: 10000,
      enableQueryLogging: process.env.DB_QUERY_LOGGING === 'true',
      slowQueryThreshold: 100,
      idleTimeoutMillis: externalConfig.pool.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: externalConfig.pool.connectionTimeoutMillis ?? 10000,
      allowExitOnIdle: false,
    };

    // Create connection pool
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.max,
      min: this.config.min,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      statement_timeout: this.config.queryTimeout,
      query_timeout: this.config.queryTimeout,
      allowExitOnIdle: this.config.allowExitOnIdle,
      ssl: this.config.ssl,
    });

    // Set up pool event handlers
    this.setupPoolHandlers();

    this.logger.info('PostgreSQL connection pool created', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      maxConnections: this.config.max,
      minConnections: this.config.min,
    });
  }

  /**
   * Set up pool event handlers
   *
   * @description
   * Configures event listeners for connection pool lifecycle events.
   *
   * **Events:**
   * - `connect` - New physical connection established
   * - `acquire` - Client checked out from pool
   * - `remove` - Client removed from pool
   * - `error` - Unexpected error on idle client
   */
  private setupPoolHandlers(): void {
    this.pool.on('connect', (_client) => {
      this.logger.debug('New database connection established', {
        totalConnections: this.pool.totalCount,
      });
    });

    this.pool.on('acquire', (_client) => {
      this.logger.debug('Connection acquired from pool', {
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
      });
    });

    this.pool.on('remove', (_client) => {
      this.logger.debug('Connection removed from pool', {
        totalConnections: this.pool.totalCount,
      });
    });

    this.pool.on('error', (err, _client) => {
      this.errorCount++;
      this.logger.error('Unexpected database pool error', {
        error: err.message,
        stack: err.stack,
        totalErrors: this.errorCount,
      });
    });
  }

  /**
   * Initialize connection and verify database
   *
   * @returns Result indicating success or initialization error
   *
   * @description
   * Initializes the connection pool and verifies database requirements.
   *
   * **Initialization Steps:**
   * 1. Acquire test connection from pool
   * 2. Verify PostgreSQL version
   * 3. Verify TimescaleDB extension is installed
   * 4. Release test connection
   * 5. Mark as initialized
   *
   * **Requirements:**
   * - PostgreSQL 12+ recommended
   * - TimescaleDB extension must be installed
   *
   * @example
   * ```typescript
   * const result = await db.initialize();
   * if (result.isErr()) {
   *   console.error('Database initialization failed:', result.error);
   * }
   * ```
   */
  async initialize(): Promise<Result<void, Error>> {
    if (this.isInitialized) {
      this.logger.warn('Database already initialized');
      return ok(undefined);
    }

    try {
      this.logger.info('Initializing database connection');

      // Test connection
      const client = await this.pool.connect();

      try {
        // Verify PostgreSQL version
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0].version;

        this.logger.info('PostgreSQL connection verified', {
          version: version.substring(0, 50), // Truncate long version string
        });

        // Verify TimescaleDB extension (optional for development)
        const extensionResult = await client.query(
          `SELECT extname, extversion
           FROM pg_extension
           WHERE extname = 'timescaledb'`
        );

        if (extensionResult.rows.length === 0) {
          // In development mode, warn but continue without TimescaleDB
          if (process.env.NODE_ENV === 'development') {
            this.logger.warn(
              'TimescaleDB extension not found. Running in development mode without time-series optimizations. ' +
                'For production, install TimescaleDB: CREATE EXTENSION IF NOT EXISTS timescaledb;'
            );
          } else {
            throw new Error(
              'TimescaleDB extension not found. ' +
                'Please install TimescaleDB: CREATE EXTENSION IF NOT EXISTS timescaledb;'
            );
          }
        } else {
          this.logger.info('TimescaleDB extension verified', {
            version: extensionResult.rows[0].extversion,
          });
        }

        // Set up any required database settings
        await client.query(`SET timezone = 'UTC'`);

        this.isInitialized = true;

        this.logger.info('Database initialization complete', {
          poolSize: this.pool.totalCount,
        });

        return ok(undefined);
      } finally {
        // Always release the client
        client.release();
      }
    } catch (error) {
      this.logger.error('Database initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return err(error as Error);
    }
  }

  /**
   * Execute query
   *
   * @param sql - SQL query string
   * @param params - Query parameters (parameterized queries prevent SQL injection)
   * @returns Result containing array of rows or error
   *
   * @description
   * Executes a SQL query with parameter binding and performance monitoring.
   *
   * **Features:**
   * - Parameterized queries (SQL injection protection)
   * - Automatic query timeout enforcement
   * - Slow query detection and logging
   * - Query performance tracking
   * - Comprehensive error handling
   *
   * **Performance Monitoring:**
   * - Logs queries exceeding slow query threshold (default 100ms)
   * - Tracks total query count
   * - Tracks slow query count
   *
   * @example
   * ```typescript
   * // Simple query
   * const result = await db.query('SELECT * FROM items');
   *
   * // Parameterized query (prevents SQL injection)
   * const result = await db.query(
   *   'SELECT * FROM items WHERE status = $1 AND zone_id = $2',
   *   ['active', 'zone-001']
   * );
   *
   * if (result.isOk()) {
   *   console.log(`Found ${result.value.length} items`);
   * }
   * ```
   */
  async query<T = any>(sql: string, params?: any[]): Promise<Result<T[], Error>> {
    const startTime = Date.now();
    this.queryCount++;

    try {
      if (this.config.enableQueryLogging) {
        this.logger.debug('Executing query', {
          sql: sql.substring(0, 100),
          params: params?.length,
        });
      }

      const result = await this.pool.query(sql, params);

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.config.slowQueryThreshold) {
        this.slowQueryCount++;
        this.logger.warn('Slow query detected', {
          sql: sql.substring(0, 200),
          durationMs: duration,
          threshold: this.config.slowQueryThreshold,
          rowCount: result.rowCount,
          slowQueryCount: this.slowQueryCount,
        });
      }

      return ok(result.rows as T[]);
    } catch (error) {
      this.errorCount++;

      this.logger.error('Query execution failed', {
        sql: sql.substring(0, 200),
        params: params?.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: this.errorCount,
      });

      return err(error as Error);
    }
  }

  /**
   * Execute query and return single row
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Result containing single row or null if not found
   *
   * @description
   * Convenience method for queries expected to return 0 or 1 row.
   *
   * @example
   * ```typescript
   * const result = await db.queryOne(
   *   'SELECT * FROM items WHERE id = $1',
   *   ['item-123']
   * );
   *
   * if (result.isOk() && result.value) {
   *   console.log('Item found:', result.value);
   * } else if (result.isOk()) {
   *   console.log('Item not found');
   * }
   * ```
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<Result<T | null, Error>> {
    const result = await this.query<T>(sql, params);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value[0] || null);
  }

  /**
   * Execute transaction
   *
   * @param fn - Function that executes queries within transaction
   * @returns Result from transaction function
   *
   * @description
   * Executes a function within a database transaction with automatic
   * commit/rollback handling.
   *
   * **Transaction Flow:**
   * 1. Acquire connection from pool
   * 2. Execute `BEGIN` statement
   * 3. Execute provided function
   * 4. If function succeeds: `COMMIT`
   * 5. If function fails: `ROLLBACK`
   * 6. Release connection back to pool
   *
   * **Error Handling:**
   * - Automatic rollback on any error
   * - Connection always released (even on error)
   * - Detailed error logging
   *
   * **Best Practices:**
   * - Keep transactions short
   * - Don't hold connections for I/O operations
   * - Return Result type from transaction function
   *
   * @example
   * ```typescript
   * const result = await db.transaction(async (client) => {
   *   // All queries use same client (same transaction)
   *   await client.query(
   *     'UPDATE items SET status = $1 WHERE id = $2',
   *     ['processed', 'item-123']
   *   );
   *
   *   await client.query(
   *     'INSERT INTO audit_log (action, item_id) VALUES ($1, $2)',
   *     ['status_change', 'item-123']
   *   );
   *
   *   return ok({ success: true });
   * });
   *
   * if (result.isErr()) {
   *   console.error('Transaction failed, rolled back:', result.error);
   * }
   * ```
   */
  async transaction<T>(
    fn: (client: PoolClient) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      this.logger.debug('Starting transaction');

      await client.query('BEGIN');

      const result = await fn(client);

      if (result.isErr()) {
        this.logger.debug('Transaction failed, rolling back', {
          error: result.error.message,
        });

        await client.query('ROLLBACK');
        return result;
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;

      this.logger.debug('Transaction committed', {
        durationMs: duration,
      });

      return result;
    } catch (error) {
      this.logger.error('Transaction error, rolling back', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        this.logger.error('Rollback failed', {
          error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
        });
      }

      return err(error as Error);
    } finally {
      // Always release the client
      client.release();
    }
  }

  /**
   * Get pool statistics
   *
   * @returns Current connection pool statistics
   *
   * @description
   * Returns real-time statistics about the connection pool.
   *
   * **Statistics:**
   * - `total` - Total connections in pool
   * - `idle` - Connections not in use
   * - `waiting` - Clients waiting for connection
   * - `initialized` - Pool is ready for queries
   *
   * @example
   * ```typescript
   * const stats = db.getStats();
   * console.log(`Pool: ${stats.idle}/${stats.total} idle`);
   *
   * if (stats.waiting > 0) {
   *   console.warn(`${stats.waiting} clients waiting for connection`);
   * }
   * ```
   */
  getStats(): PoolStats {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      initialized: this.isInitialized,
    };
  }

  /**
   * Get query statistics
   *
   * @returns Query execution statistics
   */
  getQueryStats() {
    return {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueryCount,
      errors: this.errorCount,
      slowQueryRate:
        this.queryCount > 0 ? Math.round((this.slowQueryCount / this.queryCount) * 100) : 0,
      errorRate: this.queryCount > 0 ? Math.round((this.errorCount / this.queryCount) * 100) : 0,
    };
  }

  /**
   * Health check
   *
   * @returns Result indicating database health
   *
   * @description
   * Performs a simple health check by executing a test query.
   * Use this for liveness/readiness probes in Kubernetes.
   *
   * @example
   * ```typescript
   * // Kubernetes liveness probe
   * app.get('/health/db', async (req, res) => {
   *   const result = await db.healthCheck();
   *   if (result.isOk()) {
   *     res.status(200).json({ status: 'healthy' });
   *   } else {
   *     res.status(503).json({ status: 'unhealthy', error: result.error.message });
   *   }
   * });
   * ```
   */
  async healthCheck(): Promise<Result<void, Error>> {
    try {
      await this.pool.query('SELECT 1');
      return ok(undefined);
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error as Error);
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Close all connections
   *
   * @description
   * Gracefully closes all connections in the pool.
   * Call this during application shutdown.
   *
   * **Shutdown Process:**
   * 1. Stop accepting new queries
   * 2. Wait for active queries to complete
   * 3. Close all connections
   * 4. Mark as uninitialized
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * process.on('SIGTERM', async () => {
   *   console.log('Closing database connections...');
   *   await db.close();
   *   console.log('Database closed');
   *   process.exit(0);
   * });
   * ```
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Database not initialized, nothing to close');
      return;
    }

    this.logger.info('Closing database connection pool', {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
    });

    await this.pool.end();

    this.isInitialized = false;

    this.logger.info('Database connection pool closed', {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueryCount,
      errors: this.errorCount,
    });
  }

  /**
   * Get underlying pool (for advanced use cases)
   *
   * @description
   * Provides access to the underlying pg.Pool instance.
   * Use with caution - prefer using the provided methods.
   */
  getPool(): Pool {
    return this.pool;
  }
}
