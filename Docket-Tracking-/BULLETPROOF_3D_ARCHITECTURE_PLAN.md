# Bulletproof Multi-Site 3D RFID Platform Architecture

## Executive Summary

This document outlines a comprehensive architectural redesign of the 3D frontend system to support:
- **Multi-site scalability**: Unlimited warehouses/facilities
- **Configuration-driven layouts**: No hardcoded coordinates
- **60 FPS performance**: With 300K+ items across all sites
- **Real-time synchronization**: WebSocket per-site with efficient routing
- **Zero technical debt**: Clean, maintainable, extensible codebase

---

## Part 1: Current State Analysis

### 1.1 Critical Issues Identified

#### Issue #1: Coordinate System Chaos (6 Different Systems!)

| File | Component | Example (Receiving Zone) |
|------|-----------|-------------------------|
| `sceneStore.ts` | ZONE_POSITIONS | `[-40, 20, -50]` (camera targets) |
| `ZoneHeatmap.tsx` | ZONE_CONFIG | `[-33, 0.1, -33]` (3x3 grid) |
| `VirtualizedDataBridge.tsx` | ZONE_POSITIONS | `[-33, 1.5, -33]` (3x3 grid) |
| `virtualizedAppStore.ts` | DEFAULT_ZONES | `[-33, 0, -33]` (3x3 grid) |
| `PathfindingVisualization.tsx` | ZONE_CENTERS | `[-20, 0.5, -25]` (U-shape) |
| `RFIDReaders.tsx` | DEFAULT_READERS | `[-25, 3.5, -32]` (docks) |

**Result**: Items appear in wrong locations, pathfinding breaks, camera fly-to goes nowhere.

#### Issue #2: Dual Control Systems

```
Scene.tsx
├── CinematicCamera.tsx (OrbitControls + GSAP + keyboard)
├── FirstPersonControls.tsx (PointerLock + WASD)
└── Controls.tsx (duplicate OrbitControls - UNUSED but exists)
```

Both CinematicCamera and Controls.tsx define keyboard handlers for the same keys.

#### Issue #3: Dual Store Architecture

```
sceneStore.ts          virtualizedAppStore.ts
├── items[]            ├── visibleItems (Map)
├── zoneStats[]        ├── zones (Map)
├── cameraPosition     ├── virtualWindow.cameraPosition
└── (not synced) ──────└── (not synced)
```

Data flows into virtualizedAppStore from WebSocket, but sceneStore.items is used by some components.

#### Issue #4: Performance Anti-Patterns

```typescript
// BAD: Object creation in useFrame (60x per second)
useFrame((state) => {
  const tempColor = new THREE.Color();  // GC pressure
  items.forEach(item => {
    tempColor.set(item.color);  // Creates internal objects
  });
});

// BAD: State updates in useFrame
useFrame(() => {
  setParticleProgress(newProgress);  // Triggers React re-render
});

// BAD: Non-memoized array iterations
const itemCount = Math.max(sceneItems.length, virtualizedItemCount);
// virtualizedItemCount iterates Map on every call
```

#### Issue #5: WebSocket Architecture

```typescript
// Current: Singleton with 3 retry attempts
maxReconnectAttempts = 3  // Gives up too quickly

// Multiple components call useWebSocket()
// Each mount = potential reconnection attempt
// No site-awareness
```

---

## Part 2: Target Architecture

### 2.1 Core Principles

1. **Single Source of Truth**: One configuration system for all spatial data
2. **Configuration Over Code**: Warehouse layouts from API/config, not hardcoded
3. **Site Isolation**: Each warehouse is independent, switchable
4. **Performance by Design**: Object pooling, LOD, workers
5. **Type Safety**: Full TypeScript with runtime validation

### 2.2 New Directory Structure

