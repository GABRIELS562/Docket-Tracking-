import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { initializeSocket, subscribeToReaders } from '../lib/socket';
import { zoneApi, readerApi, docketApi } from '../lib/api';
import { useStore } from '../store/useStore';
import { useZoneStore } from '../store/useZoneStore';
import { useNotifications } from './useNotifications';
import { mockZones, mockReaders, mockDockets, simulateRealtimeUpdates } from '../lib/mockData';
import type { Docket } from '../lib/mockData';
import type { Zone, Reader } from '../lib/types';

export interface AppData {
  zones: Zone[];
  readers: Reader[];
  dockets: Docket[];
  notifications: ReturnType<typeof useNotifications>;
}

export function useAppData(): AppData {
  const {
    setZones,
    setReaders,
    setIsConnected,
    updateZoneOccupancy,
    updateReaderStatus,
    isDemoMode,
    docketLimit,
  } = useStore();

  const setZonesToStore = useZoneStore((state) => state.setZones);

  const notificationHook = useNotifications();
  const { success, error, warning } = notificationHook;

  // Use mock data in demo mode, real API otherwise
  const { data: apiZones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneApi.getAll,
    enabled: !isDemoMode,
  });

  const { data: apiReaders = [] } = useQuery({
    queryKey: ['readers'],
    queryFn: readerApi.getAll,
    enabled: !isDemoMode,
  });

  const { data: apiDocketsData } = useQuery({
    queryKey: ['dockets'],
    queryFn: () => docketApi.search({ limit: 100 }),
    enabled: !isDemoMode,
  });

  // Select data source based on mode
  const zones = isDemoMode ? mockZones : apiZones;
  const readers = isDemoMode ? mockReaders : apiReaders;
  const allDockets = isDemoMode ? mockDockets : apiDocketsData?.data || [];

  // Apply docket limit for 3D view performance
  const dockets = allDockets.slice(0, docketLimit);

  // Sync zones to stores
  useEffect(() => {
    if (zones.length > 0) {
      setZones(zones);
      setZonesToStore(zones);
    }
  }, [zones, setZones, setZonesToStore]);

  // Sync readers to store
  useEffect(() => {
    if (readers.length > 0) setReaders(readers);
  }, [readers, setReaders]);

  // WebSocket / Demo mode connection
  useEffect(() => {
    if (isDemoMode) {
      setIsConnected(true);

      const cleanup = simulateRealtimeUpdates({
        onZoneOccupancy: (data) => {
          updateZoneOccupancy(data.zoneId, data.occupancy);
        },
        onReaderStatus: (data) => {
          updateReaderStatus(data.readerId, data.status);
          if (data.status === 'offline') {
            const reader = mockReaders.find((r) => r.readerId === data.readerId);
            if (reader) {
              warning('Reader Offline', `${reader.readerName} has gone offline`, {
                readerId: data.readerId,
              });
            }
          }
        },
        onOverCapacity: (data) => {
          error('Zone Over Capacity', `${data.zoneName} has exceeded capacity`, {
            zoneId: data.zoneId,
            occupancy: data.occupancy,
            capacity: data.capacity,
          });
        },
      });

      return cleanup;
    }

    // Real WebSocket mode
    const socket = initializeSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Subscribe to zones
    if (zones.length > 0) {
      socket.emit(
        'subscribe:zones',
        zones.map((z) => z.zoneId)
      );
    }

    // Subscribe to readers
    subscribeToReaders();

    // Listen for zone occupancy updates
    socket.on('zone:occupancy', (data: { zoneId: number; occupancy: number }) => {
      updateZoneOccupancy(data.zoneId, data.occupancy);
    });

    // Listen for reader status updates
    socket.on(
      'reader:status',
      (data: { readerId: string; status: 'online' | 'offline' | 'error' | 'connecting' }) => {
        updateReaderStatus(data.readerId, data.status);
      }
    );

    // Listen for zone overcapacity alerts
    socket.on(
      'zone:overcapacity',
      (data: { zoneId: number; zoneName: string; occupancy: number; capacity: number }) => {
        error(
          'Zone Over Capacity',
          `${data.zoneName} has exceeded capacity (${data.occupancy}/${data.capacity})`,
          {
            zoneId: data.zoneId,
            occupancy: data.occupancy,
            capacity: data.capacity,
          }
        );
      }
    );

    // Listen for reader offline alerts
    socket.on(
      'reader:offline',
      (data: { readerId: string; readerName: string; lastSeen: string }) => {
        warning('Reader Offline', `${data.readerName} (${data.readerId}) has gone offline`, {
          readerId: data.readerId,
          lastSeen: data.lastSeen,
        });
      }
    );

    // Listen for missing docket alerts
    socket.on(
      'docket:missing',
      (data: {
        labNumber: string;
        caseReference: string;
        lastSeenAt: string;
        lastZone: string;
      }) => {
        warning(
          'Docket Missing',
          `${data.labNumber} (${data.caseReference}) not seen in 30 minutes`,
          {
            labNumber: data.labNumber,
            lastZone: data.lastZone,
            lastSeenAt: data.lastSeenAt,
          }
        );
      }
    );

    // Listen for new docket registration
    socket.on(
      'docket:registered',
      (data: { labNumber: string; caseReference: string; rfidEpc: string }) => {
        success(
          'New Docket Registered',
          `${data.labNumber} (${data.caseReference}) has been registered`,
          {
            labNumber: data.labNumber,
            rfidEpc: data.rfidEpc,
          }
        );
      }
    );

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('zone:occupancy');
      socket.off('reader:status');
      socket.off('zone:overcapacity');
      socket.off('reader:offline');
      socket.off('docket:missing');
      socket.off('docket:registered');
    };
  }, [
    zones,
    setIsConnected,
    updateZoneOccupancy,
    updateReaderStatus,
    success,
    error,
    warning,
    isDemoMode,
  ]);

  return {
    zones,
    readers,
    dockets,
    notifications: notificationHook,
  };
}

export function useZoneNavigation(zones: Zone[]) {
  const setSelectedZone = useStore((state) => state.setSelectedZone);

  const handleZoneClick = useCallback(
    (zoneId: number) => {
      setSelectedZone(zoneId);
      return zones.find((z) => z.zoneId === zoneId) || null;
    },
    [zones, setSelectedZone]
  );

  return { handleZoneClick };
}
