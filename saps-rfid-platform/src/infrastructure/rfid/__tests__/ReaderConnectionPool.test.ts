
import { ReaderConnectionPool } from '../ReaderConnectionPool';
import type { IReaderConnection } from '../ReaderConnection';
import type { Reader } from '../../../domain/entities/Reader';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { IpAddress } from '../../../domain/value-objects/IpAddress';

/**
 * ReaderConnectionPool Unit Tests
 *
 * @description
 * Tests for connection pool management covering:
 * - Adding and removing connections
 * - Connection lookup (get, has, getAll)
 * - Statistics aggregation
 * - Graceful shutdown
 * - Connection replacement
 * - Edge cases and error handling
 */
describe('ReaderConnectionPool', () => {
  let mockLogger: ILogger;
  let pool: ReaderConnectionPool;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ILogger;

    pool = new ReaderConnectionPool(mockLogger);
  });

  function createMockReader(id: string, name: string): Reader {
    return {
      getId: () => id,
      getName: () => name,
      getIpAddress: () => IpAddress.create('192.168.1.100')._unsafeUnwrap(),
      getPort: () => 5084,
      getLocation: () => 'Test Location',
      getZoneId: () => 'zone-001',
      getStatus: () => 'ONLINE' as any,
      updateStatus: jest.fn(),
      toJSON: jest.fn(),
    } as unknown as Reader;
  }

  function createMockConnection(
    reader: Reader,
    isConnected = true,
    isReading = false,
    hasError = false
  ): IReaderConnection {
    return {
      getReader: () => reader,
      getReaderId: () => reader.getId(),
      isConnected: () => isConnected,
      isReading: () => isReading,
      getLastError: () => (hasError ? new Error('Connection error') : null),
      getLastSeenAt: () => new Date(),
      getReconnectionAttempts: () => 0,
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as IReaderConnection;
  }

  describe('Initialization', () => {
    it('should initialize with empty pool', () => {
      expect(pool.size()).toBe(0);
      expect(pool.isEmpty()).toBe(true);
      expect(pool.getAll()).toHaveLength(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReaderConnectionPool initialized'
      );
    });

    it('should have zero statistics initially', () => {
      const stats = pool.getStats();

      expect(stats.total).toBe(0);
      expect(stats.connected).toBe(0);
      expect(stats.disconnected).toBe(0);
      expect(stats.error).toBe(0);
      expect(stats.reading).toBe(0);
    });
  });

  describe('Adding Connections', () => {
    it('should add connection to pool', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = createMockConnection(reader);

      pool.add(connection);

      expect(pool.size()).toBe(1);
      expect(pool.has('reader-001')).toBe(true);
      expect(pool.get('reader-001')).toBe(connection);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connection added to pool',
        expect.objectContaining({
          readerId: 'reader-001',
          readerName: 'Reader 1',
          totalConnections: 1,
        })
      );
    });

    it('should add multiple connections', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      pool.add(createMockConnection(reader1));
      pool.add(createMockConnection(reader2));
      pool.add(createMockConnection(reader3));

      expect(pool.size()).toBe(3);
      expect(pool.getAllReaderIds()).toEqual([
        'reader-001',
        'reader-002',
        'reader-003',
      ]);
    });

    it('should replace existing connection', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const oldConnection = createMockConnection(reader);
      const newConnection = createMockConnection(reader);

      pool.add(oldConnection);
      pool.add(newConnection); // Replace

      expect(pool.size()).toBe(1);
      expect(pool.get('reader-001')).toBe(newConnection);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Replacing existing connection in pool',
        expect.objectContaining({
          readerId: 'reader-001',
        })
      );

      // Old connection should be disconnected
      expect(oldConnection.disconnect).toHaveBeenCalled();
    });
  });

  describe('Removing Connections', () => {
    it('should remove connection from pool', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = createMockConnection(reader);

      pool.add(connection);
      expect(pool.size()).toBe(1);

      pool.remove('reader-001');

      expect(pool.size()).toBe(0);
      expect(pool.has('reader-001')).toBe(false);

      expect(connection.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connection removed from pool',
        expect.objectContaining({
          readerId: 'reader-001',
          remainingConnections: 0,
        })
      );
    });

    it('should handle removing non-existent connection', () => {
      pool.remove('non-existent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Connection not found in pool',
        expect.objectContaining({
          readerId: 'non-existent',
        })
      );
    });

    it('should handle disconnect errors gracefully', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = createMockConnection(reader);
      (connection.disconnect as any).mockRejectedValue(
        new Error('Disconnect failed')
      );

      pool.add(connection);
      pool.remove('reader-001');

      expect(pool.size()).toBe(0);
      // Error should be logged but not thrown
    });
  });

  describe('Connection Lookup', () => {
    beforeEach(() => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      pool.add(createMockConnection(reader1));
      pool.add(createMockConnection(reader2));
    });

    it('should get connection by reader ID', () => {
      const connection = pool.get('reader-001');

      expect(connection).toBeDefined();
      expect(connection?.getReaderId()).toBe('reader-001');
    });

    it('should return undefined for non-existent reader', () => {
      const connection = pool.get('non-existent');

      expect(connection).toBeUndefined();
    });

    it('should check if connection exists', () => {
      expect(pool.has('reader-001')).toBe(true);
      expect(pool.has('reader-002')).toBe(true);
      expect(pool.has('non-existent')).toBe(false);
    });

    it('should get all connections', () => {
      const connections = pool.getAll();

      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.getReaderId())).toEqual([
        'reader-001',
        'reader-002',
      ]);
    });

    it('should get all reader IDs', () => {
      const readerIds = pool.getAllReaderIds();

      expect(readerIds).toHaveLength(2);
      expect(readerIds).toEqual(['reader-001', 'reader-002']);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics for connected readers', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      pool.add(createMockConnection(reader1, true, false, false)); // Connected
      pool.add(createMockConnection(reader2, true, true, false)); // Connected + Reading
      pool.add(createMockConnection(reader3, false, false, false)); // Disconnected

      const stats = pool.getStats();

      expect(stats.total).toBe(3);
      expect(stats.connected).toBe(2);
      expect(stats.disconnected).toBe(1);
      expect(stats.reading).toBe(1);
      expect(stats.error).toBe(0);
    });

    it('should calculate statistics for error states', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      pool.add(createMockConnection(reader1, true, false, true)); // Error
      pool.add(createMockConnection(reader2, true, false, false)); // OK

      const stats = pool.getStats();

      expect(stats.total).toBe(2);
      expect(stats.error).toBe(1);
      expect(stats.connected).toBe(1); // Only non-error connection counted
    });

    it('should get connected count', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      pool.add(createMockConnection(reader1, true));
      pool.add(createMockConnection(reader2, false));

      expect(pool.getConnectedCount()).toBe(1);
    });

    it('should get error count', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      pool.add(createMockConnection(reader1, true, false, true));
      pool.add(createMockConnection(reader2, true, false, false));

      expect(pool.getErrorCount()).toBe(1);
    });

    it('should get reading count', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      pool.add(createMockConnection(reader1, true, true));
      pool.add(createMockConnection(reader2, true, false));

      expect(pool.getReadingCount()).toBe(1);
    });

    it('should check if any readers are connected', () => {
      expect(pool.hasConnectedReaders()).toBe(false);

      const reader = createMockReader('reader-001', 'Reader 1');
      pool.add(createMockConnection(reader, true));

      expect(pool.hasConnectedReaders()).toBe(true);
    });

    it('should get detailed statistics', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = createMockConnection(reader, true, false, false);

      pool.add(connection);

      const details = pool.getDetailedStats();

      expect(details).toHaveLength(1);
      expect(details[0]).toEqual({
        readerId: 'reader-001',
        readerName: 'Reader 1',
        ipAddress: '192.168.1.100',
        isConnected: true,
        isReading: false,
        reconnectionAttempts: 0,
        lastError: null,
        lastSeenAt: expect.any(String),
      });
    });

    it('should include error in detailed statistics', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = createMockConnection(reader, true, false, true);

      pool.add(connection);

      const details = pool.getDetailedStats();

      expect(details[0].lastError).toBe('Connection error');
    });
  });

  describe('Pool Operations', () => {
    it('should check if pool is empty', () => {
      expect(pool.isEmpty()).toBe(true);

      const reader = createMockReader('reader-001', 'Reader 1');
      pool.add(createMockConnection(reader));

      expect(pool.isEmpty()).toBe(false);
    });

    it('should get pool size', () => {
      expect(pool.size()).toBe(0);

      for (let i = 1; i <= 5; i++) {
        const reader = createMockReader(`reader-00${i}`, `Reader ${i}`);
        pool.add(createMockConnection(reader));
      }

      expect(pool.size()).toBe(5);
    });

    it('should get status summary', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      pool.add(createMockConnection(reader1, true, true)); // Connected + Reading
      pool.add(createMockConnection(reader2, true, false)); // Connected
      pool.add(createMockConnection(reader3, true, false, true)); // Error

      const summary = pool.getStatusSummary();

      expect(summary).toBe('2/3 connected, 1 reading, 1 errors');
    });

    it('should log pool status', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      pool.add(createMockConnection(reader, true));

      pool.logStatus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connection pool status',
        expect.objectContaining({
          total: 1,
          connected: 1,
          disconnected: 0,
          reading: 0,
          errors: 0,
        })
      );
    });
  });

  describe('Disconnect All', () => {
    it('should disconnect all connections', async () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      const conn1 = createMockConnection(reader1);
      const conn2 = createMockConnection(reader2);
      const conn3 = createMockConnection(reader3);

      pool.add(conn1);
      pool.add(conn2);
      pool.add(conn3);

      await pool.disconnectAll();

      expect(conn1.disconnect).toHaveBeenCalled();
      expect(conn2.disconnect).toHaveBeenCalled();
      expect(conn3.disconnect).toHaveBeenCalled();

      expect(pool.size()).toBe(0);
      expect(pool.isEmpty()).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'All readers disconnected and pool cleared',
        expect.objectContaining({
          previousSize: 3,
        })
      );
    });

    it('should handle empty pool gracefully', async () => {
      await pool.disconnectAll();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'No connections to disconnect'
      );
    });

    it('should handle disconnect failures gracefully', async () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      const conn1 = createMockConnection(reader1);
      const conn2 = createMockConnection(reader2);

      // Make conn1 fail on disconnect
      (conn1.disconnect as any).mockRejectedValue(
        new Error('Disconnect failed')
      );

      pool.add(conn1);
      pool.add(conn2);

      // Should not throw, uses Promise.allSettled
      await pool.disconnectAll();

      expect(pool.size()).toBe(0);

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error disconnecting reader',
        expect.objectContaining({
          readerId: 'reader-001',
          error: 'Disconnect failed',
        })
      );
    });

    it('should continue disconnecting even if some fail', async () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      const conn1 = createMockConnection(reader1);
      const conn2 = createMockConnection(reader2);
      const conn3 = createMockConnection(reader3);

      // Make conn2 fail
      (conn2.disconnect as any).mockRejectedValue(new Error('Failed'));

      pool.add(conn1);
      pool.add(conn2);
      pool.add(conn3);

      await pool.disconnectAll();

      // All should be attempted
      expect(conn1.disconnect).toHaveBeenCalled();
      expect(conn2.disconnect).toHaveBeenCalled();
      expect(conn3.disconnect).toHaveBeenCalled();

      // Pool should be cleared
      expect(pool.size()).toBe(0);
    });
  });

  describe('Clear Pool', () => {
    it('should clear pool without disconnecting', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      const conn1 = createMockConnection(reader1);
      const conn2 = createMockConnection(reader2);

      pool.add(conn1);
      pool.add(conn2);

      pool.clear();

      expect(pool.size()).toBe(0);

      // Connections should NOT be disconnected
      expect(conn1.disconnect).not.toHaveBeenCalled();
      expect(conn2.disconnect).not.toHaveBeenCalled();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Pool cleared without disconnecting',
        expect.objectContaining({
          previousSize: 2,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid add/remove operations', () => {
      const reader = createMockReader('reader-001', 'Reader 1');

      for (let i = 0; i < 10; i++) {
        pool.add(createMockConnection(reader));
        expect(pool.size()).toBe(1);
        pool.remove('reader-001');
        expect(pool.size()).toBe(0);
      }
    });

    it('should handle large number of connections', () => {
      const connectionCount = 1000;

      for (let i = 0; i < connectionCount; i++) {
        const reader = createMockReader(`reader-${i}`, `Reader ${i}`);
        pool.add(createMockConnection(reader));
      }

      expect(pool.size()).toBe(connectionCount);

      const stats = pool.getStats();
      expect(stats.total).toBe(connectionCount);
    });

    it('should maintain separate connections for different readers', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');

      const conn1 = createMockConnection(reader1, true);
      const conn2 = createMockConnection(reader2, false);

      pool.add(conn1);
      pool.add(conn2);

      expect(pool.get('reader-001')?.isConnected()).toBe(true);
      expect(pool.get('reader-002')?.isConnected()).toBe(false);
    });

    it('should handle null/undefined gracefully in detailed stats', () => {
      const reader = createMockReader('reader-001', 'Reader 1');
      const connection = {
        ...createMockConnection(reader),
        getLastSeenAt: () => null,
      } as unknown as IReaderConnection;

      pool.add(connection);

      const details = pool.getDetailedStats();

      expect(details[0].lastSeenAt).toBeNull();
    });

    it('should provide accurate statistics during concurrent operations', () => {
      const reader1 = createMockReader('reader-001', 'Reader 1');
      const reader2 = createMockReader('reader-002', 'Reader 2');
      const reader3 = createMockReader('reader-003', 'Reader 3');

      pool.add(createMockConnection(reader1, true));
      const stats1 = pool.getStats();
      expect(stats1.connected).toBe(1);

      pool.add(createMockConnection(reader2, false));
      const stats2 = pool.getStats();
      expect(stats2.connected).toBe(1);
      expect(stats2.disconnected).toBe(1);

      pool.add(createMockConnection(reader3, true, false, true));
      const stats3 = pool.getStats();
      expect(stats3.error).toBe(1);
    });
  });
});
