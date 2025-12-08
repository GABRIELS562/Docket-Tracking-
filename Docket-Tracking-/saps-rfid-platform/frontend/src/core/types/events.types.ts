/**
 * WEBSOCKET EVENT TYPES
 *
 * Defines all real-time events between frontend and backend.
 */

// ============================================================================
// RFID EVENTS
// ============================================================================

/**
 * Raw RFID tag read event from a reader
 */
export interface TagReadEvent {
  /** RFID EPC code */
  epc: string;

  /** Reader that detected the tag */
  readerId: string;

  /** Zone the reader is in */
  zoneId: string;

  /** Signal strength in dBm */
  rssi: number;

  /** Antenna port number */
  antennaPort?: number;

  /** Calculated signal quality */
  signalQuality?: 'poor' | 'fair' | 'good' | 'excellent';

  /** ISO timestamp */
  timestamp: string;
}

/**
 * Item movement between zones
 */
export interface ItemMovedEvent {
  /** Item number (business ID) */
  itemNumber?: string;

  /** Item database ID */
  itemId?: string;

  /** RFID EPC */
  epc: string;

  /** Source zone (string for legacy, null for new items) */
  fromZone?: string;

  /** Target zone (string) */
  toZone?: string;

  /** Source zone ID (numeric for new format) */
  fromZoneId?: number | null;

  /** Target zone ID (numeric for new format) */
  toZoneId?: number;

  /** ISO timestamp */
  timestamp: string;
}

/**
 * Zone occupancy update
 */
export interface ZoneOccupancyEvent {
  zoneId: number | string;
  zoneName?: string;
  occupancy: number;
  capacity: number;
  occupancyPercentage: number;
  status: 'normal' | 'warning' | 'critical' | 'full';
  timestamp: string;
}

/**
 * Reader status change
 */
export interface ReaderStatusEvent {
  readerId: string;
  readerName?: string;
  status: 'online' | 'offline' | 'error' | 'warning';
  message?: string;
  timestamp: string;
}

// ============================================================================
// ALERT EVENTS
// ============================================================================

export type AnomalyType =
  | 'dwell_exceeded'
  | 'unusual_sequence'
  | 'unusual_time'
  | 'unauthorized_zone'
  | 'missing_item'
  | 'capacity_exceeded';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * AI-detected anomaly
 */
export interface AnomalyDetectedEvent {
  id: string;
  tenantId: string;
  warehouseId?: string;
  itemEpc: string;
  itemName?: string;
  type: AnomalyType;
  severity: AlertSeverity;
  confidence: number;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * System alert
 */
export interface SystemAlertEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: string;
}

// ============================================================================
// BATCH EVENTS (for high-throughput scenarios)
// ============================================================================

export interface BatchedEvent {
  event: string;
  payload: unknown;
}

export interface EventBatch {
  events: BatchedEvent[];
  batchId: string;
  timestamp: string;
}

// ============================================================================
// CONNECTION EVENTS
// ============================================================================

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectionInfo {
  socketId: string;
  authenticated: boolean;
  tenantId?: string;
  warehouseId?: string;
  features: string[];
}

export interface ConnectionQuality {
  latencyMs: number;
  lastPingAt: number;
  status: ConnectionStatus;
  reconnectAttempts: number;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export interface WebSocketEventHandlers {
  onTagRead?: (event: TagReadEvent) => void;
  onItemMoved?: (event: ItemMovedEvent) => void;
  onZoneOccupancy?: (event: ZoneOccupancyEvent) => void;
  onReaderStatus?: (event: ReaderStatusEvent) => void;
  onAnomalyDetected?: (event: AnomalyDetectedEvent) => void;
  onSystemAlert?: (event: SystemAlertEvent) => void;
  onConnect?: (info: ConnectionInfo) => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onConnectionQuality?: (quality: ConnectionQuality) => void;
  onBatchedEvents?: (batch: EventBatch) => void;
}
