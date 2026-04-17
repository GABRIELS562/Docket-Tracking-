import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import { enableMapSet } from 'immer';

// Enable Immer support for Map and Set
enableMapSet();

/**
 * Virtualized App Store (Phase 3.1)
 *
 * State management designed for 300K+ items with virtualization patterns:
 * - Never load all items into memory simultaneously
 * - View-based state management (overview/zone/search/tracking)
 * - On-demand data loading with smart caching
 * - Performance monitoring integration
 * - Automatic garbage collection of stale data
 *
 * Architecture principles:
 * - Zone aggregates: Always visible (8-12 zones)
 * - Search results: Max 100 visible at once
 * - Tracked items: 1-10 actively tracked
 * - Visible items: Max 500 in 3D scene
 *
 * Reference: StartHere.md Phase 3.1
 * Source: https://github.com/pmndrs/zustand
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * View modes for the application
 */
export type ViewMode = 'overview' | 'zone' | 'search' | 'tracking';

/**
 * Item visibility level for LOD
 */
export type VisibilityLevel = 'aggregate' | 'cluster' | 'individual' | 'detailed';

/**
 * Virtualized item data (minimal footprint)
 */
export interface VirtualizedItem {
  id: string;
  epc: string;
  zoneId: string;
  position: [number, number, number];
  lastSeen: number;
  rssi: number;
  isTracked: boolean;
  isVisible: boolean;
  lodLevel: VisibilityLevel;
}

/**
 * Zone aggregate data (always loaded)
 */
export interface ZoneAggregate {
  id: string;
  name: string;
  itemCount: number;
  capacity: number;
  utilizationPercent: number;
  centroid: [number, number, number];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  avgRssi: number;
  lastActivity: number;
  flowIn: number;
  flowOut: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isHovered: boolean;
  isSelected: boolean;
}

/**
 * Search result with pagination
 */
export interface SearchState {
  query: string;
  filters: {
    zones: string[];
    status: string[];
    dateRange: 'today' | 'week' | 'month' | 'all';
  };
  results: VirtualizedItem[];
  totalResults: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  lastSearchTime: number;
}

/**
 * Tracked item with full data
 */
export interface TrackedItem extends VirtualizedItem {
  name: string;
  status: 'active' | 'inactive' | 'missing' | 'in-transit';
  history: Array<{
    zoneId: string;
    timestamp: number;
    rssi: number;
  }>;
  metadata: Record<string, unknown>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  visibleItemCount: number;
  totalItemCount: number;
  cacheHitRate: number;
  lastGC: number;
  renderTime: number;
}

/**
 * Virtualization window (what's currently visible)
 */
