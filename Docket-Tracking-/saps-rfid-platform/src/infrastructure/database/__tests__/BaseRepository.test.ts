import { BaseRepository, type WhereClause, type PaginationOptions } from '../BaseRepository';
import type { PostgresConnection } from '../PostgresConnection';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { ok, err } from 'neverthrow';

/**
 * BaseRepository Unit Tests
 *
 * @description
 * Tests for base repository functionality covering:
 * - PostgreSQL error handling (30+ error codes)
 * - Query building helpers (WHERE, LIKE, IN, ORDER BY, pagination)
 * - Paginated query execution
 * - Helper methods (exists, count)
 * - Transaction support
 * - Edge cases and error scenarios
 */

// Concrete implementation for testing
class TestRepository extends BaseRepository {
  // Expose protected methods for testing
  public testHandleDbError(error: any, operation: string): Error {
    return this.handleDbError(error, operation);
  }

  public testExecuteQuery<T>(sql: string, params?: any[]) {
    return this.executeQuery<T>(sql, params);
  }

  public testExecuteQueryOne<T>(sql: string, params?: any[]) {
    return this.executeQueryOne<T>(sql, params);
  }

  public testExecuteTransaction<T>(
    fn: (client: any) => Promise<import('neverthrow').Result<T, Error>>
  ) {
    return this.executeTransaction(fn);
  }

  public testBuildWhereClause(criteria: Record<string, any>, startIndex?: number) {
    return this.buildWhereClause(criteria, startIndex);
  }

  public testBuildLikeClause(field: string, value: string, paramIndex: number) {
    return this.buildLikeClause(field, value, paramIndex);
  }

  public testBuildInClause(field: string, values: any[], startIndex?: number) {
    return this.buildInClause(field, values, startIndex);
  }

  public testBuildOrderByClause(field: string, direction?: 'ASC' | 'DESC') {
    return this.buildOrderByClause(field, direction);
  }

  public testBuildPaginationClause(options: PaginationOptions) {
    return this.buildPaginationClause(options);
  }

  public testExecutePaginatedQuery<T>(
    sql: string,
    countSql: string,
    params: any[],
    options: PaginationOptions
  ) {
    return this.executePaginatedQuery<T>(sql, countSql, params, options);
  }

  public testExists(table: string, criteria: Record<string, any>) {
    return this.exists(table, criteria);
  }

  public testCount(table: string, criteria?: Record<string, any>) {
    return this.count(table, criteria);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockDb: PostgresConnection;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Mock PostgresConnection
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      transaction: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      getPoolStats: jest.fn(),
      healthCheck: jest.fn(),
    } as unknown as PostgresConnection;

    // Mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ILogger;

