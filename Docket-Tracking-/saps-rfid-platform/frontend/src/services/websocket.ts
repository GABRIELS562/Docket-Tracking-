import { io, Socket } from 'socket.io-client';

/**
 * RFID Tag Read Event
 */
export interface TagReadEvent {
  epc: string;
  readerId: string;
  zoneId: string;
  rssi: number;
  antennaPort: number;
  timestamp: string;
}

/**
 * Item Moved Event
 */
export interface ItemMovedEvent {
  itemId: string;
  epc: string;
  fromZone: string;
  toZone: string;
  timestamp: string;
}

/**
 * Zone Occupancy Update
 */
export interface ZoneOccupancyEvent {
  zoneId: string;
  itemCount: number;
  capacity: number;
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
 * WebSocket Event Handlers
 */
interface WebSocketHandlers {
  onTagRead?: (event: TagReadEvent) => void;
  onItemMoved?: (event: ItemMovedEvent) => void;
  onZoneOccupancy?: (event: ZoneOccupancyEvent) => void;
  onReaderStatus?: (event: ReaderStatusEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket Service
 *
 * Manages real-time communication with backend via Socket.IO.
 * Handles RFID events, item movements, and zone updates.
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Room-based subscriptions (zone-specific, item-specific)
 * - Event multiplexing
 * - Connection state management
 *
 * @example
 * ```typescript
 * const ws = new WebSocketService('http://localhost:3000');
 *
 * ws.connect({
 *   onTagRead: (event) => console.log('Tag read:', event.epc),
 *   onItemMoved: (event) => console.log('Item moved:', event),
 * });
 *
 * // Subscribe to specific zone
 * ws.subscribeToZone('zone-001');
 *
 * // Unsubscribe when done
 * ws.unsubscribeFromZone('zone-001');
 * ws.disconnect();
 * ```
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private handlers: WebSocketHandlers = {};
  private subscribedZones: Set<string> = new Set();
  private subscribedItems: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(private serverUrl: string = 'http://localhost:3000') {}

  /**
   * Connect to WebSocket server
   */
  connect(handlers: WebSocketHandlers = {}): void {
    if (this.socket?.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    this.handlers = handlers;

    // Initialize Socket.IO connection
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();

    console.log('🔌 Connecting to WebSocket server:', this.serverUrl);
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.handlers.onConnect?.();

      // Re-subscribe to previously subscribed rooms
      this.subscribedZones.forEach((zoneId) => this.subscribeToZone(zoneId));
      this.subscribedItems.forEach((itemId) => this.subscribeToItem(itemId));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.handlers.onDisconnect?.();
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`⚠️ WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.handlers.onError?.(new Error('Failed to connect after maximum attempts'));
      }
    });

    // RFID events
    this.socket.on('rfid.tag.read', (event: TagReadEvent) => {
      console.log('📡 Tag read:', event.epc, 'in', event.zoneId);
      this.handlers.onTagRead?.(event);
    });

    this.socket.on('rfid.item.moved', (event: ItemMovedEvent) => {
      console.log('📦 Item moved:', event.itemId, `${event.fromZone} → ${event.toZone}`);
      this.handlers.onItemMoved?.(event);
    });

    this.socket.on('rfid.zone.occupancy', (event: ZoneOccupancyEvent) => {
      console.log('📊 Zone occupancy:', event.zoneId, `${event.itemCount}/${event.capacity}`);
      this.handlers.onZoneOccupancy?.(event);
    });

    this.socket.on('rfid.reader.status', (event: ReaderStatusEvent) => {
      console.log('🔧 Reader status:', event.readerId, event.status);
      this.handlers.onReaderStatus?.(event);
    });
  }

  /**
   * Subscribe to zone-specific events
   */
  subscribeToZone(zoneId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe', { room: `zone:${zoneId}` });
    this.subscribedZones.add(zoneId);
    console.log('🔔 Subscribed to zone:', zoneId);
  }

  /**
   * Unsubscribe from zone
   */
  unsubscribeFromZone(zoneId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe', { room: `zone:${zoneId}` });
    this.subscribedZones.delete(zoneId);
    console.log('🔕 Unsubscribed from zone:', zoneId);
  }

  /**
   * Subscribe to item-specific events
   */
  subscribeToItem(itemId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe', { room: `item:${itemId}` });
    this.subscribedItems.add(itemId);
    console.log('🔔 Subscribed to item:', itemId);
  }

  /**
   * Unsubscribe from item
   */
  unsubscribeFromItem(itemId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe', { room: `item:${itemId}` });
    this.subscribedItems.delete(itemId);
    console.log('🔕 Unsubscribed from item:', itemId);
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
  getSubscribedZones(): string[] {
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

    // Clear subscriptions
    this.subscribedZones.clear();
    this.subscribedItems.clear();

    // Disconnect socket
    this.socket.disconnect();
    this.socket = null;

    console.log('🔌 WebSocket disconnected');
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
 *   });
 *
 *   return <div>Listening for RFID events...</div>;
 * };
 * ```
 */
export const useWebSocket = (handlers: WebSocketHandlers) => {
  const ws = getWebSocketService();

  // Connect on mount
  if (!ws.isConnected()) {
    ws.connect(handlers);
  } else {
    // Update handlers if already connected
    ws.updateHandlers(handlers);
  }

  // Cleanup on unmount
  return () => {
    // Note: Don't disconnect on component unmount as other components may be using it
    // Only disconnect when truly cleaning up the app
  };
};