export interface VirtualWindow {
  // Camera frustum bounds in world space
  frustumBounds: {
    near: number;
    far: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  // Currently visible zone IDs
  visibleZones: string[];
  // LOD distances
  lodDistances: {
    detailed: number;   // 0-20m: full detail
    individual: number; // 20-50m: individual items
    cluster: number;    // 50-100m: clustered
    aggregate: number;  // 100m+: zone aggregates only
  };
  // Camera position for distance calculations
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

/**
 * Item cache with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

/**
 * Main virtualized app state
 */
interface VirtualizedAppState {
  // Current view mode
  viewMode: ViewMode;
  previousViewMode: ViewMode | null;

  // Zone aggregates (always loaded - 8-12 zones)
  zones: Map<string, ZoneAggregate>;

  // Visible items (max 500 in viewport)
  visibleItems: Map<string, VirtualizedItem>;

  // Tracked items (1-10 actively monitored)
  trackedItems: Map<string, TrackedItem>;

  // Item cache for recently accessed items
  itemCache: Map<string, CacheEntry<VirtualizedItem>>;

  // Search state
  search: SearchState;

  // Virtual window
  virtualWindow: VirtualWindow;

  // Performance metrics
  performance: PerformanceMetrics;

  // Configuration
  config: {
    maxVisibleItems: number;
    maxTrackedItems: number;
    maxCacheSize: number;
    cacheTTL: number;
    gcInterval: number;
    updateThrottle: number;
  };

  // Actions - View Mode
  setViewMode: (mode: ViewMode) => void;
  goToOverview: () => void;
  goToZone: (zoneId: string) => void;
  goToSearch: (query?: string) => void;
  goToTracking: (itemId?: string) => void;

  // Actions - Zones
  updateZoneAggregates: (zones: ZoneAggregate[]) => void;
  setZoneHovered: (zoneId: string | null) => void;
  setZoneSelected: (zoneId: string | null) => void;

  // Actions - Visible Items
  updateVisibleItems: (items: VirtualizedItem[]) => void;
  addVisibleItems: (items: VirtualizedItem[]) => void;
  removeVisibleItems: (itemIds: string[]) => void;
  clearVisibleItems: () => void;

  // Actions - Tracked Items
  trackItem: (item: TrackedItem) => void;
  untrackItem: (itemId: string) => void;
  updateTrackedItem: (itemId: string, updates: Partial<TrackedItem>) => void;

  // Actions - Search
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: Partial<SearchState['filters']>) => void;
  setSearchResults: (results: VirtualizedItem[], total: number) => void;
  setSearchLoading: (loading: boolean) => void;
  clearSearch: () => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions - Virtual Window
  updateVirtualWindow: (window: Partial<VirtualWindow>) => void;
  setCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;

  // Actions - Performance
  updatePerformance: (metrics: Partial<PerformanceMetrics>) => void;
  runGarbageCollection: () => void;

  // Actions - Cache
  cacheItem: (item: VirtualizedItem) => void;
  getCachedItem: (itemId: string) => VirtualizedItem | null;
  invalidateCache: (itemIds?: string[]) => void;

  // Selectors (computed values)
  getVisibleItemsArray: () => VirtualizedItem[];
  getTrackedItemsArray: () => TrackedItem[];
  getZonesArray: () => ZoneAggregate[];
  getItemById: (id: string) => VirtualizedItem | TrackedItem | null;
  getItemsInZone: (zoneId: string) => VirtualizedItem[];
  getTotalItemCount: () => number;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_VIRTUAL_WINDOW: VirtualWindow = {
  frustumBounds: {
    near: 0.1,
    far: 1000,
    left: -100,
    right: 100,
    top: 100,
    bottom: -100,
  },
  visibleZones: [],
  lodDistances: {
    detailed: 20,
    individual: 50,
    cluster: 100,
    aggregate: 200,
  },
  cameraPosition: [80, 60, 80],
  cameraTarget: [0, 0, 0],
};

const DEFAULT_SEARCH_STATE: SearchState = {
  query: '',
  filters: {
    zones: [],
    status: [],
    dateRange: 'all',
  },
  results: [],
  totalResults: 0,
  page: 0,
  pageSize: 50,
  isLoading: false,
  lastSearchTime: 0,
};

const DEFAULT_PERFORMANCE: PerformanceMetrics = {
  fps: 60,
  memoryUsage: 0,
  visibleItemCount: 0,
  totalItemCount: 0,
  cacheHitRate: 0,
  lastGC: Date.now(),
  renderTime: 0,
};

const DEFAULT_CONFIG = {
  maxVisibleItems: 500,
  maxTrackedItems: 10,
  maxCacheSize: 1000,
  cacheTTL: 60000, // 1 minute
  gcInterval: 30000, // 30 seconds
  updateThrottle: 16, // ~60fps
};

// ============================================================================
// Zone Default Data
// ============================================================================

const DEFAULT_ZONES: ZoneAggregate[] = [
  {
    id: 'receiving',
    name: 'Receiving',
    itemCount: 0,
    capacity: 150,
    utilizationPercent: 0,
    centroid: [-33, 0, -33],
    bounds: { min: [-48, 0, -48], max: [-18, 12, -18] },
    avgRssi: -50,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'high',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'storage-a',
    name: 'Storage A',
    itemCount: 0,
    capacity: 500,
    utilizationPercent: 0,
    centroid: [-33, 0, 0],
    bounds: { min: [-48, 0, -15], max: [-18, 12, 15] },
    avgRssi: -55,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'medium',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'storage-b',
    name: 'Storage B',
    itemCount: 0,
    capacity: 500,
    utilizationPercent: 0,
    centroid: [-33, 0, 33],
    bounds: { min: [-48, 0, 18], max: [-18, 12, 48] },
    avgRssi: -55,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'medium',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'storage-c',
    name: 'Storage C',
    itemCount: 0,
    capacity: 500,
    utilizationPercent: 0,
    centroid: [0, 0, -33],
    bounds: { min: [-15, 0, -48], max: [15, 12, -18] },
    avgRssi: -55,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'medium',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'secure-storage',
    name: 'Secure Storage',
    itemCount: 0,
    capacity: 100,
    utilizationPercent: 0,
    centroid: [0, 0, 0],
    bounds: { min: [-15, 0, -15], max: [15, 12, 15] },
    avgRssi: -45,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'critical',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'storage-d',
    name: 'Storage D',
    itemCount: 0,
    capacity: 500,
    utilizationPercent: 0,
    centroid: [0, 0, 33],
    bounds: { min: [-15, 0, 18], max: [15, 12, 48] },
    avgRssi: -55,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'medium',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'processing',
    name: 'Processing',
    itemCount: 0,
    capacity: 200,
    utilizationPercent: 0,
    centroid: [33, 0, -33],
    bounds: { min: [18, 0, -48], max: [48, 12, -18] },
    avgRssi: -50,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'high',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'shipping',
    name: 'Shipping',
    itemCount: 0,
    capacity: 250,
    utilizationPercent: 0,
    centroid: [33, 0, 0],
    bounds: { min: [18, 0, -15], max: [48, 12, 15] },
    avgRssi: -50,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'high',
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'returns',
    name: 'Returns',
    itemCount: 0,
    capacity: 150,
    utilizationPercent: 0,
    centroid: [33, 0, 33],
    bounds: { min: [18, 0, 18], max: [48, 12, 48] },
    avgRssi: -55,
    lastActivity: Date.now(),
    flowIn: 0,
    flowOut: 0,
    priority: 'low',
    isHovered: false,
    isSelected: false,
  },
];

// ============================================================================
// Store Implementation
// ============================================================================

export const useVirtualizedAppStore = create<VirtualizedAppState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      viewMode: 'overview',
      previousViewMode: null,

      zones: new Map(DEFAULT_ZONES.map((z) => [z.id, z])),
      visibleItems: new Map(),
      trackedItems: new Map(),
      itemCache: new Map(),

      search: DEFAULT_SEARCH_STATE,
      virtualWindow: DEFAULT_VIRTUAL_WINDOW,
      performance: DEFAULT_PERFORMANCE,
      config: DEFAULT_CONFIG,

      // ========================================
      // View Mode Actions
      // ========================================

      setViewMode: (mode) =>
        set((state) => {
          state.previousViewMode = state.viewMode;
          state.viewMode = mode;
        }),

      goToOverview: () =>
        set((state) => {
          state.previousViewMode = state.viewMode;
          state.viewMode = 'overview';
          // Clear search when going to overview
          state.search.query = '';
          state.search.results = [];
        }),

      goToZone: (zoneId) =>
        set((state) => {
          state.previousViewMode = state.viewMode;
          state.viewMode = 'zone';
          // Select the zone
          state.zones.forEach((zone, id) => {
            zone.isSelected = id === zoneId;
          });
        }),

      goToSearch: (query) =>
        set((state) => {
          state.previousViewMode = state.viewMode;
          state.viewMode = 'search';
          if (query !== undefined) {
            state.search.query = query;
          }
        }),

      goToTracking: (_itemId) =>
        set((state) => {
          state.previousViewMode = state.viewMode;
          state.viewMode = 'tracking';
          // itemId can be used for future enhancement to auto-focus on the item
        }),

      // ========================================
      // Zone Actions
      // ========================================

      updateZoneAggregates: (zones) =>
        set((state) => {
          zones.forEach((zone) => {
            const existing = state.zones.get(zone.id);
            if (existing) {
              Object.assign(existing, zone);
            } else {
              state.zones.set(zone.id, zone);
            }
          });
        }),

      setZoneHovered: (zoneId) =>
        set((state) => {
          state.zones.forEach((zone, id) => {
            zone.isHovered = id === zoneId;
          });
        }),

      setZoneSelected: (zoneId) =>
        set((state) => {
          state.zones.forEach((zone, id) => {
            zone.isSelected = id === zoneId;
          });
        }),

      // ========================================
      // Visible Items Actions
      // ========================================

      updateVisibleItems: (items) =>
        set((state) => {
          const { maxVisibleItems } = state.config;

          // Clear and rebuild visible items, respecting limit
          state.visibleItems.clear();

          // Sort by priority and distance, take top N
          const sorted = items
            .slice(0, maxVisibleItems)
            .sort((a, b) => {
              // Tracked items first
              if (a.isTracked !== b.isTracked) return a.isTracked ? -1 : 1;
              // Then by LOD level
              const lodOrder = { detailed: 0, individual: 1, cluster: 2, aggregate: 3 };
              return lodOrder[a.lodLevel] - lodOrder[b.lodLevel];
            });

          sorted.forEach((item) => {
            state.visibleItems.set(item.id, item);
          });

          state.performance.visibleItemCount = state.visibleItems.size;
        }),

      addVisibleItems: (items) =>
        set((state) => {
          const { maxVisibleItems } = state.config;

          items.forEach((item) => {
            if (state.visibleItems.size < maxVisibleItems) {
              state.visibleItems.set(item.id, item);
            }
          });

          state.performance.visibleItemCount = state.visibleItems.size;
        }),

      removeVisibleItems: (itemIds) =>
        set((state) => {
          itemIds.forEach((id) => {
            state.visibleItems.delete(id);
          });
          state.performance.visibleItemCount = state.visibleItems.size;
        }),

      clearVisibleItems: () =>
        set((state) => {
          state.visibleItems.clear();
          state.performance.visibleItemCount = 0;
        }),

      // ========================================
      // Tracked Items Actions
      // ========================================

      trackItem: (item) =>
        set((state) => {
          const { maxTrackedItems } = state.config;

          // Remove oldest if at limit
          if (state.trackedItems.size >= maxTrackedItems) {
            const oldest = Array.from(state.trackedItems.entries())
              .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
            if (oldest) {
              state.trackedItems.delete(oldest[0]);
            }
          }

          state.trackedItems.set(item.id, { ...item, isTracked: true });

          // Also update in visible items if present
          const visible = state.visibleItems.get(item.id);
          if (visible) {
            visible.isTracked = true;
          }
        }),

      untrackItem: (itemId) =>
        set((state) => {
          state.trackedItems.delete(itemId);

          const visible = state.visibleItems.get(itemId);
          if (visible) {
            visible.isTracked = false;
          }
        }),

      updateTrackedItem: (itemId, updates) =>
        set((state) => {
          const tracked = state.trackedItems.get(itemId);
          if (tracked) {
            Object.assign(tracked, updates);
          }
        }),

      // ========================================
      // Search Actions
      // ========================================

      setSearchQuery: (query) =>
        set((state) => {
          state.search.query = query;
          state.search.page = 0;
        }),

      setSearchFilters: (filters) =>
        set((state) => {
          Object.assign(state.search.filters, filters);
          state.search.page = 0;
        }),

      setSearchResults: (results, total) =>
        set((state) => {
          state.search.results = results;
          state.search.totalResults = total;
          state.search.lastSearchTime = Date.now();
          state.search.isLoading = false;
        }),

      setSearchLoading: (loading) =>
        set((state) => {
          state.search.isLoading = loading;
        }),

      clearSearch: () =>
        set((state) => {
          state.search = { ...DEFAULT_SEARCH_STATE };
        }),

      nextPage: () =>
        set((state) => {
          const maxPage = Math.ceil(state.search.totalResults / state.search.pageSize) - 1;
          if (state.search.page < maxPage) {
            state.search.page++;
          }
        }),

      prevPage: () =>
        set((state) => {
          if (state.search.page > 0) {
            state.search.page--;
          }
        }),

      // ========================================
      // Virtual Window Actions
      // ========================================

      updateVirtualWindow: (window) =>
        set((state) => {
          Object.assign(state.virtualWindow, window);
        }),

      setCameraPosition: (position, target) =>
        set((state) => {
          state.virtualWindow.cameraPosition = position;
          state.virtualWindow.cameraTarget = target;
        }),

      // ========================================
      // Performance Actions
      // ========================================

      updatePerformance: (metrics) =>
        set((state) => {
          Object.assign(state.performance, metrics);
        }),

      runGarbageCollection: () =>
        set((state) => {
          const now = Date.now();
          const { maxCacheSize } = state.config;

          // Clean expired cache entries (uses entry's own TTL)
          const toDelete: string[] = [];
          state.itemCache.forEach((entry, id) => {
            if (now - entry.timestamp > entry.ttl) {
              toDelete.push(id);
            }
          });
          toDelete.forEach((id) => state.itemCache.delete(id));

          // If still over limit, remove least accessed
          if (state.itemCache.size > maxCacheSize) {
            const sorted = Array.from(state.itemCache.entries())
              .sort((a, b) => a[1].accessCount - b[1].accessCount);

            const excess = state.itemCache.size - maxCacheSize;
            for (let i = 0; i < excess; i++) {
              state.itemCache.delete(sorted[i][0]);
            }
          }

          // Remove stale visible items (not seen in 60s and not tracked)
          const staleThreshold = 60000;
          const staleItems: string[] = [];
          state.visibleItems.forEach((item, id) => {
            if (!item.isTracked && now - item.lastSeen > staleThreshold) {
              staleItems.push(id);
            }
          });
          staleItems.forEach((id) => state.visibleItems.delete(id));

          state.performance.lastGC = now;
          state.performance.visibleItemCount = state.visibleItems.size;
        }),

      // ========================================
      // Cache Actions
      // ========================================

      cacheItem: (item) =>
        set((state) => {
          const { maxCacheSize, cacheTTL } = state.config;

          // Evict if at capacity
          if (state.itemCache.size >= maxCacheSize) {
            const oldest = Array.from(state.itemCache.entries())
              .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
              state.itemCache.delete(oldest[0]);
            }
          }

          state.itemCache.set(item.id, {
            data: item,
            timestamp: Date.now(),
            ttl: cacheTTL,
            accessCount: 0,
          });
        }),