```
saps-rfid-platform/frontend/src/
├── config/
│   ├── index.ts                    # Config loader
│   ├── warehouse.schema.ts         # Zod validation schemas
│   └── defaults/
│       ├── saps-forensics.json     # SAPS demo warehouse
│       └── generic-warehouse.json  # Template
│
├── core/
│   ├── types/
│   │   ├── warehouse.types.ts      # WarehouseConfig, Zone, Reader, etc.
│   │   ├── item.types.ts           # Item, TrackedItem, VirtualizedItem
│   │   └── events.types.ts         # WebSocket events
│   │
│   ├── constants/
│   │   └── defaults.ts             # Default values, magic numbers
│   │
│   └── utils/
│       ├── coordinates.ts          # Coordinate transformations
│       ├── pool.ts                 # Object pooling utilities
│       └── math.ts                 # Vector/matrix helpers
│
├── stores/
│   ├── warehouseStore.ts           # NEW: Unified warehouse state
│   ├── cameraStore.ts              # Camera-only state (extracted)
│   ├── uiStore.ts                  # UI toggles, selections
│   └── realtimeStore.ts            # WebSocket connection state
│
├── services/
│   ├── warehouseService.ts         # Load/save warehouse configs
│   ├── websocketService.ts         # REFACTORED: Site-aware WS
│   └── analyticsService.ts         # Metrics, performance
│
├── hooks/
│   ├── useWarehouse.ts             # Warehouse data access
│   ├── useCamera.ts                # Camera controls
│   ├── useItems.ts                 # Virtualized items
│   ├── useWebSocket.ts             # REFACTORED: Site-scoped
│   └── usePerformance.ts           # FPS, memory monitoring
│
├── components/
│   ├── 3d/
│   │   ├── Scene/
│   │   │   ├── Scene.tsx           # Main canvas
│   │   │   ├── SceneContent.tsx    # Inside Canvas
│   │   │   └── SceneOverlay.tsx    # HTML overlays (outside Canvas)
│   │   │
│   │   ├── Camera/
│   │   │   ├── CameraController.tsx    # UNIFIED controller
│   │   │   ├── OrbitMode.tsx           # Orbit behavior
│   │   │   ├── WalkMode.tsx            # FPS behavior
│   │   │   └── CinematicMode.tsx       # Tour/animation behavior
│   │   │
│   │   ├── Warehouse/
│   │   │   ├── Warehouse.tsx           # Main structure
│   │   │   ├── Zone.tsx                # Single zone (config-driven)
│   │   │   ├── ZoneLabel.tsx           # Zone labels
│   │   │   └── WarehouseFloor.tsx      # Floor with grid
│   │   │
│   │   ├── Items/
│   │   │   ├── ItemRenderer.tsx        # Smart switcher
│   │   │   ├── InstancedItems.tsx      # GPU instancing
│   │   │   ├── DetailedItem.tsx        # Close-up detail
│   │   │   └── ItemPool.ts             # Object pool
│   │   │
│   │   ├── Readers/
│   │   │   ├── ReaderRenderer.tsx      # Config-driven readers
│   │   │   └── ReaderGlow.tsx          # Scan visualization
│   │   │
│   │   ├── Visualization/
│   │   │   ├── Heatmap.tsx             # Zone heatmap
│   │   │   ├── Pathfinding.tsx         # Route visualization
│   │   │   └── FlowLines.tsx           # Item flow lines
│   │   │
│   │   └── Effects/
│   │       ├── Lighting.tsx            # Scene lighting
│   │       └── PostProcessing.tsx      # Bloom, etc.
│   │
│   └── ui/
│       └── ...
│
└── pages/
    └── ...
```

---

## Part 3: Unified Warehouse Configuration System

### 3.1 Warehouse Configuration Schema

```typescript
// core/types/warehouse.types.ts

/**
 * 3D Coordinate in warehouse space
 * Origin (0,0,0) = center of warehouse floor
 * Y-up coordinate system
 */
export interface Vector3 {
  x: number;  // East-West (-X = West, +X = East)
  y: number;  // Height (0 = floor, + = up)
  z: number;  // North-South (-Z = North/front, +Z = South/back)
}

/**
 * Bounding box for zones and structures
 */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/**
 * Zone configuration
 */
export interface ZoneConfig {
  id: string;
  name: string;
  displayName: string;
  type: 'receiving' | 'shipping' | 'storage' | 'processing' | 'secure' | 'staging' | 'office' | 'returns';

  // Spatial
  bounds: BoundingBox;
  center: Vector3;
  floorColor: string;
  wallColor?: string;

  // Capacity
  capacity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Connections for pathfinding
  connectedZones: string[];

  // Camera preset for this zone
  cameraPreset: {
    position: Vector3;
    target: Vector3;
    fov?: number;
  };
}

/**
 * RFID Reader configuration
 */
export interface ReaderConfig {
  id: string;
  name: string;
  zoneId: string;
  position: Vector3;
  rotation: number;  // Y-axis rotation in radians
  type: 'portal' | 'ceiling' | 'handheld';
  range: number;     // Read range in meters
}

/**
 * Camera preset for quick navigation
 */
export interface CameraPreset {
  id: string;
  name: string;
  position: Vector3;
  target: Vector3;
  fov: number;
  transitionDuration?: number;
}

/**
 * Complete warehouse configuration
 */
export interface WarehouseConfig {
  // Identity
  id: string;
  tenantId: string;
  name: string;
  slug: string;

  // Physical dimensions
  dimensions: {
    width: number;   // X-axis (meters)
    length: number;  // Z-axis (meters)
    height: number;  // Y-axis (meters)
  };

  // Layout type
  layoutType: 'rectangular' | 'u-shaped' | 'l-shaped' | 'custom';

  // Zones
  zones: ZoneConfig[];

  // Readers
  readers: ReaderConfig[];

  // Camera presets
  cameraPresets: CameraPreset[];
  defaultCameraPreset: string;

  // Rendering hints
  rendering: {
    ambientLightIntensity: number;
    shadowsEnabled: boolean;
    maxVisibleItems: number;
    lodDistances: {
      detailed: number;
      individual: number;
      cluster: number;
    };
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

### 3.2 Example Configuration (SAPS Forensics)

```json
{
  "id": "wh-saps-001",
  "tenantId": "tenant-saps",
  "name": "SAPS Forensics Lab",
  "slug": "saps-forensics",

  "dimensions": {
    "width": 90,
    "length": 70,
    "height": 12
  },

  "layoutType": "u-shaped",

  "zones": [
    {
      "id": "receiving",
      "name": "receiving",
      "displayName": "Receiving Dock",
      "type": "receiving",
      "bounds": {
        "min": { "x": -30, "y": 0, "z": -35 },
        "max": { "x": -10, "y": 10, "z": -20 }
      },
      "center": { "x": -20, "y": 0, "z": -27.5 },
      "floorColor": "#22c55e",
      "capacity": 150,
      "priority": "high",
      "connectedZones": ["storage-a", "office"],
      "cameraPreset": {
        "position": { "x": -35, "y": 15, "z": -45 },
        "target": { "x": -20, "y": 0, "z": -27.5 },
        "fov": 50
      }
    }
    // ... more zones
  ],

  "readers": [
    {
      "id": "RDR-001",
      "name": "R1",
      "zoneId": "receiving",
      "position": { "x": -25, "y": 3.5, "z": -32 },
      "rotation": 0,
      "type": "portal",
      "range": 5
    }
    // ... more readers
  ],

  "cameraPresets": [
    {
      "id": "overview",
      "name": "Overview",
      "position": { "x": 70, "y": 55, "z": 50 },
      "target": { "x": 0, "y": 0, "z": 0 },
      "fov": 50
    }
    // ... more presets
  ],

  "defaultCameraPreset": "overview",

  "rendering": {
    "ambientLightIntensity": 0.2,
    "shadowsEnabled": true,
    "maxVisibleItems": 500,
    "lodDistances": {
      "detailed": 20,
      "individual": 50,
      "cluster": 100
    }
  }
}
```

---

## Part 4: Unified State Architecture

### 4.1 Store Design

```typescript
// stores/warehouseStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { WarehouseConfig, ZoneConfig, ReaderConfig } from '../core/types/warehouse.types';

