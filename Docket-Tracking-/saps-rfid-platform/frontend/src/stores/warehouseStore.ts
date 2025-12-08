/**
 * UNIFIED WAREHOUSE STORE
 *
 * Central state management for warehouse configuration and runtime data.
 * This is the single source of truth for:
 * - Current warehouse configuration
 * - Zone runtime data (item counts, flow)
 * - Reader runtime data (status)
 *
 * All components should use this store for warehouse-related data.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  WarehouseConfig,
  ZoneConfig,
  ReaderConfig,
  CameraPreset,
  ZoneRuntimeData,
  ReaderRuntimeData,
  Vector3,
} from '../core/types';
import { getWarehouseConfig, DEFAULT_WAREHOUSE_SLUG } from '../config/warehouses';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface WarehouseState {
  // ========== Configuration ==========
  /** Current warehouse configuration */
  currentWarehouse: WarehouseConfig | null;

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;

  /** Whether warehouse is ready for rendering */
  isReady: boolean;

  // ========== Runtime Data ==========
  /** Zone runtime data (item counts, flow) - keyed by zone ID */
  zoneRuntimeData: Map<string, ZoneRuntimeData>;

  /** Reader runtime data (status) - keyed by reader ID */
  readerRuntimeData: Map<string, ReaderRuntimeData>;

  // ========== Actions ==========
  /** Load warehouse by ID or slug */
  loadWarehouse: (idOrSlug: string) => Promise<void>;

  /** Switch to different warehouse */
  switchWarehouse: (idOrSlug: string) => Promise<void>;

  /** Reset to initial state */
  reset: () => void;

  /** Update zone runtime data */
  updateZoneData: (zoneId: string, data: Partial<ZoneRuntimeData>) => void;

  /** Update multiple zones at once */
  batchUpdateZoneData: (updates: Array<{ zoneId: string; data: Partial<ZoneRuntimeData> }>) => void;

  /** Update reader status */
  updateReaderStatus: (readerId: string, data: Partial<ReaderRuntimeData>) => void;

  /** Increment zone flow counters */
  recordZoneFlow: (fromZoneId: string | null, toZoneId: string) => void;

  // ========== Selectors (Stable references) ==========
  /** Get zone by ID */
  getZone: (zoneId: string) => ZoneConfig | undefined;

  /** Get zone center position */
  getZoneCenter: (zoneId: string) => Vector3 | undefined;

  /** Get zone center as tuple */
  getZoneCenterTuple: (zoneId: string) => [number, number, number];

  /** Get reader by ID */
  getReader: (readerId: string) => ReaderConfig | undefined;

  /** Get camera preset by ID */
  getCameraPreset: (presetId: string) => CameraPreset | undefined;

  /** Get camera preset by keyboard shortcut */
  getPresetByShortcut: (key: string) => CameraPreset | undefined;

  /** Get all zone IDs */
  getZoneIds: () => string[];

  /** Get zones connected to a specific zone */
  getConnectedZones: (zoneId: string) => string[];

  /** Get zone runtime data */
  getZoneRuntimeData: (zoneId: string) => ZoneRuntimeData | undefined;

  /** Get total item count across all zones */
  getTotalItemCount: () => number;
}

// ============================================================================
// INITIAL RUNTIME DATA FACTORY
// ============================================================================

function createInitialZoneRuntimeData(zones: ZoneConfig[]): Map<string, ZoneRuntimeData> {
  const map = new Map<string, ZoneRuntimeData>();
  for (const zone of zones) {
    map.set(zone.id, {
      zoneId: zone.id,
      itemCount: 0,
      flowIn: 0,
      flowOut: 0,
      lastActivity: Date.now(),
      utilizationPercent: 0,
    });
  }
  return map;
}

