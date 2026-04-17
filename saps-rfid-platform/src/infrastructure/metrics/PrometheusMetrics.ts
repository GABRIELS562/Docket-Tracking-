import { injectable } from 'tsyringe';
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

/**
 * Prometheus Metrics Collector
 *
 * Provides application metrics for monitoring:
 * - HTTP request metrics
 * - RFID tag read metrics
 * - Database operation metrics
 * - System health metrics
 *
 * Metrics are exposed at /metrics endpoint for Prometheus scraping
 */
@injectable()
export class PrometheusMetrics {
  private registry: Registry;

  // HTTP Metrics
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private httpRequestsInFlight: Gauge;

  // RFID Metrics
  private rfidTagReadsTotal: Counter;
  private rfidReaderConnectionsTotal: Gauge;
  private rfidReadErrors: Counter;

  // Database Metrics
  private dbQueriesTotal: Counter;
  private dbQueryDuration: Histogram;
  private dbConnectionPoolSize: Gauge;

  // System Metrics
  private systemMemoryUsage: Gauge;
  private systemUptime: Gauge;
  private activeWebSocketConnections: Gauge;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.registry],
    });

    // RFID Metrics
    this.rfidTagReadsTotal = new Counter({
      name: 'rfid_tag_reads_total',
      help: 'Total number of RFID tag reads',
      labelNames: ['reader_id', 'zone_id'],
      registers: [this.registry],
    });

    this.rfidReaderConnectionsTotal = new Gauge({
      name: 'rfid_reader_connections_total',
      help: 'Number of connected RFID readers',
      registers: [this.registry],
    });

    this.rfidReadErrors = new Counter({
      name: 'rfid_read_errors_total',
      help: 'Total number of RFID read errors',
      labelNames: ['reader_id', 'error_type'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbConnectionPoolSize = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // System Metrics
    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.systemUptime = new Gauge({
      name: 'system_uptime_seconds',
      help: 'System uptime in seconds',
      registers: [this.registry],
    });

    this.activeWebSocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    // Start system metrics collection
    this.startSystemMetricsCollection();
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, path: string, status: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, path, status });
    this.httpRequestDuration.observe({ method, path, status }, duration);
  }

  /**
   * Increment in-flight HTTP requests
   */
  incrementHttpInFlight(): void {
    this.httpRequestsInFlight.inc();
  }

  /**
   * Decrement in-flight HTTP requests
   */
  decrementHttpInFlight(): void {
    this.httpRequestsInFlight.dec();
  }

  /**
   * Record RFID tag read
   */
  recordTagRead(readerId: string, zoneId: number): void {
    this.rfidTagReadsTotal.inc({ reader_id: readerId, zone_id: zoneId.toString() });
  }

  /**
   * Update RFID reader connection count
   */
  setReaderConnections(count: number): void {
    this.rfidReaderConnectionsTotal.set(count);
  }

  /**
   * Record RFID read error
   */
  recordRfidError(readerId: string, errorType: string): void {
    this.rfidReadErrors.inc({ reader_id: readerId, error_type: errorType });
  }

  /**
   * Record database query
   */
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueriesTotal.inc({ operation, table });
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  /**
   * Update database connection pool metrics
   */
  setDbPoolSize(total: number, idle: number, waiting: number): void {
    this.dbConnectionPoolSize.set({ state: 'total' }, total);
    this.dbConnectionPoolSize.set({ state: 'idle' }, idle);
    this.dbConnectionPoolSize.set({ state: 'waiting' }, waiting);
  }

  /**
   * Update active WebSocket connections
   */
  setWebSocketConnections(count: number): void {
    this.activeWebSocketConnections.set(count);
  }

  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection(): void {
    // Update system metrics every 10 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.systemMemoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.systemMemoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.systemMemoryUsage.set({ type: 'external' }, memUsage.external);

      this.systemUptime.set(process.uptime());
    }, 10000);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get registry (for custom metrics)
   */
  getRegistry(): Registry {
    return this.registry;
  }
}
