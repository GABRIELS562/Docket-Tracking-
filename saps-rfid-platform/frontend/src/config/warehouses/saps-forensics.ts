/**
 * SAPS FORENSICS LAB - WAREHOUSE CONFIGURATION
 *
 * This is the SINGLE SOURCE OF TRUTH for all warehouse spatial data.
 * All components MUST use this configuration - no hardcoded coordinates elsewhere.
 *
 * Layout: DNA Forensic Laboratory Workflow
 *
 *            NORTH (Front)
 *    ┌──────────────────────────────┐
 *    │    Entry       │  Chain of   │  ENTRY & EXIT
 *    │    into Lab    │  Custody    │
 *    ├────────────────┼─────────────┤
 *    │                              │
 *    │  Extractions   QPCR Lab     │  INITIAL PROCESSING
 *    │  Sgt Pillay    Sgt Mulder   │
 *    ├───────┬───────┬──────────────┤
 *    │GeneMap│Electro│  PCR Lab     │
 *    │ WO D  │phoresis│ WO Jacobs   │  ANALYSIS AREA
 *    └───────┴───────┴──────────────┘
 *            SOUTH (Back)
 */

import type { WarehouseConfig, ZoneConfig, ReaderConfig, CameraPreset } from '../../core/types';

// ============================================================================
// ZONE DEFINITIONS
// ============================================================================

