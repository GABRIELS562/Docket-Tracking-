/**
 * Core type definitions for RFID Item Tracking System
 * Renamed from Docket → Item for generic inventory use
 */

// ============================================================================
// Zone Types
// ============================================================================

export type ZoneType = 'storage' | 'processing' | 'office' | 'corridor' | 'entrance' | 'restricted';

export interface ZonePosition {
  x: number;
  y: number;
  z?: number;
  width: number;
  height: number;
  depth?: number;
}

export interface Zone {
  zoneId: number;
  zoneName: string;
  zoneCode: string;
  zoneType: ZoneType;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  readers: string[];
  parentZoneId?: number;
  position?: ZonePosition;
  isActive: boolean;
}

export type OccupancyStatus = 'normal' | 'warning' | 'critical' | 'full';

export function getOccupancyStatus(percentage: number): OccupancyStatus {
  if (percentage >= 100) return 'full';
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'normal';
}

export function getOccupancyColor(status: OccupancyStatus): string {
  switch (status) {
    case 'full':
      return '#dc2626'; // red-600
    case 'critical':
      return '#ea580c'; // orange-600
    case 'warning':
      return '#ca8a04'; // yellow-600
    case 'normal':
      return '#16a34a'; // green-600
  }
}

// ============================================================================
// Item Types (formerly Docket)
// ============================================================================

export type ItemStatus =
  | 'registered'
  | 'in_transit'
  | 'in_processing'
  | 'archived'
  | 'disposed'
  | 'missing';

export type ItemCategory =
  | 'evidence'
  | 'equipment'
  | 'document'
  | 'sample'
  | 'consumable'
  | 'asset'
  | 'other';

export interface Item {
  itemId: string;
  itemNumber: string; // Unique identifier (was labNumber)
  referenceId: string; // External reference (was caseReference)
  rfidEpc: string;
  description: string;
  category: ItemCategory;
  currentZone: { id: number; name: string } | null;
  status: ItemStatus;
  lastSeenAt: string | null;
  lastReaderId: string | null;
  locationConfidence: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ItemSummary {
  itemId: string;
  itemNumber: string;
  referenceId: string;
  status: ItemStatus;
  currentZoneName: string | null;
  lastSeenAt: string | null;
}

// ============================================================================
// Reader Types
// ============================================================================

// Note: 'maintenance' is used in the new system but not yet in all UI components
export type ReaderStatus = 'online' | 'offline' | 'error' | 'connecting' | 'maintenance';

/** Legacy reader status without maintenance - for backwards compatibility */
export type LegacyReaderStatus = 'online' | 'offline' | 'error' | 'connecting';

export interface ReaderConfiguration {
  transmitPower?: number;
  antennas?: number[];
  rssiThreshold?: number;
  session?: number;
  readIntervalMs?: number;
}

export interface Reader {
  readerId: string;
  readerName: string;
  ipAddress: string;
  zoneId: number;
  zoneName?: string;
  status: ReaderStatus;
  lastSeenAt: string | null;
  errorMessage?: string;
  configuration?: ReaderConfiguration;
  totalReads?: number;
  successRate?: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ItemSearchParams extends PaginationParams {
  query?: string;
  zoneId?: number;
  status?: ItemStatus;
  category?: ItemCategory;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface OccupancyData {
  timestamp: string;
  zones: Record<string, number>;
}

export interface ZoneDistribution {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface DistributionSummary {
  total: number;
  activeZones: number;
  avgOccupancy: number;
  peakZone: string;
  zones: ZoneDistribution[];
}

export interface ReaderActivity {
  readerId: string;
  readerName?: string;
  reads: number;
  status: ReaderStatus;
  lastReadAt?: string | null;
}

// ============================================================================
// Real-time Event Types
// ============================================================================

export interface ZoneOccupancyEvent {
  zoneId: number;
  zoneName: string;
  occupancy: number;
  capacity: number;
  percentage: number;
}

export interface ReaderStatusEvent {
  readerId: string;
  readerName: string;
  status: LegacyReaderStatus;
  previousStatus?: LegacyReaderStatus;
}

export interface ItemMovementEvent {
  itemId: string;
  itemNumber: string;
  fromZoneId: number | null;
  toZoneId: number;
  fromZoneName: string | null;
  toZoneName: string;
  readerId: string;
  confidence: number;
  timestamp: string;
}

export interface AlertEvent {
  type: 'overcapacity' | 'reader_offline' | 'item_missing' | 'unauthorized_movement';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Location History Types
// ============================================================================

export interface LocationHistoryEntry {
  timestamp: string;
  zoneId: number;
  zoneName: string;
  readerId: string;
  readerName: string;
  eventType: 'entry' | 'exit' | 'detected' | 'movement';
  rssi: number;
  confidence: number;
}

// ============================================================================
// View State Types
// ============================================================================

export type ViewMode = '3d' | 'top' | 'firstPerson';
export type FloorPlanMode = 'overview' | 'detail';

export interface ViewState {
  mode: ViewMode;
  selectedZoneId: number | null;
  selectedItemId: string | null;
  floorPlanMode: FloorPlanMode;
  showHeatmap: boolean;
  showReaders: boolean;
  showLabels: boolean;
}
