import { ReaderStatus } from '../../domain/entities/Reader';

import type { ReaderConnectionPool } from './ReaderConnectionPool';
import type { ILogger } from '../../application/interfaces/ILogger';
import type { IReaderRepository } from '../../domain/repositories/IReaderRepository';

/**
 * Health Monitor Configuration
 */
export interface HealthMonitorConfig {
  /**
   * How often to check reader health (milliseconds)
   * @default 30000 (30 seconds)
   */
  checkIntervalMs?: number;

  /**
   * How long since last heartbeat before considering reader stale (seconds)
   * @default 60 (1 minute)
   */
  staleThresholdSeconds?: number;

  /**
   * Whether to automatically start monitoring on instantiation
   * @default false
   */
  autoStart?: boolean;
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  totalReaders: number;
  statusChanges: number;
  errors: string[];
  timestamp: Date;
  duration: number;
}

/**
 * ReaderHealthMonitor - Monitors reader health and updates status
 *
 * @description
 * Periodic health monitoring system that detects unresponsive readers,
 * updates their status in the database, and can trigger alerts.
 *
 * **Responsibilities:**
 * - Periodic health checks (every 30 seconds)
 * - Detect unresponsive readers (no heartbeat for 60 seconds)
 * - Update reader status in database (batch updates)
 * - Emit events for status changes
 * - Track reader connectivity trends
 *
 * **Health Check Algorithm:**
 * 1. For each connection in pool:
 *    a. Check if connection has error → STATUS: ERROR
 *    b. Check if connected and not stale → STATUS: ONLINE
 *    c. Check if connected but stale (no activity) → STATUS: OFFLINE
 *    d. Otherwise → STATUS: OFFLINE
 * 2. Collect all status changes
 * 3. Batch update database (single transaction)
 * 4. Log results
 *
 * **Performance:**
 * - Check interval: 30 seconds (configurable)
 * - Batch database updates for efficiency
 * - Non-blocking (uses setInterval)
 * - Graceful degradation on errors
 *
 * @example
 * ```typescript
 * const monitor = new ReaderHealthMonitor(
 *   connectionPool,
 *   readerRepo,
 *   logger,
 *   {
 *     checkIntervalMs: 30000,
 *     staleThresholdSeconds: 60,
 *     autoStart: true
 *   }
 * );
 *
 * // Monitor starts automatically
 *
 * // Later, during shutdown:
 * monitor.stop();
 * ```
 */
export class ReaderHealthMonitor {
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly config: Required<HealthMonitorConfig>;
  private lastCheckResult: HealthCheckResult | null = null;
  private checkCount: number = 0;
  private totalStatusChanges: number = 0;

  constructor(
    private readonly connectionPool: ReaderConnectionPool,
    private readonly readerRepo: IReaderRepository,
    private readonly logger: ILogger,
    config?: HealthMonitorConfig
  ) {
    // Apply default configuration
    this.config = {
      checkIntervalMs: config?.checkIntervalMs ?? 30000,
      staleThresholdSeconds: config?.staleThresholdSeconds ?? 60,
      autoStart: config?.autoStart ?? false,
    };

    this.logger.info('ReaderHealthMonitor initialized', {
      checkIntervalMs: this.config.checkIntervalMs,
      staleThresholdSeconds: this.config.staleThresholdSeconds,
    });

    // Auto-start if configured
    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start health monitoring
   *
   * @description
   * Starts periodic health checks at configured interval.
   * Safe to call multiple times (no-op if already running).
   *
   * @example
   * ```typescript
   * monitor.start();
   * console.log('Health monitoring started');
   * ```
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Health monitor already running');
      return;
    }

    this.logger.info('Starting reader health monitor', {
      checkIntervalMs: this.config.checkIntervalMs,
      staleThresholdSeconds: this.config.staleThresholdSeconds,
    });

    this.isRunning = true;