const zones: ZoneConfig[] = [
  // ========== ENTRY AREA (North) ==========
  {
    id: 'entry',
    name: 'entry',
    displayName: 'Entry into Lab',
    type: 'receiving',
    bounds: { minX: -40, maxX: -5, minY: 0, maxY: 10, minZ: -35, maxZ: -20 },
    center: { x: -22.5, y: 0.5, z: -27.5 },
    floorSize: { width: 35, depth: 15 },
    floorColor: '#3b82f6',
    color: '#3b82f6',
    icon: '🚪',
    capacity: 150,
    priority: 'high',
    connectedZones: ['extractions', 'genemapper'],
    cameraPreset: {
      position: { x: -35, y: 18, z: -50 },
      target: { x: -22.5, y: 2, z: -27.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'chain-custody',
    name: 'chain-custody',
    displayName: 'Confirm Chain of Custody',
    type: 'shipping',
    bounds: { minX: 5, maxX: 40, minY: 0, maxY: 10, minZ: -35, maxZ: -20 },
    center: { x: 22.5, y: 0.5, z: -27.5 },
    floorSize: { width: 35, depth: 15 },
    floorColor: '#ef4444',
    color: '#ef4444',
    icon: '✅',
    isSecure: true,
    capacity: 200,
    priority: 'critical',
    connectedZones: ['qpcr-lab', 'electrophoresis'],
    cameraPreset: {
      position: { x: 35, y: 18, z: -50 },
      target: { x: 22.5, y: 2, z: -27.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'secure',
  },

  // ========== INITIAL PROCESSING (Center) ==========
  {
    id: 'extractions',
    name: 'extractions',
    displayName: 'Extractions - Sgt Pillay',
    type: 'storage',
    bounds: { minX: -25, maxX: 0, minY: 0, maxY: 8, minZ: -18, maxZ: 8 },
    center: { x: -12.5, y: 0.5, z: -5 },
    floorSize: { width: 25, depth: 26 },
    floorColor: '#10b981',
    color: '#10b981',
    icon: '🧬',
    capacity: 500,
    priority: 'high',
    connectedZones: ['entry', 'qpcr-lab', 'electrophoresis', 'pcr-lab'],
    cameraPreset: {
      position: { x: -25, y: 20, z: 15 },
      target: { x: -12.5, y: 2, z: -5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'qpcr-lab',
    name: 'qpcr-lab',
    displayName: 'QPCR Lab - Sgt Mulder',
    type: 'storage',
    bounds: { minX: 0, maxX: 25, minY: 0, maxY: 8, minZ: -18, maxZ: 8 },
    center: { x: 12.5, y: 0.5, z: -5 },
    floorSize: { width: 25, depth: 26 },
    floorColor: '#8b5cf6',
    color: '#8b5cf6',
    icon: '🔬',
    capacity: 500,
    priority: 'high',
    connectedZones: ['chain-custody', 'extractions', 'electrophoresis'],
    cameraPreset: {
      position: { x: 25, y: 20, z: 15 },
      target: { x: 12.5, y: 2, z: -5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },

  // ========== ANALYSIS AREA (South) ==========
  {
    id: 'genemapper',
    name: 'genemapper',
    displayName: 'GeneMapper ID - WO Daniels',
    type: 'office',
    bounds: { minX: -40, maxX: -28, minY: 0, maxY: 6, minZ: -18, maxZ: -5 },
    center: { x: -34, y: 0.5, z: -11.5 },
    floorSize: { width: 12, depth: 13 },
    floorColor: '#ec4899',
    color: '#ec4899',
    icon: '🧪',
    capacity: 50,
    priority: 'high',
    connectedZones: ['entry', 'electrophoresis'],
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
    id: 'electrophoresis',
    name: 'electrophoresis',
    displayName: 'Electrophoresis Lab',
    type: 'returns',
    bounds: { minX: -40, maxX: -28, minY: 0, maxY: 6, minZ: -5, maxZ: 8 },
    center: { x: -34, y: 0.5, z: 1.5 },
    floorSize: { width: 12, depth: 13 },
    floorColor: '#06b6d4',
    color: '#06b6d4',
    icon: '📊',
    capacity: 100,
    priority: 'high',
    connectedZones: ['genemapper', 'pcr-lab', 'extractions'],
    cameraPreset: {
      position: { x: -48, y: 12, z: -5 },
      target: { x: -34, y: 2, z: 1.5 },
      fov: 50,
    },
    hasWalls: false,
    securityLevel: 'standard',
  },
  {
    id: 'pcr-lab',
    name: 'pcr-lab',
    displayName: 'PCR Lab - WO Jacobs',
    type: 'processing',
    bounds: { minX: -40, maxX: -20, minY: 0, maxY: 8, minZ: 8, maxZ: 22 },
    center: { x: -30, y: 0.5, z: 15 },
    floorSize: { width: 20, depth: 14 },
    floorColor: '#f59e0b',
    color: '#f59e0b',
    icon: '⚗️',
    capacity: 200,
    priority: 'high',
    connectedZones: ['electrophoresis', 'extractions'],
    cameraPreset: {
      position: { x: -48, y: 15, z: 8 },
      target: { x: -30, y: 2, z: 15 },
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
  // Entry into Lab Readers
  {
    id: 'RDR-001',
    name: 'ENT1',
    displayName: 'Lab Entry Portal 1',
    zoneId: 'entry',
    position: { x: -30, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },
  {
    id: 'RDR-002',
    name: 'ENT2',
    displayName: 'Lab Entry Portal 2',
    zoneId: 'entry',
    position: { x: -15, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },

  // Chain of Custody Readers
  {
    id: 'RDR-003',
    name: 'COC1',
    displayName: 'Chain Custody Portal 1',
    zoneId: 'chain-custody',
    position: { x: 15, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },
  {
    id: 'RDR-004',
    name: 'COC2',
    displayName: 'Chain Custody Portal 2',
    zoneId: 'chain-custody',
    position: { x: 30, y: 3.5, z: -32 },
    rotation: 0,
    type: 'portal',
    range: 5,
    antennaCount: 4,
  },

  // Extractions Lab Readers
  {
    id: 'RDR-005',
    name: 'EXT-N',
    displayName: 'Extractions North',
    zoneId: 'extractions',
    position: { x: -12.5, y: 3, z: -15 },
    rotation: 0,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },
  {
    id: 'RDR-006',
    name: 'EXT-S',
    displayName: 'Extractions South',
    zoneId: 'extractions',
    position: { x: -12.5, y: 3, z: 5 },
    rotation: Math.PI,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },

  // QPCR Lab Readers
  {
    id: 'RDR-007',
    name: 'QPCR-N',
    displayName: 'QPCR Lab North',
    zoneId: 'qpcr-lab',
    position: { x: 12.5, y: 3, z: -15 },
    rotation: 0,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },
  {
    id: 'RDR-008',
    name: 'QPCR-S',
    displayName: 'QPCR Lab South',
    zoneId: 'qpcr-lab',
    position: { x: 12.5, y: 3, z: 5 },
    rotation: Math.PI,
    type: 'ceiling',
    range: 8,
    antennaCount: 2,
  },

  // PCR Lab Reader
  {
    id: 'RDR-009',
    name: 'PCR',
    displayName: 'PCR Lab - WO Jacobs',
    zoneId: 'pcr-lab',
    position: { x: -30, y: 3, z: 15 },
    rotation: Math.PI / 2,
    type: 'ceiling',
    range: 6,
    antennaCount: 2,
  },

  // Electrophoresis Reader
  {
    id: 'RDR-010',
    name: 'ELEC',
    displayName: 'Electrophoresis Station',
    zoneId: 'electrophoresis',
    position: { x: -34, y: 3, z: 1.5 },
    rotation: Math.PI / 2,
    type: 'dock',
    range: 3,
    antennaCount: 1,
  },

  // GeneMapper ID Reader
  {
    id: 'RDR-011',
    name: 'GENE',
    displayName: 'GeneMapper ID Office',
    zoneId: 'genemapper',
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
    id: 'entry-view',
    name: 'Entry View',
    description: 'View of lab entry and chain of custody',
    position: { x: 0, y: 25, z: -55 },
    target: { x: 0, y: 3, z: -25 },
    fov: 55,
    transitionDuration: 1.5,
    shortcut: '3',
    keyboardShortcut: '3',
  },
  {
    id: 'entry',
    name: 'Entry into Lab',
    description: 'Lab entry focus',
    position: { x: -35, y: 18, z: -50 },
    target: { x: -22.5, y: 2, z: -27.5 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '4',
    keyboardShortcut: '4',
  },
  {
    id: 'chain-custody',
    name: 'Chain of Custody',
    description: 'Chain of custody confirmation area',
    position: { x: 35, y: 18, z: -50 },
    target: { x: 22.5, y: 2, z: -27.5 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '5',
    keyboardShortcut: '5',
  },
  {
    id: 'extractions',
    name: 'Extractions',
    description: 'Extractions lab - Sgt Pillay',
    position: { x: 0, y: 30, z: 20 },
    target: { x: 0, y: 0, z: -5 },
    fov: 55,
    transitionDuration: 1.5,
    shortcut: '6',
    keyboardShortcut: '6',
  },
  {
    id: 'pcr-lab',
    name: 'PCR Lab',
    description: 'PCR Lab - WO Jacobs',
    position: { x: -48, y: 12, z: 22 },
    target: { x: -30, y: 2, z: 15 },
    fov: 50,
    transitionDuration: 1.5,
    shortcut: '7',
    keyboardShortcut: '7',
  },
  {
    id: 'qpcr-lab',
    name: 'QPCR Lab',
    description: 'QPCR Lab - Sgt Mulder',
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
    id: 'genemapper-interior',
    name: 'Inside GeneMapper',
    description: 'POV from GeneMapper ID office',
    position: { x: -34, y: 2, z: -11 },
    target: { x: -20, y: 2, z: -5 },
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
  // ========== INTERIOR VIEWS (for demo) ==========
  {
    id: 'interior-overview',
    name: 'Interior Overview',
    description: 'Inside warehouse looking at all zones',
    position: { x: 0, y: 12, z: 0 },
    target: { x: 0, y: 0, z: -10 },
    fov: 70,
    transitionDuration: 1.5,
  },
  {
    id: 'extractions-interior',
    name: 'Extractions Interior',
    description: 'Inside Extractions lab with RFID readers visible',
    position: { x: -5, y: 5, z: -5 },
    target: { x: -12.5, y: 3, z: -10 },
    fov: 60,
    transitionDuration: 1.5,
  },
  {
    id: 'readers-view',
    name: 'RFID Readers',
    description: 'View showing RFID reader network',
    position: { x: 10, y: 8, z: 0 },
    target: { x: -10, y: 3, z: -5 },
    fov: 65,
    transitionDuration: 1.5,
  },
  {
    id: 'electrophoresis-interior',
    name: 'Inside Electrophoresis',
    description: 'POV inside electrophoresis lab',
    position: { x: -34, y: 3, z: 1 },
    target: { x: -30, y: 2, z: 5 },
    fov: 55,
    transitionDuration: 1.5,
  },
  {
    id: 'pcr-interior',
    name: 'PCR Lab Floor',
    description: 'Inside PCR lab - WO Jacobs',
    position: { x: -30, y: 4, z: 12 },
    target: { x: -30, y: 2, z: 18 },
    fov: 60,
    transitionDuration: 1.5,
  },
  {
    id: 'entry-interior',
    name: 'Entry Inside',
    description: 'Inside lab entry area',
    position: { x: -22, y: 4, z: -25 },
    target: { x: -22, y: 2, z: -30 },
    fov: 55,
    transitionDuration: 1.5,
  },
  {
    id: 'custody-interior',
    name: 'Chain of Custody Inside',
    description: 'Inside chain of custody area',
    position: { x: 22, y: 4, z: -25 },
    target: { x: 22, y: 2, z: -30 },
    fov: 55,
    transitionDuration: 1.5,
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
