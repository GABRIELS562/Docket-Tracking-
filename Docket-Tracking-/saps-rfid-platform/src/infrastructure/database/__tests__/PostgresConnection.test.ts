import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { Pool, PoolClient } from 'pg';

/**
 * PostgresConnection Unit Tests
 *
 * @description
 * Tests for PostgreSQL connection pool manager covering:
 * - Pool initialization and configuration
 * - TimescaleDB extension verification
 * - Query execution with performance monitoring
 * - Transaction support with rollback
 * - Error handling and recovery
 * - Pool statistics and health checks
 * - Graceful shutdown
 */

// Mock pg module
vi.mock('pg', () => {
  const mockPool = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  };

  return {
    Pool: vi.fn(() => mockPool),
  };
});

describe('PostgresConnection', () => {
  let connection: PostgresConnection;
  let mockLogger: ILogger;
  let mockPool: any;
  let mockClient: PoolClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILogger;

    // Mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    } as unknown as PoolClient;

    // Get mock pool instance
    const PoolConstructor = Pool as any;
    connection = new PostgresConnection(
      {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 20,
        queryTimeout: 10000,
      },
      mockLogger
    );

    mockPool = connection.getPool();
  });

  afterEach(async () => {
    if (connection.isReady()) {
      await connection.close();
    }
  });

  describe('Initialization', () => {
    it('should create connection pool with default configuration', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PostgreSQL connection pool created',
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          maxConnections: 20,
        })
      );
    });

    it('should initialize and verify PostgreSQL connection', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({
          rows: [{ version: 'PostgreSQL 14.5' }],
        })
        .mockResolvedValueOnce({
          rows: [{ extname: 'timescaledb', extversion: '2.8.0' }],
        })
        .mockResolvedValueOnce({ rows: [] }); // SET timezone

      const result = await connection.initialize();

      expect(result.isOk()).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT version()');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT extname, extversion')
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(connection.isReady()).toBe(true);
    });

    it('should fail initialization if TimescaleDB extension not found', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({
          rows: [{ version: 'PostgreSQL 14.5' }],
        })
        .mockResolvedValueOnce({
          rows: [], // No TimescaleDB extension
        });

      const result = await connection.initialize();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('TimescaleDB extension not found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await connection.initialize();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Connection refused');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database initialization failed',
        expect.any(Object)
      );
    });

    it('should not reinitialize if already initialized', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      const result = await connection.initialize();

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith('Database already initialized');
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      // Initialize connection first
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();
      vi.clearAllMocks();
    });

    it('should execute query successfully', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      });

      const result = await connection.query('SELECT * FROM test WHERE id = $1', [1]);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([{ id: 1, name: 'Test' }]);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
    });

    it('should execute parameterized query', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await connection.query(
        'SELECT * FROM dockets WHERE status = $1 AND zone_id = $2',
        ['active', 'zone-001']
      );

      expect(result.isOk()).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM dockets WHERE status = $1 AND zone_id = $2',
        ['active', 'zone-001']
      );
    });

    it('should detect and log slow queries', async () => {
      mockPool.query.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ rows: [{ id: 1 }], rowCount: 1 });
            }, 150); // Slower than threshold (100ms)
          })
      );

      await connection.query('SELECT * FROM large_table');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });

    it('should handle query errors', async () => {
      const queryError = new Error('Query execution failed');
      mockPool.query.mockRejectedValue(queryError);

      const result = await connection.query('SELECT * FROM invalid_table');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(queryError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Query execution failed',
        expect.any(Object)
      );
    });

    it('should execute queryOne and return single row', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      });

      const result = await connection.queryOne('SELECT * FROM test WHERE id = $1', [1]);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ id: 1, name: 'Test' });
    });

    it('should return null when queryOne finds no results', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await connection.queryOne('SELECT * FROM test WHERE id = $1', [999]);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();
      vi.clearAllMocks();

      mockPool.connect.mockResolvedValue(mockClient);
    });

    it('should execute transaction successfully', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // User query 1
        .mockResolvedValueOnce({ rows: [] }) // User query 2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await connection.transaction(async (client) => {
        await client.query('UPDATE test SET value = 1');
        await client.query('INSERT INTO audit (action) VALUES ($1)', ['update']);
        return { isOk: () => true, value: true, isErr: () => false } as any;
      });

      expect(result.isOk()).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const result = await connection.transaction(async (client) => {
        return { isOk: () => false, isErr: () => true, error: new Error('Failed') } as any;
      });

      expect(result.isErr()).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on exception in transaction', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const result = await connection.transaction(async (client) => {
        throw new Error('Transaction error');
      });

      expect(result.isErr()).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should always release client even if rollback fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK fails

      const result = await connection.transaction(async (client) => {
        throw new Error('Transaction error');
      });

      expect(result.isErr()).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rollback failed',
        expect.any(Object)
      );
    });
  });

  describe('Pool Statistics', () => {
    it('should return pool statistics', () => {
      const stats = connection.getStats();

      expect(stats).toEqual({
        total: 5,
        idle: 3,
        waiting: 0,
        initialized: false, // Not initialized yet
      });
    });

    it('should track query statistics', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      // Execute some queries
      await connection.query('SELECT 1');
      await connection.query('SELECT 2');
      await connection.query('SELECT 3');

      const queryStats = connection.getQueryStats();

      expect(queryStats.totalQueries).toBe(3);
      expect(queryStats.errors).toBe(0);
    });

    it('should track error rate in query statistics', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockRejectedValueOnce(new Error('Query error'))
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await connection.query('SELECT 1');
      await connection.query('SELECT 2'); // Error
      await connection.query('SELECT 3');

      const queryStats = connection.getQueryStats();

      expect(queryStats.totalQueries).toBe(3);
      expect(queryStats.errors).toBe(1);
      expect(queryStats.errorRate).toBe(33); // 1/3 = 33%
    });
  });

  describe('Health Check', () => {
    it('should pass health check when database is available', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ column1: 1 }], rowCount: 1 });

      const result = await connection.healthCheck();

      expect(result.isOk()).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should fail health check when database is unavailable', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      const result = await connection.healthCheck();

      expect(result.isErr()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Object)
      );
    });
  });

  describe('Pool Event Handlers', () => {
    it('should log pool events', () => {
      const pool = connection.getPool();

      // Trigger events
      const eventHandlers = (pool.on as any).mock.calls;

      expect(eventHandlers.some((call: any) => call[0] === 'connect')).toBe(true);
      expect(eventHandlers.some((call: any) => call[0] === 'acquire')).toBe(true);
      expect(eventHandlers.some((call: any) => call[0] === 'remove')).toBe(true);
      expect(eventHandlers.some((call: any) => call[0] === 'error')).toBe(true);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close connection pool gracefully', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      mockPool.end.mockResolvedValue(undefined);

      await connection.close();

      expect(mockPool.end).toHaveBeenCalled();
      expect(connection.isReady()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Database connection pool closed',
        expect.any(Object)
      );
    });

    it('should handle close when not initialized', async () => {
      await connection.close();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Database not initialized, nothing to close'
      );
    });
  });

  describe('Configuration', () => {
    it('should apply default configuration values', () => {
      const conn = new PostgresConnection(
        {
          host: 'localhost',
          database: 'test',
        },
        mockLogger
      );

      const stats = conn.getStats();
      // Defaults should be applied (max: 20, min: 2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PostgreSQL connection pool created',
        expect.objectContaining({
          maxConnections: 20,
          minConnections: 2,
        })
      );
    });

    it('should use custom configuration', () => {
      const conn = new PostgresConnection(
        {
          host: 'localhost',
          database: 'test',
          max: 50,
          min: 10,
          queryTimeout: 5000,
          slowQueryThreshold: 200,
        },
        mockLogger
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'PostgreSQL connection pool created',
        expect.objectContaining({
          maxConnections: 50,
          minConnections: 10,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query results', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await connection.query('SELECT * FROM empty_table');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([]);
    });

    it('should handle queries with no parameters', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.5' }] })
        .mockResolvedValueOnce({ rows: [{ extname: 'timescaledb', extversion: '2.8.0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await connection.initialize();

      mockPool.query.mockResolvedValue({ rows: [{ count: 5 }], rowCount: 1 });

      const result = await connection.query('SELECT COUNT(*) FROM test');

      expect(result.isOk()).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM test', undefined);
    });
  });
});
