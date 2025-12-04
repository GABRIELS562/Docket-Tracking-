import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

/**
 * RFID Tag Read Event
 */
export interface TagReadEvent {
  epc: string;
  readerId: string;
  zoneId: string;
  rssi: number;
  antennaPort?: number;
  signalQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  timestamp: string;
}

/**
 * Item Moved Event
 * Supports both legacy (string zones) and Phase 4.1 (numeric zones) formats
 */
export interface ItemMovedEvent {
  itemNumber?: string;
  itemId?: string;
  epc: string;
  // Legacy string-based zones (frontend compatibility)
  fromZone?: string;
  toZone?: string;
  // Phase 4.1 numeric zone IDs
  fromZoneId?: number | null;
  toZoneId?: number;
  timestamp: string;
}

/**
 * Zone Occupancy Update
 */
export interface ZoneOccupancyEvent {
  zoneId: number;
  occupancy: number;
  capacity: number;
  occupancyPercentage: number;
  status: 'normal' | 'warning' | 'critical' | 'full';
  timestamp: string;
}

/**
 * Reader Status Update
 */
export interface ReaderStatusEvent {
  readerId: string;
  status: 'online' | 'offline' | 'error';
  timestamp: string;
}

/**
 * Anomaly Detected Event (from backend AI)
 */
export interface AnomalyDetectedEvent {
  id: string;
  tenantId: string;
  itemEpc: string;
  itemName: string;
  type: 'dwell_exceeded' | 'unusual_sequence' | 'unusual_time' | 'unauthorized_zone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Batched Events (for efficiency)
 */
export interface BatchedEvent {
  event: string;
  payload: unknown;
}

/**
 * Connection Status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Connection Quality Metrics
 */
export interface ConnectionQuality {
  latencyMs: number;
  lastPingAt: number;
  status: ConnectionStatus;
  reconnectAttempts: number;
}

/**
 * WebSocket Event Handlers
 */
interface WebSocketHandlers {
  onTagRead?: (event: TagReadEvent) => void;
  onItemMoved?: (event: ItemMovedEvent) => void;
  onZoneOccupancy?: (event: ZoneOccupancyEvent) => void;
  onReaderStatus?: (event: ReaderStatusEvent) => void;
  onAnomalyDetected?: (event: AnomalyDetectedEvent) => void;
  onConnect?: (info: { socketId: string; authenticated: boolean; features: string[] }) => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onConnectionQuality?: (quality: ConnectionQuality) => void;
  onBatchedEvents?: (events: BatchedEvent[]) => void;
}

/**
 * Subscription Options
 */
export interface SubscriptionOptions {
  zones?: number[];
  items?: string[];
  readers?: boolean;
}

/**
 * WebSocket Service (Phase 4.1 Enhanced)
 *
 * Manages real-time communication with backend via Socket.IO.
 * Handles RFID events, item movements, and zone updates.
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Room-based subscriptions (zone-specific, item-specific)
 * - Event batching support for high-frequency updates
 * - Connection quality monitoring with heartbeat
 * - Bulk subscription for efficiency
 * - Enhanced error handling and status tracking
 *
 * @example
 * ```typescript
 * const ws = new WebSocketService('http://localhost:3000');
 *
 * ws.connect({
 *   onTagRead: (event) => console.log('Tag read:', event.epc),
 *   onItemMoved: (event) => console.log('Item moved:', event),
 *   onConnectionQuality: (q) => console.log('Latency:', q.latencyMs),
 * });
 *
 * // Bulk subscribe
 * ws.subscribeBulk({ zones: [1, 2, 3], items: ['INV-2024-000001'] });
 *
 * ws.disconnect();
 * ```
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private handlers: WebSocketHandlers = {};
  private subscribedZones: Set<number> = new Set();
  private subscribedItems: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced to stop spam when backend not running
  private serverUrl: string;
  private authToken: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastLatency = 0;
  private lastPingAt = 0;

  // Ping interval for connection quality monitoring
  private readonly PING_INTERVAL_MS = 30000; // 30 seconds

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  /**
   * Set authentication token for secure connections
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get connection quality metrics
   */
  getConnectionQuality(): ConnectionQuality {
    return {
      latencyMs: this.lastLatency,
      lastPingAt: this.lastPingAt,
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(handlers: WebSocketHandlers = {}): void {
    if (this.socket?.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    this.handlers = handlers;
    this.status = 'connecting';

    // Initialize Socket.IO connection
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling'],
      auth: this.authToken ? { token: this.authToken } : undefined,
    });

    this.setupEventListeners();
    this.startPingMonitor();

    console.log('Connecting to WebSocket server:', this.serverUrl);
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.status = 'connected';
      this.reconnectAttempts = 0;

      // Re-subscribe to previously subscribed rooms
      if (this.subscribedZones.size > 0 || this.subscribedItems.size > 0) {
        this.subscribeBulk({
          zones: Array.from(this.subscribedZones),
          items: Array.from(this.subscribedItems),
        });
      }
    });

