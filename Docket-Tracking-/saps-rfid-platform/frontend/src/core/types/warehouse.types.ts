/**
 * UNIFIED WAREHOUSE TYPE DEFINITIONS
 *
 * Single source of truth for all warehouse-related types.
 * All components must use these types - no more scattered definitions.
 *
 * Coordinate System:
 * - Origin (0,0,0) = center of warehouse floor
 * - Y-up: Y=0 is floor, positive Y is up
 * - X-axis: West (-X) to East (+X)
 * - Z-axis: North/Front (-Z) to South/Back (+Z)
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

/**
 * 3D Vector - used for positions, targets, directions
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Bounding Box
 */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/**
 * Convert Vector3 to tuple for Three.js compatibility
 */
export function toTuple(v: Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

/**
 * Convert tuple to Vector3
 */
export function toVector3(t: [number, number, number]): Vector3 {
  return { x: t[0], y: t[1], z: t[2] };
}

// ============================================================================
// ZONE TYPES
// ============================================================================

export type ZoneType =
  | 'receiving'
  | 'shipping'
  | 'storage'
  | 'processing'
  | 'secure'
  | 'staging'
  | 'office'
  | 'returns'
  | 'quality-control'
  | 'quarantine';

export type ZonePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Flat bounds for easier access
 */
export interface FlatBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Zone Configuration
 * Defines a physical area in the warehouse
 */
export interface ZoneConfig {
  /** Unique identifier */
  id: string;

  /** Internal name (used in code) */
  name: string;

  /** Display name (shown in UI) */
  displayName: string;

  /** Zone type for categorization */
  type: ZoneType;

  /** 3D bounding box (nested format) */
  bounds: FlatBounds;

  /** Center point (for item placement, camera targets) */
  center: Vector3;

  /** Floor area dimensions */
  floorSize: { width: number; depth: number };

  /** Visual properties */
  floorColor: string;
  wallColor?: string;
  opacity?: number;

  /** Alias for floorColor for compatibility */
  color: string;

  /** Icon for display */
  icon: string;

  /** Is this a secure zone */
  isSecure?: boolean;

  /** Capacity management */
  capacity: number;
  priority: ZonePriority;

  /** Connected zones for pathfinding */
  connectedZones: string[];

  /** Optimal camera view for this zone */
  cameraPreset: {
    position: Vector3;
    target: Vector3;
    fov?: number;
  };

  /** Whether zone has physical walls */
  hasWalls?: boolean;
  wallHeight?: number;

  /** Security level */
  securityLevel?: 'standard' | 'restricted' | 'secure';
}

// ============================================================================
// READER TYPES
// ============================================================================

export type ReaderType = 'portal' | 'ceiling' | 'handheld' | 'dock';
export type ReaderStatus = 'online' | 'offline' | 'warning' | 'error';

/**
 * RFID Reader Configuration
 */
export interface ReaderConfig {
  /** Unique identifier */
  id: string;

  /** Short display name (e.g., "R1", "S2") */
  name: string;

  /** Full descriptive name */
  displayName?: string;

  /** Zone this reader is in */
  zoneId: string;

  /** 3D position */
  position: Vector3;

  /** Y-axis rotation in radians */
  rotation: number;

  /** Reader type */
  type: ReaderType;

  /** Read range in meters */
  range: number;

  /** Antenna configuration */
  antennaCount?: number;
  antennaAngle?: number;

  /** Current status (runtime, not config) */
  status?: ReaderStatus;
}

// ============================================================================
// CAMERA TYPES
// ============================================================================

/**
 * Camera Preset for quick navigation
 */
export interface CameraPreset {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Camera position */
  position: Vector3;

  /** Look-at target */
  target: Vector3;

  /** Field of view */
  fov: number;

  /** Animation duration when transitioning to this preset */
  transitionDuration?: number;

  /** Keyboard shortcut (e.g., "1", "2", "v") */
  shortcut?: string;

  /** Alternative name for shortcut */
  keyboardShortcut?: string;

  /** Description for UI */
  description?: string;
}

export type CameraMode = 'orbit' | 'walk' | 'cinematic' | 'follow';

// ============================================================================
// WAREHOUSE CONFIGURATION
// ============================================================================

export type LayoutType = 'rectangular' | 'u-shaped' | 'l-shaped' | 'custom';

/**
 * Rendering configuration
 */
export interface RenderingConfig {
  /** Ambient light intensity (0-1) */
  ambientLightIntensity: number;

  /** Enable shadow mapping */
  shadowsEnabled: boolean;

  /** Shadow map resolution */
  shadowMapSize?: number;

  /** Maximum visible items in scene */
  maxVisibleItems: number;

  /** LOD (Level of Detail) distance thresholds */
  lodDistances: {
    /** Distance for full detail (textures, labels) */
    detailed: number;
    /** Distance for individual items (colored boxes) */
    individual: number;
    /** Distance for clustered rendering */
    cluster: number;
  };

  /** Background color */
  backgroundColor?: string;

  /** Enable post-processing effects */
  postProcessing?: boolean;
}

/**
 * Complete Warehouse Configuration
 * This is the single source of truth for a warehouse
 */
export interface WarehouseConfig {
  // ========== Identity ==========
  /** Unique warehouse ID */
  id: string;

  /** Tenant/organization ID */
  tenantId: string;

  /** Warehouse name */
  name: string;

  /** URL-safe slug */
  slug: string;

  /** Description */
  description?: string;

  // ========== Physical Properties ==========
  /** Physical dimensions in meters */
  dimensions: {
    width: number;   // X-axis
    length: number;  // Z-axis
    height: number;  // Y-axis
  };

  /** Layout type */
  layoutType: LayoutType;

  /** Floor level (Y coordinate) */
  floorLevel: number;

  // ========== Layout Elements ==========
  /** All zones in this warehouse */
  zones: ZoneConfig[];

  /** All RFID readers */
  readers: ReaderConfig[];

  // ========== Camera Configuration ==========
  /** Camera presets for navigation */
  cameraPresets: CameraPreset[];

  /** Default camera preset ID */
  defaultCameraPreset: string;

  /** Walk mode boundaries */
  walkBoundaries: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };

  // ========== Rendering ==========
  /** Rendering configuration */
  rendering: RenderingConfig;

  // ========== Metadata ==========
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================================
// RUNTIME TYPES (Not stored, computed at runtime)
// ============================================================================

/**
 * Zone runtime data (item counts, flow statistics)
 */
export interface ZoneRuntimeData {
  zoneId: string;
  itemCount: number;
  flowIn: number;
  flowOut: number;
  lastActivity: number;
  utilizationPercent: number;
}

/**
 * Reader runtime data
 */
export interface ReaderRuntimeData {
  readerId: string;
  status: ReaderStatus;
  readsPerMinute: number;
  lastRead: number;
  signalStrength: number;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

export type ItemLODLevel = 'detailed' | 'individual' | 'cluster' | 'aggregate';
export type ItemStatus = 'active' | 'in_transit' | 'processing' | 'archived' | 'missing';

/**
 * Virtualized Item for 3D rendering
 */
export interface VirtualizedItem {
  /** Unique ID (usually EPC) */
  id: string;

  /** RFID EPC code */
  epc: string;

  /** Current zone */
  zoneId: string;

  /** 3D position in warehouse space */
  position: Vector3;

  /** Last seen timestamp */
  lastSeen: number;

  /** Signal strength */
  rssi: number;

  /** Current LOD level based on camera distance */
  lodLevel: ItemLODLevel;

  /** Is this item being tracked by user */
  isTracked?: boolean;

  /** Item status */
  status?: ItemStatus;

  /** Custom color override */
  color?: string;
}

/**
 * Item movement event
 */
export interface ItemMovement {
  itemId: string;
  epc: string;
  fromZoneId: string | null;
  toZoneId: string;
  timestamp: number;
  readerId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate center of a bounding box (nested format)
 */
export function getBoundsCenter(bounds: BoundingBox): Vector3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

/**
 * Calculate center of flat bounds
 */
export function getFlatBoundsCenter(bounds: FlatBounds): Vector3 {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

/**
 * Check if a point is inside a bounding box (nested format)
 */
export function isInsideBounds(point: Vector3, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.min.x && point.x <= bounds.max.x &&
    point.y >= bounds.min.y && point.y <= bounds.max.y &&
    point.z >= bounds.min.z && point.z <= bounds.max.z
  );
}

/**
 * Check if a point is inside flat bounds
 */
export function isInsideFlatBounds(point: Vector3, bounds: FlatBounds): boolean {
  return (
    point.x >= bounds.minX && point.x <= bounds.maxX &&
    point.y >= bounds.minY && point.y <= bounds.maxY &&
    point.z >= bounds.minZ && point.z <= bounds.maxZ
  );
}

/**
 * Calculate distance between two points
 */
export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get random position within a zone
 */
export function getRandomPositionInZone(zone: ZoneConfig): Vector3 {
  const { bounds } = zone;
  return {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    y: zone.center.y,
    z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ),
  };
}
