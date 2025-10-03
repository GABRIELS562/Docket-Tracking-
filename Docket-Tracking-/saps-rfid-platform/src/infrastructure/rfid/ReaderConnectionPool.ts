import type { ILogger } from '../../application/interfaces/ILogger';
import type { IReaderConnection } from './ReaderConnection';

/**
 * Connection Statistics
 */
export interface ConnectionStats {
  /**
   * Total number of connections in pool
   */
  total: number;

  /**
   * Number of connected readers
   */
  connected: number;

  /**
   * Number of disconnected readers
   */
  disconnected: number;

  /**
   * Number of readers in error state
   */
  error: number;

  /**
   * Number of readers currently reading
   */
  reading: number;
}

/**
 * Detailed Connection Information
 */
export interface DetailedConnectionInfo {
  readerId: string;
  readerName: string;
  ipAddress: string;
  isConnected: boolean;
  isReading: boolean;
  reconnectionAttempts: number;
  lastError: string | null;
  lastSeenAt: string | null;
}

/**
 * ReaderConnectionPool - Manages all RFID reader connections
 *
 * @description
 * Centralized management of connections to physical RFID readers.
 * Provides thread-safe access to connections and aggregated statistics.
 *
 * **Responsibilities:**
 * - Track all active reader connections
 * - Provide O(1) connection lookup by reader ID
 * - Aggregate connection statistics
 * - Handle graceful shutdown of all connections
 * - Prevent duplicate connections
 * - Manage connection lifecycle
 *
 * **Thread Safety:**
 * This class is thread-safe for Node.js (single-threaded event loop).
 * For multi-threaded environments, add mutex locks.
 *
 * **Memory Management:**
 * - Map storage: O(n) where n = number of readers
 * - Typical deployment: 10-50 readers
 * - Memory per connection: ~1-2 KB
 * - Total pool memory: <100 KB
 *
 * @example
 * ```typescript
 * const pool = new ReaderConnectionPool(logger);
 *
 * // Add connection
 * const connection = new ReaderConnection(reader);
 * pool.add(connection);
 *
 * // Get connection
 * const conn = pool.get(readerId);
 * if (conn) {
 *   console.log(`Reader: ${conn.getReader().getName()}`);
 * }
 *
 * // Get statistics
 * const stats = pool.getStats();
 * console.log(`Connected: ${stats.connected}/${stats.total}`);
 *
 * // Shutdown
 * await pool.disconnectAll();
 * ```
 */
export class ReaderConnectionPool {
  private connections: Map<string, IReaderConnection>;

  constructor(private readonly logger: ILogger) {
    this.connections = new Map();

    this.logger.info('ReaderConnectionPool initialized');
  }

  /**
   * Add connection to pool
   *
   * @param connection - Reader connection to add
   *
   * @description
   * If a connection already exists for this reader, the old connection
   * is disconnected and replaced with the new one.
   *
   * @example
   * ```typescript
   * const connection = new ReaderConnection(reader);
   * pool.add(connection);
   * ```
   */
  add(connection: IReaderConnection): void {
    const readerId = connection.getReaderId();

    // Check if connection already exists
    if (this.connections.has(readerId)) {
      this.logger.warn('Replacing existing connection in pool', {
        readerId,
        readerName: connection.getReader().getName(),
      });

      // Disconnect old connection first
      this.remove(readerId);
    }

    // Add new connection
    this.connections.set(readerId, connection);

    this.logger.info('Connection added to pool', {
      readerId,
      readerName: connection.getReader().getName(),
      totalConnections: this.connections.size,
    });
  }

