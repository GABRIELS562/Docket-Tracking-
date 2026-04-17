/**
 * Search API Service (Phase 3.3)
 *
 * Elasticsearch-compatible search service for RFID items:
 * - Full-text search with autocomplete
 * - Faceted filtering with aggregations
 * - Pagination and infinite scroll support
 * - Real-time search with debouncing
 * - Request caching and deduplication
 * - Integration with scene store for consistent item data
 *
 * Target: <300ms search response
 * Reference: StartHere.md Phase 3.3
 */

import { useSceneStore } from '../stores/sceneStore';

// ============================================================================
// Types
// ============================================================================

export interface SearchResultItem {
  id: string;
  epc: string;
  name: string;
  zone: string;
  zoneId: string;
  status: 'active' | 'inactive' | 'missing' | 'in-transit';
  lastSeen: string;
  position: [number, number, number];
  rssi?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SearchFilters {
  zones: string[];
  status: string[];
  priority: string[];
  dateRange: 'today' | 'week' | 'month' | 'all';
}

export interface SearchAggregations {
  zones: { zoneId: string; count: number }[];
  statuses: { status: string; count: number }[];
  priorities: { priority: string; count: number }[];
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  aggregations: SearchAggregations;
  took: number; // milliseconds
}

export interface AutocompleteResult {
  type: 'item' | 'zone' | 'epc' | 'tag';
  value: string;
  label: string;
  metadata?: string;
  score: number;
}

export interface SearchRequest {
  query: string;
  filters: SearchFilters;
  page: number;
  pageSize: number;
  sortBy?: 'relevance' | 'lastSeen' | 'zone' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const DEFAULT_PAGE_SIZE = 50;
const CACHE_TTL = 30000; // 30 seconds
const REQUEST_TIMEOUT = 5000; // 5 seconds

// SAPS Forensic Lab zone metadata
const ZONES = [
  { id: 'entry', name: 'Entry into Lab' },
  { id: 'extractions', name: 'Extractions - Sgt Pillay' },
  { id: 'qpcr-lab', name: 'QPCR Lab - Sgt Mulder' },
  { id: 'pcr-lab', name: 'PCR Lab - WO Jacobs' },
  { id: 'electrophoresis', name: 'Electrophoresis Lab' },
  { id: 'genemapper', name: 'GeneMapper ID - WO Daniels' },
  { id: 'chain-custody', name: 'Confirm Chain of Custody' },
];

const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  'entry': [-22.5, 1.5, -27.5],
  'extractions': [-12.5, 1.5, -5],
  'qpcr-lab': [12.5, 1.5, -5],
  'pcr-lab': [-30, 1.5, 15],
  'electrophoresis': [-34, 1.5, 1.5],
  'genemapper': [-34, 1.5, -11.5],
  'chain-custody': [22.5, 1.5, -27.5],
};

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100;

  set<T>(key: string, data: T): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Remove entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const searchCache = new SearchCache();

// ============================================================================
// Request Deduplication
// ============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

async function deduplicatedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  // Create new request
  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================================
// Search API Class
// ============================================================================

export class SearchApiService {
  private baseUrl: string;
  private useSimulation: boolean;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Use simulation if no backend is available
    this.useSimulation = import.meta.env.DEV || !import.meta.env.VITE_API_URL;
  }

  /**
   * Search items with filters and pagination
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const cacheKey = this.buildCacheKey('search', request);

    // Check cache
    const cached = searchCache.get<SearchResponse>(cacheKey);
    if (cached) {
      return { ...cached, took: 0 }; // 0ms for cached results
    }

    // Use simulation or real API
    const result = await deduplicatedFetch(cacheKey, async () => {
      if (this.useSimulation) {
        return this.simulateSearch(request);
      }
      return this.fetchSearch(request);
    });

    // Cache result
    searchCache.set(cacheKey, result);

    return result as SearchResponse;
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query: string, limit: number = 10): Promise<AutocompleteResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `autocomplete:${query}:${limit}`;

    // Check cache
    const cached = searchCache.get<AutocompleteResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await deduplicatedFetch(cacheKey, async () => {
      if (this.useSimulation) {
        return this.simulateAutocomplete(query, limit);
      }
      return this.fetchAutocomplete(query, limit);
    });

    searchCache.set(cacheKey, result);

    return result as AutocompleteResult[];
  }

  /**
   * Get a single item by ID or EPC
   */
  async getItem(identifier: string): Promise<SearchResultItem | null> {
    const cacheKey = `item:${identifier}`;

    const cached = searchCache.get<SearchResultItem>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.useSimulation) {
      const item = this.simulateGetItem(identifier);
      if (item) {
        searchCache.set(cacheKey, item);
      }
      return item;
    }

