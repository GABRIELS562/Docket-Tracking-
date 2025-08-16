export interface RfidTag {
  tagId: string;
  epcCode?: string;
  userData?: string;
  lockStatus?: boolean;
  memoryBank?: string;
}

export interface RfidEvent {
  id?: number;
  eventUuid?: string;
  tagId: string;
  epcCode?: string;
  readerId: string;
  antennaNumber?: number;
  signalStrength: number;
  phase?: number;
  frequency?: number;
  eventType: 'read' | 'write' | 'killed' | 'moved' | 'lost';
  locationId?: number;
  objectId?: number;
  timestamp: Date;
  processed?: boolean;
  processingTime?: number;
  batchId?: string;
  metadata?: Record<string, any>;
}

export interface RfidReader {
  id?: number;
  readerId: string;
  readerName: string;
  readerType: 'FX9600' | 'FX7500' | 'MC3300' | 'simulated';
  ipAddress: string;
  port: number;
  locationId?: number;
  zone?: string;
  antennaCount: number;
  maxPower: number;
  frequencyRegion: 'US' | 'EU' | 'AS' | 'JP';
  status: 'online' | 'offline' | 'warning' | 'error' | 'connecting';
  lastPing?: Date;
  lastEvent?: Date;
  firmwareVersion?: string;
  configuration?: ReaderConfiguration;
  healthMetrics?: ReaderHealthMetrics;
  createdAt?: Date;
  updatedAt?: Date;
  active: boolean;
}

export interface ReaderConfiguration {
  powerLevel: number;
  sensitivity: number;
  tagPopulation: number;
  sessionFlag: number;
  antennaConfig: AntennaConfiguration[];
  filterConfig?: FilterConfiguration[];
  regionConfig?: RegionConfiguration;
  networkConfig?: NetworkConfiguration;
}

export interface AntennaConfiguration {
  antennaNumber: number;
  enabled: boolean;
  powerLevel: number;
  polarization: 'linear' | 'circular';
  gain: number;
  receiveGain?: number;
  transmitGain?: number;
  coordinates?: { x: number; y: number; z: number };
  coverageArea?: string; // GeoJSON polygon
}

export interface FilterConfiguration {
  filterId: string;
  enabled: boolean;
  memoryBank: 'EPC' | 'TID' | 'USER' | 'RESERVED';
  startAddress: number;
  dataLength: number;
  filterData: string;
  filterMask?: string;
  matchAction: 'include' | 'exclude';
}

export interface RegionConfiguration {
  region: string;
  channels: number[];
  hopTableId?: number;
  powerTable?: number[];
}

export interface NetworkConfiguration {
  dhcpEnabled: boolean;
  staticIp?: string;
  subnetMask?: string;
  gateway?: string;
  dnsServers?: string[];
  ntpServers?: string[];
}

export interface ReaderHealthMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  temperature?: number;
  tagReadRate?: number;
  errorCount?: number;
  uptime?: number;
  networkLatency?: number;
  powerConsumption?: number;
  antennaStatus?: AntennaHealthStatus[];
  lastUpdate?: Date;
}

export interface AntennaHealthStatus {
  antennaNumber: number;
  vswr: number; // Voltage Standing Wave Ratio
  returnLoss: number;
  portPower: number;
  temperature?: number;
  status: 'ok' | 'warning' | 'error';
}

export interface ObjectMovement {
  id?: number;
  objectId: number;
  fromLocationId?: number;
  toLocationId?: number;
  fromReaderId?: string;
  toReaderId?: string;
  movementType: 'detected' | 'moved' | 'lost' | 'entered' | 'exited';
  confidenceScore: number;
  signalStrength?: number;
  eventCount: number;
  timestamp: Date;
  durationSeconds?: number;
  metadata?: Record<string, any>;
}

export interface SystemAlert {
  id?: number;
  alertType: 'reader_offline' | 'reader_error' | 'tag_collision' | 'object_missing' | 
            'unauthorized_movement' | 'low_battery' | 'high_temperature' | 'network_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: 'reader' | 'system' | 'object' | 'network';
  sourceId?: string;
  readerId?: string;
  objectId?: number;
  locationId?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt?: Date;
  metadata?: Record<string, any>;
}

