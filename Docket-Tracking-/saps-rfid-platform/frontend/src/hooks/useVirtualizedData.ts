import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVirtualizedAppStore } from '../stores/virtualizedAppStore';
import type { VirtualizedItem, ZoneAggregate, TrackedItem } from '../stores/virtualizedAppStore';
import { useDebounce } from './useDebounce';

/**
 * On-Demand Data Loading Hooks (Phase 3.1)
 *
 * Hooks for virtualized data loading patterns:
 * - Load items only when needed (search, zone drill-down)
 * - Smart prefetching based on camera position
 * - Automatic cleanup of off-screen data
 * - Integration with backend API
 *
 * Never loads all 300K+ items at once.
 *
 * Reference: StartHere.md Phase 3.1
 */

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ============================================================================
// Types
// ============================================================================

interface LoadItemsOptions {
  zoneId?: string;
  query?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'lastSeen' | 'rssi' | 'epc';
  sortOrder?: 'asc' | 'desc';
}

interface LoadZonesOptions {
  includeStats?: boolean;
  includeFlow?: boolean;
}

interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// API Functions (would connect to backend)
// ============================================================================

/**
 * Fetch items from API with pagination
 */
async function fetchItems(options: LoadItemsOptions): Promise<ApiResponse<VirtualizedItem[]>> {
  const params = new URLSearchParams();
  if (options.zoneId) params.set('zoneId', options.zoneId);
  if (options.query) params.set('q', options.query);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);

  try {
    const response = await fetch(`${API_BASE}/items?${params}`);
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  } catch (error) {
    console.warn('API not available, using simulated data');
    // Return simulated data for development
    return simulateItemsResponse(options);
  }
}

/**
 * Fetch zone aggregates from API
 */
async function fetchZones(options: LoadZonesOptions = {}): Promise<ZoneAggregate[]> {
  try {
    const params = new URLSearchParams();
    if (options.includeStats) params.set('stats', 'true');
    if (options.includeFlow) params.set('flow', 'true');

    const response = await fetch(`${API_BASE}/zones?${params}`);
    if (!response.ok) throw new Error('Failed to fetch zones');
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.warn('API not available, using simulated zones');
    return simulateZonesResponse();
  }
}

/**
 * Fetch single item details
 */