      getCachedItem: (itemId) => {
        const state = get();
        const entry = state.itemCache.get(itemId);

        if (entry) {
          // Update access count (outside of set for performance)
          entry.accessCount++;
          return entry.data;
        }

        return null;
      },

      invalidateCache: (itemIds) =>
        set((state) => {
          if (itemIds) {
            itemIds.forEach((id) => state.itemCache.delete(id));
          } else {
            state.itemCache.clear();
          }
        }),

      // ========================================
      // Selectors
      // ========================================

      getVisibleItemsArray: () => Array.from(get().visibleItems.values()),

      getTrackedItemsArray: () => Array.from(get().trackedItems.values()),

      getZonesArray: () => Array.from(get().zones.values()),

      getItemById: (id) => {
        const state = get();
        return (
          state.trackedItems.get(id) ||
          state.visibleItems.get(id) ||
          state.getCachedItem(id)
        );
      },

      getItemsInZone: (zoneId) => {
        const state = get();
        return Array.from(state.visibleItems.values()).filter(
          (item) => item.zoneId === zoneId
        );
      },

      getTotalItemCount: () => {
        const state = get();
        let total = 0;
        state.zones.forEach((zone) => {
          total += zone.itemCount;
        });
        return total;
      },
    }))
  )
);

// ============================================================================
// Garbage Collection Interval
// ============================================================================