interface WarehouseState {
  // Current warehouse
  currentWarehouse: WarehouseConfig | null;
  isLoading: boolean;
  error: string | null;

  // Available warehouses (for multi-site)
  availableWarehouses: Array<{ id: string; name: string; slug: string }>;

  // Runtime zone data (item counts, flow)
  zoneRuntimeData: Map<string, {
    itemCount: number;
    flowIn: number;
    flowOut: number;
    lastActivity: number;
  }>;

  // Actions
  loadWarehouse: (warehouseId: string) => Promise<void>;
  switchWarehouse: (warehouseId: string) => Promise<void>;
  updateZoneData: (zoneId: string, data: Partial<ZoneRuntimeData>) => void;

  // Selectors (memoized)
  getZone: (zoneId: string) => ZoneConfig | undefined;
  getReader: (readerId: string) => ReaderConfig | undefined;
  getZoneCenter: (zoneId: string) => Vector3 | undefined;
  getCameraPreset: (presetId: string) => CameraPreset | undefined;
}

export const useWarehouseStore = create<WarehouseState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      currentWarehouse: null,
      isLoading: false,
      error: null,
      availableWarehouses: [],
      zoneRuntimeData: new Map(),

      loadWarehouse: async (warehouseId) => {
        set({ isLoading: true, error: null });
        try {
          const config = await fetchWarehouseConfig(warehouseId);
          set({
            currentWarehouse: config,
            isLoading: false,
            zoneRuntimeData: new Map(
              config.zones.map(z => [z.id, { itemCount: 0, flowIn: 0, flowOut: 0, lastActivity: Date.now() }])
            )
          });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      switchWarehouse: async (warehouseId) => {
        // Clean up current state
        get().loadWarehouse(warehouseId);
      },

      updateZoneData: (zoneId, data) => {
        set((state) => {
          const existing = state.zoneRuntimeData.get(zoneId);
          if (existing) {
            Object.assign(existing, data);
          }
        });
      },

      // Memoized selectors - return stable references
      getZone: (zoneId) => {
        return get().currentWarehouse?.zones.find(z => z.id === zoneId);
      },

      getReader: (readerId) => {
        return get().currentWarehouse?.readers.find(r => r.id === readerId);
      },

      getZoneCenter: (zoneId) => {
        return get().currentWarehouse?.zones.find(z => z.id === zoneId)?.center;
      },

      getCameraPreset: (presetId) => {
        return get().currentWarehouse?.cameraPresets.find(p => p.id === presetId);
      },
    }))
  )
);
```

### 4.2 Camera Store (Separated)

```typescript
// stores/cameraStore.ts

import { create } from 'zustand';
import type { Vector3, CameraPreset } from '../core/types/warehouse.types';

type CameraMode = 'orbit' | 'walk' | 'cinematic' | 'follow';

interface CameraState {
  // Position
  position: Vector3;
  target: Vector3;
  fov: number;

  // Mode
  mode: CameraMode;
  previousMode: CameraMode | null;

