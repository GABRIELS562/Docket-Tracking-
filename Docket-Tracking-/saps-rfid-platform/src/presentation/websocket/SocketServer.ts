import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { injectable, inject } from 'tsyringe';
import { IEventBus } from '../../application/interfaces/IEventBus';
import { ILogger } from '../../application/interfaces/ILogger';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';
import { DocketMovedEvent } from '../../domain/events/DocketMovedEvent';
import { ZoneOccupancyChangedEvent } from '../../domain/events/ZoneOccupancyChangedEvent';

/**
 * WebSocket Server - Real-time updates via Socket.IO
 *
 * Provides real-time event broadcasting to connected clients
 *
 * Events broadcast to clients:
 * - `tag:detected` - When an RFID tag is detected by a reader
 * - `docket:moved` - When a docket changes zones
 * - `zone:occupancy` - When zone occupancy changes
 * - `reader:status` - When reader status changes
 *
 * Client subscriptions (rooms):
 * - `subscribe:zones` - Subscribe to specific zone(s) updates
 * - `subscribe:docket` - Subscribe to specific docket updates
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

      // Handle docket subscriptions
      socket.on('subscribe:docket', (labNumber: string) => {
        this.handleDocketSubscription(socket, labNumber);
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

      socket.on('unsubscribe:docket', (labNumber: string) => {
        socket.leave(`docket:${labNumber}`);
        this.logger.debug('Client unsubscribed from docket', { socketId, labNumber });
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
    // Tag detected event
    this.eventBus.subscribe('TagDetected', async (event: DomainEvent) => {
      const tagEvent = event as TagDetectedEvent;

      const payload = {
        labNumber: tagEvent.payload.labNumber,
        epc: tagEvent.payload.epc,
        zoneId: tagEvent.payload.zoneId,
        readerId: tagEvent.payload.readerId,
        timestamp: tagEvent.payload.timestamp.toISOString(),
        rssi: tagEvent.payload.rssi,
      };

      // Broadcast to zone subscribers
      if (tagEvent.payload.zoneId) {
        this.io!.to(`zone:${tagEvent.payload.zoneId}`).emit('tag:detected', payload);
      }

      // Broadcast to docket subscribers
      this.io!.to(`docket:${tagEvent.payload.labNumber}`).emit('tag:detected', payload);

      this.logger.debug('Tag detected event broadcast', {
        labNumber: tagEvent.payload.labNumber,
        zoneId: tagEvent.payload.zoneId,
      });
    });

    // Docket moved event
    this.eventBus.subscribe('DocketMoved', async (event: DomainEvent) => {
      const moveEvent = event as DocketMovedEvent;

      const payload = {
        labNumber: moveEvent.payload.labNumber,
        fromZoneId: moveEvent.payload.fromZoneId,
        toZoneId: moveEvent.payload.toZoneId,
        timestamp: moveEvent.payload.timestamp.toISOString(),
      };

      // Broadcast to old zone subscribers
      if (moveEvent.payload.fromZoneId) {
        this.io!.to(`zone:${moveEvent.payload.fromZoneId}`).emit('docket:moved', payload);
      }

      // Broadcast to new zone subscribers
      this.io!.to(`zone:${moveEvent.payload.toZoneId}`).emit('docket:moved', payload);

      // Broadcast to docket subscribers
      this.io!.to(`docket:${moveEvent.payload.labNumber}`).emit('docket:moved', payload);

      this.logger.debug('Docket moved event broadcast', {
        labNumber: moveEvent.payload.labNumber,
        fromZoneId: moveEvent.payload.fromZoneId,
        toZoneId: moveEvent.payload.toZoneId,
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
   * Handle docket subscription request
   */
  private handleDocketSubscription(socket: Socket, labNumber: string): void {
    // Validate input
    if (typeof labNumber !== 'string' || !labNumber.match(/^FSL-\d{4}-\d{6}$/)) {
      socket.emit('error', {
        code: 'INVALID_LAB_NUMBER',
        message: 'Invalid lab number format',
      });
      return;
    }

    socket.join(`docket:${labNumber}`);

    this.logger.debug('Client subscribed to docket', {
      socketId: socket.id,
      labNumber,
    });

    socket.emit('subscribed', {
      type: 'docket',
      labNumber,
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
