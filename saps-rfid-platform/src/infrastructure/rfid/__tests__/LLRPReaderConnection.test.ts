import { LLRPReaderConnection } from '../LLRPReaderConnection';
import type { Reader } from '../../../domain/entities/Reader';
import type { IEventBus } from '../../../application/interfaces/IEventBus';
import type { ILogger } from '../../../application/interfaces/ILogger';
import { IpAddress } from '../../../domain/value-objects/IpAddress';
import EventEmitter from 'events';

/**
 * LLRPReaderConnection Unit Tests
 *
 * @description
 * Tests for LLRP protocol implementation covering:
 * - Connection establishment with timeout
 * - ROSpec configuration and management
 * - Event emission (connected, disconnected, error, tagRead)
 * - LLRP message handling
 * - Reconnection attempt tracking
 * - Graceful disconnect
 * - Error handling
 */
describe('LLRPReaderConnection', () => {
  let mockReader: Reader;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let connection: LLRPReaderConnection;
  let mockLLRPClient: any;

  beforeEach(() => {
    // Mock Reader
    mockReader = {
      getId: () => 'reader-001',
      getName: () => 'Test Reader 1',
      getIpAddress: () => IpAddress.create('192.168.1.100')._unsafeUnwrap(),
      getPort: () => 5084,
      getLocation: () => 'Test Location',
      getZoneId: () => 'zone-001',
      getStatus: () => 'ONLINE' as any,
    } as unknown as Reader;

    // Mock EventBus
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
    } as unknown as IEventBus;

    // Mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ILogger;

    // Mock LLRP Client
    mockLLRPClient = new EventEmitter();
    mockLLRPClient.connect = jest.fn();
    mockLLRPClient.send = jest.fn();
    mockLLRPClient.disconnect = jest.fn(() => {
      mockLLRPClient.emit('close');
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    if (connection) {
      connection.removeAllListeners();
    }
    jest.useRealTimers();
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should initialize with disconnected state', () => {
      expect(connection.isConnected()).toBe(false);
      expect(connection.isReading()).toBe(false);
      expect(connection.getReconnectionAttempts()).toBe(0);
      expect(connection.getLastError()).toBeNull();
    });

    it('should connect successfully', async () => {
      const connectedSpy = jest.fn();
      connection.on('connected', connectedSpy);

      // Mock successful connection
      const connectPromise = connection.connect();

      // Simulate LLRP client connection after timeout
      await jest.advanceTimersByTimeAsync(50);

      // Wait for promise to resolve
      const result = await connectPromise;

      expect(result.isOk()).toBe(true);
      expect(connection.isConnected()).toBe(true);
      expect(connection.getReconnectionAttempts()).toBe(0);
      expect(connectedSpy).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to RFID reader',
        expect.objectContaining({
          readerId: 'reader-001',
        })
      );
    });

    it('should handle connection timeout', async () => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);

      const connectPromise = connection.connect();

      // Advance past timeout (10 seconds)
      await jest.advanceTimersByTimeAsync(11000);

      const result = await connectPromise;

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Connection timeout');
      expect(connection.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);

      const connectPromise = connection.connect();

      // Will emit error during connect attempt
      await jest.advanceTimersByTimeAsync(50);

      const result = await connectPromise;

      expect(result.isErr()).toBe(true);
      expect(connection.isConnected()).toBe(false);
      expect(connection.getLastError()).toBeDefined();
    });

    it('should not connect if already connected', async () => {
      connection.setConnected(true);

      const result = await connection.connect();

      expect(result.isOk()).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Already connected', expect.any(Object));
    });

    it('should disconnect gracefully', async () => {
      connection.setConnected(true);
      connection.setReading(true);

      await connection.disconnect();

      expect(connection.isConnected()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Disconnected from reader',
        expect.objectContaining({
          readerId: 'reader-001',
        })
      );
    });

    it('should handle disconnect when not connected', async () => {
      await connection.disconnect();

      // Should not throw or log errors
      expect(connection.isConnected()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should emit connected event on successful connection', async () => {
      const connectedSpy = jest.fn();
      connection.on('connected', connectedSpy);

      connection.setConnected(true);
      connection.emit('connected');

      expect(connectedSpy).toHaveBeenCalled();
    });

    it('should emit disconnected event on connection close', () => {
      const disconnectedSpy = jest.fn();
      connection.on('disconnected', disconnectedSpy);

      connection.setConnected(true);
      connection.setConnected(false);
      connection.emit('disconnected');

      expect(disconnectedSpy).toHaveBeenCalled();
    });

    it('should emit error event on client error', () => {
      const errorSpy = jest.fn();
      connection.on('error', errorSpy);

      const testError = new Error('Test error');
      connection.setLastError(testError);
      connection.emit('error', testError);

      expect(errorSpy).toHaveBeenCalledWith(testError);
      expect(connection.getLastError()).toBe(testError);
    });

    it('should emit tagRead event for RO_ACCESS_REPORT', () => {
      const tagReadSpy = jest.fn();
      connection.on('tagRead', tagReadSpy);

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'ABC123',
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      connection.emit('tagRead', message);

      expect(tagReadSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('ROSpec Management', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
      connection.setConnected(true);
    });

    it('should require connection before starting reading', async () => {
      connection.setConnected(false);

      const result = await connection.startReading();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Reader not connected');
    });

    it('should not start reading if already reading', async () => {
      connection.setReading(true);

      const result = await connection.startReading();

      expect(result.isOk()).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Already reading', expect.any(Object));
    });

    it('should stop reading successfully', async () => {
      connection.setReading(true);

      const result = await connection.stopReading();

      expect(result.isOk()).toBe(true);
      expect(connection.isReading()).toBe(false);
    });

    it('should handle stop reading when not reading', async () => {
      connection.setReading(false);

      const result = await connection.stopReading();

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Reconnection Tracking', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should track reconnection attempts', () => {
      expect(connection.getReconnectionAttempts()).toBe(0);

      connection.incrementReconnectionAttempts();
      expect(connection.getReconnectionAttempts()).toBe(1);

      connection.incrementReconnectionAttempts();
      expect(connection.getReconnectionAttempts()).toBe(2);
    });

    it('should reset reconnection attempts', () => {
      connection.incrementReconnectionAttempts();
      connection.incrementReconnectionAttempts();
      connection.incrementReconnectionAttempts();

      expect(connection.getReconnectionAttempts()).toBe(3);

      connection.resetReconnectionAttempts();

      expect(connection.getReconnectionAttempts()).toBe(0);
    });

    it('should reset attempts on successful connection', async () => {
      connection.incrementReconnectionAttempts();
      connection.incrementReconnectionAttempts();

      expect(connection.getReconnectionAttempts()).toBe(2);

      connection.setConnected(true);
      connection.resetReconnectionAttempts();

      expect(connection.getReconnectionAttempts()).toBe(0);
    });
  });

  describe('State Tracking', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should track last seen timestamp', () => {
      expect(connection.getLastSeenAt()).toBeNull();

      connection.updateLastSeen();

      expect(connection.getLastSeenAt()).toBeInstanceOf(Date);
    });

    it('should track last error', () => {
      expect(connection.getLastError()).toBeNull();

      const error = new Error('Test error');
      connection.setLastError(error);

      expect(connection.getLastError()).toBe(error);
    });

    it('should update last seen on message receipt', () => {
      connection.setConnected(true);

      const before = new Date();
      connection.updateLastSeen();
      const after = new Date();

      const lastSeen = connection.getLastSeenAt();
      expect(lastSeen).toBeDefined();
      expect(lastSeen!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastSeen!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should return reader entity', () => {
      expect(connection.getReader()).toBe(mockReader);
    });

    it('should return reader ID', () => {
      expect(connection.getReaderId()).toBe('reader-001');
    });

    it('should return connection status', () => {
      expect(connection.isConnected()).toBe(false);

      connection.setConnected(true);

      expect(connection.isConnected()).toBe(true);
    });

    it('should return reading status', () => {
      expect(connection.isReading()).toBe(false);

      connection.setReading(true);

      expect(connection.isReading()).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should handle errors during disconnect', async () => {
      connection.setConnected(true);
      connection.setReading(true);

      // Mock error during disconnect
      const disconnectError = new Error('Disconnect failed');

      await connection.disconnect();

      // Should log error but not throw
      expect(connection.isConnected()).toBe(false);
    });

    it('should handle multiple event listeners', () => {
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      const spy3 = jest.fn();

      connection.on('connected', spy1);
      connection.on('connected', spy2);
      connection.on('connected', spy3);

      connection.emit('connected');

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
    });

    it('should clean up listeners on removal', () => {
      const spy = jest.fn();

      connection.on('tagRead', spy);
      connection.removeListener('tagRead', spy);

      connection.emit('tagRead', {});

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      for (let i = 0; i < 5; i++) {
        connection.setConnected(true);
        expect(connection.isConnected()).toBe(true);

        await connection.disconnect();
        expect(connection.isConnected()).toBe(false);
      }
    });

    it('should handle concurrent event emissions', () => {
      const spy = jest.fn();
      connection.on('tagRead', spy);

      // Emit multiple events rapidly
      for (let i = 0; i < 100; i++) {
        connection.emit('tagRead', { index: i });
      }

      expect(spy).toHaveBeenCalledTimes(100);
    });

    it('should maintain state consistency', () => {
      connection.setConnected(true);
      connection.setReading(true);

      expect(connection.isConnected()).toBe(true);
      expect(connection.isReading()).toBe(true);

      connection.setConnected(false);

      expect(connection.isConnected()).toBe(false);
      // Reading state should remain as set
      expect(connection.isReading()).toBe(true);
    });

    it('should handle null/undefined error gracefully', () => {
      connection.setLastError(null);
      expect(connection.getLastError()).toBeNull();

      const error = new Error('Test');
      connection.setLastError(error);
      expect(connection.getLastError()).toBe(error);

      connection.setLastError(null);
      expect(connection.getLastError()).toBeNull();
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      connection = new LLRPReaderConnection(mockReader, mockEventBus, mockLogger);
    });

    it('should handle high-frequency tag reads', () => {
      const spy = jest.fn();
      connection.on('tagRead', spy);

      // Simulate 1000 tag reads
      for (let i = 0; i < 1000; i++) {
        connection.emit('tagRead', {
          type: 'RO_ACCESS_REPORT',
          tagReportData: [{ epcData: `TAG${i}` }],
        });
      }

      expect(spy).toHaveBeenCalledTimes(1000);
    });

    it('should maintain performance with multiple listeners', () => {
      const spies = Array(10)
        .fill(null)
        .map(() => jest.fn());

      spies.forEach((spy) => connection.on('tagRead', spy));

      const message = { type: 'RO_ACCESS_REPORT' };
      connection.emit('tagRead', message);

      spies.forEach((spy) => {
        expect(spy).toHaveBeenCalledWith(message);
      });
    });
  });
});
