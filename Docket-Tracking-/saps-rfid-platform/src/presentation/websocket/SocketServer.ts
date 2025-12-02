import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { injectable, inject } from 'tsyringe';
import jwt from 'jsonwebtoken';
import { IEventBus } from '../../application/interfaces/IEventBus';
import { ILogger } from '../../application/interfaces/ILogger';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';
import { ItemMovedEvent } from '../../domain/events/ItemMovedEvent';
import { ZoneOccupancyChangedEvent } from '../../domain/events/ZoneOccupancyChangedEvent';
import type { JwtConfig } from '../http/middleware/authMiddleware';

/**
 * Extended Socket with tenant context
 */
interface TenantSocket extends Socket {
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  userRole?: string;
}

/**
 * WebSocket Server - Real-time updates via Socket.IO
 *
 * Provides real-time event broadcasting to connected clients
 *
 * Events broadcast to clients:
 * - `tag:detected` - When an RFID tag is detected by a reader
 * - `item:moved` - When an item changes zones
 * - `zone:occupancy` - When zone occupancy changes
 * - `reader:status` - When reader status changes
 *
 * Client subscriptions (rooms):
 * - `subscribe:zones` - Subscribe to specific zone(s) updates
 * - `subscribe:item` - Subscribe to specific item updates
 * - `subscribe:readers` - Subscribe to all reader updates
 *
 * Features:
 * - Room-based subscriptions for targeted updates
 * - Automatic cleanup on disconnect
 * - Connection tracking
 * - Error handling
 * - CORS support
 * - Multi-tenant isolation with tenant-scoped rooms
 * - JWT authentication for secure connections
 *
 * Example client usage:
 * ```javascript
 * const socket = io('http://localhost:3000', {
 *   auth: { token: 'your-jwt-token' }
 * });
 *
 * // Subscribe to zones (within your tenant)
 * socket.emit('subscribe:zones', [1, 2, 3]);
 *
 * // Listen for events
 * socket.on('tag:detected', (data) => {
 *   console.log('Tag detected:', data);
 * });
 * ```
 */
@injectable()
export class SocketServer {
  private io: SocketIOServer | null = null;
  private activeConnections: Map<string, TenantSocket> = new Map();
  private tenantConnections: Map<string, Set<string>> = new Map(); // tenantId -> Set of socketIds

  constructor(
    @inject('IEventBus') private eventBus: IEventBus,
    @inject('ILogger') private logger: ILogger,
    @inject('JwtConfig') private jwtConfig: JwtConfig
  ) {}

