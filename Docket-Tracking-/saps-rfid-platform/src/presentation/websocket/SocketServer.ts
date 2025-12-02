import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { injectable, inject } from 'tsyringe';
import { IEventBus } from '../../application/interfaces/IEventBus';
import { ILogger } from '../../application/interfaces/ILogger';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';
import { ItemMovedEvent } from '../../domain/events/ItemMovedEvent';
import { ZoneOccupancyChangedEvent } from '../../domain/events/ZoneOccupancyChangedEvent';

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
 *
 * Example client usage:
 * ```javascript
 * const socket = io('http://localhost:3000');
 *
 * // Subscribe to zones
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
  private activeConnections: Map<string, Socket> = new Map();

  constructor(
    @inject('IEventBus') private eventBus: IEventBus,
    @inject('ILogger') private logger: ILogger
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

    this.setupConnectionHandlers();
    this.subscribeToEvents();

    this.logger.info('WebSocket server started', {
      transports: ['websocket', 'polling'],
    });
  }

  /**
   * Set up connection handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) {
      throw new Error('Socket.IO server not initialized');
    }

    this.io.on('connection', (socket: Socket) => {
      const socketId = socket.id;
      this.activeConnections.set(socketId, socket);

      this.logger.info('WebSocket client connected', {
        socketId,
        totalConnections: this.activeConnections.size,
        remoteAddress: socket.handshake.address,
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to SAPS RFID Platform',
        socketId,
        timestamp: new Date().toISOString(),
      });

      // Handle zone subscriptions
      socket.on('subscribe:zones', (zoneIds: number[]) => {
        this.handleZoneSubscription(socket, zoneIds);
      });

      // Handle item subscriptions
      socket.on('subscribe:item', (itemNumber: string) => {
        this.handleItemSubscription(socket, itemNumber);
      });

      // Handle reader subscriptions
      socket.on('subscribe:readers', () => {
        this.handleReaderSubscription(socket);
      });

      // Handle unsubscribe
      socket.on('unsubscribe:zones', (zoneIds: number[]) => {
        zoneIds.forEach((zoneId) => {
          socket.leave(`zone:${zoneId}`);
        });
        this.logger.debug('Client unsubscribed from zones', { socketId, zoneIds });
      });

      socket.on('unsubscribe:item', (itemNumber: string) => {
        socket.leave(`item:${itemNumber}`);
        this.logger.debug('Client unsubscribed from item', { socketId, itemNumber });
      });

      socket.on('unsubscribe:readers', () => {
        socket.leave('readers');
        this.logger.debug('Client unsubscribed from readers', { socketId });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.activeConnections.delete(socketId);
        this.logger.info('WebSocket client disconnected', {
          socketId,
          reason,
          totalConnections: this.activeConnections.size,
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error('WebSocket error', {
          socketId,
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
   * Handle zone subscription request
   */
  private handleZoneSubscription(socket: Socket, zoneIds: number[]): void {
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

    // Join rooms for each zone
    zoneIds.forEach((zoneId) => {
      if (typeof zoneId === 'number' && zoneId > 0) {
        socket.join(`zone:${zoneId}`);
      }
    });

    this.logger.debug('Client subscribed to zones', {
      socketId: socket.id,
      zoneIds,
    });

    socket.emit('subscribed', {
      type: 'zones',
      zoneIds,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle item subscription request
   */
  private handleItemSubscription(socket: Socket, itemNumber: string): void {
    // Validate input - generic item number format: INV-YYYY-NNNNNN
    if (typeof itemNumber !== 'string' || !itemNumber.match(/^INV-\d{4}-\d{6}$/)) {
      socket.emit('error', {
        code: 'INVALID_ITEM_NUMBER',
        message: 'Invalid item number format',
      });
      return;
    }

    socket.join(`item:${itemNumber}`);

    this.logger.debug('Client subscribed to item', {
      socketId: socket.id,
      itemNumber,
    });

    socket.emit('subscribed', {
      type: 'item',
      itemNumber,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle reader subscription request
   */
  private handleReaderSubscription(socket: Socket): void {
    socket.join('readers');

    this.logger.debug('Client subscribed to readers', {
      socketId: socket.id,
    });

    socket.emit('subscribed', {
      type: 'readers',
      timestamp: new Date().toISOString(),
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
   * Get number of active connections
   *
   * @returns Number of connected clients
   */
  getActiveConnections(): number {
    return this.activeConnections.size;
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

      this.logger.info('WebSocket server stopped');
    }
  }
}
