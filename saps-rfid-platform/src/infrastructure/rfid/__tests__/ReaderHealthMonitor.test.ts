import { ReaderHealthMonitor } from '../ReaderHealthMonitor';
import type { ReaderConnectionPool } from '../ReaderConnectionPool';
import type { IReaderRepository } from '../../../domain/repositories/IReaderRepository';
import type { IReaderConnection } from '../ReaderConnection';
import type { Reader } from '../../../domain/entities/Reader';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { ReaderStatus } from '../../../domain/entities/Reader';
import { ok, err } from 'neverthrow';

/**
 * ReaderHealthMonitor Unit Tests
 *
 * @description
 * Tests for reader health monitoring covering:
 * - Periodic health checks
 * - Status determination logic
 * - Stale reader detection
 * - Database batch updates
 * - Manual health checks
 * - Statistics tracking
 * - Edge cases and error handling
 */
describe('ReaderHealthMonitor', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockConnectionPool: jest.Mocked<ReaderConnectionPool>;
  let mockReaderRepo: jest.Mocked<IReaderRepository>;
  let monitor: ReaderHealthMonitor;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockConnectionPool = {
      getAll: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<ReaderConnectionPool>;

    mockReaderRepo = {
      updateStatuses: jest.fn().mockResolvedValue(ok(undefined)),
    } as unknown as jest.Mocked<IReaderRepository>;

    jest.useFakeTimers();
  });

  afterEach(() => {
    if (monitor) {
      monitor.dispose();
    }
    jest.useRealTimers();
  });

  function createMockReader(id: string, status: ReaderStatus): Reader {
    return {
      getId: () => id,
      getName: () => `Reader ${id}`,
      getStatus: () => status,
    } as unknown as Reader;
  }

  function createMockConnection(
    readerId: string,
    status: ReaderStatus,
    options: {
      isConnected?: boolean;
      hasError?: boolean;
      lastSeenAt?: Date | null;
    } = {}
  ): IReaderConnection {
    const { isConnected = true, hasError = false, lastSeenAt = new Date() } = options;

    return {
      getReader: () => createMockReader(readerId, status),
      getReaderId: () => readerId,
      isConnected: () => isConnected,
      getLastError: () => (hasError ? new Error('Connection error') : null),
      getLastSeenAt: () => lastSeenAt,
    } as unknown as IReaderConnection;
  }

  describe('Initialization', () => {
    it('should initialize without auto-start', () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);

      const status = monitor.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.checkCount).toBe(0);
      expect(status.totalStatusChanges).toBe(0);
      expect(status.checkIntervalMs).toBe(30000);
      expect(status.staleThresholdSeconds).toBe(60);
    });

    it('should initialize with custom configuration', () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        checkIntervalMs: 60000,
        staleThresholdSeconds: 120,
        autoStart: false,
      });

      const status = monitor.getStatus();
      expect(status.checkIntervalMs).toBe(60000);
      expect(status.staleThresholdSeconds).toBe(120);
    });

    it('should auto-start when configured', () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        autoStart: true,
      });

      const status = monitor.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('Starting and Stopping', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should start monitoring', () => {
      monitor.start();

      const status = monitor.getStatus();
      expect(status.isRunning).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting reader health monitor',
        expect.objectContaining({
          checkIntervalMs: 30000,
          staleThresholdSeconds: 60,
        })
      );
    });

    it('should perform immediate check on start', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      monitor.start();

      // Allow immediate check to complete
      await jest.runAllTimersAsync();

      const status = monitor.getStatus();
      expect(status.checkCount).toBeGreaterThan(0);
    });

    it('should warn if already running', () => {
      monitor.start();
      monitor.start(); // Second call

      expect(mockLogger.warn).toHaveBeenCalledWith('Health monitor already running');
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();

      const status = monitor.getStatus();
      expect(status.isRunning).toBe(false);

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping reader health monitor');
    });

    it('should handle stop when not running', () => {
      monitor.stop();

      expect(mockLogger.debug).toHaveBeenCalledWith('Health monitor not running');
    });
  });

  describe('Status Determination', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        staleThresholdSeconds: 60,
      });
    });

    it('should mark reader as ERROR when connection has error', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          hasError: true,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.ERROR },
      ]);
    });

    it('should mark reader as ONLINE when connected and not stale', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.OFFLINE, {
          isConnected: true,
          lastSeenAt: new Date(), // Recent
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.ONLINE },
      ]);
    });

    it('should mark reader as OFFLINE when connected but stale', async () => {
      const staleTime = new Date(Date.now() - 70 * 1000); // 70 seconds ago

      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: true,
          lastSeenAt: staleTime,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.OFFLINE },
      ]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Reader is stale (no activity)',
        expect.objectContaining({
          readerId: 'reader-001',
        })
      );
    });

    it('should mark reader as OFFLINE when not connected', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.OFFLINE },
      ]);
    });

    it('should mark as ONLINE when connected with no lastSeenAt', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.OFFLINE, {
          isConnected: true,
          lastSeenAt: null,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.ONLINE },
      ]);
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should check all readers in pool', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE),
        createMockConnection('reader-002', ReaderStatus.ONLINE),
        createMockConnection('reader-003', ReaderStatus.ONLINE),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.totalReaders).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performing health check',
        expect.objectContaining({
          totalReaders: 3,
        })
      );
    });

    it('should only update changed statuses', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: true, // Still online
        }),
        createMockConnection('reader-002', ReaderStatus.ONLINE, {
          isConnected: false, // Now offline
        }),
        createMockConnection('reader-003', ReaderStatus.OFFLINE, {
          isConnected: false, // Still offline
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.statusChanges).toBe(1); // Only reader-002 changed
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-002', status: ReaderStatus.OFFLINE },
      ]);
    });

    it('should handle empty connection pool', async () => {
      (mockConnectionPool.getAll as any).mockReturnValue([]);

      const result = await monitor.forceCheck();

      expect(result.totalReaders).toBe(0);
      expect(result.statusChanges).toBe(0);
      expect(mockReaderRepo.updateStatuses).not.toHaveBeenCalled();
    });

    it('should track check duration', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should warn on slow health checks', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      // Mock slow processing by delaying the updateStatuses call
      (mockReaderRepo.updateStatuses as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(ok(undefined)), 6000);
          })
      );

      const checkPromise = monitor.forceCheck();

      // Advance timers to simulate slow processing
      await jest.advanceTimersByTimeAsync(6100);

      const result = await checkPromise;

      // Should warn if duration > 5000ms
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow health check',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('Database Updates', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should batch update statuses', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
        createMockConnection('reader-002', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
        createMockConnection('reader-003', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      await monitor.forceCheck();

      // Should batch all 3 updates in single call
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledTimes(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-001', status: ReaderStatus.OFFLINE },
        { readerId: 'reader-002', status: ReaderStatus.OFFLINE },
        { readerId: 'reader-003', status: ReaderStatus.OFFLINE },
      ]);
    });

    it('should handle database update errors', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);
      (mockReaderRepo.updateStatuses as any).mockResolvedValue(err(new Error('Database error')));

      const result = await monitor.forceCheck();

      expect(result.errors).toContain('Database update failed: Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update reader statuses',
        expect.objectContaining({
          error: 'Database error',
        })
      );
    });

    it('should handle database update exceptions', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);
      (mockReaderRepo.updateStatuses as any).mockRejectedValue(new Error('Database exception'));

      const result = await monitor.forceCheck();

      expect(result.errors).toContain('Database exception');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Exception updating reader statuses',
        expect.any(Object)
      );
    });

    it('should not call database if no status changes', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: true, // Status unchanged
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      await monitor.forceCheck();

      expect(mockReaderRepo.updateStatuses).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should handle errors checking individual readers', async () => {
      const badConnection = {
        getReader: () => {
          throw new Error('Reader error');
        },
        getReaderId: () => 'reader-001',
      } as unknown as IReaderConnection;

      (mockConnectionPool.getAll as any).mockReturnValue([badConnection]);

      const result = await monitor.forceCheck();

      expect(result.errors).toContain('Reader error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking reader health',
        expect.objectContaining({
          error: 'Reader error',
          readerId: 'reader-001',
        })
      );
    });

    it('should continue checking after individual errors', async () => {
      const badConnection = {
        getReader: () => {
          throw new Error('Error');
        },
        getReaderId: () => 'reader-bad',
      } as unknown as IReaderConnection;

      const goodConnection = createMockConnection('reader-good', ReaderStatus.ONLINE, {
        isConnected: false,
      });

      (mockConnectionPool.getAll as any).mockReturnValue([badConnection, goodConnection]);

      const result = await monitor.forceCheck();

      // Should still process good connection
      expect(result.statusChanges).toBe(1);
      expect(mockReaderRepo.updateStatuses).toHaveBeenCalledWith([
        { readerId: 'reader-good', status: ReaderStatus.OFFLINE },
      ]);
    });

    it('should handle non-Error exceptions', async () => {
      const badConnection = {
        getReader: () => {
          throw 'String error';
        },
        getReaderId: () => 'reader-001',
      } as unknown as IReaderConnection;

      (mockConnectionPool.getAll as any).mockReturnValue([badConnection]);

      const result = await monitor.forceCheck();

      expect(result.errors).toContain('Unknown error');
    });
  });

  describe('Periodic Checks', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        checkIntervalMs: 10000, // 10 seconds for testing
      });
    });

    it('should perform periodic checks', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      monitor.start();

      // Initial check
      await jest.runAllTimersAsync();
      expect(monitor.getStatus().checkCount).toBe(1);

      // Advance to next check
      jest.advanceTimersByTime(10000);
      await jest.runAllTimersAsync();
      expect(monitor.getStatus().checkCount).toBe(2);

      // Advance to next check
      jest.advanceTimersByTime(10000);
      await jest.runAllTimersAsync();
      expect(monitor.getStatus().checkCount).toBe(3);
    });

    it('should handle errors during periodic checks', async () => {
      (mockConnectionPool.getAll as any).mockImplementation(() => {
        throw new Error('Pool error');
      });

      monitor.start();

      await jest.runAllTimersAsync();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Pool error',
        })
      );
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should track total status changes', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      await monitor.forceCheck();
      await monitor.forceCheck(); // No change
      await monitor.forceCheck(); // No change

      const status = monitor.getStatus();
      expect(status.totalStatusChanges).toBe(1);
      expect(status.checkCount).toBe(3);
    });

    it('should store last check result', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      await monitor.forceCheck();

      const status = monitor.getStatus();
      expect(status.lastCheckResult).not.toBeNull();
      expect(status.lastCheckResult?.totalReaders).toBe(1);
    });

    it('should reset statistics', async () => {
      const connections = [createMockConnection('reader-001', ReaderStatus.ONLINE)];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      await monitor.forceCheck();

      expect(monitor.getStatus().checkCount).toBe(1);

      monitor.resetStats();

      const status = monitor.getStatus();
      expect(status.checkCount).toBe(0);
      expect(status.totalStatusChanges).toBe(0);
      expect(status.lastCheckResult).toBeNull();
    });
  });

  describe('Disposal', () => {
    it('should stop monitoring on dispose', () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);

      monitor.start();
      expect(monitor.getStatus().isRunning).toBe(true);

      monitor.dispose();

      expect(monitor.getStatus().isRunning).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('ReaderHealthMonitor disposed');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger);
    });

    it('should handle stale threshold of 0 seconds', async () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        staleThresholdSeconds: 0,
      });

      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: true,
          lastSeenAt: new Date(Date.now() - 1000), // 1 second ago
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      // Should mark as stale immediately
      expect(result.statusChanges).toBe(1);
    });

    it('should handle very large check intervals', () => {
      monitor = new ReaderHealthMonitor(mockConnectionPool, mockReaderRepo, mockLogger, {
        checkIntervalMs: 1000000, // ~16 minutes
      });

      const status = monitor.getStatus();
      expect(status.checkIntervalMs).toBe(1000000);
    });

    it('should handle multiple readers with different states', async () => {
      const connections = [
        createMockConnection('reader-001', ReaderStatus.ONLINE, {
          isConnected: true,
        }),
        createMockConnection('reader-002', ReaderStatus.ONLINE, {
          isConnected: false,
        }),
        createMockConnection('reader-003', ReaderStatus.OFFLINE, {
          hasError: true,
        }),
        createMockConnection('reader-004', ReaderStatus.ERROR, {
          hasError: true,
        }),
      ];
      (mockConnectionPool.getAll as any).mockReturnValue(connections);

      const result = await monitor.forceCheck();

      // reader-001: ONLINE → ONLINE (no change)
      // reader-002: ONLINE → OFFLINE (change)
      // reader-003: OFFLINE → ERROR (change)
      // reader-004: ERROR → ERROR (no change)
      expect(result.statusChanges).toBe(2);
    });
  });
});
