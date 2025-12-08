/**
 * SAPS FORENSICS LAB - WAREHOUSE CONFIGURATION
 *
 * This is the SINGLE SOURCE OF TRUTH for all warehouse spatial data.
 * All components MUST use this configuration - no hardcoded coordinates elsewhere.
 *
 * Layout: U-Shaped warehouse with central storage area
 *
 *            NORTH (Front)
 *    ┌──────────────────────────────┐
 *    │   Receiving    │   Shipping  │  DOCK AREA
 *    │    Dock        │    Dock     │
 *    ├────────────────┼─────────────┤
 *    │                              │
 *    │   Storage A   Storage B     │  MAIN STORAGE
 *    │                              │
 *    ├───────┬───────┬──────────────┤
 *    │Office │Returns│ Processing   │
 *    │       │       │              │  LEFT WING
 *    ├───────┴───────┼──────────────┤
 *    │ Secure        │   Staging    │
 *    │ Evidence      │              │  SECURE AREA
 *    └───────────────┴──────────────┘
 *            SOUTH (Back)
 */

import type { WarehouseConfig, ZoneConfig, ReaderConfig, CameraPreset } from '../../core/types';

// ============================================================================
// ZONE DEFINITIONS
// ============================================================================

const zones: ZoneConfig[] = [
  // ========== DOCK AREA (North) ==========
  {
    id: 'receiving',
    name: 'receiving',
    displayName: 'Receiving Dock',
    type: 'receiving',
    bounds: { minX: -40, maxX: -5, minY: 0, maxY: 10, minZ: -35, maxZ: -20 },
    center: { x: -22.5, y: 0.5, z: -27.5 },
    floorSize: { width: 35, depth: 15 },
    floorColor: '#22c55e',
    color: '#22c55e',
    icon: '📥',
    capacity: 150,
    priority: 'high',
    connectedZones: ['storage-a', 'office'],
    cameraPreset: {
      position: { x: -35, y: 18, z: -50 },
      target: { x: -22.5, y: 2, z: -27.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'shipping',
    name: 'shipping',
    displayName: 'Shipping Dock',
    type: 'shipping',
    bounds: { minX: 5, maxX: 40, minY: 0, maxY: 10, minZ: -35, maxZ: -20 },
    center: { x: 22.5, y: 0.5, z: -27.5 },
    floorSize: { width: 35, depth: 15 },
    floorColor: '#8b5cf6',
    color: '#8b5cf6',
    icon: '📤',
    capacity: 200,
    priority: 'high',
    connectedZones: ['storage-b', 'staging'],
    cameraPreset: {
      position: { x: 35, y: 18, z: -50 },
      target: { x: 22.5, y: 2, z: -27.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },

  // ========== MAIN STORAGE (Center) ==========
  {
    id: 'storage-a',
    name: 'storage-a',
    displayName: 'Storage Area A',
    type: 'storage',
    bounds: { minX: -25, maxX: 0, minY: 0, maxY: 8, minZ: -18, maxZ: 8 },
    center: { x: -12.5, y: 0.5, z: -5 },
    floorSize: { width: 25, depth: 26 },
    floorColor: '#3b82f6',
    color: '#3b82f6',
    icon: '📦',
    capacity: 500,
    priority: 'medium',
    connectedZones: ['receiving', 'storage-b', 'returns', 'processing'],
    cameraPreset: {
      position: { x: -25, y: 20, z: 15 },
      target: { x: -12.5, y: 2, z: -5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'storage-b',
    name: 'storage-b',
    displayName: 'Storage Area B',
    type: 'storage',
    bounds: { minX: 0, maxX: 25, minY: 0, maxY: 8, minZ: -18, maxZ: 8 },
    center: { x: 12.5, y: 0.5, z: -5 },
    floorSize: { width: 25, depth: 26 },
    floorColor: '#3b82f6',
    color: '#3b82f6',
    icon: '📦',
    capacity: 500,
    priority: 'medium',
    connectedZones: ['shipping', 'storage-a', 'staging'],
    cameraPreset: {
      position: { x: 25, y: 20, z: 15 },
      target: { x: 12.5, y: 2, z: -5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },

  // ========== LEFT WING (West) ==========
  {
    id: 'office',
    name: 'office',
    displayName: 'Office Area',
    type: 'office',
    bounds: { minX: -40, maxX: -28, minY: 0, maxY: 6, minZ: -18, maxZ: -5 },
    center: { x: -34, y: 0.5, z: -11.5 },
    floorSize: { width: 12, depth: 13 },
    floorColor: '#6366f1',
    color: '#6366f1',
    icon: '🏢',
    capacity: 20,
    priority: 'low',
    connectedZones: ['receiving', 'returns'],
    cameraPreset: {
      position: { x: -48, y: 12, z: -20 },
      target: { x: -34, y: 2, z: -11.5 },
      fov: 50,
    },
    hasWalls: true,
    wallHeight: 3,
    securityLevel: 'standard',
  },
  {
    id: 'returns',
    name: 'returns',
    displayName: 'Returns Processing',
    type: 'returns',
    bounds: { minX: -40, maxX: -28, minY: 0, maxY: 6, minZ: -5, maxZ: 8 },
    center: { x: -34, y: 0.5, z: 1.5 },
    floorSize: { width: 12, depth: 13 },
    floorColor: '#f97316',
    color: '#f97316',
    icon: '↩️',
    capacity: 100,
    priority: 'medium',
    connectedZones: ['office', 'processing', 'storage-a'],
    cameraPreset: {
      position: { x: -48, y: 12, z: -5 },
      target: { x: -34, y: 2, z: 1.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'processing',
    name: 'processing',
    displayName: 'Processing Area',
    type: 'processing',
    bounds: { minX: -40, maxX: -20, minY: 0, maxY: 8, minZ: 8, maxZ: 22 },
    center: { x: -30, y: 0.5, z: 15 },
    floorSize: { width: 20, depth: 14 },
    floorColor: '#eab308',
    color: '#eab308',
    icon: '⚙️',
    capacity: 200,
    priority: 'high',
    connectedZones: ['returns', 'secure-evidence', 'storage-a'],
    cameraPreset: {
      position: { x: -48, y: 15, z: 8 },
      target: { x: -30, y: 2, z: 15 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },

  // ========== SECURE AREA (Southwest) ==========
  {
    id: 'secure-evidence',
    name: 'secure-evidence',
    displayName: 'Secure Evidence Vault',
    type: 'secure',
    bounds: { minX: -40, maxX: -20, minY: 0, maxY: 6, minZ: 22, maxZ: 35 },
    center: { x: -30, y: 0.5, z: 28.5 },
    floorSize: { width: 20, depth: 13 },
    floorColor: '#ef4444',
    color: '#ef4444',
    icon: '🔒',
    isSecure: true,
    wallColor: '#7f1d1d',
    capacity: 100,
    priority: 'critical',
    connectedZones: ['processing'],
    cameraPreset: {
      position: { x: -48, y: 12, z: 22 },
      target: { x: -30, y: 2, z: 28.5 },
      fov: 50,
    },
    hasWalls: true,
    wallHeight: 4,
    securityLevel: 'secure',
  },

  // ========== RIGHT WING (East) ==========
  {
    id: 'staging',
    name: 'staging',
    displayName: 'Staging Area',
    type: 'staging',
    bounds: { minX: 25, maxX: 40, minY: 0, maxY: 8, minZ: -5, maxZ: 25 },
    center: { x: 32.5, y: 0.5, z: 10 },
    floorSize: { width: 15, depth: 30 },
    floorColor: '#14b8a6',
    color: '#14b8a6',
    icon: '📋',
    capacity: 250,
    priority: 'high',
    connectedZones: ['shipping', 'storage-b'],
    cameraPreset: {
      position: { x: 48, y: 15, z: 0 },
      target: { x: 32.5, y: 2, z: 10 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
];

// ============================================================================
// RFID READERS
// ============================================================================

const readers: ReaderConfig[] = [
  // Receiving Dock Readers
  {
    id: 'RDR-001',
    name: 'R1',
    displayName: 'Receiving Portal 1',
    zoneId: 'receiving',
    position: { x: -30, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },
  {
    id: 'RDR-002',
    name: 'R2',
    displayName: 'Receiving Portal 2',
    zoneId: 'receiving',
    position: { x: -15, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },

  // Shipping Dock Readers
  {
    id: 'RDR-003',
    name: 'S1',
    displayName: 'Shipping Portal 1',
    zoneId: 'shipping',
    position: { x: 15, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },
  {
    id: 'RDR-004',
    name: 'S2',
    displayName: 'Shipping Portal 2',
    zoneId: 'shipping',
    position: { x: 30, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },

  // Storage A Readers
  {
    id: 'RDR-005',
    name: 'A-N',
    displayName: 'Storage A North',
    zoneId: 'storage-a',
    position: { x: -12.5, y: 3, z: -15 },
    rotation: 0,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },
  {
    id: 'RDR-006',
    name: 'A-S',
    displayName: 'Storage A South',
    zoneId: 'storage-a',
    position: { x: -12.5, y: 3, z: 5 },
    rotation: Math.PI,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },

  // Storage B Readers
  {
    id: 'RDR-007',
    name: 'B-N',
    displayName: 'Storage B North',
    zoneId: 'storage-b',
    position: { x: 12.5, y: 3, z: -15 },
    rotation: 0,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },
  {
    id: 'RDR-008',
    name: 'B-S',
    displayName: 'Storage B South',
    zoneId: 'storage-b',
    position: { x: 12.5, y: 3, z: 5 },
    rotation: Math.PI,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },

  // Processing Reader
  {
    id: 'RDR-009',
    name: 'PROC',
    displayName: 'Processing Area',
    zoneId: 'processing',
    position: { x: -30, y: 3, z: 15 },
    rotation: Math.PI / 2,
    type: 'ceiling',
    range: 6,
    antennaCount: 2,
  },

  // Returns Reader
  {
    id: 'RDR-010',
    name: 'RET',
    displayName: 'Returns Station',
    zoneId: 'returns',
    position: { x: -34, y: 3, z: 1.5 },
    rotation: Math.PI / 2,
    type: 'dock',
    range: 3,
    antennaCount: 1,
  },

  // Staging Reader
  {
    id: 'RDR-011',
    name: 'STG',
    displayName: 'Staging Area',
    zoneId: 'staging',
    position: { x: 32.5, y: 3, z: 5 },
    rotation: -Math.PI / 2,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },

  // Secure Evidence Readers (dual for redundancy)
  {
    id: 'RDR-012',
    name: 'SEC1',
    displayName: 'Secure Entry',
    zoneId: 'secure-evidence',
    position: { x: -25, y: 3, z: 23 },
    rotation: Math.PI / 2,
    type: 'portal',
    range: 3,
    antennaCount: 4,
  },
  {
    id: 'RDR-013',
    name: 'SEC2',
    displayName: 'Secure Interior',
    zoneId: 'secure-evidence',
    position: { x: -30, y: 3.5, z: 28.5 },
    rotation: 0,
    type: 'ceiling',
    range: 5,
    antennaCount: 2,
  },

  // Office Reader
  {
    id: 'RDR-014',
    name: 'OFF',
    displayName: 'Office Entry',
    zoneId: 'office',
    position: { x: -29, y: 3, z: -11.5 },
    rotation: Math.PI / 2,
    type: 'portal',
    range: 3,
    antennaCount: 2,
  },
];

// ============================================================================
// CAMERA PRESETS
// ============================================================================

const cameraPresets: CameraPreset[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'Bird\'s eye view of entire warehouse',
    position: { x: 70, y: 55, z: 50 },
    target: { x: 0, y: 0, z: 0 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '1',
    keyboardShortcut: '1',
  },
  {
    id: 'top-down',
    name: 'Top Down',
    description: 'Directly above, floor plan view',
    position: { x: 0, y: 80, z: 0.1 },
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    transitionDuration: 1.5,
    shortcut: '2',
    keyboardShortcut: '2',
  },
  {
    id: 'docks',
    name: 'Dock View',
    description: 'View of receiving and shipping docks',
    position: { x: 0, y: 25, z: -55 },
    target: { x: 0, y: 3, z: -25 },
    fov: 55,
    transitionDuration: 1.5,
    shortcut: '3',
    keyboardShortcut: '3',
  },
  {
    id: 'receiving',
    name: 'Receiving',
    description: 'Receiving dock focus',
    position: { x: -35, y: 18, z: -50 },
    target: { x: -22.5, y: 2, z: -27.5 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '4',
    keyboardShortcut: '4',
  },
  {
    id: 'shipping',
    name: 'Shipping',
    description: 'Shipping dock focus',
    position: { x: 35, y: 18, z: -50 },
    target: { x: 22.5, y: 2, z: -27.5 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '5',
    keyboardShortcut: '5',
  },
  {
    id: 'storage',
    name: 'Storage',
    description: 'Main storage areas',
    position: { x: 0, y: 30, z: 20 },
    target: { x: 0, y: 0, z: -5 },
    fov: 55,
    transitionDuration: 1.5,
    shortcut: '6',
    keyboardShortcut: '6',
  },
  {
    id: 'secure-evidence',
    name: 'Secure Vault',
    description: 'Evidence vault exterior',
    position: { x: -48, y: 12, z: 22 },
    target: { x: -30, y: 2, z: 28.5 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '7',
    keyboardShortcut: '7',
  },
  {
    id: 'processing',
    name: 'Processing',
    description: 'Processing area view',
    position: { x: -48, y: 15, z: 8 },
    target: { x: -30, y: 2, z: 15 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '8',
    keyboardShortcut: '8',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Dramatic low angle',
    position: { x: 65, y: 8, z: -45 },
    target: { x: 0, y: 5, z: 0 },
    fov: 35,
    transitionDuration: 2,
    shortcut: '9',
    keyboardShortcut: '9',
  },
  {
    id: 'isometric',
    name: 'Isometric',
    description: 'Classic isometric view',
    position: { x: 60, y: 45, z: 60 },
    target: { x: 0, y: 0, z: 0 },
    fov: 35,
    transitionDuration: 1.5,
    shortcut: '0',
    keyboardShortcut: '0',
  },
  {
    id: 'vault-interior',
    name: 'Inside Vault',
    description: 'POV from inside secure area',
    position: { x: -30, y: 2, z: 30 },
    target: { x: -20, y: 2, z: 15 },
    fov: 60,
    transitionDuration: 1.5,
    shortcut: 'v',
    keyboardShortcut: 'v',
  },
  {
    id: 'hero-shot',
    name: 'Hero Shot',
    description: 'Dramatic entrance view',
    position: { x: 0, y: 6, z: -55 },
    target: { x: 0, y: 5, z: 0 },
    fov: 45,
    transitionDuration: 2,
    shortcut: 'h',
    keyboardShortcut: 'h',
  },
];

// ============================================================================
// COMPLETE WAREHOUSE CONFIGURATION
// ============================================================================

export const SAPS_FORENSICS_WAREHOUSE: WarehouseConfig = {
  // Identity
  id: 'wh-saps-001',
  tenantId: 'tenant-saps-forensics',
  name: 'SAPS Forensics Lab',
  slug: 'saps-forensics',
  description: 'South African Police Service Forensic Evidence Tracking Facility',

  // Physical dimensions
  dimensions: {
    width: 90,   // -45 to +45 on X
    length: 80,  // -40 to +40 on Z
    height: 12,
  },
  layoutType: 'u-shaped',
  floorLevel: 0,

  // Layout elements
  zones,
  readers,

  // Camera
  cameraPresets,
  defaultCameraPreset: 'overview',
  walkBoundaries: {
    minX: -42,
    maxX: 42,
    minZ: -38,
    maxZ: 38,
  },

  // Rendering
  rendering: {
    ambientLightIntensity: 0.2,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    maxVisibleItems: 500,
    lodDistances: {
      detailed: 20,
      individual: 50,
      cluster: 100,
    },
    backgroundColor: '#0f172a',
    postProcessing: true,
  },

  // Metadata
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
  version: 1,
};

// ============================================================================
// HELPER LOOKUPS (Pre-computed for performance)
// ============================================================================

/** Zone lookup by ID */
export const ZONE_MAP = new Map(zones.map(z => [z.id, z]));

/** Reader lookup by ID */
export const READER_MAP = new Map(readers.map(r => [r.id, r]));

/** Camera preset lookup by ID */
export const PRESET_MAP = new Map(cameraPresets.map(p => [p.id, p]));

/** Camera preset lookup by shortcut key */
export const PRESET_BY_SHORTCUT = new Map(
  cameraPresets.filter(p => p.shortcut).map(p => [p.shortcut!, p])
);

/** Get zone center as tuple */
export function getZoneCenterTuple(zoneId: string): [number, number, number] {
  const zone = ZONE_MAP.get(zoneId);
  if (!zone) return [0, 0.5, 0];
  return [zone.center.x, zone.center.y, zone.center.z];
}

/** Get all zone IDs */
export const ZONE_IDS = zones.map(z => z.id);

/** Zone connections graph for pathfinding */
export const ZONE_CONNECTIONS = new Map(
  zones.map(z => [z.id, z.connectedZones])
);

export default SAPS_FORENSICS_WAREHOUSE;
