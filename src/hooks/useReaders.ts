import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readerApi } from '@/lib/api';
import { mockReaders } from '@/lib/mockData';
import { useReaderStore } from '@/store/useReaderStore';
import { useUIStore } from '@/store/useUIStore';

/**
 * Hook for fetching and managing readers
 */
export function useReaders() {
  const { setReaders, setLoading, setError } = useReaderStore();
  const isDemoMode = useUIStore((state) => state.isDemoMode);

  const query = useQuery({
    queryKey: ['readers'],
    queryFn: async () => {
      if (isDemoMode) {
        return mockReaders;
      }
      return readerApi.getAll();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: isDemoMode ? false : 30000, // Refetch every 30 seconds in live mode
  });

  // Sync to store
  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  useEffect(() => {
    if (query.data) {
      setReaders(query.data);
    }
  }, [query.data, setReaders]);

  useEffect(() => {
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : 'Failed to load readers');
    }
  }, [query.error, setError]);

  return {
    readers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for getting readers in a specific zone
 */
export function useZoneReaders(zoneId: number | null) {
  const getReadersByZone = useReaderStore((state) => state.getReadersByZone);

  if (zoneId === null) {
    return { readers: [], onlineCount: 0, offlineCount: 0 };
  }

  const readers = getReadersByZone(zoneId);
  const onlineCount = readers.filter((r) => r.status === 'online').length;
  const offlineCount = readers.filter((r) => r.status === 'offline' || r.status === 'error').length;

  return { readers, onlineCount, offlineCount };
}

/**
 * Hook for reader health summary
 */
export function useReaderHealth() {
  const readers = useReaderStore((state) => state.readers);
  const getOnlineReaderCount = useReaderStore((state) => state.getOnlineReaderCount);
  const getOfflineReaderCount = useReaderStore((state) => state.getOfflineReaderCount);

  const total = readers.length;
  const online = getOnlineReaderCount();
  const offline = getOfflineReaderCount();
  const healthPercentage = total > 0 ? Math.round((online / total) * 100) : 0;

  return {
    total,
    online,
    offline,
    healthPercentage,
    hasIssues: offline > 0,
  };
}