// Start GC interval when store is created
if (typeof window !== 'undefined') {
  setInterval(() => {
    useVirtualizedAppStore.getState().runGarbageCollection();
  }, DEFAULT_CONFIG.gcInterval);
}

// ============================================================================
// Hooks for Common Patterns
// ============================================================================

/**
 * Hook to get items for a specific zone with virtualization
 * Uses useShallow to prevent re-renders when array contents haven't changed
 */
export const useZoneItems = (zoneId: string) => {
  return useVirtualizedAppStore(
    useShallow((state) =>
      Array.from(state.visibleItems.values()).filter((item) => item.zoneId === zoneId)
    )
  );
};

/**
 * Hook to get zone aggregate by ID
 * Uses useShallow for stable reference comparison
 */
export const useZone = (zoneId: string) => {
  return useVirtualizedAppStore(
    useShallow((state) => state.zones.get(zoneId))
  );
};

/**
 * Hook for search state
 * Uses useShallow for stable reference comparison
 */
export const useSearch = () => {
  return useVirtualizedAppStore(
    useShallow((state) => state.search)
  );
};

/**
 * Hook for tracked items
 * Uses useShallow to prevent re-renders when array contents haven't changed
 */
export const useTrackedItems = () => {
  return useVirtualizedAppStore(
    useShallow((state) => Array.from(state.trackedItems.values()))
  );
};

/**
 * Hook for performance metrics
 * Uses useShallow for stable reference comparison
 */
export const usePerformance = () => {
  return useVirtualizedAppStore(
    useShallow((state) => state.performance)
  );
};

/**
 * Hook for total item count (computed from zones)
 * Returns a stable primitive to avoid infinite re-render loops
 */
export const useTotalItemCount = () => {
  return useVirtualizedAppStore((state) => {
    let total = 0;
    state.zones.forEach((zone) => {
      total += zone.itemCount;
    });
    return total;
  });
};

/**
 * Hook for view mode
 * Uses useShallow for stable shallow comparison of returned object
 */
export const useViewMode = () => {
  return useVirtualizedAppStore(
    useShallow((state) => ({
      current: state.viewMode,
      previous: state.previousViewMode,
      setViewMode: state.setViewMode,
      goToOverview: state.goToOverview,
      goToZone: state.goToZone,
      goToSearch: state.goToSearch,
      goToTracking: state.goToTracking,
    }))
  );
};

export default useVirtualizedAppStore;