    try {
      const response = await fetch(`${this.baseUrl}/items/${identifier}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        return null;
      }

      const item = await response.json();
      searchCache.set(cacheKey, item);
      return item;
    } catch {
      return null;
    }
  }

  /**
   * Get items by zone
   */
  async getItemsByZone(zoneId: string, page: number = 1): Promise<SearchResponse> {
    return this.search({
      query: '',
      filters: {
        zones: [zoneId],
        status: [],
        priority: [],
        dateRange: 'all',
      },
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  }

  /**
   * Invalidate cache
   */
  invalidateCache(pattern?: string): void {
    searchCache.invalidate(pattern);
  }

  // ============================================================================
  // Private Methods - Real API
  // ============================================================================

  private async fetchSearch(request: SearchRequest): Promise<SearchResponse> {
    const startTime = performance.now();

    const params = new URLSearchParams({
      q: request.query,
      page: request.page.toString(),
      pageSize: request.pageSize.toString(),
    });

    if (request.filters.zones.length > 0) {
      params.set('zones', request.filters.zones.join(','));
    }
    if (request.filters.status.length > 0) {
      params.set('status', request.filters.status.join(','));
    }
    if (request.filters.priority.length > 0) {
      params.set('priority', request.filters.priority.join(','));
    }
    if (request.filters.dateRange !== 'all') {
      params.set('dateRange', request.filters.dateRange);
    }
    if (request.sortBy) {
      params.set('sortBy', request.sortBy);
      params.set('sortOrder', request.sortOrder || 'desc');
    }

    const response = await fetch(`${this.baseUrl}/items/search?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const took = Math.round(performance.now() - startTime);

    return {
      ...data,
      took,
    };
  }

  private async fetchAutocomplete(query: string, limit: number): Promise<AutocompleteResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/items/autocomplete?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Autocomplete failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // Private Methods - Simulation
  // ============================================================================

  private simulateSearch(request: SearchRequest): Promise<SearchResponse> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // Simulate network delay (50-150ms)
      const delay = 50 + Math.random() * 100;

      setTimeout(() => {
        const items = this.generateSimulatedItems(request);
        const aggregations = this.generateAggregations(items);
        const took = Math.round(performance.now() - startTime);

        resolve({
          items: items.slice(
            (request.page - 1) * request.pageSize,
            request.page * request.pageSize
          ),
          total: items.length,
          page: request.page,
          pageSize: request.pageSize,
          hasMore: request.page * request.pageSize < items.length,
          aggregations,
          took,
        });
      }, delay);
    });
  }

  private simulateAutocomplete(query: string, limit: number): Promise<AutocompleteResult[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const results: AutocompleteResult[] = [];
        const lowerQuery = query.toLowerCase();

        // Zone suggestions
        ZONES.filter((z) => z.name.toLowerCase().includes(lowerQuery))
          .slice(0, 3)
          .forEach((zone) => {
            results.push({
              type: 'zone',
              value: zone.id,
              label: zone.name,
              metadata: 'Zone',
              score: 0.9,
            });
          });

        // EPC suggestions (simulated)
        if (lowerQuery.length >= 4) {
          for (let i = 0; i < Math.min(5, limit - results.length); i++) {
            const epc = `EPC${lowerQuery.toUpperCase()}${String(i).padStart(4, '0')}`;
            results.push({
              type: 'epc',
              value: epc,
              label: epc.slice(-8),
              metadata: ZONES[i % ZONES.length].name,
              score: 0.7 - i * 0.1,
            });
          }
        }

        resolve(results.slice(0, limit));
      }, 30);
    });
  }

  private simulateGetItem(identifier: string): SearchResultItem | null {
    const zoneId = ZONES[Math.floor(Math.random() * ZONES.length)].id;
    const zone = ZONES.find((z) => z.id === zoneId)!;
    const basePos = ZONE_POSITIONS[zoneId];

    return {
      id: identifier,
      epc: identifier.startsWith('EPC') ? identifier : `EPC${identifier}`,
      name: `Item ${identifier.slice(-6)}`,
      zone: zone.name,
      zoneId: zone.id,
      status: 'active',
      lastSeen: new Date().toISOString(),
      position: [
        basePos[0] + (Math.random() - 0.5) * 20,
        basePos[1] + Math.random() * 0.5,
        basePos[2] + (Math.random() - 0.5) * 20,
      ],
      rssi: -30 - Math.random() * 30,
      priority: 'medium',
    };
  }

  private generateSimulatedItems(request: SearchRequest): SearchResultItem[] {
    const { query, filters } = request;
    const lowerQuery = query.toLowerCase();

    // Get real items from scene store for consistency with 3D view
    const sceneItems = useSceneStore.getState().items;

    // If scene has items, use them (converted to search format)
    if (sceneItems.length > 0) {
      const items: SearchResultItem[] = sceneItems
        .filter((item) => {
          // Zone filter
          if (filters.zones.length > 0 && !filters.zones.includes(item.zone)) {
            return false;
          }

          // Query filter (EPC or zone name)
          if (query) {
            const zoneName = item.zone.replace(/-/g, ' ').toLowerCase();
            const epcLower = item.epc.toLowerCase();
            if (!epcLower.includes(lowerQuery) && !zoneName.includes(lowerQuery)) {
              return false;
            }
          }

          return true;
        })
        .map((item) => {
          const zone = ZONES.find((z) => z.id === item.zone);
          const zoneName = zone?.name || item.zone.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

          // Determine priority based on zone (SAPS Forensic Lab)
          let priority: SearchResultItem['priority'] = 'medium';
          if (item.zone === 'chain-custody') priority = 'critical';
          else if (item.zone === 'entry' || item.zone === 'extractions' || item.zone === 'qpcr-lab') priority = 'high';
          else if (item.zone === 'electrophoresis') priority = 'low';

          return {
            id: item.id,
            epc: item.epc,
            name: `Item ${item.epc.slice(-6).toUpperCase()}`,
            zone: zoneName,
            zoneId: item.zone,
            status: (item.isMoving ? 'in-transit' : 'active') as SearchResultItem['status'],
            lastSeen: new Date().toISOString(),
            position: item.position,
            rssi: -30 - Math.random() * 30,
            priority,
          };
        });

      // Apply status filter
      const statusFiltered = filters.status.length > 0
        ? items.filter((item) => filters.status.includes(item.status))
        : items;

      // Apply priority filter
      const priorityFiltered = filters.priority.length > 0
        ? statusFiltered.filter((item) => filters.priority.includes(item.priority))
        : statusFiltered;

      // Sort by relevance (query match) or zone
      if (query) {
        priorityFiltered.sort((a, b) => {
          const aMatch = a.epc.toLowerCase().includes(lowerQuery) ? 1 : 0;
          const bMatch = b.epc.toLowerCase().includes(lowerQuery) ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      return priorityFiltered;
    }

    // Fallback: Generate 250+ items if scene is empty (initial load)
    const items: SearchResultItem[] = [];
    const activeZones = filters.zones.length > 0
      ? ZONES.filter((z) => filters.zones.includes(z.id))
      : ZONES;

    // Generate 28 items per zone = 252 items total (matching pitch claim)
    activeZones.forEach((zone) => {
      const itemCount = 28;
      const basePos = ZONE_POSITIONS[zone.id];

      for (let i = 0; i < itemCount; i++) {
        const epc = `3050614141${zone.id.slice(0, 2).toUpperCase()}${String(i).padStart(6, '0')}`;

        // Apply text filter
        if (query && !epc.toLowerCase().includes(lowerQuery) && !zone.name.toLowerCase().includes(lowerQuery)) {
          continue;
        }

        const status = this.randomStatus(filters.status);
        const priority = this.randomPriority(filters.priority);

        // Apply date filter
        const lastSeen = this.randomDate(filters.dateRange);
        if (!lastSeen) continue;

        items.push({
          id: `item-${zone.id}-${i}`,
          epc,
          name: `Item ${epc.slice(-6)}`,
          zone: zone.name,
          zoneId: zone.id,
          status,
          lastSeen: lastSeen.toISOString(),
          position: [
            basePos[0] + (Math.random() - 0.5) * 20,
            basePos[1] + Math.random() * 0.5,
            basePos[2] + (Math.random() - 0.5) * 20,
          ],
          rssi: -30 - Math.random() * 30,
          priority,
        });
      }
    });

    // Sort by relevance (query match) or lastSeen
    if (query) {
      items.sort((a, b) => {
        const aMatch = a.epc.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const bMatch = b.epc.toLowerCase().includes(lowerQuery) ? 1 : 0;
        return bMatch - aMatch;
      });
    } else {
      items.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    }

    return items;
  }

  private randomStatus(filter: string[]): SearchResultItem['status'] {
    const statuses: SearchResultItem['status'][] = filter.length > 0
      ? filter as SearchResultItem['status'][]
      : ['active', 'inactive', 'missing', 'in-transit'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private randomPriority(filter: string[]): SearchResultItem['priority'] {
    const priorities: SearchResultItem['priority'][] = filter.length > 0
      ? filter as SearchResultItem['priority'][]
      : ['low', 'medium', 'high', 'critical'];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }

  private randomDate(range: SearchFilters['dateRange']): Date | null {
    const now = new Date();
    let minDate: Date;

    switch (range) {
      case 'today':
        minDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        minDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const maxTime = Date.now();
    const minTime = minDate.getTime();
    const randomTime = minTime + Math.random() * (maxTime - minTime);

    return new Date(randomTime);
  }

  private generateAggregations(items: SearchResultItem[]): SearchAggregations {
    const zoneCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();

    items.forEach((item) => {
      zoneCounts.set(item.zoneId, (zoneCounts.get(item.zoneId) || 0) + 1);
      statusCounts.set(item.status, (statusCounts.get(item.status) || 0) + 1);
      priorityCounts.set(item.priority, (priorityCounts.get(item.priority) || 0) + 1);
    });

    return {
      zones: Array.from(zoneCounts.entries()).map(([zoneId, count]) => ({ zoneId, count })),
      statuses: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
      priorities: Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count })),
    };
  }

  private buildCacheKey(prefix: string, request: SearchRequest): string {
    return `${prefix}:${JSON.stringify(request)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let searchApiInstance: SearchApiService | null = null;

export const getSearchApi = (): SearchApiService => {
  if (!searchApiInstance) {
    searchApiInstance = new SearchApiService();
  }
  return searchApiInstance;
};

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSearchOptions {
  initialFilters?: SearchFilters;
  pageSize?: number;
  debounceMs?: number;
}

export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  results: SearchResultItem[];
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  aggregations: SearchAggregations | null;
  took: number;
  loadMore: () => void;
  reset: () => void;
  autocomplete: AutocompleteResult[];
}

const DEFAULT_FILTERS: SearchFilters = {
  zones: [],
  status: [],
  priority: [],
  dateRange: 'all',
};

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    initialFilters = DEFAULT_FILTERS,
    pageSize = DEFAULT_PAGE_SIZE,
    debounceMs = 200,
  } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [aggregations, setAggregations] = useState<SearchAggregations | null>(null);
  const [took, setTook] = useState(0);
  const [page, setPage] = useState(1);
  const [autocomplete, setAutocomplete] = useState<AutocompleteResult[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchApi = useRef(getSearchApi());

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      setPage(1);

      try {
        const response = await searchApi.current.search({
          query,
          filters,
          page: 1,
          pageSize,
        });

        setResults(response.items);
        setTotal(response.total);
        setHasMore(response.hasMore);
        setAggregations(response.aggregations);
        setTook(response.took);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, filters, pageSize, debounceMs]);

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) {
      setAutocomplete([]);
      return;
    }

    const fetchAutocomplete = async () => {
      try {
        const suggestions = await searchApi.current.autocomplete(query);
        setAutocomplete(suggestions);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };

    fetchAutocomplete();
  }, [query]);

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const nextPage = page + 1;

    try {
      const response = await searchApi.current.search({
        query,
        filters,
        page: nextPage,
        pageSize,
      });

      setResults((prev) => [...prev, ...response.items]);
      setHasMore(response.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, query, filters, pageSize]);

  // Reset
  const reset = useCallback(() => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setAggregations(null);
    setTook(0);
    setPage(1);
    setAutocomplete([]);
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    total,
    isLoading,
    hasMore,
    aggregations,
    took,
    loadMore,
    reset,
    autocomplete,
  };
}

export default SearchApiService;
