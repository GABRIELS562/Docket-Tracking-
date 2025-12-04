import { injectable, inject } from 'tsyringe';
import type { IEventBus } from '../../application/interfaces/IEventBus';
import type { ILogger } from '../../application/interfaces/ILogger';
import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';
import type { ParsedTagRead } from './TagProcessor';

/**
 * Pipeline Configuration
 */
export interface PipelineConfig {
  /**
   * Maximum events per batch
   * @default 50
   */
  maxBatchSize?: number;

  /**
   * Maximum batch wait time in milliseconds
   * @default 100
   */
  batchWindowMs?: number;

  /**
   * Maximum queue size before applying backpressure
   * @default 1000
   */
  maxQueueSize?: number;

  /**
   * Latency warning threshold in milliseconds
   * @default 500
   */
  latencyWarningMs?: number;

  /**
   * Latency error threshold in milliseconds
   * @default 1000
   */
  latencyErrorMs?: number;

  /**
   * Enable parallel processing
   * @default true
   */
  parallelProcessing?: boolean;

  /**
   * Number of parallel workers
   * @default 4
   */
  workerCount?: number;
}

/**
 * Event with timing metadata
 */
interface TimedEvent {
  event: ParsedTagRead;
  readerId: string;
  zoneId: string;
  enqueuedAt: number;
  readerTimestamp?: number;
}

/**
 * Pipeline Metrics
 */
export interface PipelineMetrics {
  totalEventsProcessed: number;
  totalBatchesProcessed: number;
  eventsPerSecond: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  queueSize: number;
  droppedEvents: number;
  backpressureEvents: number;
}

/**
 * Optimized Event Pipeline (Phase 4.2)
 *
 * High-performance event processing with:
 * - Adaptive batching (groups events for efficiency)
 * - Backpressure handling (prevents memory exhaustion)
 * - End-to-end latency tracking (sub-second target)
 * - Parallel processing (multi-worker support)
 * - Graceful degradation (drops low-priority events under load)
 *
 * Target: <1 second end-to-end latency, 1000+ events/minute, 0% critical event loss
 */
@injectable()
export class OptimizedEventPipeline {
  private eventQueue: TimedEvent[] = [];
  private processingBatch = false;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  // Metrics tracking
  private metrics: PipelineMetrics = {
    totalEventsProcessed: 0,
    totalBatchesProcessed: 0,
    eventsPerSecond: 0,
    averageLatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    maxLatencyMs: 0,
    queueSize: 0,
    droppedEvents: 0,
    backpressureEvents: 0,
  };

  // Latency samples for percentile calculation
  private latencySamples: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 1000;

  // Event counters for rate calculation
  private eventsInWindow = 0;
  private lastRateUpdate = Date.now();

  private readonly config: Required<PipelineConfig>;

  constructor(
    @inject('IEventBus') private eventBus: IEventBus,
    @inject('ILogger') private logger: ILogger
  ) {
    this.config = {
      maxBatchSize: 50,
      batchWindowMs: 100,
      maxQueueSize: 1000,
      latencyWarningMs: 500,
      latencyErrorMs: 1000,
      parallelProcessing: true,
      workerCount: 4,
    };
  }

  /**
   * Start the event pipeline
   */
  start(config?: Partial<PipelineConfig>): void {
    if (this.isRunning) {
      this.logger.warn('Event pipeline already running');
      return;
    }

    // Merge config
    Object.assign(this.config, config);

    this.isRunning = true;

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);

