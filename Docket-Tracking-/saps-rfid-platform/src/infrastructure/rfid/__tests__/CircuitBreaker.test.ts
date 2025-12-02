
import { CircuitBreaker, CircuitState } from '../CircuitBreaker';
import { ok, err } from 'neverthrow';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * CircuitBreaker Unit Tests
 *
 * @description
 * Tests for circuit breaker pattern implementation covering:
 * - State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
 * - Failure threshold detection
 * - Success threshold recovery
 * - Timeout behavior
 * - Statistics tracking
 * - Edge cases and error handling
 */
describe('CircuitBreaker', () => {
  let mockLogger: ILogger;
  let breaker: CircuitBreaker;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ILogger;

    // Reset time mocks
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      breaker = new CircuitBreaker('test-breaker', mockLogger);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.isHalfOpen()).toBe(false);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 120000,
        monitoringPeriod: 20000,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'CircuitBreaker initialized',
        expect.objectContaining({
          name: 'test-breaker',
          config: {
            failureThreshold: 10,
            successThreshold: 5,
            timeout: 120000,
            monitoringPeriod: 20000,
          },
        })
      );
    });
  });

  describe('CLOSED State - Normal Operation', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
      });
    });

    it('should execute function successfully when closed', async () => {
      const mockFn = jest.fn().mockResolvedValue(ok('success'));

      const result = await breaker.execute(mockFn);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalFailures).toBe(0);
      expect(breaker.getSuccessRate()).toBe(100);
    });

    it('should count failures but stay closed below threshold', async () => {
      const mockFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Fail 2 times (below threshold of 3)
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      expect(breaker.isClosed()).toBe(true);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(2);
      expect(stats.totalFailures).toBe(2);
    });

    it('should open circuit when failure threshold reached', async () => {
      const mockFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Fail 3 times (reaches threshold)
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      expect(breaker.isOpen()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit breaker opened',
        expect.objectContaining({
          name: 'test-breaker',
          failureCount: 3,
        })
      );

      const stats = breaker.getStats();
      expect(stats.openCount).toBe(1);
    });

    it('should reset failure count on success', async () => {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // Fail twice
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);

      const statsBeforeSuccess = breaker.getStats();
      expect(statsBeforeSuccess.failureCount).toBe(2);

      // Succeed once - should reset failure count
      await breaker.execute(mockSuccessFn);

      const statsAfterSuccess = breaker.getStats();
      expect(statsAfterSuccess.failureCount).toBe(0);
      expect(breaker.isClosed()).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Exception'));

      const result = await breaker.execute(mockFn);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('Exception');

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(1);
    });

    it('should reset failure count after monitoring period', async () => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        monitoringPeriod: 10000, // 10 seconds
      });

      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // First failure
      await breaker.execute(mockFailFn);
      expect(breaker.getStats().failureCount).toBe(1);

      // Advance time beyond monitoring period
      jest.advanceTimersByTime(11000);

      // Second failure (should reset count to 1, not increment to 2)
      await breaker.execute(mockFailFn);
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(1); // Reset to 1, not 2
    });
  });

  describe('OPEN State - Rejecting Requests', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
      });
    });

    it('should reject requests immediately when open', async () => {
      const mockFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Open the circuit
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      expect(breaker.isOpen()).toBe(true);
      mockFn.mockClear();

      // Try to execute - should be rejected without calling function
      const result = await breaker.execute(mockFn);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Circuit breaker open');
      expect(mockFn).not.toHaveBeenCalled(); // Function not executed

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Circuit breaker open, request rejected',
        expect.any(Object)
      );
    });

    it('should transition to half-open after timeout', async () => {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // Open the circuit
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);

      expect(breaker.isOpen()).toBe(true);

      // Advance time past timeout (60 seconds)
      jest.advanceTimersByTime(61000);

      // Next request should transition to half-open
      await breaker.execute(mockSuccessFn);

      expect(breaker.isHalfOpen()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker half-open (testing recovery)',
        expect.any(Object)
      );
    });

    it('should include retry time in error message', async () => {
      const mockFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Open circuit
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      // Try request
      const result = await breaker.execute(mockFn);

      expect(result.isErr()).toBe(true);
      const errorMessage = result._unsafeUnwrapErr().message;
      expect(errorMessage).toMatch(/Retry in \d+s/);
    });
  });

  describe('HALF_OPEN State - Testing Recovery', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
      });
    });

    async function openAndTransitionToHalfOpen() {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Open circuit
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);

      // Wait for timeout
      jest.advanceTimersByTime(61000);

      // Trigger transition to half-open
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));
      await breaker.execute(mockSuccessFn);
    }

    it('should close circuit after success threshold met', async () => {
      await openAndTransitionToHalfOpen();

      expect(breaker.isHalfOpen()).toBe(true);

      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // First success (need 2 total)
      await breaker.execute(mockSuccessFn);

      expect(breaker.isClosed()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker closed (recovery confirmed)',
        expect.any(Object)
      );
    });

    it('should reopen circuit immediately on failure in half-open', async () => {
      await openAndTransitionToHalfOpen();

      expect(breaker.isHalfOpen()).toBe(true);

      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Fail in half-open state
      await breaker.execute(mockFailFn);

      expect(breaker.isOpen()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker reopened (failure in half-open)',
        expect.any(Object)
      );

      const stats = breaker.getStats();
      expect(stats.openCount).toBe(2); // Opened twice
    });

    it('should track success count in half-open state', async () => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 3, // Need 3 successes to close
        timeout: 60000,
      });

      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // Open circuit
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);

      // Transition to half-open
      jest.advanceTimersByTime(61000);
      await breaker.execute(mockSuccessFn);

      expect(breaker.isHalfOpen()).toBe(true);

      // First additional success (2/3)
      await breaker.execute(mockSuccessFn);
      expect(breaker.isHalfOpen()).toBe(true);

      // Second additional success (3/3) - should close
      await breaker.execute(mockSuccessFn);
      expect(breaker.isClosed()).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 5,
        successThreshold: 2,
      });
    });

    it('should track comprehensive statistics', async () => {
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Execute mixed success/failure
      await breaker.execute(mockSuccessFn);
      await breaker.execute(mockSuccessFn);
      await breaker.execute(mockFailFn);
      await breaker.execute(mockSuccessFn);
      await breaker.execute(mockFailFn);

      const stats = breaker.getStats();

      expect(stats.totalRequests).toBe(5);
      expect(stats.totalSuccesses).toBe(3);
      expect(stats.totalFailures).toBe(2);
      expect(stats.lastSuccessTime).not.toBeNull();
      expect(stats.lastFailureTime).not.toBeNull();
      expect(stats.state).toBe(CircuitState.CLOSED);
    });

    it('should calculate success and failure rates', async () => {
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // 6 successes, 4 failures = 60% success rate
      for (let i = 0; i < 6; i++) {
        await breaker.execute(mockSuccessFn);
      }
      for (let i = 0; i < 4; i++) {
        await breaker.execute(mockFailFn);
      }

      expect(breaker.getSuccessRate()).toBe(60);
      expect(breaker.getFailureRate()).toBe(40);
    });

    it('should handle zero requests for rate calculation', () => {
      expect(breaker.getSuccessRate()).toBe(0);
      expect(breaker.getFailureRate()).toBe(0);
    });

    it('should track next attempt time when open', async () => {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await breaker.execute(mockFailFn);
      }

      const stats = breaker.getStats();
      expect(stats.nextAttemptTime).not.toBeNull();
      expect(stats.nextAttemptTime).toBeGreaterThan(Date.now());
    });

    it('should provide human-readable status summary', async () => {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // CLOSED state
      let summary = breaker.getStatusSummary();
      expect(summary).toContain('CLOSED');
      expect(summary).toContain('success rate');

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await breaker.execute(mockFailFn);
      }

      // OPEN state
      summary = breaker.getStatusSummary();
      expect(summary).toContain('OPEN');
      expect(summary).toContain('retry in');

      // Transition to HALF_OPEN
      jest.advanceTimersByTime(61000);
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));
      await breaker.execute(mockSuccessFn);

      // HALF_OPEN state
      summary = breaker.getStatusSummary();
      expect(summary).toContain('HALF_OPEN');
      expect(summary).toContain('testing');
    });
  });

  describe('Manual Control', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 3,
        successThreshold: 2,
      });
    });

    it('should allow manual reset to closed state', async () => {
      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));

      // Open circuit
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);

      expect(breaker.isOpen()).toBe(true);

      // Manual reset
      breaker.reset();

      expect(breaker.isClosed()).toBe(true);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker manually reset',
        expect.any(Object)
      );
    });

    it('should allow statistics reset', async () => {
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // Generate some statistics
      await breaker.execute(mockSuccessFn);
      await breaker.execute(mockSuccessFn);

      const statsBefore = breaker.getStats();
      expect(statsBefore.totalRequests).toBe(2);

      // Reset statistics
      breaker.resetStats();

      const statsAfter = breaker.getStats();
      expect(statsAfter.totalRequests).toBe(0);
      expect(statsAfter.totalSuccesses).toBe(0);
      expect(statsAfter.totalFailures).toBe(0);
      expect(statsAfter.lastSuccessTime).toBeNull();
      expect(statsAfter.lastFailureTime).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker('test-breaker', mockLogger);
    });

    it('should handle non-Error exceptions', async () => {
      const mockFn = jest.fn().mockRejectedValue('string error');

      const result = await breaker.execute(mockFn);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('string error');
    });

    it('should handle concurrent executions', async () => {
      const mockFn = jest.fn().mockResolvedValue(ok('success'));

      // Execute multiple concurrent requests
      const results = await Promise.all([
        breaker.execute(mockFn),
        breaker.execute(mockFn),
        breaker.execute(mockFn),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should handle rapid state transitions', async () => {
      breaker = new CircuitBreaker('test-breaker', mockLogger, {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 1000, // Short timeout
      });

      const mockFailFn = jest.fn().mockResolvedValue(err(new Error('Failure')));
      const mockSuccessFn = jest.fn().mockResolvedValue(ok('success'));

      // Open circuit
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      expect(breaker.isOpen()).toBe(true);

      // Wait and transition to half-open
      jest.advanceTimersByTime(1100);
      await breaker.execute(mockSuccessFn);
      expect(breaker.isClosed()).toBe(true);

      // Fail again
      await breaker.execute(mockFailFn);
      await breaker.execute(mockFailFn);
      expect(breaker.isOpen()).toBe(true);

      const stats = breaker.getStats();
      expect(stats.openCount).toBe(2);
    });
  });
});
