/**
 * ITEMS STORE
 *
 * Manages virtualized item data for 3D rendering.
 * Handles:
 * - Visible items (max 500 for performance)
 * - Tracked/highlighted items (max 10)
 * - Item position updates from WebSocket
 * - LOD (Level of Detail) management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { VirtualizedItem, Vector3, ItemLODLevel } from '../core/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VISIBLE_ITEMS = 500;
const MAX_TRACKED_ITEMS = 10;

// LOD distance thresholds (from camera)
const LOD_DISTANCES = {
  detailed: 20,
  individual: 50,
  cluster: 100,
};

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ItemsState {
  // ========== Item Collections ==========
  /** All visible items (keyed by ID for O(1) lookup) */
  visibleItems: Map<string, VirtualizedItem>;

  /** Tracked/highlighted items (always visible at detailed LOD) */
  trackedItems: Map<string, VirtualizedItem>;

  /** Selected item (for detail panel) */
  selectedItemId: string | null;

  // ========== Statistics ==========
  /** Total item count from backend */
  totalItemCount: number;

  /** Currently visible count */
  visibleCount: number;

  // ========== Camera Position (for LOD) ==========
  cameraPosition: Vector3;

  // ========== Actions ==========
  /** Add or update items */
  upsertItems: (items: VirtualizedItem[]) => void;

  /** Remove items by ID */
  removeItems: (ids: string[]) => void;

  /** Clear all items */
  clearItems: () => void;

  /** Track an item (highlight, always visible) */
  trackItem: (id: string) => void;

  /** Untrack an item */
  untrackItem: (id: string) => void;

  /** Clear all tracked items */
  clearTrackedItems: () => void;

  /** Select an item (show details) */
  selectItem: (id: string | null) => void;

  /** Update camera position (for LOD calculation) */
  updateCameraPosition: (position: Vector3) => void;

  /** Set total item count */
  setTotalItemCount: (count: number) => void;

  /** Move item to new zone */
  moveItem: (id: string, newZoneId: string, newPosition: Vector3) => void;

  // ========== Selectors ==========
  /** Get item by ID */
  getItem: (id: string) => VirtualizedItem | undefined;

  /** Get items in zone */
  getItemsInZone: (zoneId: string) => VirtualizedItem[];

  /** Get visible items as array */
  getVisibleItemsArray: () => VirtualizedItem[];

  /** Check if item is tracked */
  isItemTracked: (id: string) => boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate LOD level based on distance from camera
 */