  /**
   * Remove connection from pool
   *
   * @param readerId - ID of reader to remove
   *
   * @description
   * Disconnects the connection and removes it from the pool.
   * If connection doesn't exist, logs warning but doesn't throw.
   *
   * @example
   * ```typescript
   * pool.remove('reader-storage-001');
   * ```
   */
  remove(readerId: string): void {
    const connection = this.connections.get(readerId);

    if (!connection) {
      this.logger.warn('Connection not found in pool', { readerId });
      return;
    }

    // Disconnect asynchronously (don't wait)
    connection.disconnect().catch((error) => {
      this.logger.error('Error disconnecting reader during removal', {
        readerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Remove from pool immediately
    this.connections.delete(readerId);

    this.logger.info('Connection removed from pool', {
      readerId,
      remainingConnections: this.connections.size,
    });
  }

  /**
   * Get connection by reader ID
   *
   * @param readerId - ID of reader to lookup
   * @returns Connection or undefined if not found
   *
   * @example
   * ```typescript
   * const connection = pool.get('reader-storage-001');
   * if (connection && connection.isConnected()) {
   *   console.log('Reader is online');
   * }
   * ```
   */
  get(readerId: string): IReaderConnection | undefined {
    return this.connections.get(readerId);
  }

  /**
   * Check if pool has connection for reader
   *
   * @param readerId - ID of reader to check
   * @returns True if connection exists in pool
   */
  has(readerId: string): boolean {
    return this.connections.has(readerId);
  }

  /**
   * Get all connections
   *
   * @returns Array of all connections in pool
   *
   * @example
   * ```typescript
   * const allConnections = pool.getAll();
   * for (const conn of allConnections) {
   *   console.log(`Reader ${conn.getReaderId()}: ${conn.isConnected()}`);
   * }
   * ```
   */
  getAll(): IReaderConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all reader IDs
   *
   * @returns Array of reader IDs in pool
   */
  getAllReaderIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection statistics
   *
   * @returns Aggregated statistics for all connections
   *
   * @description
   * Calculates real-time statistics by iterating through all connections.
   * O(n) complexity where n = number of connections.
   *
   * @example
   * ```typescript
   * const stats = pool.getStats();
   * console.log(`Status: ${stats.connected}/${stats.total} connected`);
   * console.log(`Errors: ${stats.error}`);
   * ```
   */
  getStats(): ConnectionStats {
    const connections = this.getAll();

    const stats: ConnectionStats = {
      total: connections.length,
      connected: 0,
      disconnected: 0,
      error: 0,
      reading: 0,
    };

    for (const conn of connections) {
      if (conn.getLastError()) {
        stats.error++;
      } else if (conn.isConnected()) {
        stats.connected++;
        if (conn.isReading()) {
          stats.reading++;
        }
      } else {
        stats.disconnected++;
      }
    }

    return stats;
  }

  /**
   * Get detailed statistics per reader
   *
   * @returns Array of detailed connection information
   *
   * @description
   * Provides comprehensive status for each reader, useful for
   * admin dashboards and monitoring.
   *
   * @example
   * ```typescript
   * const details = pool.getDetailedStats();
   * for (const info of details) {
   *   console.log(`${info.readerName} (${info.ipAddress}): ${info.isConnected ? 'Online' : 'Offline'}`);
   *   if (info.lastError) {
   *     console.log(`  Error: ${info.lastError}`);
   *   }
   * }
   * ```
   */
  getDetailedStats(): DetailedConnectionInfo[] {
    const connections = this.getAll();

    return connections.map((conn) => {
      const reader = conn.getReader();
      const lastError = conn.getLastError();
      const lastSeenAt = conn.getLastSeenAt();

      return {
        readerId: reader.getId(),
        readerName: reader.getName(),
        ipAddress: reader.getIpAddress().getValue(),
        isConnected: conn.isConnected(),
        isReading: conn.isReading(),
        reconnectionAttempts: conn.getReconnectionAttempts(),
        lastError: lastError ? lastError.message : null,
        lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      };
    });
  }

  /**
   * Get count of connected readers
   *
   * @returns Number of readers currently connected
   */
  getConnectedCount(): number {
    return this.getStats().connected;
  }

  /**
   * Get count of readers in error state
   *
   * @returns Number of readers with errors
   */
  getErrorCount(): number {
    return this.getStats().error;
  }

  /**
   * Get count of readers currently reading
   *
   * @returns Number of readers actively reading tags
   */
  getReadingCount(): number {
    return this.getStats().reading;
  }

  /**
   * Check if any readers are connected
   *
   * @returns True if at least one reader is connected
   */
  hasConnectedReaders(): boolean {
    return this.getConnectedCount() > 0;
  }

  /**
   * Get pool size
   *
   * @returns Total number of connections in pool
   */
  size(): number {
    return this.connections.size;
  }

  /**
   * Check if pool is empty
   *
   * @returns True if pool has no connections
   */
  isEmpty(): boolean {
    return this.connections.size === 0;
  }

  /**
   * Disconnect all readers and clear pool
   *
   * @description
   * Gracefully disconnects all readers and clears the pool.
   * Uses Promise.allSettled to ensure all disconnects are attempted
   * even if some fail.
   *
   * Should be called during application shutdown.
   *
   * @example
   * ```typescript
   * // Application shutdown
   * await pool.disconnectAll();
   * console.log('All readers disconnected');
   * ```
   */
  async disconnectAll(): Promise<void> {
    const connectionCount = this.connections.size;

    if (connectionCount === 0) {
      this.logger.info('No connections to disconnect');
      return;
    }

    this.logger.info('Disconnecting all readers', {
      totalConnections: connectionCount,
    });

    const disconnectPromises = this.getAll().map((conn) => {
      const readerId = conn.getReaderId();
      return conn
        .disconnect()
        .then(() => {
          this.logger.debug('Reader disconnected', { readerId });
        })
        .catch((error) => {
          this.logger.error('Error disconnecting reader', {
            readerId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
    });

    // Wait for all disconnects to complete (or fail)
    await Promise.allSettled(disconnectPromises);

    // Clear the pool
    this.connections.clear();

    this.logger.info('All readers disconnected and pool cleared', {
      previousSize: connectionCount,
    });
  }

  /**
   * Clear pool without disconnecting
   *
   * @description
   * Removes all connections from pool without disconnecting them.
   * Use with caution - prefer disconnectAll() for clean shutdown.
   *
   * Useful for testing or force-clearing stale connections.
   */
  clear(): void {
    const size = this.connections.size;
    this.connections.clear();

    this.logger.warn('Pool cleared without disconnecting', {
      previousSize: size,
    });
  }

  /**
   * Get pool status summary
   *
   * @returns Human-readable status summary
   */
  getStatusSummary(): string {
    const stats = this.getStats();
    return `${stats.connected}/${stats.total} connected, ${stats.reading} reading, ${stats.error} errors`;
  }

  /**
   * Log pool status
   *
   * @description
   * Logs current pool status at info level.
   * Useful for periodic status checks.
   */
  logStatus(): void {
    const stats = this.getStats();
    this.logger.info('Connection pool status', {
      total: stats.total,
      connected: stats.connected,
      disconnected: stats.disconnected,
      reading: stats.reading,
      errors: stats.error,
    });
  }
}
