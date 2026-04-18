import { Server as HttpServer } from 'http';

import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { injectable, inject } from 'tsyringe';
// Redis type used by factory

import { ItemMovedEvent } from '../../domain/events/ItemMovedEvent';
import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';
import { ZoneOccupancyChangedEvent } from '../../domain/events/ZoneOccupancyChangedEvent';
import { RedisClientFactory } from '../../infrastructure/redis/RedisClient';

import type { IEventBus } from '../../application/interfaces/IEventBus';
import type { ILogger } from '../../application/interfaces/ILogger';
import type { DomainEvent } from '../../domain/events/DomainEvent';
import type { JwtConfig } from '../http/middleware/authMiddleware';

/**
 * Extended Socket with tenant context and metadata
 */
interface TenantSocket extends Socket {
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  userRole?: string;
  subscribedZones: Set<number>;
  subscribedItems: Set<string>;
  lastActivity: number;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Event priority levels for delivery ordering
 */
type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Batched event for efficient delivery
 */
interface BatchedEvent {
  event: string;
  payload: unknown;
  priority: EventPriority;
  timestamp: number;
  room?: string;
}

/**
 * WebSocket metrics for monitoring
 */
interface WebSocketMetrics {
  totalConnections: number;
  connectionsByTenant: Map<string, number>;
  eventsPerSecond: number;
  averageLatencyMs: number;
  batchedEventsCount: number;
  droppedEventsCount: number;
}

/**
 * Clustered WebSocket Server (Phase 4.1)
 *
 * Enhanced WebSocket server with:
 * - Redis adapter for horizontal scaling (100+ users)
 * - Event batching for performance optimization
 * - Priority-based event delivery
 * - Health monitoring and metrics
 * - Automatic reconnection handling
 * - Targeted room-based subscriptions
 *
 * Target: <100ms event delivery, 99.9% uptime
 */
@injectable()
export class ClusteredSocketServer {
  private io: SocketIOServer | null = null;
  private activeConnections: Map<string, TenantSocket> = new Map();
  private tenantConnections: Map<string, Set<string>> = new Map();

  // Event batching
  private eventBatch: BatchedEvent[] = [];
  private batchInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_INTERVAL_MS = 50; // Batch events every 50ms
  private readonly MAX_BATCH_SIZE = 100;

  // Metrics
  private metrics: WebSocketMetrics = {
    totalConnections: 0,
    connectionsByTenant: new Map(),
    eventsPerSecond: 0,
    averageLatencyMs: 0,
    batchedEventsCount: 0,
    droppedEventsCount: 0,
  };
  private eventCount = 0;
  private latencySum = 0;
  private latencyCount = 0;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  // Health check
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT_MS = 120000; // 2 minutes

  constructor(
    @inject('IEventBus') private eventBus: IEventBus,
    @inject('ILogger') private logger: ILogger,
    @inject('JwtConfig') private jwtConfig: JwtConfig,
    @inject(RedisClientFactory) private redisFactory: RedisClientFactory
  ) {}