function calculateLOD(
  itemPosition: Vector3,
  cameraPosition: Vector3
): ItemLODLevel {
  const dx = itemPosition.x - cameraPosition.x;
  const dy = itemPosition.y - cameraPosition.y;
  const dz = itemPosition.z - cameraPosition.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance <= LOD_DISTANCES.detailed) return 'detailed';
  if (distance <= LOD_DISTANCES.individual) return 'individual';
  if (distance <= LOD_DISTANCES.cluster) return 'cluster';
  return 'aggregate';
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useItemsStore = create<ItemsState>()(
  subscribeWithSelector((set, get) => ({
    // ========== Initial State ==========
    visibleItems: new Map(),
    trackedItems: new Map(),
    selectedItemId: null,
    totalItemCount: 0,
    visibleCount: 0,
    cameraPosition: { x: 70, y: 55, z: 50 },

    // ========== Actions ==========

    upsertItems: (items: VirtualizedItem[]) => {
      set((state) => {
        const newVisible = new Map(state.visibleItems);
        const cameraPos = state.cameraPosition;

        for (const item of items) {
          // Calculate LOD
          const lodLevel = state.trackedItems.has(item.id)
            ? 'detailed'
            : calculateLOD(item.position, cameraPos);

          const updatedItem: VirtualizedItem = {
            ...item,
            lodLevel,
            lastSeen: Date.now(),
          };

          // Update tracked items if exists
          if (state.trackedItems.has(item.id)) {
            state.trackedItems.set(item.id, { ...updatedItem, lodLevel: 'detailed' });
          }

          // Add/update in visible items if not at aggregate LOD or within limit
          if (lodLevel !== 'aggregate' || newVisible.size < MAX_VISIBLE_ITEMS) {
            newVisible.set(item.id, updatedItem);
          }
        }

        // Trim to max if exceeded
        if (newVisible.size > MAX_VISIBLE_ITEMS) {
          const sortedItems = Array.from(newVisible.entries())
            .sort((a, b) => {
              // Tracked items first
              if (state.trackedItems.has(a[0]) && !state.trackedItems.has(b[0])) return -1;
              if (!state.trackedItems.has(a[0]) && state.trackedItems.has(b[0])) return 1;
              // Then by last seen (most recent first)
              return b[1].lastSeen - a[1].lastSeen;
            });

          newVisible.clear();
          for (let i = 0; i < MAX_VISIBLE_ITEMS; i++) {
            newVisible.set(sortedItems[i][0], sortedItems[i][1]);
          }
        }

        return {
          visibleItems: newVisible,
          visibleCount: newVisible.size,
        };
      });
    },

    removeItems: (ids: string[]) => {
      set((state) => {
        const newVisible = new Map(state.visibleItems);
        const newTracked = new Map(state.trackedItems);

        for (const id of ids) {
          newVisible.delete(id);
          newTracked.delete(id);
        }

        return {
          visibleItems: newVisible,
          trackedItems: newTracked,
          visibleCount: newVisible.size,
          selectedItemId: ids.includes(state.selectedItemId || '') ? null : state.selectedItemId,
        };
      });
    },

    clearItems: () => {
      set({
        visibleItems: new Map(),
        trackedItems: new Map(),
        visibleCount: 0,
        selectedItemId: null,
      });
    },

    trackItem: (id: string) => {
      set((state) => {
        if (state.trackedItems.size >= MAX_TRACKED_ITEMS) {
          console.warn(`Cannot track more than ${MAX_TRACKED_ITEMS} items`);
          return state;
        }

        const item = state.visibleItems.get(id);
        if (!item) {
          console.warn(`Item ${id} not found in visible items`);
          return state;
        }

        const trackedItem: VirtualizedItem = {
          ...item,
          lodLevel: 'detailed',
          isTracked: true,
        };

        const newTracked = new Map(state.trackedItems);
        newTracked.set(id, trackedItem);

        // Also update in visible items
        const newVisible = new Map(state.visibleItems);
        newVisible.set(id, trackedItem);

        return {
          trackedItems: newTracked,
          visibleItems: newVisible,
        };
      });
    },

    untrackItem: (id: string) => {
      set((state) => {
        const newTracked = new Map(state.trackedItems);
        newTracked.delete(id);

        // Update LOD in visible items
        const item = state.visibleItems.get(id);
        if (item) {
          const newVisible = new Map(state.visibleItems);
          newVisible.set(id, {
            ...item,
            lodLevel: calculateLOD(item.position, state.cameraPosition),
            isTracked: false,
          });
          return {
            trackedItems: newTracked,
            visibleItems: newVisible,
          };
        }

        return { trackedItems: newTracked };
      });
    },

    clearTrackedItems: () => {
      set((state) => {
        // Update all tracked items to recalculate LOD
        const newVisible = new Map(state.visibleItems);
        state.trackedItems.forEach((_, id) => {
          const item = newVisible.get(id);
          if (item) {
            newVisible.set(id, {
              ...item,
              lodLevel: calculateLOD(item.position, state.cameraPosition),
              isTracked: false,
            });
          }
        });

        return {
          trackedItems: new Map(),
          visibleItems: newVisible,
        };
      });
    },

    selectItem: (id: string | null) => {
      set({ selectedItemId: id });
    },

    updateCameraPosition: (position: Vector3) => {
      set((state) => {
        // Only update if position changed significantly
        const dx = position.x - state.cameraPosition.x;
        const dy = position.y - state.cameraPosition.y;
        const dz = position.z - state.cameraPosition.z;
        const distMoved = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distMoved < 1) return state; // Ignore tiny movements

        // Recalculate LOD for all visible items
        const newVisible = new Map<string, VirtualizedItem>();

        state.visibleItems.forEach((item, id) => {
          const isTracked = state.trackedItems.has(id);
          const lodLevel = isTracked ? 'detailed' : calculateLOD(item.position, position);

          // Only keep items that aren't aggregate (or are tracked)
          if (lodLevel !== 'aggregate' || isTracked) {
            newVisible.set(id, { ...item, lodLevel });
          }
        });

        return {
          cameraPosition: position,
          visibleItems: newVisible,
          visibleCount: newVisible.size,
        };
      });
    },

    setTotalItemCount: (count: number) => {
      set({ totalItemCount: count });
    },

    moveItem: (id: string, newZoneId: string, newPosition: Vector3) => {
      set((state) => {
        const item = state.visibleItems.get(id);
        if (!item) return state;

        const updatedItem: VirtualizedItem = {
          ...item,
          zoneId: newZoneId,
          position: newPosition,
          lastSeen: Date.now(),
          lodLevel: state.trackedItems.has(id)
            ? 'detailed'
            : calculateLOD(newPosition, state.cameraPosition),
        };

        const newVisible = new Map(state.visibleItems);
        newVisible.set(id, updatedItem);

        if (state.trackedItems.has(id)) {
          const newTracked = new Map(state.trackedItems);
          newTracked.set(id, { ...updatedItem, lodLevel: 'detailed' });
          return { visibleItems: newVisible, trackedItems: newTracked };
        }

        return { visibleItems: newVisible };
      });
    },

    // ========== Selectors ==========

    getItem: (id: string) => {
      return get().visibleItems.get(id) || get().trackedItems.get(id);
    },

    getItemsInZone: (zoneId: string) => {
      return Array.from(get().visibleItems.values()).filter(
        (item) => item.zoneId === zoneId
      );
    },

    getVisibleItemsArray: () => {
      return Array.from(get().visibleItems.values());
    },

    isItemTracked: (id: string) => {
      return get().trackedItems.has(id);
    },
  }))
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/** Get visible items count */
export const useVisibleCount = () =>
  useItemsStore((s) => s.visibleCount);

/** Get total item count */
export const useTotalItemCount = () =>
  useItemsStore((s) => s.totalItemCount);

/** Get selected item ID */
export const useSelectedItemId = () =>
  useItemsStore((s) => s.selectedItemId);

/** Get tracked items count */
export const useTrackedCount = () =>
  useItemsStore((s) => s.trackedItems.size);

export default useItemsStore;