  // Animation
  isAnimating: boolean;
  animationTarget: { position: Vector3; target: Vector3 } | null;

  // Selected/focused
  focusedItemId: string | null;
  focusedZoneId: string | null;

  // Actions
  setPosition: (position: Vector3, target: Vector3) => void;
  goToPreset: (preset: CameraPreset, duration?: number) => void;
  flyToZone: (zoneId: string) => void;
  flyToItem: (itemId: string, position: Vector3) => void;
  setMode: (mode: CameraMode) => void;
  toggleWalkMode: () => void;
  startAnimation: (target: { position: Vector3; target: Vector3 }) => void;
  endAnimation: () => void;
}

export const useCameraStore = create<CameraState>()((set, get) => ({
  position: { x: 70, y: 55, z: 50 },
  target: { x: 0, y: 0, z: 0 },
  fov: 50,
  mode: 'orbit',
  previousMode: null,
  isAnimating: false,
  animationTarget: null,
  focusedItemId: null,
  focusedZoneId: null,

  setPosition: (position, target) => set({ position, target }),

  goToPreset: (preset, _duration) => {
    set({
      isAnimating: true,
      animationTarget: {
        position: preset.position,
        target: preset.target,
      },
    });
  },

  flyToZone: (zoneId) => {
    const warehouseStore = useWarehouseStore.getState();
    const zone = warehouseStore.getZone(zoneId);
    if (zone) {
      set({
        isAnimating: true,
        focusedZoneId: zoneId,
        focusedItemId: null,
        animationTarget: {
          position: zone.cameraPreset.position,
          target: zone.cameraPreset.target,
        },
      });
    }
  },

  flyToItem: (itemId, position) => {
    const offset = { x: 12, y: 10, z: 12 };
    set({
      isAnimating: true,
      focusedItemId: itemId,
      focusedZoneId: null,
      animationTarget: {
        position: {
          x: position.x + offset.x,
          y: position.y + offset.y,
          z: position.z + offset.z,
        },
        target: position,
      },
    });
  },

  setMode: (mode) => {
    set((state) => ({
      mode,
      previousMode: state.mode,
    }));
  },

  toggleWalkMode: () => {
    const current = get().mode;
    set({
      mode: current === 'walk' ? 'orbit' : 'walk',
      previousMode: current,
    });
  },

  startAnimation: (target) => set({ isAnimating: true, animationTarget: target }),

  endAnimation: () => set({ isAnimating: false, animationTarget: null }),
}));
```

### 4.3 Items Store (Virtualized)

```typescript
// stores/itemsStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface VirtualizedItem {
  id: string;
  epc: string;
  zoneId: string;
  position: Vector3;
  lastSeen: number;
  rssi: number;
  lodLevel: 'detailed' | 'individual' | 'cluster' | 'aggregate';
}

interface ItemsState {
  // Visible items (max 500)
  visibleItems: Map<string, VirtualizedItem>;

  // Tracked items (max 10)
  trackedItems: Map<string, VirtualizedItem>;

  // Item pool for object reuse
  itemPool: VirtualizedItem[];

  // Performance
  totalItemCount: number;  // From backend
  visibleCount: number;

  // Actions
  updateVisibleItems: (items: VirtualizedItem[]) => void;
  addItem: (item: VirtualizedItem) => void;
  removeItems: (ids: string[]) => void;
  trackItem: (id: string) => void;
  untrackItem: (id: string) => void;
  setTotalCount: (count: number) => void;

  // Selectors
  getItemsInZone: (zoneId: string) => VirtualizedItem[];
  getItem: (id: string) => VirtualizedItem | undefined;
}

export const useItemsStore = create<ItemsState>()(
  subscribeWithSelector((set, get) => ({
    visibleItems: new Map(),
    trackedItems: new Map(),
    itemPool: [],
    totalItemCount: 0,
    visibleCount: 0,

    updateVisibleItems: (items) => {
      set((state) => {
        const newMap = new Map<string, VirtualizedItem>();
        const maxVisible = 500;

        // Prioritize tracked items
        state.trackedItems.forEach((item, id) => {
          newMap.set(id, item);
        });

        // Add new items up to limit
        for (const item of items) {
          if (newMap.size >= maxVisible) break;
          if (!newMap.has(item.id)) {
            newMap.set(item.id, item);
          }
        }

        return {
          visibleItems: newMap,
          visibleCount: newMap.size,
        };
      });
    },

    addItem: (item) => {
      set((state) => {
        if (state.visibleItems.size < 500) {
          const newMap = new Map(state.visibleItems);
          newMap.set(item.id, item);
          return { visibleItems: newMap, visibleCount: newMap.size };
        }
        return state;
      });
    },

    removeItems: (ids) => {
      set((state) => {
        const newMap = new Map(state.visibleItems);
        ids.forEach(id => newMap.delete(id));
        return { visibleItems: newMap, visibleCount: newMap.size };
      });
    },

    trackItem: (id) => {
      set((state) => {
        const item = state.visibleItems.get(id);
        if (item && state.trackedItems.size < 10) {
          const newTracked = new Map(state.trackedItems);
          newTracked.set(id, { ...item, lodLevel: 'detailed' });
          return { trackedItems: newTracked };
        }
        return state;
      });
    },

    untrackItem: (id) => {
      set((state) => {
        const newTracked = new Map(state.trackedItems);
        newTracked.delete(id);
        return { trackedItems: newTracked };
      });
    },

    setTotalCount: (count) => set({ totalItemCount: count }),

    getItemsInZone: (zoneId) => {
      return Array.from(get().visibleItems.values()).filter(i => i.zoneId === zoneId);
    },

    getItem: (id) => {
      return get().visibleItems.get(id) || get().trackedItems.get(id);
    },
  }))
);
```

---

## Part 5: Unified Camera Controller

### 5.1 Single Camera Controller Component

```typescript
// components/3d/Camera/CameraController.tsx

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCameraStore } from '../../../stores/cameraStore';
import { useWarehouseStore } from '../../../stores/warehouseStore';