    // Server welcome message (Phase 4.1)
    this.socket.on('connected', (info: { socketId: string; authenticated: boolean; features: string[] }) => {
      console.log('Server welcome:', info);
      this.handlers.onConnect?.(info);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.status = 'disconnected';
      this.handlers.onDisconnect?.(reason);
    });

    this.socket.on('reconnecting', () => {
      this.status = 'reconnecting';
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.status = 'reconnecting';
      // Only log every 3rd attempt to reduce spam
      if (attempt === 1 || attempt % 3 === 0) {
        console.log(`WebSocket reconnecting (attempt ${attempt}/${this.maxReconnectAttempts})`);
      }
      this.handlers.onReconnecting?.(attempt);
    });

    this.socket.on('connect_error', (error) => {
      this.status = 'error';
      // Only log first error and when max attempts reached (avoid spam)
      if (this.reconnectAttempts === 0) {
        console.warn('WebSocket connection failed:', error.message);
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('WebSocket: Max reconnection attempts reached. Will not retry automatically.');
        this.handlers.onError?.(new Error('Failed to connect after maximum attempts'));
      }
    });

    // Pong response for latency measurement
    this.socket.on('pong', (_data: { serverTime: number }) => {
      this.lastLatency = Date.now() - this.lastPingAt;
      this.handlers.onConnectionQuality?.(this.getConnectionQuality());
    });

    // Server timeout warning
    this.socket.on('timeout', (data: { message: string }) => {
      console.warn('Server timeout warning:', data.message);
    });

    // Server shutdown notification
    this.socket.on('server:shutdown', () => {
      console.warn('Server shutting down');
      this.status = 'disconnected';
    });

    // Subscription confirmations (debug level - only in dev)
    this.socket.on('subscribed', (data: { type: string; zoneIds?: number[]; itemNumber?: string }) => {
      if (import.meta.env.DEV) {
        console.debug('Subscription confirmed:', data);
      }
    });

    this.socket.on('unsubscribed', (data: { all?: boolean }) => {
      if (import.meta.env.DEV) {
        console.debug('Unsubscription confirmed:', data);
      }
    });

    // Error from server
    this.socket.on('error', (error: { code: string; message: string }) => {
      console.error('Server error:', error);
      this.handlers.onError?.(new Error(`${error.code}: ${error.message}`));
    });

    // RFID events (Phase 4.1 format)
    this.socket.on('tag:detected', (event: TagReadEvent) => {
      this.handlers.onTagRead?.(event);
    });

    this.socket.on('item:moved', (event: ItemMovedEvent) => {
      this.handlers.onItemMoved?.(event);
    });

    this.socket.on('zone:occupancy', (event: ZoneOccupancyEvent) => {
      this.handlers.onZoneOccupancy?.(event);
    });

    this.socket.on('reader:status', (event: ReaderStatusEvent) => {
      this.handlers.onReaderStatus?.(event);
    });

    // Anomaly events (from backend AI detection)
    this.socket.on('anomaly:detected', (event: AnomalyDetectedEvent) => {
      this.handlers.onAnomalyDetected?.(event);
    });

    // Batched events (Phase 4.1 - high performance)
    this.socket.on('events:batch', (events: BatchedEvent[]) => {
      // Process batch through handlers
      if (this.handlers.onBatchedEvents) {
        this.handlers.onBatchedEvents(events);
      } else {
        // Dispatch individual events
        for (const e of events) {
          switch (e.event) {
            case 'tag:detected':
              this.handlers.onTagRead?.(e.payload as TagReadEvent);
              break;
            case 'item:moved':
              this.handlers.onItemMoved?.(e.payload as ItemMovedEvent);
              break;
            case 'zone:occupancy':
              this.handlers.onZoneOccupancy?.(e.payload as ZoneOccupancyEvent);
              break;
            case 'reader:status':
              this.handlers.onReaderStatus?.(e.payload as ReaderStatusEvent);
              break;
            case 'anomaly:detected':
              this.handlers.onAnomalyDetected?.(e.payload as AnomalyDetectedEvent);
              break;
          }
        }
      }
    });

    // Legacy RFID events (backwards compatibility)
    this.socket.on('rfid.tag.read', (event: TagReadEvent) => {
      this.handlers.onTagRead?.(event);
    });

    this.socket.on('rfid.item.moved', (event: ItemMovedEvent) => {
      this.handlers.onItemMoved?.(event);
    });

    this.socket.on('rfid.zone.occupancy', (event: ZoneOccupancyEvent) => {
      this.handlers.onZoneOccupancy?.(event);
    });