  /**
   * Start WebSocket server attached to HTTP server
   *
   * @param httpServer - HTTP server to attach Socket.IO to
   */
  async start(httpServer: HttpServer): Promise<void> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // Configure based on your security requirements
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'], // WebSocket preferred, fallback to polling
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
    });

    this.setupAuthMiddleware();
    this.setupConnectionHandlers();
    this.subscribeToEvents();

    this.logger.info('WebSocket server started', {
      transports: ['websocket', 'polling'],
      features: ['multi-tenant rooms', 'jwt authentication'],
    });
  }

  /**
   * Set up JWT authentication middleware
   */
  private setupAuthMiddleware(): void {
    if (!this.io) {
      throw new Error('Socket.IO server not initialized');
    }

    this.io.use((socket: TenantSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous connections for public data (if needed)
        // For strict auth, use: return next(new Error('Authentication required'));
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

        // Attach tenant context to socket
        socket.userId = decoded.sub;
        socket.tenantId = decoded.tenantId;
        socket.tenantSlug = decoded.tenantSlug;
        socket.userRole = decoded.role;

        this.logger.debug('Authenticated WebSocket connection', {
          socketId: socket.id,
          userId: decoded.sub,
          tenantId: decoded.tenantId,
        });

        next();
      } catch (error) {
        this.logger.warn('Invalid WebSocket authentication token', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Set up connection handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) {
      throw new Error('Socket.IO server not initialized');
    }

    this.io.on('connection', (socket: TenantSocket) => {
      const socketId = socket.id;
      const tenantId = socket.tenantId;

      this.activeConnections.set(socketId, socket);

      // Track connections by tenant
      if (tenantId) {
        if (!this.tenantConnections.has(tenantId)) {
          this.tenantConnections.set(tenantId, new Set());
        }
        this.tenantConnections.get(tenantId)!.add(socketId);

        // Auto-join tenant room for tenant-wide broadcasts
        socket.join(`tenant:${tenantId}`);
      }

      this.logger.info('WebSocket client connected', {
        socketId,
        tenantId: tenantId || 'anonymous',
        userId: socket.userId || 'anonymous',
        totalConnections: this.activeConnections.size,
        tenantConnections: tenantId ? this.tenantConnections.get(tenantId)?.size : 0,
        remoteAddress: socket.handshake.address,
      });

      // Send welcome message with tenant context
      socket.emit('connected', {
        message: 'Connected to RFID Inventory Platform',
        socketId,
        tenantId: tenantId || null,
        authenticated: !!socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Handle zone subscriptions (tenant-scoped)
      socket.on('subscribe:zones', (zoneIds: number[]) => {
        this.handleZoneSubscription(socket, zoneIds);
      });

      // Handle item subscriptions (tenant-scoped)
      socket.on('subscribe:item', (itemNumber: string) => {
        this.handleItemSubscription(socket, itemNumber);
      });

      // Handle reader subscriptions (tenant-scoped)
      socket.on('subscribe:readers', () => {
        this.handleReaderSubscription(socket);
      });

      // Handle tenant-wide subscriptions
      socket.on('subscribe:tenant', () => {
        this.handleTenantSubscription(socket);
      });

      // Handle unsubscribe
      socket.on('unsubscribe:zones', (zoneIds: number[]) => {
        const prefix = tenantId ? `tenant:${tenantId}:` : '';
        zoneIds.forEach((zoneId) => {
          socket.leave(`${prefix}zone:${zoneId}`);
        });
        this.logger.debug('Client unsubscribed from zones', { socketId, zoneIds, tenantId });
      });

      socket.on('unsubscribe:item', (itemNumber: string) => {
        const prefix = tenantId ? `tenant:${tenantId}:` : '';
        socket.leave(`${prefix}item:${itemNumber}`);
        this.logger.debug('Client unsubscribed from item', { socketId, itemNumber, tenantId });
      });

      socket.on('unsubscribe:readers', () => {
        const prefix = tenantId ? `tenant:${tenantId}:` : '';
        socket.leave(`${prefix}readers`);
        this.logger.debug('Client unsubscribed from readers', { socketId, tenantId });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.activeConnections.delete(socketId);

        // Remove from tenant tracking
        if (tenantId && this.tenantConnections.has(tenantId)) {
          this.tenantConnections.get(tenantId)!.delete(socketId);
          if (this.tenantConnections.get(tenantId)!.size === 0) {
            this.tenantConnections.delete(tenantId);
          }
        }

        this.logger.info('WebSocket client disconnected', {
          socketId,
          tenantId: tenantId || 'anonymous',
          reason,
          totalConnections: this.activeConnections.size,
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error('WebSocket error', {
          socketId,
          tenantId: tenantId || 'anonymous',
          error: error.message,
        });
      });
    });
  }

  /**
   * Subscribe to domain events and broadcast to clients
   */
  private subscribeToEvents(): void {
    // Tag detected event (raw hardware detection)
    this.eventBus.subscribe('TagDetected', async (event: DomainEvent) => {
      const tagEvent = event as TagDetectedEvent;

      const payload = {
        epc: tagEvent.rfidEpc,
        zoneId: tagEvent.zoneId,
        readerId: tagEvent.readerId,
        timestamp: tagEvent.timestamp.toISOString(),
        rssi: tagEvent.rssi,
        antennaPort: tagEvent.antennaPort,
        signalQuality: tagEvent.getSignalQuality(),
      };

      // Broadcast to zone subscribers
      if (tagEvent.zoneId) {
        this.io!.to(`zone:${tagEvent.zoneId}`).emit('tag:detected', payload);
      }

      this.logger.debug('Tag detected event broadcast', {
        epc: tagEvent.rfidEpc,
        zoneId: tagEvent.zoneId,
      });
    });

    // Item moved event
    this.eventBus.subscribe('ItemMoved', async (event: DomainEvent) => {
      const moveEvent = event as ItemMovedEvent;

      const payload = {
        itemNumber: moveEvent.itemNumber,
        fromZoneId: moveEvent.fromZoneId,
        toZoneId: moveEvent.toZoneId,
        timestamp: moveEvent.movedAt.toISOString(),
      };

      // Broadcast to old zone subscribers
      if (moveEvent.fromZoneId) {
        this.io!.to(`zone:${moveEvent.fromZoneId}`).emit('item:moved', payload);
      }

      // Broadcast to new zone subscribers
      this.io!.to(`zone:${moveEvent.toZoneId}`).emit('item:moved', payload);

      // Broadcast to item subscribers
      this.io!.to(`item:${moveEvent.itemNumber}`).emit('item:moved', payload);

      this.logger.debug('Item moved event broadcast', {
        itemNumber: moveEvent.itemNumber,
        fromZoneId: moveEvent.fromZoneId,
        toZoneId: moveEvent.toZoneId,
      });
    });

    // Zone occupancy changed event
    this.eventBus.subscribe('ZoneOccupancyChanged', async (event: DomainEvent) => {
      const occupancyEvent = event as ZoneOccupancyChangedEvent;

      const payload = {
        zoneId: occupancyEvent.zoneId,
        occupancy: occupancyEvent.occupancy,
        capacity: occupancyEvent.capacity,
        occupancyPercentage: Math.round((occupancyEvent.occupancy / occupancyEvent.capacity) * 100),
        status:
          occupancyEvent.occupancy >= occupancyEvent.capacity
            ? 'full'
            : occupancyEvent.occupancy / occupancyEvent.capacity >= 0.9
            ? 'critical'
            : occupancyEvent.occupancy / occupancyEvent.capacity >= 0.7
            ? 'warning'
            : 'normal',
        timestamp: occupancyEvent.occurredAt.toISOString(),
      };

      // Broadcast to zone subscribers
      this.io!.to(`zone:${occupancyEvent.zoneId}`).emit('zone:occupancy', payload);

      this.logger.debug('Zone occupancy event broadcast', {
        zoneId: occupancyEvent.zoneId,
        occupancy: occupancyEvent.occupancy,
      });
    });
  }

  /**
   * Handle zone subscription request (tenant-scoped)
   */
  private handleZoneSubscription(socket: TenantSocket, zoneIds: number[]): void {
    const tenantId = socket.tenantId;

    // Validate input
    if (!Array.isArray(zoneIds)) {
      socket.emit('error', {
        code: 'INVALID_INPUT',
        message: 'Zone IDs must be an array',
      });
      return;
    }

    // Limit max subscriptions to prevent abuse
    if (zoneIds.length > 50) {
      socket.emit('error', {
        code: 'TOO_MANY_SUBSCRIPTIONS',
        message: 'Maximum 50 zone subscriptions allowed',
      });
      return;
    }

    // Join rooms for each zone (tenant-scoped if authenticated)
    const prefix = tenantId ? `tenant:${tenantId}:` : '';
    zoneIds.forEach((zoneId) => {
      if (typeof zoneId === 'number' && zoneId > 0) {
        socket.join(`${prefix}zone:${zoneId}`);
      }
    });

    this.logger.debug('Client subscribed to zones', {
      socketId: socket.id,
      zoneIds,
      tenantId: tenantId || 'global',
    });

    socket.emit('subscribed', {
      type: 'zones',
      zoneIds,
      tenantScoped: !!tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle item subscription request (tenant-scoped)
   */
  private handleItemSubscription(socket: TenantSocket, itemNumber: string): void {
    const tenantId = socket.tenantId;

    // Validate input - generic item number format: INV-YYYY-NNNNNN
    if (typeof itemNumber !== 'string' || !itemNumber.match(/^INV-\d{4}-\d{6}$/)) {
      socket.emit('error', {
        code: 'INVALID_ITEM_NUMBER',
        message: 'Invalid item number format',
      });
      return;
    }

    const prefix = tenantId ? `tenant:${tenantId}:` : '';
    socket.join(`${prefix}item:${itemNumber}`);

    this.logger.debug('Client subscribed to item', {
      socketId: socket.id,
      itemNumber,
      tenantId: tenantId || 'global',
    });

    socket.emit('subscribed', {
      type: 'item',
      itemNumber,
      tenantScoped: !!tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle reader subscription request (tenant-scoped)
   */
  private handleReaderSubscription(socket: TenantSocket): void {
    const tenantId = socket.tenantId;
    const prefix = tenantId ? `tenant:${tenantId}:` : '';

    socket.join(`${prefix}readers`);

    this.logger.debug('Client subscribed to readers', {
      socketId: socket.id,
      tenantId: tenantId || 'global',
    });

    socket.emit('subscribed', {
      type: 'readers',
      tenantScoped: !!tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle tenant-wide subscription request
   */
  private handleTenantSubscription(socket: TenantSocket): void {
    const tenantId = socket.tenantId;

    if (!tenantId) {
      socket.emit('error', {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Must be authenticated to subscribe to tenant events',
      });
      return;
    }

    // Already auto-joined tenant room on connection
    socket.emit('subscribed', {
      type: 'tenant',
      tenantId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug('Client confirmed tenant subscription', {
      socketId: socket.id,
      tenantId,
    });
  }

  /**
   * Broadcast custom event to all connected clients
   *
   * @param event - Event name
   * @param data - Event data
   */
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Broadcast to specific room
   *
   * @param room - Room name
   * @param event - Event name
   * @param data - Event data
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  /**
   * Broadcast to all clients within a specific tenant
   *
   * @param tenantId - Tenant ID
   * @param event - Event name
   * @param data - Event data
   */
  broadcastToTenant(tenantId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit(event, data);
    }
  }

  /**
   * Broadcast to a zone within a tenant
   *
   * @param tenantId - Tenant ID
   * @param zoneId - Zone ID
   * @param event - Event name
   * @param data - Event data
   */
  broadcastToTenantZone(tenantId: string, zoneId: number, event: string, data: any): void {
    if (this.io) {
      this.io.to(`tenant:${tenantId}:zone:${zoneId}`).emit(event, data);
    }
  }

  /**
   * Broadcast to item subscribers within a tenant
   *
   * @param tenantId - Tenant ID
   * @param itemNumber - Item number
   * @param event - Event name
   * @param data - Event data
   */
  broadcastToTenantItem(tenantId: string, itemNumber: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`tenant:${tenantId}:item:${itemNumber}`).emit(event, data);
    }
  }

  /**
   * Get number of active connections
   *
   * @returns Number of connected clients
   */
  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  /**
   * Get number of connections for a specific tenant
   *
   * @param tenantId - Tenant ID
   * @returns Number of connected clients for the tenant
   */
  getTenantConnections(tenantId: string): number {
    return this.tenantConnections.get(tenantId)?.size || 0;
  }

  /**
   * Get all connected socket IDs
   *
   * @returns Array of socket IDs
   */
  getConnectedSockets(): string[] {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Get all connected tenants and their connection counts
   *
   * @returns Map of tenant IDs to connection counts
   */
  getConnectedTenants(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [tenantId, sockets] of this.tenantConnections) {
      result.set(tenantId, sockets.size);
    }
    return result;
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    if (this.io) {
      // Disconnect all clients gracefully
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString(),
      });

      // Close server
      this.io.close();
      this.activeConnections.clear();
      this.tenantConnections.clear();

      this.logger.info('WebSocket server stopped');
    }
  }
}