export interface TagCollision {
  id?: number;
  collisionUuid?: string;
  readerId: string;
  antennaNumber?: number;
  tagCount: number;
  collisionTime: Date;
  durationMs?: number;
  resolved: boolean;
  resolutionMethod?: 'time_division' | 'frequency_division' | 'power_adjustment' | 'manual';
  tagsInvolved: string[];
  signalStrengths: number[];
  metadata?: Record<string, any>;
}

export interface RfidEventBatch {
  id?: number;
  batchUuid?: string;
  readerId?: string;
  eventCount: number;
  processedCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  errorDetails?: Record<string, any>;
}

export interface Location {
  id?: number;
  locationCode: string;
  locationName: string;
  description?: string;
  zone?: string;
  building?: string;
  floor?: number;
  room?: string;
  coordinates?: { x: number; y: number };
  coverageArea?: string; // GeoJSON polygon
  readerId?: string;
  securityLevel: 'normal' | 'restricted' | 'high' | 'maximum';
  active: boolean;
  createdAt?: Date;
}

export interface RfidObject {
  id?: number;
  objectCode: string;
  name: string;
  description?: string;
  objectType: string;
  rfidTagId: string;
  epcCode?: string;
  currentLocationId?: number;
  currentReaderId?: string;
  currentAntenna?: number;
  lastSeen?: Date;
  signalStrength?: number;
  readCount: number;
  status: 'active' | 'inactive' | 'lost' | 'archived';
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Protocol-specific interfaces
export interface ZebraFX9600Command {
  command: string;
  parameters?: Record<string, any>;
  sequenceId?: number;
  timestamp?: Date;
}

export interface ZebraFX9600Response {
  status: 'success' | 'error' | 'warning';
  data?: any;
  errorCode?: string;
  errorMessage?: string;
  sequenceId?: number;
  timestamp?: Date;
}

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId: string;
  keepAlive: number;
  cleanSession?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export interface TcpConfig {
  host: string;
  port: number;
  timeout: number;
  reconnectInterval: number;
  maxReconnectAttempts?: number;
  keepAlive?: boolean;
  noDelay?: boolean;
}

// Event emitter types
export type RfidEventType = 
  | 'tag_read'
  | 'tag_write'
  | 'tag_moved'
  | 'tag_lost'
  | 'reader_connected'
  | 'reader_disconnected'
  | 'reader_error'
  | 'collision_detected'
  | 'batch_processed'
  | 'alert_created';

export interface RfidEventPayload {
  type: RfidEventType;
  data: any;
  timestamp: Date;
  source?: string;
}

// Performance monitoring types
export interface PerformanceMetrics {
  eventsPerSecond: number;
  averageProcessingTime: number;
  batchProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
  timestamp: Date;
}

export interface ReaderStatistics {
  readerId: string;
  totalEvents: number;
  uniqueTags: number;
  averageSignalStrength: number;
  readRate: number;
  errorRate: number;
  uptime: number;
  lastSeen: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// Simulation types
export interface SimulatedTag {
  tagId: string;
  epcCode?: string;
  objectId?: number;
  currentLocation?: string;
  movementPattern?: 'static' | 'random' | 'patrol' | 'scheduled';
  movementSpeed?: number;
  signalStrengthRange?: [number, number];
  batteryLevel?: number;
  active: boolean;
}

export interface SimulationConfig {
  enabled: boolean;
  tagCount: number;
  readerCount: number;
  eventRate: number; // events per second
  movementProbability: number; // 0-1
  collisionProbability: number; // 0-1
  errorRate: number; // 0-1
  runDuration?: number; // milliseconds
}

export type ReaderConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionInfo {
  readerId: string;
  status: ReaderConnectionStatus;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
  errorMessage?: string;
}

export default {
  RfidTag,
  RfidEvent,
  RfidReader,
  ReaderConfiguration,
  AntennaConfiguration,
  FilterConfiguration,
  RegionConfiguration,
  NetworkConfiguration,
  ReaderHealthMetrics,
  AntennaHealthStatus,
  ObjectMovement,
  SystemAlert,
  TagCollision,
  RfidEventBatch,
  Location,
  RfidObject
};