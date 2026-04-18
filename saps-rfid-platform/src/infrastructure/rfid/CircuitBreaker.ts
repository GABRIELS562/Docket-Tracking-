import { err } from 'neverthrow';

import type { ILogger } from '../../application/interfaces/ILogger';
import type { Result } from 'neverthrow';

/**
 * Circuit Breaker States
 *
 * @description
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold reached, reject all requests
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Number of successes to close from half-open
   * @default 2
   */
  successThreshold?: number;

  /**
   * Milliseconds before attempting half-open from open
   * @default 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Milliseconds window to track failures
   * @default 10000 (10 seconds)
   */
  monitoringPeriod?: number;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
  openCount: number;
}

/**
 * CircuitBreaker - Prevents cascading failures
 *
 * @description
 * Implementation of the Circuit Breaker pattern to prevent repeated
 * attempts to execute operations that are likely to fail.
 *
 * **Pattern:**
 * If a service (e.g., RFID reader) keeps failing, stop trying for a while
 * instead of overwhelming it with requests. After a timeout, test if it
 * has recovered.
 *
 * **States:**
 * - **CLOSED** (Normal): All requests pass through, failures are counted
 * - **OPEN** (Failing): All requests rejected immediately, wait for timeout
 * - **HALF_OPEN** (Testing): Limited requests allowed to test recovery
 *
 * **Use Cases:**
 * - RFID reader connection failures
 * - Database connection pool exhaustion
 * - External API timeouts
 * - Network failures
 *
 * **Benefits:**
 * - Prevent resource exhaustion from repeated failures
 * - Faster failure detection (fail fast)
 * - Automatic recovery testing
 * - Improved system stability
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker('reader-storage-001', logger, {
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 * });
 *
 * // Execute with circuit breaker protection
 * const result = await breaker.execute(async () => {
 *   return await connectToReader();
 * });
 *
 * if (result.isErr()) {
 *   if (result.error.message.includes('Circuit breaker open')) {
 *     console.log('Reader offline, skipping connection attempt');
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private openCount: number = 0;

  constructor(
    private readonly name: string,
    private readonly logger: ILogger,
    config?: CircuitBreakerConfig
  ) {
    // Apply default configuration
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000,
      monitoringPeriod: config?.monitoringPeriod ?? 10000,
    };

    this.logger.debug('CircuitBreaker initialized', {
      name: this.name,
      config: this.config,
    });
  }

  /**
   * Execute function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns Result from function or circuit breaker error
   *
   * @description
   * Wraps function execution with circuit breaker logic:
   * 1. Check if circuit is open → reject immediately
   * 2. If open but timeout expired → transition to half-open
   * 3. Execute function
   * 4. On success → count success, maybe close circuit
   * 5. On failure → count failure, maybe open circuit
   *
   * @example
   * ```typescript
   * const result = await breaker.execute(async () => {
   *   const response = await fetch('https://api.example.com/data');
   *   if (!response.ok) {
   *     return err(new Error('API returned ' + response.status));
   *   }
   *   const data = await response.json();
   *   return ok(data);
   * });
   *
   * if (result.isErr()) {
   *   console.error('Request failed:', result.error);
   * }
   * ```
   */
  async execute<T>(fn: () => Promise<Result<T, Error>>): Promise<Result<T, Error>> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();

      if (now < this.nextAttemptTime) {
        // Circuit still open - reject immediately (fail fast)
        const waitTimeMs = this.nextAttemptTime - now;

        this.logger.debug('Circuit breaker open, request rejected', {
          name: this.name,
          waitTimeMs: Math.round(waitTimeMs),
        });

        return err(
          new Error(
            `Circuit breaker open for ${this.name}. ` + `Retry in ${Math.round(waitTimeMs / 1000)}s`
          )
        );
      }

      // Timeout expired - try half-open
      this.transitionToHalfOpen();
    }

    // Execute function
    try {
      const result = await fn();

      if (result.isOk()) {
        this.onSuccess();
        return result;
      } else {
        this.onFailure(result.error);
        return result;
      }
    } catch (error) {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      this.onFailure(wrappedError);
      return err(wrappedError);
    }
  }

  /**
   * Handle successful execution
   *
   * @description
   * - Reset failure count
   * - In HALF_OPEN: count successes, close if threshold reached
   * - In CLOSED: no special action
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      this.logger.debug('Circuit breaker success in half-open', {
        name: this.name,
        successCount: this.successCount,
        successThreshold: this.config.successThreshold,
      });

      if (this.successCount >= this.config.successThreshold) {
        // Enough successes - close circuit
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handle failed execution
   *
   * @param error - Error that occurred
   *
   * @description
   * - Count failure
   * - Reset success count
   * - Check if monitoring period expired (reset if so)
   * - Open circuit if failure threshold reached
   * - In HALF_OPEN: open circuit immediately on failure
   */
  private onFailure(error: Error): void {
    const now = Date.now();
    this.totalFailures++;
    this.successCount = 0;

    // Reset failure count if outside monitoring period
    const timeSinceLastFailure = now - this.lastFailureTime;
    if (this.lastFailureTime > 0 && timeSinceLastFailure > this.config.monitoringPeriod) {
      this.failureCount = 1;
    } else {
      this.failureCount++;
    }

    // Update last failure time AFTER checking period
    this.lastFailureTime = now;

    this.logger.debug('Circuit breaker failure', {
      name: this.name,
      failureCount: this.failureCount,
      failureThreshold: this.config.failureThreshold,
      state: this.state,
      error: error.message,
    });

    // In HALF_OPEN: open immediately on failure
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.info('Circuit breaker reopened (failure in half-open)', {
        name: this.name,
      });
      this.transitionToOpen();
      return;
    }

    // In CLOSED: open if threshold reached
    if (this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.openCount++;

    this.logger.warn('Circuit breaker opened', {
      name: this.name,
      failureCount: this.failureCount,
      nextAttemptIn: `${this.config.timeout}ms`,
      totalOpens: this.openCount,
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;

    this.logger.info('Circuit breaker half-open (testing recovery)', {
      name: this.name,
    });
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;

    this.logger.info('Circuit breaker closed (recovery confirmed)', {
      name: this.name,
      totalOpens: this.openCount,
    });
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime || null,
      lastSuccessTime: this.lastSuccessTime || null,
      nextAttemptTime: this.state === CircuitState.OPEN ? this.nextAttemptTime : null,
      openCount: this.openCount,
    };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.totalRequests === 0) {
      return 0;
    }
    return Math.round((this.totalSuccesses / this.totalRequests) * 10000) / 100;
  }

  /**
   * Get failure rate percentage
   */
  getFailureRate(): number {
    if (this.totalRequests === 0) {
      return 0;
    }
    return Math.round((this.totalFailures / this.totalRequests) * 10000) / 100;
  }

  /**
   * Force reset circuit breaker to CLOSED state
   *
   * @description
   * Manually resets the circuit breaker, clearing all counters.
   * Use with caution - typically for administrative actions or testing.
   *
   * @example
   * ```typescript
   * // Admin: Force reset after fixing underlying issue
   * breaker.reset();
   * console.log('Circuit breaker manually reset');
   * ```
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;

    this.logger.info('Circuit breaker manually reset', {
      name: this.name,
    });
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.openCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;

    this.logger.debug('Circuit breaker statistics reset', {
      name: this.name,
    });
  }

  /**
   * Get human-readable status
   */
  getStatusSummary(): string {
    const stats = this.getStats();
    const successRate = this.getSuccessRate();

    if (this.state === CircuitState.OPEN) {
      const waitTimeMs = stats.nextAttemptTime! - Date.now();
      const waitTimeSec = Math.ceil(waitTimeMs / 1000);
      return `OPEN (retry in ${waitTimeSec}s, ${this.failureCount} failures)`;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return `HALF_OPEN (testing, ${this.successCount}/${this.config.successThreshold} successes)`;
    }

    return `CLOSED (success rate: ${successRate}%, ${this.totalRequests} total requests)`;
  }
}