    this.socket.on('rfid.reader.status', (event: ReaderStatusEvent) => {
      this.handlers.onReaderStatus?.(event);
    });
  }

  /**
   * Start ping monitor for connection quality
   */
  private startPingMonitor(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingAt = Date.now();
        this.socket.emit('ping');
      }
    }, this.PING_INTERVAL_MS);
  }

  /**
   * Stop ping monitor
   */
  private stopPingMonitor(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Subscribe to multiple resources at once (efficient)
   */
  subscribeBulk(options: SubscriptionOptions): void {
    if (!this.socket?.connected) {
      // Store for later subscription on connect
      options.zones?.forEach((z) => this.subscribedZones.add(z));
      options.items?.forEach((i) => this.subscribedItems.add(i));
      console.warn('WebSocket not connected, subscriptions will be applied on connect');
      return;
    }

    this.socket.emit('subscribe:bulk', options);

    options.zones?.forEach((z) => this.subscribedZones.add(z));
    options.items?.forEach((i) => this.subscribedItems.add(i));

    if (import.meta.env.DEV) {
      console.debug('Bulk subscription:', options);
    }
  }

  /**
   * Subscribe to zone-specific events
   */
  subscribeToZone(zoneId: number): void {
    if (!this.socket?.connected) {
      this.subscribedZones.add(zoneId);
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe:zones', [zoneId]);
    this.subscribedZones.add(zoneId);
  }

  /**
   * Unsubscribe from zone
   */
  unsubscribeFromZone(zoneId: number): void {
    if (!this.socket?.connected) {
      this.subscribedZones.delete(zoneId);
      return;
    }

    this.socket.emit('unsubscribe:zones', [zoneId]);
    this.subscribedZones.delete(zoneId);
  }

  /**
   * Subscribe to item-specific events
   */
  subscribeToItem(itemNumber: string): void {
    if (!this.socket?.connected) {
      this.subscribedItems.add(itemNumber);
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe:item', itemNumber);
    this.subscribedItems.add(itemNumber);
  }

  /**
   * Unsubscribe from item
   */
  unsubscribeFromItem(itemNumber: string): void {
    if (!this.socket?.connected) {
      this.subscribedItems.delete(itemNumber);
      return;
    }

    this.socket.emit('unsubscribe:item', itemNumber);
    this.subscribedItems.delete(itemNumber);
  }

  /**
   * Subscribe to reader events
   */
  subscribeToReaders(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe:readers');
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:all');
    this.subscribedZones.clear();
    this.subscribedItems.clear();
  }

  /**
   * Update event handlers dynamically
   */
  updateHandlers(handlers: WebSocketHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get subscribed zones
   */
  getSubscribedZones(): number[] {
    return Array.from(this.subscribedZones);
  }

  /**
   * Get subscribed items
   */
  getSubscribedItems(): string[] {
    return Array.from(this.subscribedItems);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (!this.socket) return;

    this.stopPingMonitor();

    // Clear subscriptions
    this.subscribedZones.clear();
    this.subscribedItems.clear();

    // Disconnect socket
    this.socket.disconnect();
    this.socket = null;
    this.status = 'disconnected';
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    this.disconnect();
    this.connect(this.handlers);
  }
}

// Singleton instance
let websocketInstance: WebSocketService | null = null;

/**
 * Get global WebSocket service instance
 */
export const getWebSocketService = (serverUrl?: string): WebSocketService => {
  if (!websocketInstance) {
    websocketInstance = new WebSocketService(serverUrl);
  }
  return websocketInstance;
};

/**
 * React Hook for WebSocket connection
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   useWebSocket({
 *     onTagRead: (event) => {
 *       console.log('Tag detected:', event.epc);
 *     },
 *     onConnectionQuality: (quality) => {
 *       console.log('Latency:', quality.latencyMs);
 *     },
 *   });
 *
 *   return <div>Listening for RFID events...</div>;
 * };
 * ```
 */
export const useWebSocket = (handlers: WebSocketHandlers) => {
  const ws = getWebSocketService();
  const handlersRef = useRef(handlers);
  const connectedRef = useRef(false);

  // Keep handlers ref updated
  handlersRef.current = handlers;

  useEffect(() => {
    // Only connect once per mount
    if (!connectedRef.current) {
      connectedRef.current = true;
      if (!ws.isConnected()) {
        ws.connect(handlersRef.current);
      } else {
        ws.updateHandlers(handlersRef.current);
      }
    }

    // Cleanup on unmount - don't disconnect as other components may use it
    return () => {
      connectedRef.current = false;
    };
  }, []); // Empty deps - only run on mount

  // Update handlers when they change (without reconnecting)
  useEffect(() => {
    if (ws.isConnected()) {
      ws.updateHandlers(handlers);
    }
  }, [handlers]);
};