/**
 * Unified Camera Controller
 *
 * Manages all camera modes:
 * - Orbit: Default, mouse orbit around target
 * - Walk: First-person WASD navigation
 * - Cinematic: GSAP-powered tours and animations
 * - Follow: Track a specific item
 */
const CameraController = () => {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  const pointerLockRef = useRef<any>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Camera store (use individual selectors)
  const mode = useCameraStore(s => s.mode);
  const isAnimating = useCameraStore(s => s.isAnimating);
  const animationTarget = useCameraStore(s => s.animationTarget);
  const endAnimation = useCameraStore(s => s.endAnimation);
  const setPosition = useCameraStore(s => s.setPosition);
  const setMode = useCameraStore(s => s.setMode);

  // Warehouse for presets
  const warehouse = useWarehouseStore(s => s.currentWarehouse);

  // Walk mode state
  const walkState = useRef({
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    keys: { forward: false, back: false, left: false, right: false, sprint: false },
  });

  // Reusable vectors (no GC pressure)
  const vectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    tempPos: new THREE.Vector3(),
    tempTarget: new THREE.Vector3(),
  });

  // Handle camera animation with GSAP
  useEffect(() => {
    if (!isAnimating || !animationTarget || !orbitRef.current) return;

    // Kill existing animation
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const startPos = camera.position.clone();
    const startTarget = orbitRef.current.target.clone();
    const endPos = new THREE.Vector3(
      animationTarget.position.x,
      animationTarget.position.y,
      animationTarget.position.z
    );
    const endTarget = new THREE.Vector3(
      animationTarget.target.x,
      animationTarget.target.y,
      animationTarget.target.z
    );

    const progress = { value: 0 };

    timelineRef.current = gsap.timeline({
      onComplete: () => {
        endAnimation();
        setPosition(animationTarget.position, animationTarget.target);
      }
    });

    timelineRef.current.to(progress, {
      value: 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(startPos, endPos, progress.value);
        orbitRef.current.target.lerpVectors(startTarget, endTarget, progress.value);
      }
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [isAnimating, animationTarget, camera, endAnimation, setPosition]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key.toLowerCase();

      // Mode switching
      if (key === 'g') {
        setMode(mode === 'walk' ? 'orbit' : 'walk');
        return;
      }

      // Camera presets (numbers)
      if (warehouse && /^[0-9]$/.test(key)) {
        const presetIndex = key === '0' ? 9 : parseInt(key) - 1;
        const preset = warehouse.cameraPresets[presetIndex];
        if (preset) {
          useCameraStore.getState().goToPreset(preset);
        }
        return;
      }

      // Walk mode keys
      if (mode === 'walk') {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            walkState.current.keys.forward = true;
            break;
          case 'KeyS':
          case 'ArrowDown':
            walkState.current.keys.back = true;
            break;
          case 'KeyA':
          case 'ArrowLeft':
            walkState.current.keys.left = true;
            break;
          case 'KeyD':
          case 'ArrowRight':
            walkState.current.keys.right = true;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            walkState.current.keys.sprint = true;
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          walkState.current.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          walkState.current.keys.back = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          walkState.current.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          walkState.current.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          walkState.current.keys.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, warehouse, setMode]);

  // Walk mode movement
  useFrame((_, delta) => {
    if (mode !== 'walk') return;

    const { keys, velocity, direction } = walkState.current;
    const { forward, right } = vectors.current;

    // Get camera forward/right (horizontal only)
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    // Build movement direction
    direction.set(0, 0, 0);
    if (keys.forward) direction.add(forward);
    if (keys.back) direction.sub(forward);
    if (keys.right) direction.add(right);
    if (keys.left) direction.sub(right);
    direction.normalize();

    // Apply speed
    const speed = keys.sprint ? 20 : 12;
    const targetVel = direction.multiplyScalar(speed * delta);

    // Smooth acceleration
    velocity.lerp(targetVel, 0.2);

    // Apply with boundaries
    const warehouse = useWarehouseStore.getState().currentWarehouse;
    if (warehouse) {
      const halfW = warehouse.dimensions.width / 2;
      const halfL = warehouse.dimensions.length / 2;

      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x + velocity.x,
        -halfW + 2,
        halfW - 2
      );
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + velocity.z,
        -halfL + 2,
        halfL - 2
      );
    } else {
      camera.position.add(velocity);
    }

    // Keep eye height
    camera.position.y = 1.7;
  });

  // Render appropriate controls based on mode
  return (
    <>
      {mode === 'orbit' && (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={250}
          minPolarAngle={Math.PI / 10}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />
      )}

      {mode === 'walk' && (
        <PointerLockControls
          ref={pointerLockRef}
          onUnlock={() => {
            // Clear walk keys on unlock
            walkState.current.keys = {
              forward: false,
              back: false,
              left: false,
              right: false,
              sprint: false,
            };
          }}
        />
      )}
    </>
  );
};

