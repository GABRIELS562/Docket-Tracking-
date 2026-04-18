import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { zoneApi } from '@/lib/api';
import { mockZones } from '@/lib/mockData';
import { useZoneStore } from '@/store/useZoneStore';
import { useUIStore } from '@/store/useUIStore';

/**
 * Hook for fetching and managing zones
 * Supports both demo mode (mock data) and live API
 */
export function useZones() {
  const { setZones, setLoading, setError } = useZoneStore();
  const isDemoMode = useUIStore((state) => state.isDemoMode);

  const query = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      if (isDemoMode) {
        return mockZones;
      }
      return zoneApi.getAll();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: isDemoMode ? false : 60000, // Refetch every minute in live mode
  });

  // Sync to store
  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  useEffect(() => {
    if (query.data) {
      setZones(query.data);
    }
  }, [query.data, setZones]);

  useEffect(() => {
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : 'Failed to load zones');
    }
  }, [query.error, setError]);

  return {
    zones: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for selecting and working with a single zone
 */
export function useSelectedZone() {
  const selectedZoneId = useZoneStore((state) => state.selectedZoneId);
  const getZoneById = useZoneStore((state) => state.getZoneById);
  const selectZone = useZoneStore((state) => state.selectZone);

  const selectedZone = selectedZoneId !== null ? getZoneById(selectedZoneId) : undefined;

  return {
    selectedZone,
    selectedZoneId,
    selectZone,
    clearSelection: () => selectZone(null),
  };
}