    // Set up periodic check
    this.checkInterval = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        this.logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, this.config.checkIntervalMs);

    // Allow Node.js to exit even if interval is running
    this.checkInterval.unref();

    // Perform immediate check
    this.performHealthCheck().catch((error) => {
      this.logger.error('Initial health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Stop health monitoring
   *
   * @description
   * Stops periodic health checks.
   * Safe to call multiple times (no-op if not running).
   *
   * @example
   * ```typescript
   * monitor.stop();
   * console.log('Health monitoring stopped');
   * ```
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.debug('Health monitor not running');
      return;
    }

    this.logger.info('Stopping reader health monitor');

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform health check on all readers
   *
   * @returns Health check result
   *
   * @description
   * Checks health of all readers in connection pool and updates
   * their status in the database if changed.
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.checkCount++;

    const connections = this.connectionPool.getAll();

    this.logger.debug('Performing health check', {
      totalReaders: connections.length,
      checkNumber: this.checkCount,
    });

    const statusUpdates: Array<{
      readerId: string;
      status: ReaderStatus;
      errorMessage?: string;
    }> = [];

    const errors: string[] = [];

    // Check each connection
    for (const connection of connections) {
      try {
        const reader = connection.getReader();
        const readerId = reader.getId();
        const currentStatus = reader.getStatus();

        const newStatus = this.determineReaderStatus(connection);

        // Only update if status changed
        if (newStatus !== currentStatus) {
          const lastError = connection.getLastError();

          statusUpdates.push({
            readerId,
            status: newStatus,
            errorMessage: lastError ? lastError.message : undefined,
          });

          this.logger.info('Reader status changed', {
            readerId,
            readerName: reader.getName(),
            oldStatus: currentStatus,
            newStatus,
            errorMessage: lastError?.message,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
        this.logger.error('Error checking reader health', {
          error: errorMsg,
          readerId: connection.getReaderId(),
        });
      }
    }

    // Batch update statuses in database (system-wide, across all tenants)
    if (statusUpdates.length > 0) {
      try {
        const updateResult = await this.readerRepo.updateStatusesSystemWide(
          statusUpdates.map(({ readerId, status }) => ({ readerId, status }))
        );

        if (updateResult.isErr()) {
          const errorMsg = `Database update failed: ${updateResult.error.message}`;
          errors.push(errorMsg);
          this.logger.error('Failed to update reader statuses', {
            error: updateResult.error.message,
            updateCount: statusUpdates.length,
          });
        } else {
          this.totalStatusChanges += statusUpdates.length;
          this.logger.debug('Updated reader statuses', {
            count: statusUpdates.length,
            totalChanges: this.totalStatusChanges,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
        this.logger.error('Exception updating reader statuses', {
          error: errorMsg,
        });
      }
    }

    const duration = Date.now() - startTime;

    const result: HealthCheckResult = {
      totalReaders: connections.length,
      statusChanges: statusUpdates.length,
      errors,
      timestamp: new Date(),
      duration,
    };

    this.lastCheckResult = result;

    // Log summary
    if (statusUpdates.length > 0 || errors.length > 0) {
      this.logger.info('Health check completed', {
        totalReaders: result.totalReaders,
        statusChanges: result.statusChanges,
        errors: result.errors.length,
        durationMs: result.duration,
      });
    }

    // Warn if health check is slow
    if (duration > 5000) {
      this.logger.warn('Slow health check', {
        durationMs: duration,
        readerCount: connections.length,
      });
    }

    return result;
  }

  /**
   * Determine reader status based on connection state
   *
   * @param connection - Reader connection to check
   * @returns Determined reader status
   *
   * @description
   * Decision tree:
   * 1. Has error? → ERROR
   * 2. Connected and not stale? → ONLINE
   * 3. Connected but stale? → OFFLINE (no recent activity)
   * 4. Not connected? → OFFLINE
   */
  private determineReaderStatus(connection: any): ReaderStatus {
    // Check for errors
    if (connection.getLastError()) {
      return ReaderStatus.ERROR;
    }

    // Check if connected
    if (connection.isConnected()) {
      // Check if reader is stale (not seen recently)
      const lastSeenAt = connection.getLastSeenAt();

      if (lastSeenAt) {
        const secondsSinceLastSeen = (Date.now() - lastSeenAt.getTime()) / 1000;

        if (secondsSinceLastSeen > this.config.staleThresholdSeconds) {
          this.logger.warn('Reader is stale (no activity)', {
            readerId: connection.getReaderId(),
            secondsSinceLastSeen: Math.round(secondsSinceLastSeen),
            threshold: this.config.staleThresholdSeconds,
          });
          return ReaderStatus.OFFLINE;
        }

        return ReaderStatus.ONLINE;
      } else {
        // Connected but never seen (new connection)
        return ReaderStatus.ONLINE;
      }
    }

    // Not connected
    return ReaderStatus.OFFLINE;
  }

  /**
   * Get monitor status
   *
   * @returns Current monitor status and statistics
   */
  getStatus(): {
    isRunning: boolean;
    checkIntervalMs: number;
    staleThresholdSeconds: number;
    checkCount: number;
    totalStatusChanges: number;
    lastCheckResult: HealthCheckResult | null;
  } {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.config.checkIntervalMs,
      staleThresholdSeconds: this.config.staleThresholdSeconds,
      checkCount: this.checkCount,
      totalStatusChanges: this.totalStatusChanges,
      lastCheckResult: this.lastCheckResult,
    };
  }

  /**
   * Force immediate health check
   *
   * @returns Health check result
   *
   * @description
   * Performs health check immediately regardless of schedule.
   * Useful for manual testing or triggered checks.
   *
   * @example
   * ```typescript
   * const result = await monitor.forceCheck();
   * console.log(`Checked ${result.totalReaders} readers`);
   * console.log(`Status changes: ${result.statusChanges}`);
   * ```
   */
  async forceCheck(): Promise<HealthCheckResult> {
    this.logger.info('Forcing immediate health check');
    return await this.performHealthCheck();
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.checkCount = 0;
    this.totalStatusChanges = 0;
    this.lastCheckResult = null;
    this.logger.debug('Health monitor statistics reset');
  }

  /**
   * Cleanup resources (call on shutdown)
   */
  dispose(): void {
    this.stop();
    this.logger.info('ReaderHealthMonitor disposed');
  }
}