export default CameraController;
```

---

## Part 6: Performance Optimizations

### 6.1 Object Pooling

```typescript
// core/utils/pool.ts

import * as THREE from 'three';

/**
 * Object pool for frequently created/destroyed objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize = 100,
    maxSize = 1000
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  releaseAll(objects: T[]): void {
    objects.forEach(obj => this.release(obj));
  }

  get size(): number {
    return this.pool.length;
  }
}

// Pre-built pools for common Three.js objects
export const vector3Pool = new ObjectPool(
  () => new THREE.Vector3(),
  (v) => v.set(0, 0, 0),
  200
);

export const colorPool = new ObjectPool(
  () => new THREE.Color(),
  (c) => c.set(0xffffff),
  50
);

export const matrix4Pool = new ObjectPool(
  () => new THREE.Matrix4(),
  (m) => m.identity(),
  100
);

export const object3DPool = new ObjectPool(
  () => new THREE.Object3D(),
  (o) => {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
  },
  100
);
```

### 6.2 Instanced Item Renderer (Optimized)

```typescript
// components/3d/Items/InstancedItems.tsx

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useItemsStore } from '../../../stores/itemsStore';
import { useWarehouseStore } from '../../../stores/warehouseStore';
import { object3DPool, colorPool } from '../../../core/utils/pool';

// Pre-allocated objects (OUTSIDE component - never recreated)
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const ITEM_COLORS: Record<string, THREE.Color> = {};

/**
 * High-performance instanced item renderer
 * Uses GPU instancing for 500+ items at 60 FPS
 */
const InstancedItems = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorArrayRef = useRef<Float32Array | null>(null);

  // Use stable selector that returns Map (reference stable)
  const visibleItems = useItemsStore(s => s.visibleItems);
  const warehouse = useWarehouseStore(s => s.currentWarehouse);

  // Pre-compute zone colors once when warehouse changes
  useEffect(() => {
    if (!warehouse) return;

    warehouse.zones.forEach(zone => {
      if (!ITEM_COLORS[zone.id]) {
        ITEM_COLORS[zone.id] = new THREE.Color(zone.floorColor);
      }
    });
  }, [warehouse?.id]);

  // Initialize color array
  const maxItems = warehouse?.rendering.maxVisibleItems || 500;

  useMemo(() => {
    colorArrayRef.current = new Float32Array(maxItems * 3);
  }, [maxItems]);

  // Update instance matrices and colors
  useFrame(() => {
    if (!meshRef.current || !colorArrayRef.current) return;

    const mesh = meshRef.current;
    const colors = colorArrayRef.current;

    let index = 0;

    visibleItems.forEach((item) => {
      if (index >= maxItems) return;

      // Position (using pre-allocated tempObject)
      tempObject.position.set(item.position.x, item.position.y, item.position.z);

      // Scale based on LOD
      const scale = item.lodLevel === 'detailed' ? 1.2 :
                    item.lodLevel === 'individual' ? 1 : 0.8;
      tempObject.scale.setScalar(scale);

      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);

      // Color (using pre-cached colors)
      const zoneColor = ITEM_COLORS[item.zoneId] || ITEM_COLORS['default'];
      if (zoneColor) {
        colors[index * 3] = zoneColor.r;
        colors[index * 3 + 1] = zoneColor.g;
        colors[index * 3 + 2] = zoneColor.b;
      }

      index++;
    });

    // Hide unused instances
    for (let i = index; i < maxItems; i++) {
      tempObject.position.set(0, -1000, 0);  // Move off-screen
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    // Update colors if geometry has color attribute
    const colorAttr = mesh.geometry.getAttribute('color');
    if (colorAttr) {
      (colorAttr.array as Float32Array).set(colors);
      colorAttr.needsUpdate = true;
    }

    mesh.count = index;
  });

  // Geometry with vertex colors
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.4, 0.6, 0.4);
    geo.setAttribute('color', new THREE.InstancedBufferAttribute(
      new Float32Array(maxItems * 3), 3
    ));
    return geo;
  }, [maxItems]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, maxItems]}
      frustumCulled
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.6}
        metalness={0.2}
      />
    </instancedMesh>
  );
};