  /**
   * Start clustered WebSocket server
   */
  async start(httpServer: HttpServer): Promise<void> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      // Performance optimizations
      perMessageDeflate: {
        threshold: 1024, // Only compress messages > 1KB
      },
      httpCompression: true,
      maxHttpBufferSize: 1e6, // 1MB max message size
    });

    // Set up Redis adapter for clustering
    await this.setupRedisAdapter();

    // Set up handlers
    this.setupAuthMiddleware();
    this.setupConnectionHandlers();
    this.subscribeToEvents();

    // Start batch processing
    this.startBatchProcessor();

    // Start health checks
    this.startHealthChecks();

    // Start metrics collection
    this.startMetricsCollection();

    this.logger.info('Clustered WebSocket server started', {
      features: [
        'redis-clustering',
        'event-batching',
        'priority-delivery',
        'health-monitoring',
        'multi-tenant',
      ],
    });
  }

  /**
   * Set up Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    try {
      const pubClient = this.redisFactory.getPublisher();
      const subClient = this.redisFactory.getSubscriber();

      this.io!.adapter(createAdapter(pubClient, subClient));

      this.logger.info('Redis adapter configured for WebSocket clustering');
    } catch (error) {
      this.logger.warn('Redis adapter setup failed, falling back to single-instance mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue without Redis adapter (single instance mode)
    }
  }

  /**
   * Set up JWT authentication middleware
   */
  private setupAuthMiddleware(): void {
    this.io!.use((socket: Socket, next) => {
      const tenantSocket = socket as TenantSocket;
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      // Initialize socket properties
      tenantSocket.subscribedZones = new Set();
      tenantSocket.subscribedItems = new Set();
      tenantSocket.lastActivity = Date.now();
      tenantSocket.priority = 'normal';

      if (!token) {
        this.logger.debug('Anonymous WebSocket connection', { socketId: socket.id });
        return next();
      }

      try {
        const decoded = jwt.verify(token, this.jwtConfig.secret) as {
          sub: string;
          tenantId: string;
          tenantSlug: string;
          role: string;
        };

        tenantSocket.userId = decoded.sub;
        tenantSocket.tenantId = decoded.tenantId;
        tenantSocket.tenantSlug = decoded.tenantSlug;
        tenantSocket.userRole = decoded.role;

        // Set priority based on role
        tenantSocket.priority = decoded.role === 'admin' ? 'high' : 'normal';

        next();
      } catch (error) {
        this.logger.warn('Invalid WebSocket token', { socketId: socket.id });
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Set up connection handlers
   */
  private setupConnectionHandlers(): void {
    this.io!.on('connection', (rawSocket: Socket) => {
      const socket = rawSocket as TenantSocket;
      const socketId = socket.id;
      const tenantId = socket.tenantId;

      this.activeConnections.set(socketId, socket);
      this.metrics.totalConnections = this.activeConnections.size;

      // Track by tenant
      if (tenantId) {
        if (!this.tenantConnections.has(tenantId)) {
          this.tenantConnections.set(tenantId, new Set());
        }
        this.tenantConnections.get(tenantId)!.add(socketId);
        this.metrics.connectionsByTenant.set(tenantId, this.tenantConnections.get(tenantId)!.size);

        socket.join(`tenant:${tenantId}`);
      }

      this.logger.info('Client connected', {
        socketId,
        tenantId: tenantId || 'anonymous',
        totalConnections: this.activeConnections.size,
      });

      // Send welcome with server capabilities
      socket.emit('connected', {
        socketId,
        tenantId: tenantId || null,
        authenticated: !!socket.userId,
        features: ['batching', 'priority', 'rooms'],
        serverTime: Date.now(),
      });

      // Zone subscriptions with validation
      socket.on('subscribe:zones', (zoneIds: number[]) => {
        this.handleZoneSubscription(socket, zoneIds);
      });

      // Item subscriptions
      socket.on('subscribe:item', (itemNumber: string) => {
        this.handleItemSubscription(socket, itemNumber);
      });

      // Reader subscriptions
      socket.on('subscribe:readers', () => {
        this.handleReaderSubscription(socket);
      });

      // Priority subscriptions (admin only)
      socket.on('subscribe:priority', (level: 'critical' | 'high') => {
        this.handlePrioritySubscription(socket, level);
      });

      // Bulk subscribe for efficiency
      socket.on(
        'subscribe:bulk',
        (subscriptions: { zones?: number[]; items?: string[]; readers?: boolean }) => {
          this.handleBulkSubscription(socket, subscriptions);
        }
      );

      // Unsubscribe handlers
      socket.on('unsubscribe:zones', (zoneIds: number[]) => {
        const prefix = tenantId ? `tenant:${tenantId}:` : '';
        zoneIds.forEach((zoneId) => {
          socket.leave(`${prefix}zone:${zoneId}`);
          socket.subscribedZones.delete(zoneId);
        });
      });

      socket.on('unsubscribe:item', (itemNumber: string) => {
        const prefix = tenantId ? `tenant:${tenantId}:` : '';
        socket.leave(`${prefix}item:${itemNumber}`);
        socket.subscribedItems.delete(itemNumber);
      });

      socket.on('unsubscribe:all', () => {
        this.handleUnsubscribeAll(socket);
      });

      // Heartbeat for connection health
      socket.on('ping', () => {
        socket.lastActivity = Date.now();
        socket.emit('pong', { serverTime: Date.now() });
      });

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      socket.on('error', (error) => {
        this.logger.error('Socket error', {
          socketId,
          error: error.message,
        });
      });
    });
  }

  /**
   * Subscribe to domain events and queue for batched delivery
   */
  private subscribeToEvents(): void {
    // Tag detected - high frequency, batch aggressively
    this.eventBus.subscribe('TagDetected', async (event: DomainEvent) => {
      const tagEvent = event as TagDetectedEvent;

      this.queueEvent({
        event: 'tag:detected',
        payload: {
          epc: tagEvent.rfidEpc,
          zoneId: tagEvent.zoneId,
          readerId: tagEvent.readerId,
          timestamp: tagEvent.timestamp.toISOString(),
          rssi: tagEvent.rssi,
          signalQuality: tagEvent.getSignalQuality(),
        },
        priority: 'normal',
        timestamp: Date.now(),
        room: tagEvent.zoneId ? `zone:${tagEvent.zoneId}` : undefined,
      });
    });

    // Item moved - important, higher priority
    this.eventBus.subscribe('ItemMoved', async (event: DomainEvent) => {
      const moveEvent = event as ItemMovedEvent;

      const payload = {
        itemNumber: moveEvent.itemNumber,
        fromZoneId: moveEvent.fromZoneId,
        toZoneId: moveEvent.toZoneId,
        timestamp: moveEvent.movedAt.toISOString(),
      };

      // Send to both zones
      if (moveEvent.fromZoneId) {
        this.queueEvent({
          event: 'item:moved',
          payload,
          priority: 'high',
          timestamp: Date.now(),
          room: `zone:${moveEvent.fromZoneId}`,
        });
      }

      this.queueEvent({
        event: 'item:moved',
        payload,
        priority: 'high',
        timestamp: Date.now(),
        room: `zone:${moveEvent.toZoneId}`,
      });

      // Send to item subscribers
      this.queueEvent({
        event: 'item:moved',
        payload,
        priority: 'high',
        timestamp: Date.now(),
        room: `item:${moveEvent.itemNumber}`,
      });
    });

    // Zone occupancy - moderate priority
    this.eventBus.subscribe('ZoneOccupancyChanged', async (event: DomainEvent) => {
      const occupancyEvent = event as ZoneOccupancyChangedEvent;

      const occupancyPercent = Math.round(
        (occupancyEvent.currentOccupancy / occupancyEvent.capacity) * 100
      );

      // Critical if zone is full or near full
      const priority: EventPriority =
        occupancyPercent >= 100 ? 'critical' : occupancyPercent >= 90 ? 'high' : 'normal';

      this.queueEvent({
        event: 'zone:occupancy',
        payload: {
          zoneId: occupancyEvent.zoneId,
          occupancy: occupancyEvent.currentOccupancy,
          capacity: occupancyEvent.capacity,
          occupancyPercentage: occupancyPercent,
          status:
            occupancyPercent >= 100
              ? 'full'
              : occupancyPercent >= 90
                ? 'critical'
                : occupancyPercent >= 70
                  ? 'warning'
                  : 'normal',
          timestamp: occupancyEvent.occurredAt.toISOString(),
        },
        priority,
        timestamp: Date.now(),
        room: `zone:${occupancyEvent.zoneId}`,
      });
    });
  }

  /**
   * Queue event for batched delivery
   */
  private queueEvent(event: BatchedEvent): void {
    // Check batch size limit
    if (this.eventBatch.length >= this.MAX_BATCH_SIZE) {
      this.metrics.droppedEventsCount++;
      this.logger.warn('Event batch full, dropping event', { event: event.event });
      return;
    }

    this.eventBatch.push(event);
    this.metrics.batchedEventsCount++;
    this.eventCount++;
  }

  /**
   * Start batch processor for efficient event delivery
   */
  private startBatchProcessor(): void {
    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, this.BATCH_INTERVAL_MS);
  }

  /**
   * Process and deliver batched events
   */
  private processBatch(): void {
    if (this.eventBatch.length === 0) return;

    const startTime = Date.now();

    // Sort by priority (critical first)
    const priorityOrder: Record<EventPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    this.eventBatch.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Group events by room for efficient delivery
    const roomEvents = new Map<string, BatchedEvent[]>();
    const broadcastEvents: BatchedEvent[] = [];

    for (const event of this.eventBatch) {
      if (event.room) {
        const existing = roomEvents.get(event.room) || [];
        existing.push(event);
        roomEvents.set(event.room, existing);
      } else {
        broadcastEvents.push(event);
      }
    }

    // Deliver to rooms
    for (const [room, events] of roomEvents) {
      const firstEvent = events[0];
      if (events.length === 1 && firstEvent) {
        this.io!.to(room).emit(firstEvent.event, firstEvent.payload);
      } else if (events.length > 0) {
        // Send as batch for efficiency
        this.io!.to(room).emit(
          'events:batch',
          events.map((e) => ({
            event: e.event,
            payload: e.payload,
          }))
        );
      }
    }

    // Broadcast events
    for (const event of broadcastEvents) {
      this.io!.emit(event.event, event.payload);
    }

    // Update latency metrics
    const processingTime = Date.now() - startTime;
    this.latencySum += processingTime;
    this.latencyCount++;

    // Clear batch
    this.eventBatch = [];
  }

  /**
   * Handle zone subscription with validation
   */
  private handleZoneSubscription(socket: TenantSocket, zoneIds: number[]): void {
    if (!Array.isArray(zoneIds) || zoneIds.length > 50) {
      socket.emit('error', { code: 'INVALID_SUBSCRIPTION', message: 'Invalid zone IDs' });
      return;
    }

    const prefix = socket.tenantId ? `tenant:${socket.tenantId}:` : '';

    zoneIds.forEach((zoneId) => {
      if (typeof zoneId === 'number' && zoneId > 0) {
        socket.join(`${prefix}zone:${zoneId}`);
        socket.subscribedZones.add(zoneId);
      }
    });

    socket.lastActivity = Date.now();

    socket.emit('subscribed', {
      type: 'zones',
      zoneIds,
      timestamp: Date.now(),
    });

    this.logger.debug('Zone subscription', {
      socketId: socket.id,
      zoneIds,
      tenantId: socket.tenantId,
    });
  }

  /**
   * Handle item subscription
   */
  private handleItemSubscription(socket: TenantSocket, itemNumber: string): void {
    if (typeof itemNumber !== 'string' || !itemNumber.match(/^INV-\d{4}-\d{6}$/)) {
      socket.emit('error', { code: 'INVALID_ITEM', message: 'Invalid item number' });
      return;
    }

    const prefix = socket.tenantId ? `tenant:${socket.tenantId}:` : '';
    socket.join(`${prefix}item:${itemNumber}`);
    socket.subscribedItems.add(itemNumber);
    socket.lastActivity = Date.now();

    socket.emit('subscribed', {
      type: 'item',
      itemNumber,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle reader subscription
   */
  private handleReaderSubscription(socket: TenantSocket): void {
    const prefix = socket.tenantId ? `tenant:${socket.tenantId}:` : '';
    socket.join(`${prefix}readers`);
    socket.lastActivity = Date.now();

    socket.emit('subscribed', {
      type: 'readers',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle priority subscription (admin only)
   */
  private handlePrioritySubscription(socket: TenantSocket, level: 'critical' | 'high'): void {
    if (socket.userRole !== 'admin') {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'Admin only' });
      return;
    }

    socket.join(`priority:${level}`);
    socket.emit('subscribed', {
      type: 'priority',
      level,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle bulk subscription for efficiency
   */
  private handleBulkSubscription(
    socket: TenantSocket,
    subscriptions: { zones?: number[]; items?: string[]; readers?: boolean }
  ): void {
    if (subscriptions.zones) {
      this.handleZoneSubscription(socket, subscriptions.zones);
    }

    if (subscriptions.items) {
      subscriptions.items.forEach((item) => {
        this.handleItemSubscription(socket, item);
      });
    }

    if (subscriptions.readers) {
      this.handleReaderSubscription(socket);
    }
  }

  /**
   * Handle unsubscribe all
   */
  private handleUnsubscribeAll(socket: TenantSocket): void {
    const prefix = socket.tenantId ? `tenant:${socket.tenantId}:` : '';

    socket.subscribedZones.forEach((zoneId) => {
      socket.leave(`${prefix}zone:${zoneId}`);
    });

    socket.subscribedItems.forEach((itemNumber) => {
      socket.leave(`${prefix}item:${itemNumber}`);
    });

    socket.leave(`${prefix}readers`);

    socket.subscribedZones.clear();
    socket.subscribedItems.clear();

    socket.emit('unsubscribed', { all: true, timestamp: Date.now() });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: TenantSocket, reason: string): void {
    const socketId = socket.id;
    const tenantId = socket.tenantId;

    this.activeConnections.delete(socketId);

    if (tenantId && this.tenantConnections.has(tenantId)) {
      this.tenantConnections.get(tenantId)!.delete(socketId);
      if (this.tenantConnections.get(tenantId)!.size === 0) {
        this.tenantConnections.delete(tenantId);
        this.metrics.connectionsByTenant.delete(tenantId);
      } else {
        this.metrics.connectionsByTenant.set(tenantId, this.tenantConnections.get(tenantId)!.size);
      }
    }

    this.metrics.totalConnections = this.activeConnections.size;

    this.logger.info('Client disconnected', {
      socketId,
      tenantId: tenantId || 'anonymous',
      reason,
      totalConnections: this.activeConnections.size,
    });
  }

  /**
   * Start health checks for stale connections
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [socketId, socket] of this.activeConnections) {
        if (now - socket.lastActivity > this.CONNECTION_TIMEOUT_MS) {
          staleConnections.push(socketId);
        }
      }

      if (staleConnections.length > 0) {
        this.logger.info('Disconnecting stale connections', {
          count: staleConnections.length,
        });

        staleConnections.forEach((socketId) => {
          const socket = this.activeConnections.get(socketId);
          if (socket) {
            socket.emit('timeout', { message: 'Connection timeout' });
            socket.disconnect(true);
          }
        });
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.metrics.eventsPerSecond = this.eventCount;
      this.metrics.averageLatencyMs =
        this.latencyCount > 0 ? this.latencySum / this.latencyCount : 0;

      // Reset counters
      this.eventCount = 0;
      this.latencySum = 0;
      this.latencyCount = 0;
    }, 1000);
  }

  /**
   * Broadcast to specific tenant
   */
  broadcastToTenant(tenantId: string, event: string, data: unknown): void {
    this.io?.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Broadcast to zone within tenant
   */
  broadcastToZone(tenantId: string, zoneId: number, event: string, data: unknown): void {
    this.io?.to(`tenant:${tenantId}:zone:${zoneId}`).emit(event, data);
  }

  /**
   * Broadcast critical event to priority subscribers
   */
  broadcastCritical(event: string, data: unknown): void {
    this.io?.to('priority:critical').emit(event, data);
    this.io?.to('priority:high').emit(event, data);
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active connection count
   */
  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  /**
   * Get connections by tenant
   */
  getConnectionsByTenant(): Map<string, number> {
    return new Map(this.metrics.connectionsByTenant);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Process remaining events
    this.processBatch();

    if (this.io) {
      this.io.emit('server:shutdown', { timestamp: Date.now() });
      this.io.close();
      this.activeConnections.clear();
      this.tenantConnections.clear();
    }

    this.logger.info('Clustered WebSocket server stopped');
  }
}