    repository = new TestRepository(mockDb, mockLogger);
  });

  describe('Error Handling - handleDbError()', () => {
    describe('Class 23 - Integrity Constraint Violations', () => {
      it('should handle 23505 - unique_violation', () => {
        const dbError = {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
          detail: 'Key (id)=(abc-123) already exists.',
          constraint: 'items_pkey',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Duplicate entry');
        expect(error.message).toContain('items_pkey');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Database error in insert',
          expect.objectContaining({
            code: '23505',
            constraint: 'items_pkey',
          })
        );
      });

      it('should handle 23503 - foreign_key_violation', () => {
        const dbError = {
          code: '23503',
          message: 'foreign key constraint violated',
          detail: 'Key (zone_id)=(zone-999) is not present in table "zones".',
          constraint: 'items_zone_id_fkey',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Foreign key violation');
        expect(error.message).toContain('items_zone_id_fkey');
      });

      it('should handle 23502 - not_null_violation', () => {
        const dbError = {
          code: '23502',
          message: 'null value in column violates not-null constraint',
          column: 'item_number',
          table: 'items',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Required field missing');
        expect(error.message).toContain('item_number');
        expect(error.message).toContain('items');
      });

      it('should handle 23514 - check_violation', () => {
        const dbError = {
          code: '23514',
          message: 'check constraint violated',
          detail: 'Check constraint "valid_status" failed.',
          constraint: 'valid_status',
        };

        const error = repository.testHandleDbError(dbError, 'update');

        expect(error.message).toContain('Check constraint violation');
        expect(error.message).toContain('valid_status');
      });
    });

    describe('Class 22 - Data Exceptions', () => {
      it('should handle 22P02 - invalid_text_representation', () => {
        const dbError = {
          code: '22P02',
          message: 'invalid input syntax for type uuid',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Invalid data format');
      });

      it('should handle 22001 - string_data_right_truncation', () => {
        const dbError = {
          code: '22001',
          message: 'value too long for type character varying(50)',
          column: 'item_number',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Value too long for column');
        expect(error.message).toContain('item_number');
      });

      it('should handle 22003 - numeric_value_out_of_range', () => {
        const dbError = {
          code: '22003',
          message: 'integer out of range',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Numeric value out of range');
      });

      it('should handle 22007 - invalid_datetime_format', () => {
        const dbError = {
          code: '22007',
          message: 'invalid datetime format',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Invalid date/time format');
      });

      it('should handle 22008 - datetime_field_overflow', () => {
        const dbError = {
          code: '22008',
          message: 'timestamp out of range',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Date/time value out of range');
      });
    });

    describe('Class 42 - Syntax Error or Access Rule Violations', () => {
      it('should handle 42P01 - undefined_table', () => {
        const dbError = {
          code: '42P01',
          message: 'relation "non_existent_table" does not exist',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Table not found');
        expect(error.message).toContain('Check your database schema');
      });

      it('should handle 42703 - undefined_column', () => {
        const dbError = {
          code: '42703',
          message: 'column "invalid_column" does not exist',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Column not found');
        expect(error.message).toContain('Check your query or schema');
      });

      it('should handle 42601 - syntax_error', () => {
        const dbError = {
          code: '42601',
          message: 'syntax error at or near "SELCT"',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('SQL syntax error');
      });

      it('should handle 42501 - insufficient_privilege', () => {
        const dbError = {
          code: '42501',
          message: 'permission denied for table items',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Permission denied');
        expect(error.message).toContain('Check database user permissions');
      });

      it('should handle 42P07 - duplicate_table', () => {
        const dbError = {
          code: '42P07',
          message: 'relation "items" already exists',
        };

        const error = repository.testHandleDbError(dbError, 'create');

        expect(error.message).toContain('Table already exists');
      });

      it('should handle 42704 - undefined_object', () => {
        const dbError = {
          code: '42704',
          message: 'type "custom_type" does not exist',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Database object not found');
      });
    });

    describe('Class 40 - Transaction Rollback', () => {
      it('should handle 40001 - serialization_failure', () => {
        const dbError = {
          code: '40001',
          message: 'could not serialize access due to concurrent update',
        };

        const error = repository.testHandleDbError(dbError, 'transaction');

        expect(error.message).toContain('Transaction conflict');
        expect(error.message).toContain('serialization failure');
        expect(error.message).toContain('Retry the transaction');
      });

      it('should handle 40P01 - deadlock_detected', () => {
        const dbError = {
          code: '40P01',
          message: 'deadlock detected',
        };

        const error = repository.testHandleDbError(dbError, 'transaction');

        expect(error.message).toContain('Deadlock detected');
        expect(error.message).toContain('Retry the transaction');
      });
    });

    describe('Class 57 - Operator Intervention', () => {
      it('should handle 57014 - query_canceled', () => {
        const dbError = {
          code: '57014',
          message: 'canceling statement due to statement timeout',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Query canceled (timeout)');
      });

      it('should handle 57P01 - admin_shutdown', () => {
        const dbError = {
          code: '57P01',
          message: 'the database system is shutting down',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Database is shutting down');
      });

      it('should handle 57P03 - cannot_connect_now', () => {
        const dbError = {
          code: '57P03',
          message: 'the database system is starting up',
        };

        const error = repository.testHandleDbError(dbError, 'connect');

        expect(error.message).toContain('Cannot connect to database');
        expect(error.message).toContain('Database may be starting up');
      });
    });

    describe('Class 08 - Connection Exceptions', () => {
      it('should handle 08000 - connection_exception', () => {
        const dbError = {
          code: '08000',
          message: 'connection error',
        };

        const error = repository.testHandleDbError(dbError, 'connect');

        expect(error.message).toContain('Connection error');
      });

      it('should handle 08003 - connection_does_not_exist', () => {
        const dbError = {
          code: '08003',
          message: 'connection does not exist',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Connection does not exist');
      });

      it('should handle 08006 - connection_failure', () => {
        const dbError = {
          code: '08006',
          message: 'connection failure',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Connection failure');
      });

      it('should handle 08P01 - protocol_violation', () => {
        const dbError = {
          code: '08P01',
          message: 'protocol violation',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Protocol violation');
      });
    });

    describe('Class 53 - Insufficient Resources', () => {
      it('should handle 53000 - insufficient_resources', () => {
        const dbError = {
          code: '53000',
          message: 'insufficient resources',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Insufficient resources');
        expect(error.message).toContain('Database may be overloaded');
      });

      it('should handle 53100 - disk_full', () => {
        const dbError = {
          code: '53100',
          message: 'disk full',
        };

        const error = repository.testHandleDbError(dbError, 'insert');

        expect(error.message).toContain('Disk full');
      });

      it('should handle 53200 - out_of_memory', () => {
        const dbError = {
          code: '53200',
          message: 'out of memory',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Out of memory');
      });

      it('should handle 53300 - too_many_connections', () => {
        const dbError = {
          code: '53300',
          message: 'sorry, too many clients already',
        };

        const error = repository.testHandleDbError(dbError, 'connect');

        expect(error.message).toContain('Too many connections');
        expect(error.message).toContain('Connection pool exhausted');
      });
    });

    describe('Class 54 - Program Limit Exceeded', () => {
      it('should handle 54000 - program_limit_exceeded', () => {
        const dbError = {
          code: '54000',
          message: 'program limit exceeded',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Program limit exceeded');
      });

      it('should handle 54001 - statement_too_complex', () => {
        const dbError = {
          code: '54001',
          message: 'statement too complex',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Statement too complex');
      });
    });

    describe('Unknown Error Codes', () => {
      it('should handle unknown error code with generic message', () => {
        const dbError = {
          code: '99999',
          message: 'unknown error',
        };

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Database error (99999)');
        expect(error.message).toContain('unknown error');
        expect(error.message).toContain('PostgreSQL documentation');
      });

      it('should handle error without code', () => {
        const dbError = new Error('Generic error without code');

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Generic error without code');
      });

      it('should handle non-Error objects', () => {
        const dbError = 'String error';

        const error = repository.testHandleDbError(dbError, 'query');

        expect(error.message).toContain('Unexpected error in query');
        expect(error.message).toContain('String error');
      });
    });
  });

  describe('Query Building - buildWhereClause()', () => {
    it('should build WHERE clause with single condition', () => {
      const criteria = { status: 'active' };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1');
      expect(result.params).toEqual(['active']);
    });

    it('should build WHERE clause with multiple conditions', () => {
      const criteria = {
        status: 'active',
        zone_id: 'zone-001',
        item_number: 'INV-123',
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1 AND zone_id = $2 AND item_number = $3');
      expect(result.params).toEqual(['active', 'zone-001', 'INV-123']);
    });

    it('should handle NULL values correctly', () => {
      const criteria = {
        status: 'active',
        deleted_at: null,
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1 AND deleted_at IS NULL');
      expect(result.params).toEqual(['active']);
    });

    it('should ignore undefined values', () => {
      const criteria = {
        status: 'active',
        zone_id: undefined,
        item_number: 'INV-123',
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1 AND item_number = $2');
      expect(result.params).toEqual(['active', 'INV-123']);
    });

    it('should return empty WHERE clause for empty criteria', () => {
      const criteria = {};

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should return empty WHERE clause for all undefined values', () => {
      const criteria = {
        status: undefined,
        zone_id: undefined,
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should use custom starting index', () => {
      const criteria = {
        status: 'active',
        zone_id: 'zone-001',
      };

      const result = repository.testBuildWhereClause(criteria, 3);

      expect(result.sql).toBe('WHERE status = $3 AND zone_id = $4');
      expect(result.params).toEqual(['active', 'zone-001']);
    });

    it('should handle mixed NULL and undefined values', () => {
      const criteria = {
        status: 'active',
        deleted_at: null,
        archived_at: undefined,
        zone_id: 'zone-001',
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1 AND deleted_at IS NULL AND zone_id = $2');
      expect(result.params).toEqual(['active', 'zone-001']);
    });
  });

  describe('Query Building - buildLikeClause()', () => {
    it('should build LIKE clause with wildcards', () => {
      const result = repository.testBuildLikeClause('item_number', 'INV', 1);

      expect(result.sql).toBe('item_number LIKE $1');
      expect(result.params).toEqual(['%INV%']);
    });

    it('should use custom parameter index', () => {
      const result = repository.testBuildLikeClause('description', 'inventory', 5);

      expect(result.sql).toBe('description LIKE $5');
      expect(result.params).toEqual(['%inventory%']);
    });

    it('should handle empty search value', () => {
      const result = repository.testBuildLikeClause('name', '', 1);

      expect(result.sql).toBe('name LIKE $1');
      expect(result.params).toEqual(['%%']);
    });
  });

  describe('Query Building - buildInClause()', () => {
    it('should build IN clause with multiple values', () => {
      const values = ['active', 'pending', 'completed'];

      const result = repository.testBuildInClause('status', values);

      expect(result.sql).toBe('status IN ($1, $2, $3)');
      expect(result.params).toEqual(['active', 'pending', 'completed']);
    });

    it('should build IN clause with single value', () => {
      const values = ['active'];

      const result = repository.testBuildInClause('status', values);

      expect(result.sql).toBe('status IN ($1)');
      expect(result.params).toEqual(['active']);
    });

    it('should handle empty array with no-match condition', () => {
      const values: string[] = [];

      const result = repository.testBuildInClause('status', values);

      expect(result.sql).toBe('1=0'); // No match
      expect(result.params).toEqual([]);
    });

    it('should use custom starting index', () => {
      const values = ['zone-001', 'zone-002'];

      const result = repository.testBuildInClause('zone_id', values, 3);

      expect(result.sql).toBe('zone_id IN ($3, $4)');
      expect(result.params).toEqual(['zone-001', 'zone-002']);
    });

    it('should handle numeric values', () => {
      const values = [1, 2, 3, 4, 5];

      const result = repository.testBuildInClause('id', values);

      expect(result.sql).toBe('id IN ($1, $2, $3, $4, $5)');
      expect(result.params).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Query Building - buildOrderByClause()', () => {
    it('should build ORDER BY clause with ASC direction', () => {
      const result = repository.testBuildOrderByClause('created_at', 'ASC');

      expect(result).toBe('ORDER BY created_at ASC');
    });

    it('should build ORDER BY clause with DESC direction', () => {
      const result = repository.testBuildOrderByClause('created_at', 'DESC');

      expect(result).toBe('ORDER BY created_at DESC');
    });

    it('should default to ASC direction', () => {
      const result = repository.testBuildOrderByClause('name');

      expect(result).toBe('ORDER BY name ASC');
    });
  });

  describe('Query Building - buildPaginationClause()', () => {
    it('should build pagination clause for first page', () => {
      const result = repository.testBuildPaginationClause({ page: 1, pageSize: 20 });

      expect(result).toBe('LIMIT 20 OFFSET 0');
    });

    it('should build pagination clause for second page', () => {
      const result = repository.testBuildPaginationClause({ page: 2, pageSize: 20 });

      expect(result).toBe('LIMIT 20 OFFSET 20');
    });

    it('should build pagination clause for custom page size', () => {
      const result = repository.testBuildPaginationClause({ page: 3, pageSize: 50 });

      expect(result).toBe('LIMIT 50 OFFSET 100');
    });

    it('should build pagination clause for large offset', () => {
      const result = repository.testBuildPaginationClause({ page: 100, pageSize: 25 });

      expect(result).toBe('LIMIT 25 OFFSET 2475');
    });
  });

  describe('Query Execution - executeQuery()', () => {
    it('should execute query successfully', async () => {
      const mockRows = [
        { id: 'item-001', item_number: 'INV-001' },
        { id: 'item-002', item_number: 'INV-002' },
      ];

      jest.mocked(mockDb.query).mockResolvedValue(ok(mockRows));

      const result = await repository.testExecuteQuery<any>(
        'SELECT * FROM items WHERE status = $1',
        ['active']
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockRows);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM items WHERE status = $1', [
        'active',
      ]);
    });

    it('should handle query errors with error mapping', async () => {
      const dbError = {
        code: '42P01',
        message: 'relation "items" does not exist',
      };

      jest.mocked(mockDb.query).mockResolvedValue(err(dbError as any));

      const result = await repository.testExecuteQuery<any>('SELECT * FROM items');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Table not found');
    });
  });

  describe('Query Execution - executeQueryOne()', () => {
    it('should execute query for single row successfully', async () => {
      const mockRow = { id: 'item-001', item_number: 'INV-001' };

      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(mockRow));

      const result = await repository.testExecuteQueryOne<any>(
        'SELECT * FROM items WHERE id = $1',
        ['item-001']
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockRow);
    });

    it('should handle null result for non-existent record', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const result = await repository.testExecuteQueryOne<any>(
        'SELECT * FROM items WHERE id = $1',
        ['non-existent']
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it('should handle query errors with error mapping', async () => {
      const dbError = {
        code: '42703',
        message: 'column "invalid_column" does not exist',
      };

      jest.mocked(mockDb.queryOne).mockResolvedValue(err(dbError as any));

      const result = await repository.testExecuteQueryOne<any>(
        'SELECT invalid_column FROM items'
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Column not found');
    });
  });

  describe('Transaction Execution - executeTransaction()', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = { id: 'item-001' };

      jest.mocked(mockDb.transaction).mockResolvedValue(ok(mockResult));

      const result = await repository.testExecuteTransaction(async (client) => {
        return ok(mockResult);
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockResult);
    });

    it('should handle transaction errors with error mapping', async () => {
      const dbError = {
        code: '40001',
        message: 'could not serialize access due to concurrent update',
      };

      jest.mocked(mockDb.transaction).mockResolvedValue(err(dbError as any));

      const result = await repository.testExecuteTransaction(async (client) => {
        return ok({ id: 'test' });
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Transaction conflict');
      expect(result._unsafeUnwrapErr().message).toContain('Retry the transaction');
    });
  });

  describe('Pagination - executePaginatedQuery()', () => {
    it('should execute paginated query successfully', async () => {
      const mockData = [
        { id: 'item-001', item_number: 'INV-001' },
        { id: 'item-002', item_number: 'INV-002' },
      ];

      // Mock count query
      jest.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(ok({ count: '50' }))
        .mockResolvedValue(ok(null));

      // Mock data query
      jest.mocked(mockDb.query).mockResolvedValue(ok(mockData));

      const result = await repository.testExecutePaginatedQuery<any>(
        'SELECT * FROM items WHERE status = $1 ORDER BY created_at DESC',
        'SELECT COUNT(*) FROM items WHERE status = $1',
        ['active'],
        { page: 1, pageSize: 20 }
      );

      expect(result.isOk()).toBe(true);

      const paginatedResult = result._unsafeUnwrap();
      expect(paginatedResult.data).toEqual(mockData);
      expect(paginatedResult.total).toBe(50);
      expect(paginatedResult.page).toBe(1);
      expect(paginatedResult.pageSize).toBe(20);
      expect(paginatedResult.totalPages).toBe(3); // Math.ceil(50 / 20)
    });

    it('should handle empty results', async () => {
      // Mock count query
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '0' }));

      // Mock data query
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.testExecutePaginatedQuery<any>(
        'SELECT * FROM items WHERE status = $1',
        'SELECT COUNT(*) FROM items WHERE status = $1',
        ['inactive'],
        { page: 1, pageSize: 20 }
      );

      expect(result.isOk()).toBe(true);

      const paginatedResult = result._unsafeUnwrap();
      expect(paginatedResult.data).toEqual([]);
      expect(paginatedResult.total).toBe(0);
      expect(paginatedResult.totalPages).toBe(0);
    });

    it('should calculate total pages correctly', async () => {
      // Mock count query
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '47' }));

      // Mock data query
      jest.mocked(mockDb.query).mockResolvedValue(ok([]));

      const result = await repository.testExecutePaginatedQuery<any>(
        'SELECT * FROM items',
        'SELECT COUNT(*) FROM items',
        [],
        { page: 1, pageSize: 10 }
      );

      expect(result.isOk()).toBe(true);

      const paginatedResult = result._unsafeUnwrap();
      expect(paginatedResult.total).toBe(47);
      expect(paginatedResult.totalPages).toBe(5); // Math.ceil(47 / 10)
    });

    it('should handle count query error', async () => {
      const dbError = {
        code: '42P01',
        message: 'relation "items" does not exist',
      };

      jest.mocked(mockDb.queryOne).mockResolvedValue(err(dbError as any));

      const result = await repository.testExecutePaginatedQuery<any>(
        'SELECT * FROM items',
        'SELECT COUNT(*) FROM items',
        [],
        { page: 1, pageSize: 20 }
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Table not found');
    });

    it('should handle data query error', async () => {
      // Mock count query success
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '50' }));

      // Mock data query error
      const dbError = {
        code: '57014',
        message: 'canceling statement due to statement timeout',
      };
      jest.mocked(mockDb.query).mockResolvedValue(err(dbError as any));

      const result = await repository.testExecutePaginatedQuery<any>(
        'SELECT * FROM items',
        'SELECT COUNT(*) FROM items',
        [],
        { page: 1, pageSize: 20 }
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Query canceled (timeout)');
    });
  });

  describe('Helper Methods - exists()', () => {
    it('should return true when record exists', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: true }));

      const result = await repository.testExists('items', { id: 'item-001' });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT EXISTS(SELECT 1 FROM items WHERE id = $1) as exists',
        ['item-001']
      );
    });

    it('should return false when record does not exist', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: false }));

      const result = await repository.testExists('items', { id: 'non-existent' });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(false);
    });

    it('should handle null result as false', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const result = await repository.testExists('items', { id: 'item-001' });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(false);
    });

    it('should build WHERE clause with multiple criteria', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ exists: true }));

      await repository.testExists('items', {
        status: 'active',
        zone_id: 'zone-001',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT EXISTS(SELECT 1 FROM items WHERE status = $1 AND zone_id = $2) as exists',
        ['active', 'zone-001']
      );
    });

    it('should handle query errors', async () => {
      const dbError = {
        code: '42P01',
        message: 'relation "items" does not exist',
      };

      jest.mocked(mockDb.queryOne).mockResolvedValue(err(dbError as any));

      const result = await repository.testExists('items', { id: 'item-001' });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Table not found');
    });
  });

  describe('Helper Methods - count()', () => {
    it('should return count of all records', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '42' }));

      const result = await repository.testCount('items');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(42);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM items ',
        []
      );
    });

    it('should return count with criteria', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '15' }));

      const result = await repository.testCount('items', { status: 'active' });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(15);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM items WHERE status = $1',
        ['active']
      );
    });

    it('should return 0 for empty result', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok(null));

      const result = await repository.testCount('items');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(0);
    });

    it('should handle multiple criteria', async () => {
      jest.mocked(mockDb.queryOne).mockResolvedValue(ok({ count: '7' }));

      await repository.testCount('items', {
        status: 'active',
        zone_id: 'zone-001',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM items WHERE status = $1 AND zone_id = $2',
        ['active', 'zone-001']
      );
    });

    it('should handle query errors', async () => {
      const dbError = {
        code: '42P01',
        message: 'relation "items" does not exist',
      };

      jest.mocked(mockDb.queryOne).mockResolvedValue(err(dbError as any));

      const result = await repository.testCount('items');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Table not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values in WHERE clause', () => {
      const criteria = {
        status: '',
        description: '',
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE status = $1 AND description = $2');
      expect(result.params).toEqual(['', '']);
    });

    it('should handle boolean values in WHERE clause', () => {
      const criteria = {
        is_active: true,
        is_deleted: false,
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE is_active = $1 AND is_deleted = $2');
      expect(result.params).toEqual([true, false]);
    });

    it('should handle zero value in WHERE clause', () => {
      const criteria = {
        count: 0,
        value: 0,
      };

      const result = repository.testBuildWhereClause(criteria);

      expect(result.sql).toBe('WHERE count = $1 AND value = $2');
      expect(result.params).toEqual([0, 0]);
    });

    it('should handle pagination for page 1 with 1 item', () => {
      const result = repository.testBuildPaginationClause({ page: 1, pageSize: 1 });

      expect(result).toBe('LIMIT 1 OFFSET 0');
    });

    it('should handle large page numbers', () => {
      const result = repository.testBuildPaginationClause({ page: 1000, pageSize: 100 });

      expect(result).toBe('LIMIT 100 OFFSET 99900');
    });
  });
});