export default InstancedItems;
```

### 6.3 Performance Monitor Hook

```typescript
// hooks/usePerformance.ts

import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryMB: number;
  drawCalls: number;
  triangles: number;
}

/**
 * Performance monitoring hook
 * Uses requestAnimationFrame timing, not useFrame state updates
 */
export function usePerformance(onMetrics?: (metrics: PerformanceMetrics) => void) {
  const metricsRef = useRef<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryMB: 0,
    drawCalls: 0,
    triangles: 0,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());
  const lastReportRef = useRef(performance.now());

  // Measure frame time in useFrame (no state updates!)
  useFrame(({ gl }) => {
    const now = performance.now();
    const frameTime = now - lastFrameRef.current;
    lastFrameRef.current = now;

    // Rolling average of last 60 frames
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Report every 500ms (not every frame)
    if (now - lastReportRef.current > 500) {
      lastReportRef.current = now;

      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const info = gl.info;

      metricsRef.current = {
        fps: Math.round(1000 / avgFrameTime),
        frameTime: avgFrameTime,
        memoryMB: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
      };

      onMetrics?.(metricsRef.current);
    }
  });

  return metricsRef.current;
}
```

---

## Part 7: WebSocket Architecture

### 7.1 Site-Aware WebSocket Service

```typescript
// services/websocketService.ts

import { io, Socket } from 'socket.io-client';
import type { TagReadEvent, ItemMovedEvent } from '../core/types/events.types';

interface WebSocketConfig {
  url: string;
  tenantId: string;
  warehouseId: string;
  authToken?: string;
}

/**
 * Site-aware WebSocket service
 * One connection per warehouse, proper lifecycle management
 */