function createInitialReaderRuntimeData(readers: ReaderConfig[]): Map<string, ReaderRuntimeData> {
  const map = new Map<string, ReaderRuntimeData>();
  for (const reader of readers) {
    map.set(reader.id, {
      readerId: reader.id,
      status: 'online',
      readsPerMinute: 0,
      lastRead: Date.now(),
      signalStrength: -50,
    });
  }
  return map;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useWarehouseStore = create<WarehouseState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // ========== Initial State ==========
      currentWarehouse: null,
      isLoading: false,
      error: null,
      isReady: false,
      zoneRuntimeData: new Map(),
      readerRuntimeData: new Map(),

      // ========== Actions ==========

      loadWarehouse: async (idOrSlug: string) => {
        set({ isLoading: true, error: null, isReady: false });

        try {
          // Simulate async load (in production, this would fetch from API)
          await new Promise(resolve => setTimeout(resolve, 100));

          const config = getWarehouseConfig(idOrSlug);

          if (!config) {
            throw new Error(`Warehouse not found: ${idOrSlug}`);
          }

          set({
            currentWarehouse: config,
            isLoading: false,
            isReady: true,
            zoneRuntimeData: createInitialZoneRuntimeData(config.zones),
            readerRuntimeData: createInitialReaderRuntimeData(config.readers),
          });

          console.log(`[WarehouseStore] Loaded warehouse: ${config.name}`);
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
            isReady: false,
          });
          console.error('[WarehouseStore] Failed to load warehouse:', err);
        }
      },

      switchWarehouse: async (idOrSlug: string) => {
        const current = get().currentWarehouse;
        if (current?.slug === idOrSlug || current?.id === idOrSlug) {
          return; // Already on this warehouse
        }

        // Reset and load new warehouse
        get().reset();
        await get().loadWarehouse(idOrSlug);
      },

      reset: () => {
        set({
          currentWarehouse: null,
          isLoading: false,
          error: null,
          isReady: false,
          zoneRuntimeData: new Map(),
          readerRuntimeData: new Map(),
        });
      },

      updateZoneData: (zoneId: string, data: Partial<ZoneRuntimeData>) => {
        set((state) => {
          const existing = state.zoneRuntimeData.get(zoneId);
          if (existing) {
            state.zoneRuntimeData.set(zoneId, {
              ...existing,
              ...data,
              lastActivity: Date.now(),
            });
          }
        });
      },

      batchUpdateZoneData: (updates) => {
        set((state) => {
          for (const { zoneId, data } of updates) {
            const existing = state.zoneRuntimeData.get(zoneId);
            if (existing) {
              state.zoneRuntimeData.set(zoneId, {
                ...existing,
                ...data,
                lastActivity: Date.now(),
              });
            }
          }
        });
      },

      updateReaderStatus: (readerId: string, data: Partial<ReaderRuntimeData>) => {
        set((state) => {
          const existing = state.readerRuntimeData.get(readerId);
          if (existing) {
            state.readerRuntimeData.set(readerId, {
              ...existing,
              ...data,
            });
          }
        });
      },

      recordZoneFlow: (fromZoneId: string | null, toZoneId: string) => {
        set((state) => {
          // Increment outflow from source zone
          if (fromZoneId) {
            const fromData = state.zoneRuntimeData.get(fromZoneId);
            if (fromData) {
              fromData.flowOut += 1;
              fromData.itemCount = Math.max(0, fromData.itemCount - 1);
              fromData.lastActivity = Date.now();
            }
          }

          // Increment inflow to target zone
          const toData = state.zoneRuntimeData.get(toZoneId);
          if (toData) {
            const zone = get().getZone(toZoneId);
            toData.flowIn += 1;
            toData.itemCount += 1;
            toData.lastActivity = Date.now();
            if (zone) {
              toData.utilizationPercent = Math.round((toData.itemCount / zone.capacity) * 100);
            }
          }
        });
      },

      // ========== Selectors ==========

      getZone: (zoneId: string) => {
        return get().currentWarehouse?.zones.find(z => z.id === zoneId);
      },

      getZoneCenter: (zoneId: string) => {
        const zone = get().getZone(zoneId);
        return zone?.center;
      },

      getZoneCenterTuple: (zoneId: string) => {
        const center = get().getZoneCenter(zoneId);
        if (!center) return [0, 0.5, 0];
        return [center.x, center.y, center.z];
      },

      getReader: (readerId: string) => {
        return get().currentWarehouse?.readers.find(r => r.id === readerId);
      },

      getCameraPreset: (presetId: string) => {
        return get().currentWarehouse?.cameraPresets.find(p => p.id === presetId);
      },

      getPresetByShortcut: (key: string) => {
        return get().currentWarehouse?.cameraPresets.find(p => p.shortcut === key);
      },

      getZoneIds: () => {
        return get().currentWarehouse?.zones.map(z => z.id) || [];
      },

      getConnectedZones: (zoneId: string) => {
        const zone = get().getZone(zoneId);
        return zone?.connectedZones || [];
      },

      getZoneRuntimeData: (zoneId: string) => {
        return get().zoneRuntimeData.get(zoneId);
      },

      getTotalItemCount: () => {
        let total = 0;
        get().zoneRuntimeData.forEach(data => {
          total += data.itemCount;
        });
        return total;
      },
    }))
  )
);

// ============================================================================
// SELECTOR HOOKS (For React components - stable references)
// ============================================================================

/**
 * Get current warehouse configuration
 */
export const useCurrentWarehouse = () =>
  useWarehouseStore((s) => s.currentWarehouse);

/**
 * Get warehouse loading state
 */
export const useWarehouseLoading = () =>
  useWarehouseStore((s) => s.isLoading);

/**
 * Get warehouse ready state
 */
export const useWarehouseReady = () =>
  useWarehouseStore((s) => s.isReady);

/**
 * Get all zones from current warehouse
 */
export const useZones = () =>
  useWarehouseStore((s) => s.currentWarehouse?.zones || []);

/**
 * Get all readers from current warehouse
 */
export const useReaders = () =>
  useWarehouseStore((s) => s.currentWarehouse?.readers || []);

/**
 * Get all camera presets
 */
export const useCameraPresets = () =>
  useWarehouseStore((s) => s.currentWarehouse?.cameraPresets || []);

/**
 * Get rendering config
 */
export const useRenderingConfig = () =>
  useWarehouseStore((s) => s.currentWarehouse?.rendering);

/**
 * Get walk boundaries
 */
export const useWalkBoundaries = () =>
  useWarehouseStore((s) => s.currentWarehouse?.walkBoundaries);

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize warehouse store with default warehouse
 * Call this in App.tsx or main.tsx
 */
export async function initializeWarehouseStore(): Promise<void> {
  const store = useWarehouseStore.getState();
  if (!store.currentWarehouse && !store.isLoading) {
    await store.loadWarehouse(DEFAULT_WAREHOUSE_SLUG);
  }
}

export default useWarehouseStore;