async function fetchItemDetails(itemId: string): Promise<TrackedItem | null> {
  try {
    const response = await fetch(`${API_BASE}/items/${itemId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.warn('API not available, using simulated item');
    return simulateItemDetails(itemId);
  }
}

// ============================================================================
// Simulation Functions (for development without backend)
// ============================================================================

function simulateItemsResponse(options: LoadItemsOptions): ApiResponse<VirtualizedItem[]> {
  const zones = ['receiving', 'storage-a', 'storage-b', 'storage-c', 'secure-storage', 'storage-d', 'processing', 'shipping', 'returns'];
  const zonePositions: Record<string, [number, number, number]> = {
    'receiving': [-33, 1.5, -33],
    'storage-a': [-33, 1.5, 0],
    'storage-b': [-33, 1.5, 33],
    'storage-c': [0, 1.5, -33],
    'secure-storage': [0, 1.5, 0],
    'storage-d': [0, 1.5, 33],
    'processing': [33, 1.5, -33],
    'shipping': [33, 1.5, 0],
    'returns': [33, 1.5, 33],
  };

  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const targetZone = options.zoneId;

  const items: VirtualizedItem[] = [];
  const total = targetZone ? 50 : 200;

  for (let i = 0; i < Math.min(limit, total - offset); i++) {
    const zoneId = targetZone || zones[Math.floor(Math.random() * zones.length)];
    const basePos = zonePositions[zoneId] || [0, 1.5, 0];

    items.push({
      id: `item-${offset + i}`,
      epc: `E200${String(offset + i).padStart(8, '0')}`,
      zoneId,
      position: [
        basePos[0] + (Math.random() - 0.5) * 20,
        basePos[1] + Math.random() * 0.5,
        basePos[2] + (Math.random() - 0.5) * 20,
      ],
      lastSeen: Date.now() - Math.random() * 60000,
      rssi: -30 - Math.random() * 40,
      isTracked: false,
      isVisible: true,
      lodLevel: 'individual',
    });
  }

  return {
    data: items,
    total,
    page: Math.floor(offset / limit),
    pageSize: limit,
  };
}

function simulateZonesResponse(): ZoneAggregate[] {
  const zones = [
    { id: 'receiving', name: 'Receiving', capacity: 150, priority: 'high' as const },
    { id: 'storage-a', name: 'Storage A', capacity: 500, priority: 'medium' as const },
    { id: 'storage-b', name: 'Storage B', capacity: 500, priority: 'medium' as const },
    { id: 'storage-c', name: 'Storage C', capacity: 500, priority: 'medium' as const },
    { id: 'secure-storage', name: 'Secure Storage', capacity: 100, priority: 'critical' as const },
    { id: 'storage-d', name: 'Storage D', capacity: 500, priority: 'medium' as const },
    { id: 'processing', name: 'Processing', capacity: 200, priority: 'high' as const },
    { id: 'shipping', name: 'Shipping', capacity: 250, priority: 'high' as const },
    { id: 'returns', name: 'Returns', capacity: 150, priority: 'low' as const },
  ];

  const zonePositions: Record<string, [number, number, number]> = {
    'receiving': [-33, 0, -33],
    'storage-a': [-33, 0, 0],
    'storage-b': [-33, 0, 33],
    'storage-c': [0, 0, -33],
    'secure-storage': [0, 0, 0],
    'storage-d': [0, 0, 33],
    'processing': [33, 0, -33],
    'shipping': [33, 0, 0],
    'returns': [33, 0, 33],
  };

  return zones.map((zone) => {
    const itemCount = Math.floor(Math.random() * zone.capacity * 0.8);
    const pos = zonePositions[zone.id];

    return {
      id: zone.id,
      name: zone.name,
      itemCount,
      capacity: zone.capacity,
      utilizationPercent: Math.round((itemCount / zone.capacity) * 100),
      centroid: pos,
      bounds: {
        min: [pos[0] - 15, 0, pos[2] - 15] as [number, number, number],
        max: [pos[0] + 15, 12, pos[2] + 15] as [number, number, number],
      },
      avgRssi: -40 - Math.random() * 20,
      lastActivity: Date.now() - Math.random() * 10000,
      flowIn: Math.floor(Math.random() * 5),
      flowOut: Math.floor(Math.random() * 5),
      priority: zone.priority,
      isHovered: false,
      isSelected: false,
    };
  });
}

function simulateItemDetails(itemId: string): TrackedItem {
  const zones = ['receiving', 'storage-a', 'storage-b', 'storage-c', 'secure-storage', 'storage-d', 'processing', 'shipping', 'returns'];
  const zoneId = zones[Math.floor(Math.random() * zones.length)];

  return {
    id: itemId,
    epc: `E200${itemId.replace('item-', '').padStart(8, '0')}`,
    name: `Item ${itemId}`,
    zoneId,
    position: [Math.random() * 60 - 30, 1.5, Math.random() * 60 - 30],
    lastSeen: Date.now(),
    rssi: -30 - Math.random() * 40,
    isTracked: true,
    isVisible: true,
    lodLevel: 'detailed',
    status: 'active',
    history: [
      { zoneId: 'receiving', timestamp: Date.now() - 3600000, rssi: -45 },
      { zoneId: 'storage-a', timestamp: Date.now() - 1800000, rssi: -50 },
      { zoneId, timestamp: Date.now(), rssi: -40 },
    ],
    metadata: {},
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for loading zone aggregates
 * Always loads - zones are always visible
 */
export function useZoneAggregates(refreshInterval = 5000) {
  const updateZoneAggregates = useVirtualizedAppStore((s) => s.updateZoneAggregates);
  // Use useShallow to prevent new array reference on every render
  const zones = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.zones.values()))
  );
  const initialLoadRef = useRef(false);

  useEffect(() => {
    // Initial load - only once
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchZones({ includeStats: true, includeFlow: true }).then(updateZoneAggregates);
    }

    // Periodic refresh
    const interval = setInterval(() => {
      fetchZones({ includeStats: true, includeFlow: true }).then(updateZoneAggregates);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]); // Remove updateZoneAggregates - it's stable from store

  return zones;
}

/**
 * Hook for loading items in a specific zone (on-demand)
 */
export function useZoneItems(zoneId: string | null, options: { limit?: number } = {}) {
  const { limit = 100 } = options;
  const addVisibleItems = useVirtualizedAppStore((s) => s.addVisibleItems);
  // Use useShallow with a stable selector to prevent new array reference
  const visibleItems = useVirtualizedAppStore(
    useShallow((s) =>
      Array.from(s.visibleItems.values()).filter((i) => i.zoneId === zoneId)
    )
  );

  const loadingRef = useRef(false);
  const loadedZoneRef = useRef<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!zoneId || loadingRef.current) return;

    loadingRef.current = true;
    try {
      const response = await fetchItems({ zoneId, limit });
      addVisibleItems(response.data);
    } finally {
      loadingRef.current = false;
    }
  }, [zoneId, limit, addVisibleItems]);

  useEffect(() => {
    // Only load when zoneId changes
    if (zoneId && zoneId !== loadedZoneRef.current) {
      loadedZoneRef.current = zoneId;
      loadItems();
    }
  }, [zoneId, loadItems]);

  return { items: visibleItems, reload: loadItems };
}

/**
 * Hook for search with pagination
 */
export function useItemSearch() {
  // Use useShallow to prevent re-renders from search object reference changes
  const search = useVirtualizedAppStore(useShallow((s) => s.search));
  const setSearchQuery = useVirtualizedAppStore((s) => s.setSearchQuery);
  const setSearchFilters = useVirtualizedAppStore((s) => s.setSearchFilters);
  const setSearchResults = useVirtualizedAppStore((s) => s.setSearchResults);
  const setSearchLoading = useVirtualizedAppStore((s) => s.setSearchLoading);
  const addVisibleItems = useVirtualizedAppStore((s) => s.addVisibleItems);
  const nextPage = useVirtualizedAppStore((s) => s.nextPage);
  const prevPage = useVirtualizedAppStore((s) => s.prevPage);

  const debouncedQuery = useDebounce(search.query, 300);
  const lastSearchRef = useRef<string>('');

  // Execute search when query changes
  useEffect(() => {
    if (!debouncedQuery) {
      if (lastSearchRef.current !== '') {
        lastSearchRef.current = '';
        setSearchResults([], 0);
      }
      return;
    }

    // Prevent duplicate searches
    const searchKey = `${debouncedQuery}-${search.page}-${search.pageSize}`;
    if (searchKey === lastSearchRef.current) return;
    lastSearchRef.current = searchKey;

    const doSearch = async () => {
      setSearchLoading(true);
      try {
        const response = await fetchItems({
          query: debouncedQuery,
          limit: search.pageSize,
          offset: search.page * search.pageSize,
        });

        setSearchResults(response.data, response.total);

        // Also add to visible items for 3D rendering
        addVisibleItems(response.data);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([], 0);
      }
    };

    doSearch();
  }, [debouncedQuery, search.page, search.pageSize]); // Removed store actions from deps

  return {
    query: search.query,
    results: search.results,
    total: search.totalResults,
    isLoading: search.isLoading,
    page: search.page,
    pageSize: search.pageSize,
    filters: search.filters,
    setQuery: setSearchQuery,
    setFilters: setSearchFilters,
    nextPage,
    prevPage,
  };
}

/**
 * Hook for tracking specific items
 */
export function useItemTracking() {
  // Use useShallow to prevent new array reference on every render
  const trackedItems = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.trackedItems.values()))
  );
  const trackItem = useVirtualizedAppStore((s) => s.trackItem);
  const untrackItem = useVirtualizedAppStore((s) => s.untrackItem);
  const updateTrackedItem = useVirtualizedAppStore((s) => s.updateTrackedItem);

  const startTracking = useCallback(
    async (itemId: string) => {
      const details = await fetchItemDetails(itemId);
      if (details) {
        trackItem(details);
      }
    },
    [trackItem]
  );

  const stopTracking = useCallback(
    (itemId: string) => {
      untrackItem(itemId);
    },
    [untrackItem]
  );

  return {
    trackedItems,
    startTracking,
    stopTracking,
    updateTrackedItem,
    trackingCount: trackedItems.length,
  };
}

/**
 * Hook for camera-based prefetching
 * Loads items in zones that are about to be visible
 */
export function useCameraPrefetch() {
  // Use useShallow for stable references
  const virtualWindow = useVirtualizedAppStore(useShallow((s) => s.virtualWindow));
  const zones = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.zones.values()))
  );
  const addVisibleItems = useVirtualizedAppStore((s) => s.addVisibleItems);

  const prefetchRef = useRef<Set<string>>(new Set());

  // Determine which zones are near the camera
  const nearbyZones = useMemo(() => {
    const [cx, cy, cz] = virtualWindow.cameraPosition;
    const prefetchDistance = virtualWindow.lodDistances.individual;

    return zones.filter((zone) => {
      const [zx, zy, zz] = zone.centroid;
      const distance = Math.sqrt(
        Math.pow(cx - zx, 2) + Math.pow(cy - zy, 2) + Math.pow(cz - zz, 2)
      );
      return distance < prefetchDistance;
    });
  }, [virtualWindow.cameraPosition, virtualWindow.lodDistances.individual, zones]);

  // Prefetch items for nearby zones
  useEffect(() => {
    nearbyZones.forEach((zone) => {
      if (!prefetchRef.current.has(zone.id)) {
        prefetchRef.current.add(zone.id);

        fetchItems({ zoneId: zone.id, limit: 50 }).then((response) => {
          addVisibleItems(response.data);
        });
      }
    });

    // Cleanup prefetch cache for zones no longer nearby
    const nearbyIds = new Set(nearbyZones.map((z) => z.id));
    prefetchRef.current.forEach((id) => {
      if (!nearbyIds.has(id)) {
        prefetchRef.current.delete(id);
      }
    });
  }, [nearbyZones]); // Removed addVisibleItems - it's stable from store

  return nearbyZones;
}

/**
 * Hook for LOD-based item loading
 * Returns items with appropriate LOD level based on camera distance
 */
export function useLODItems() {
  // Use useShallow for stable references
  const virtualWindow = useVirtualizedAppStore(useShallow((s) => s.virtualWindow));
  const visibleItems = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.visibleItems.values()))
  );

  // Calculate LOD level for each item based on distance
  const itemsWithLOD = useMemo(() => {
    const [cx, cy, cz] = virtualWindow.cameraPosition;
    const { detailed, individual, cluster } = virtualWindow.lodDistances;

    return visibleItems.map((item) => {
      const [ix, iy, iz] = item.position;
      const distance = Math.sqrt(
        Math.pow(cx - ix, 2) + Math.pow(cy - iy, 2) + Math.pow(cz - iz, 2)
      );

      let lodLevel: VirtualizedItem['lodLevel'];
      if (distance < detailed) {
        lodLevel = 'detailed';
      } else if (distance < individual) {
        lodLevel = 'individual';
      } else if (distance < cluster) {
        lodLevel = 'cluster';
      } else {
        lodLevel = 'aggregate';
      }

      return { ...item, lodLevel };
    });
  }, [visibleItems, virtualWindow.cameraPosition, virtualWindow.lodDistances]);

  // Group by LOD level for efficient rendering
  const grouped = useMemo(() => {
    const groups = {
      detailed: [] as VirtualizedItem[],
      individual: [] as VirtualizedItem[],
      cluster: [] as VirtualizedItem[],
      aggregate: [] as VirtualizedItem[],
    };

    itemsWithLOD.forEach((item) => {
      groups[item.lodLevel].push(item);
    });

    return groups;
  }, [itemsWithLOD]);

  return {
    all: itemsWithLOD,
    grouped,
    counts: {
      detailed: grouped.detailed.length,
      individual: grouped.individual.length,
      cluster: grouped.cluster.length,
      aggregate: grouped.aggregate.length,
    },
  };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  // Use useShallow for stable reference
  const perfMetrics = useVirtualizedAppStore(useShallow((s) => s.performance));
  const updatePerformance = useVirtualizedAppStore((s) => s.updatePerformance);
  const runGC = useVirtualizedAppStore((s) => s.runGarbageCollection);

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(window.performance.now());
  // Use ref to avoid dependency issues
  const updatePerfRef = useRef(updatePerformance);
  updatePerfRef.current = updatePerformance;

  // FPS calculation - use empty deps to run only once
  useEffect(() => {
    let animationId: number;

    const measureFrame = () => {
      const now = window.performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average FPS
      const avgFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = Math.round(1000 / avgFrameTime);

      // Use ref to always get latest updatePerformance
      updatePerfRef.current({ fps, renderTime: avgFrameTime });

      animationId = requestAnimationFrame(measureFrame);
    };

    animationId = requestAnimationFrame(measureFrame);

    return () => cancelAnimationFrame(animationId);
  }, []); // Empty deps - run only once

  // Memory monitoring (if available)
  useEffect(() => {
    const checkMemory = () => {
      const perf = window.performance as any;
      if ('memory' in perf) {
        updatePerfRef.current({
          memoryUsage: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
        });
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 5000);

    return () => clearInterval(interval);
  }, []); // Empty deps - run only once

  return {
    ...perfMetrics,
    updatePerformance,
    forceGC: runGC,
  };
}

export default {
  useZoneAggregates,
  useZoneItems,
  useItemSearch,
  useItemTracking,
  useCameraPrefetch,
  useLODItems,
  usePerformanceMonitor,
};