export class SiteWebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private handlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        transports: ['websocket', 'polling'],
        auth: {
          token: this.config.authToken,
          tenantId: this.config.tenantId,
          warehouseId: this.config.warehouseId,
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      this.socket.on('connect', () => {
        console.log(`[WS] Connected to ${this.config.warehouseId}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Subscribe to warehouse events
        this.socket?.emit('subscribe:warehouse', this.config.warehouseId);
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error(`[WS] Connection error:`, err.message);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.isConnecting = false;
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[WS] Disconnected: ${reason}`);
        this.emit('disconnected', reason);
      });

      // RFID Events
      this.socket.on('tag:detected', (data: TagReadEvent) => {
        this.emit('tagRead', data);
      });

      this.socket.on('item:moved', (data: ItemMovedEvent) => {
        this.emit('itemMoved', data);
      });

      // Batched events for high throughput
      this.socket.on('events:batch', (events: Array<{ type: string; data: any }>) => {
        events.forEach(e => this.emit(e.type, e.data));
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  on(event: string, handler: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Connection manager for multiple sites
class WebSocketManager {
  private connections: Map<string, SiteWebSocketService> = new Map();

  getConnection(warehouseId: string, config: WebSocketConfig): SiteWebSocketService {
    if (!this.connections.has(warehouseId)) {
      this.connections.set(warehouseId, new SiteWebSocketService(config));
    }
    return this.connections.get(warehouseId)!;
  }

  disconnectAll(): void {
    this.connections.forEach(conn => conn.disconnect());
    this.connections.clear();
  }

  disconnectWarehouse(warehouseId: string): void {
    this.connections.get(warehouseId)?.disconnect();
    this.connections.delete(warehouseId);
  }
}

export const wsManager = new WebSocketManager();
```

### 7.2 React Hook for WebSocket

```typescript
// hooks/useWebSocket.ts

import { useEffect, useRef, useCallback } from 'react';
import { useWarehouseStore } from '../stores/warehouseStore';
import { useItemsStore } from '../stores/itemsStore';
import { wsManager, SiteWebSocketService } from '../services/websocketService';
import type { TagReadEvent, ItemMovedEvent } from '../core/types/events.types';

/**
 * Site-scoped WebSocket hook
 * Automatically connects when warehouse is loaded
 */
export function useWebSocket() {
  const warehouse = useWarehouseStore(s => s.currentWarehouse);
  const addItem = useItemsStore(s => s.addItem);
  const updateZoneData = useWarehouseStore(s => s.updateZoneData);

  const connectionRef = useRef<SiteWebSocketService | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // Connect when warehouse changes
  useEffect(() => {
    if (!warehouse) return;

    const config = {
      url: import.meta.env.VITE_WS_URL || 'http://localhost:3000',
      tenantId: warehouse.tenantId,
      warehouseId: warehouse.id,
    };

    const connection = wsManager.getConnection(warehouse.id, config);
    connectionRef.current = connection;

    // Connect and subscribe
    connection.connect().then(() => {
      // Handle tag reads
      const unsubTag = connection.on('tagRead', (event: TagReadEvent) => {
        const zone = warehouse.zones.find(z => z.id === event.zoneId);
        if (zone) {
          addItem({
            id: event.epc,
            epc: event.epc,
            zoneId: event.zoneId,
            position: zone.center,
            lastSeen: Date.now(),
            rssi: event.rssi,
            lodLevel: 'individual',
          });
        }
      });

      // Handle item moves
      const unsubMove = connection.on('itemMoved', (event: ItemMovedEvent) => {
        // Update zone counts
        if (event.fromZone) {
          updateZoneData(event.fromZone, {
            flowOut: 1,
            lastActivity: Date.now()
          });
        }
        if (event.toZone) {
          updateZoneData(event.toZone, {
            flowIn: 1,
            lastActivity: Date.now()
          });
        }
      });

      unsubscribersRef.current = [unsubTag, unsubMove];
    });

    // Cleanup on warehouse change
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [warehouse?.id]);

  return {
    isConnected: connectionRef.current?.isConnected || false,
  };
}
```

---

## Part 8: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `core/types/warehouse.types.ts` | P0 | 1 day | None |
| Create SAPS warehouse config JSON | P0 | 1 day | Types |
| Create `stores/warehouseStore.ts` | P0 | 2 days | Types, Config |
| Delete duplicate `Controls.tsx` | P0 | 0.5 day | None |
| Unify `CameraController.tsx` | P0 | 2 days | Store |
| Fix zone coordinate mismatches | P0 | 1 day | Config |

### Phase 2: Store Refactor (Week 2-3)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `stores/cameraStore.ts` | P1 | 1 day | Types |
| Create `stores/itemsStore.ts` | P1 | 1 day | Types |
| Migrate from `sceneStore.ts` | P1 | 2 days | New stores |
| Migrate from `virtualizedAppStore.ts` | P1 | 2 days | New stores |
| Delete old stores | P1 | 0.5 day | All migrations |
| Update all component imports | P1 | 1 day | New stores |

### Phase 3: Performance (Week 3-4)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `core/utils/pool.ts` | P1 | 1 day | None |
| Refactor `InstancedItems.tsx` | P1 | 2 days | Pool |
| Fix useFrame anti-patterns | P1 | 1 day | Pool |
| Add `usePerformance.ts` hook | P2 | 0.5 day | None |
| Reduce shadow map size | P2 | 0.5 day | None |
| Add FPS monitoring overlay | P2 | 0.5 day | usePerformance |

### Phase 4: WebSocket Refactor (Week 4)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `SiteWebSocketService` | P1 | 1 day | Types |
| Create `WebSocketManager` | P1 | 0.5 day | Service |
| Create `useWebSocket.ts` hook | P1 | 1 day | Manager |
| Remove old WebSocket code | P1 | 0.5 day | New hook |
| Move data bridge outside Canvas | P1 | 0.5 day | New hook |

### Phase 5: Multi-Site (Week 5-6)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create warehouse switcher UI | P1 | 2 days | All above |
| Add second warehouse config | P2 | 1 day | Config system |
| Test site switching | P1 | 1 day | Switcher |
| Add cross-site analytics | P2 | 2 days | Both sites |
| Production load testing | P1 | 2 days | All features |

---

## Part 9: Success Metrics

### Performance Targets

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| FPS (500 items) | ~30-45 | 60 stable | `usePerformance` hook |
| FPS (300K items) | N/A | 55+ | Load test |
| Memory (frontend) | ~800MB | <500MB | Chrome DevTools |
| Initial load | ~3s | <1.5s | Lighthouse |
| WebSocket latency | ~500ms | <100ms | Ping measurement |

### Code Quality Targets

| Metric | Target |
|--------|--------|
| TypeScript strict mode | 100% |
| No `any` types | 0 |
| Test coverage | 70%+ |
| Bundle size (gzipped) | <200KB |
| Lighthouse performance | 90+ |

---

## Part 10: File Deletion List

These files should be deleted after migration:

```
DELETE:
├── components/3d/Controls.tsx           # Duplicate of CinematicCamera
├── stores/sceneStore.ts                  # Replaced by camera/items stores
├── stores/virtualizedAppStore.ts         # Merged into new stores
├── hooks/useVirtualizedData.ts           # Merged into useItems
├── services/websocket.ts                 # Replaced by SiteWebSocketService

KEEP (but refactor):
├── components/3d/CinematicCamera.tsx    # -> CameraController.tsx
├── components/3d/RFIDItems.tsx          # -> Items/DetailedItem.tsx
├── components/3d/InstancedRFIDSystem.tsx # -> Items/InstancedItems.tsx
├── hooks/useDemoSimulator.ts            # Keep for demo mode
```

---

## Conclusion

This architecture solves all identified issues:

1. **Single coordinate system** via WarehouseConfig
2. **Single camera controller** with mode switching
3. **Unified state management** with proper selectors
4. **Object pooling** eliminates GC pressure
5. **Site-aware WebSocket** with proper lifecycle
6. **Multi-site ready** from day one

The plan is designed to be implemented incrementally - each phase builds on the previous while maintaining a working application throughout the migration.

---

*Document created: 2025-12-07*
*Author: Claude Code*
*Version: 1.0*
