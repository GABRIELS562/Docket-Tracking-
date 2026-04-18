import { useQuery } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { zoneApi, itemApi } from '@/lib/api';
import { getMockItemsForZone, searchMockItems } from '@/lib/mockData';
import { useItemStore } from '@/store/useItemStore';
import { useUIStore } from '@/store/useUIStore';
import type { Item, ItemSummary, PaginatedResponse } from '@/lib/types';

/**
 * Hook for fetching paginated items in a zone
 */
export function useZoneItems(zoneId: number | null) {
  const { currentPage, itemsPerPage, setItems, setLoading, setError, setCurrentZoneId } =
    useItemStore();
  const isDemoMode = useUIStore((state) => state.isDemoMode);

  const query = useQuery({
    queryKey: ['zone-items', zoneId, currentPage, itemsPerPage],
    queryFn: async (): Promise<PaginatedResponse<Item>> => {
      if (!zoneId) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: itemsPerPage,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }
      if (isDemoMode) {
        return getMockItemsForZone(zoneId, currentPage, itemsPerPage);
      }
      return zoneApi.getItems(zoneId, { page: currentPage, limit: itemsPerPage });
    },
    enabled: zoneId !== null,
    staleTime: 10000, // 10 seconds
  });

  // Update store when zone changes
  useEffect(() => {
    setCurrentZoneId(zoneId);
  }, [zoneId, setCurrentZoneId]);

  // Sync loading state
  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  // Sync data to store
  useEffect(() => {
    if (query.data) {
      setItems(query.data);
    }
  }, [query.data, setItems]);

  // Sync errors
  useEffect(() => {
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : 'Failed to load items');
    }
  }, [query.error, setError]);

  return {
    items: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for searching items across all zones
 */
export function useItemSearch() {
  const { searchQuery, setSearchQuery, setSearchResults, setIsSearching, clearSearch } =
    useItemStore();
  const isDemoMode = useUIStore((state) => state.isDemoMode);

  const query = useQuery({
    queryKey: ['item-search', searchQuery],
    queryFn: async (): Promise<PaginatedResponse<ItemSummary>> => {
      if (!searchQuery || searchQuery.length < 2) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }
      if (isDemoMode) {
        return searchMockItems(searchQuery, 1, 50);
      }
      return itemApi.search({ query: searchQuery, limit: 50 });
    },
    enabled: searchQuery.length >= 2,
    staleTime: 5000,
  });

  // Sync searching state
  useEffect(() => {
    setIsSearching(query.isLoading);
  }, [query.isLoading, setIsSearching]);

  // Sync results to store
  useEffect(() => {
    if (query.data) {
      setSearchResults(query.data.data, query.data.total);
    }
  }, [query.data, setSearchResults]);

  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  return {
    results: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isSearching: query.isLoading,
    searchQuery,
    search,
    clearSearch,
  };
}

/**
 * Hook for getting a single item by ID
 */
export function useItem(itemId: string | null) {
  const isDemoMode = useUIStore((state) => state.isDemoMode);
  const { selectItem } = useItemStore();

  const query = useQuery({
    queryKey: ['item', itemId],
    queryFn: async (): Promise<Item | null> => {
      if (!itemId) return null;
      if (isDemoMode) {
        // In demo mode, generate the item based on the ID
        const index = parseInt(itemId.replace('item-', ''), 10);
        if (isNaN(index)) return null;
        // Dynamically import to get the generateMockItem function
        const mockData = await import('@/lib/mockData');
        // Use the zone items function but find the specific item
        // Items are distributed across zones, so we calculate which zone
        const zonesData = mockData.mockZones;
        let cumulative = 0;
        for (const zone of zonesData) {
          if (index < cumulative + zone.currentOccupancy) {
            const pageSize = 50;
            const localIndex = index - cumulative;
            const page = Math.floor(localIndex / pageSize) + 1;
            const pageResult = mockData.getMockItemsForZone(zone.zoneId, page, pageSize);
            const itemInPage = pageResult.data.find((item) => item.itemId === itemId);
            return itemInPage ?? null;
          }
          cumulative += zone.currentOccupancy;
        }
        return null;
      }
      return itemApi.getById(itemId);
    },
    enabled: itemId !== null,
  });

  // Sync to selected item in store
  useEffect(() => {
    if (query.data) {
      selectItem(query.data);
    }
  }, [query.data, selectItem]);

  return {
    item: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