    this.logger.info('Optimized event pipeline started', {
      config: this.config,
    });
  }

  /**
   * Stop the event pipeline
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Process remaining events
    if (this.eventQueue.length > 0) {
      await this.processBatch();
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.logger.info('Optimized event pipeline stopped', {
      processedEvents: this.metrics.totalEventsProcessed,
      droppedEvents: this.metrics.droppedEvents,
    });
  }

  /**
   * Enqueue a tag read for processing
   *
   * @returns true if event was queued, false if dropped
   */
  enqueue(
    tagRead: ParsedTagRead,
    readerId: string,
    zoneId: string
  ): boolean {
    if (!this.isRunning) {
      this.logger.warn('Pipeline not running, dropping event');
      return false;
    }

    // Backpressure check
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.metrics.backpressureEvents++;

      // Under backpressure, drop low-priority events (weak signals)
      if (tagRead.rssi < -75) {
        this.metrics.droppedEvents++;
        this.logger.debug('Dropping low-priority event under backpressure', {
          epc: tagRead.epc,
          rssi: tagRead.rssi,
          queueSize: this.eventQueue.length,
        });
        return false;
      }

      // Remove oldest low-priority event to make room
      const lowPriorityIdx = this.eventQueue.findIndex(e => e.event.rssi < -75);
      if (lowPriorityIdx >= 0) {
        this.eventQueue.splice(lowPriorityIdx, 1);
        this.metrics.droppedEvents++;
      } else {
        // Queue full with high-priority events, drop incoming
        this.metrics.droppedEvents++;
        this.logger.warn('Queue full, dropping event', {
          epc: tagRead.epc,
          queueSize: this.eventQueue.length,
        });
        return false;
      }
    }

    // Enqueue event with timing
    const timedEvent: TimedEvent = {
      event: tagRead,
      readerId,
      zoneId,
      enqueuedAt: Date.now(),
      readerTimestamp: tagRead.lastSeenTimestamp,
    };

    this.eventQueue.push(timedEvent);
    this.eventsInWindow++;
    this.metrics.queueSize = this.eventQueue.length;

    // Trigger batch processing
    this.scheduleBatch();

    return true;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    // Already processing or timer set
    if (this.processingBatch || this.batchTimer) {
      return;
    }

    // Process immediately if batch is full
    if (this.eventQueue.length >= this.config.maxBatchSize) {
      this.processBatch();
      return;
    }

    // Schedule batch processing
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.config.batchWindowMs);
  }

  /**
   * Process a batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.eventQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batchStartTime = Date.now();

    // Take batch from queue
    const batchSize = Math.min(this.eventQueue.length, this.config.maxBatchSize);
    const batch = this.eventQueue.splice(0, batchSize);
    this.metrics.queueSize = this.eventQueue.length;

    try {
      if (this.config.parallelProcessing) {
        await this.processParallel(batch);
      } else {
        await this.processSequential(batch);
      }

      this.metrics.totalBatchesProcessed++;

      const batchTime = Date.now() - batchStartTime;
      this.logger.debug('Batch processed', {
        batchSize: batch.length,
        processingTimeMs: batchTime,
        queueRemaining: this.eventQueue.length,
      });
    } catch (error) {
      this.logger.error('Batch processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        batchSize: batch.length,
      });
    } finally {
      this.processingBatch = false;

      // Process next batch if queue has more events
      if (this.eventQueue.length > 0) {
        this.scheduleBatch();
      }
    }
  }

  /**
   * Process events in parallel
   */
  private async processParallel(batch: TimedEvent[]): Promise<void> {
    const chunkSize = Math.ceil(batch.length / this.config.workerCount);
    const chunks: TimedEvent[][] = [];

    for (let i = 0; i < batch.length; i += chunkSize) {
      chunks.push(batch.slice(i, i + chunkSize));
    }

    await Promise.all(chunks.map(chunk => this.processChunk(chunk)));
  }

  /**
   * Process events sequentially
   */
  private async processSequential(batch: TimedEvent[]): Promise<void> {
    await this.processChunk(batch);
  }

  /**
   * Process a chunk of events
   */
  private async processChunk(events: TimedEvent[]): Promise<void> {
    for (const timedEvent of events) {
      await this.processEvent(timedEvent);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(timedEvent: TimedEvent): Promise<void> {
    const { event, readerId, zoneId, enqueuedAt, readerTimestamp } = timedEvent;
    const now = Date.now();

    // Calculate latencies
    const queueLatency = now - enqueuedAt;
    const endToEndLatency = readerTimestamp
      ? now - readerTimestamp
      : queueLatency;

    // Track latency
    this.recordLatency(endToEndLatency);

    // Warn on high latency
    if (endToEndLatency > this.config.latencyErrorMs) {
      this.logger.error('High event latency detected', {
        epc: event.epc,
        latencyMs: endToEndLatency,
        queueLatencyMs: queueLatency,
        threshold: this.config.latencyErrorMs,
      });
    } else if (endToEndLatency > this.config.latencyWarningMs) {
      this.logger.warn('Event latency warning', {
        epc: event.epc,
        latencyMs: endToEndLatency,
        threshold: this.config.latencyWarningMs,
      });
    }

    // Create and publish domain event
    const tagEvent = new TagDetectedEvent(
      event.epc,
      readerId,
      zoneId,
      event.rssi,
      event.antennaPort,
      event.timestamp
    );

    await this.eventBus.publish(tagEvent);

    this.metrics.totalEventsProcessed++;
  }

  /**
   * Record latency sample
   */
  private recordLatency(latencyMs: number): void {
    this.latencySamples.push(latencyMs);

    // Keep sample window bounded
    if (this.latencySamples.length > this.MAX_LATENCY_SAMPLES) {
      this.latencySamples.shift();
    }

    // Update max
    if (latencyMs > this.metrics.maxLatencyMs) {
      this.metrics.maxLatencyMs = latencyMs;
    }
  }

  /**
   * Update metrics calculations
   */
  private updateMetrics(): void {
    const now = Date.now();
    const windowMs = now - this.lastRateUpdate;

    // Calculate events per second
    if (windowMs > 0) {
      this.metrics.eventsPerSecond = Math.round(
        (this.eventsInWindow / windowMs) * 1000
      );
    }

    // Reset window counters
    this.eventsInWindow = 0;
    this.lastRateUpdate = now;

    // Calculate latency percentiles
    if (this.latencySamples.length > 0) {
      const sorted = [...this.latencySamples].sort((a, b) => a - b);
      const len = sorted.length;

      this.metrics.averageLatencyMs = Math.round(
        sorted.reduce((a, b) => a + b, 0) / len
      );
      this.metrics.p95LatencyMs = sorted[Math.floor(len * 0.95)] || 0;
      this.metrics.p99LatencyMs = sorted[Math.floor(len * 0.99)] || 0;
    }

    // Log metrics periodically
    this.logger.debug('Pipeline metrics', {
      eventsPerSecond: this.metrics.eventsPerSecond,
      avgLatencyMs: this.metrics.averageLatencyMs,
      p95LatencyMs: this.metrics.p95LatencyMs,
      queueSize: this.metrics.queueSize,
      droppedEvents: this.metrics.droppedEvents,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealth(): {
    healthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  } {
    const healthy =
      this.isRunning &&
      this.metrics.averageLatencyMs < this.config.latencyWarningMs &&
      this.metrics.queueSize < this.config.maxQueueSize * 0.8;

    const degraded =
      this.metrics.averageLatencyMs >= this.config.latencyWarningMs ||
      this.metrics.queueSize >= this.config.maxQueueSize * 0.5;

    return {
      healthy,
      status: healthy ? 'healthy' : degraded ? 'degraded' : 'unhealthy',
      details: {
        isRunning: this.isRunning,
        queueSize: this.metrics.queueSize,
        queueCapacity: this.config.maxQueueSize,
        averageLatencyMs: this.metrics.averageLatencyMs,
        latencyThresholdMs: this.config.latencyWarningMs,
        eventsPerSecond: this.metrics.eventsPerSecond,
        droppedEvents: this.metrics.droppedEvents,
      },
    };
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalEventsProcessed: 0,
      totalBatchesProcessed: 0,
      eventsPerSecond: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      maxLatencyMs: 0,
      queueSize: 0,
      droppedEvents: 0,
      backpressureEvents: 0,
    };
    this.latencySamples = [];
    this.eventsInWindow = 0;
    this.lastRateUpdate = Date.now();
  }
}
