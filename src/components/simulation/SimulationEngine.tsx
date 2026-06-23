import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useZoneStore } from '@/store/useZoneStore';
import { useReaderStore } from '@/store/useReaderStore';
import { useUIStore } from '@/store/useUIStore';
import { mockZones, mockReaders } from '@/lib/mockData';
import type {
  ItemMovementEvent,
  ZoneOccupancyEvent,
  ReaderStatusEvent,
  LegacyReaderStatus,
} from '@/lib/types';

interface SimulationEngineProps {
  /** Callback when a notification should be shown */
  onNotification?: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => void;
}

/**
 * SimulationEngine - Orchestrates real-time demo simulation
 *
 * This component runs background timers to simulate:
 * - Item movements between zones (every 3-5 seconds)
 * - Zone occupancy fluctuations (every 5-8 seconds)
 * - Reader status changes (every 20-30 seconds)
 * - Periodic alerts (exit alerts, stale dockets, etc.)
 *
 * It updates the relevant stores and triggers notifications.
 */
export default function SimulationEngine({ onNotification }: SimulationEngineProps) {
  const isDemoMode = useUIStore((state) => state.isDemoMode);
  const {
    isRunning,
    simulationSpeed,
    startSimulation,
    addMovement,
    addOccupancyChange,
    addReaderChange,
    addAlert,
    updateMetrics,
  } = useSimulationStore();

  const updateZoneOccupancy = useZoneStore((state) => state.updateZoneOccupancy);
  const zones = useZoneStore((state) => state.zones);
  const updateReaderStatus = useReaderStore((state) => state.updateReaderStatus);
  const readers = useReaderStore((state) => state.readers);

  // Refs for interval IDs
  const movementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const occupancyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metricsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to generate random item movement
  const generateMovement = useCallback((): ItemMovementEvent | null => {
    const sourceZones = zones.length > 0 ? zones : mockZones;
    if (sourceZones.length < 2) return null;

    const fromZone = sourceZones[Math.floor(Math.random() * sourceZones.length)];
    let toZone = sourceZones[Math.floor(Math.random() * sourceZones.length)];

    // Ensure different zones
    while (toZone.zoneId === fromZone.zoneId && sourceZones.length > 1) {
      toZone = sourceZones[Math.floor(Math.random() * sourceZones.length)];
    }

    const itemIndex = Math.floor(Math.random() * 10000);
    const year = 2024 + Math.floor(itemIndex / 100000);
    const itemNumber = `INV-${year}-${String(itemIndex % 100000).padStart(6, '0')}`;

    return {
      itemId: `item-${itemIndex}`,
      itemNumber,
      fromZoneId: fromZone.zoneId,
      toZoneId: toZone.zoneId,
      fromZoneName: fromZone.zoneName,
      toZoneName: toZone.zoneName,
      readerId: toZone.readers?.[0] || `READER-${toZone.zoneId}`,
      confidence: 85 + Math.floor(Math.random() * 15),
      timestamp: new Date().toISOString(),
    };
  }, [zones]);

  // Helper to simulate occupancy change
  const simulateOccupancyChange = useCallback(() => {
    const sourceZones = zones.length > 0 ? zones : mockZones;
    const zone = sourceZones[Math.floor(Math.random() * sourceZones.length)];

    const changeAmount = Math.floor(Math.random() * 30) - 15; // -15 to +15
    const newOccupancy = Math.max(
      0,
      Math.min(zone.capacity * 1.1, zone.currentOccupancy + changeAmount)
    );
    const percentage = Math.round((newOccupancy / zone.capacity) * 100);

    const event: ZoneOccupancyEvent = {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      occupancy: Math.round(newOccupancy),
      capacity: zone.capacity,
      percentage,
    };

    // Update zone store
    updateZoneOccupancy(zone.zoneId, Math.round(newOccupancy));

    // Add to simulation store
    addOccupancyChange(event);

    // Check for overcapacity alert
    if (percentage >= 95) {
      addAlert({
        type: 'overcapacity',
        severity: percentage >= 100 ? 'critical' : 'warning',
        title: 'Zone Capacity Alert',
        message: `${zone.zoneName} is at ${percentage}% capacity`,
        metadata: { zoneId: zone.zoneId, percentage },
      });

      onNotification?.(
        percentage >= 100 ? 'error' : 'warning',
        'Zone Capacity Alert',
        `${zone.zoneName} is at ${percentage}% capacity`,
        { zoneId: zone.zoneId, percentage }
      );
    }
  }, [zones, updateZoneOccupancy, addOccupancyChange, addAlert, onNotification]);

  // Helper to simulate reader status change
  const simulateReaderChange = useCallback(() => {
    const sourceReaders = readers.length > 0 ? readers : mockReaders;
    const reader = sourceReaders[Math.floor(Math.random() * sourceReaders.length)];

    // Weighted status selection (mostly online)
    const statusOptions: LegacyReaderStatus[] = [
      'online',
      'online',
      'online',
      'online',
      'online',
      'online',
      'online',
      'offline',
      'error',
    ];
    const newStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    const previousStatus = reader.status as LegacyReaderStatus;

    if (newStatus !== previousStatus) {
      const event: ReaderStatusEvent = {
        readerId: reader.readerId,
        readerName: reader.readerName,
        status: newStatus,
        previousStatus,
      };

      // Update reader store
      updateReaderStatus(reader.readerId, newStatus);

      // Add to simulation store
      addReaderChange(event);

      // Alert for offline/error status
      if (newStatus === 'offline' || newStatus === 'error') {
        addAlert({
          type: 'reader_offline',
          severity: newStatus === 'error' ? 'error' : 'warning',
          title: 'Reader Status Change',
          message: `${reader.readerName} is now ${newStatus}`,
          metadata: { readerId: reader.readerId, status: newStatus },
        });

        onNotification?.(
          newStatus === 'error' ? 'error' : 'warning',
          'Reader Status Change',
          `${reader.readerName} is now ${newStatus}`,
          { readerId: reader.readerId }
        );
      }
    }
  }, [readers, updateReaderStatus, addReaderChange, addAlert, onNotification]);

  // Helper to generate random alerts
  const generateRandomAlert = useCallback(() => {
    const alertTypes = [
      {
        type: 'exit' as const,
        severity: 'warning' as const,
        title: 'Exit Alert',
        getMessage: () => {
          const itemNum = `INV-2024-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;
          return `Item ${itemNum} detected at exit without authorization`;
        },
      },
      {
        type: 'stale' as const,
        severity: 'info' as const,
        title: 'Stale Item Warning',
        getMessage: () => {
          const itemNum = `INV-2024-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;
          const hours = Math.floor(Math.random() * 24) + 1;
          return `Item ${itemNum} not detected for ${hours} hours`;
        },
      },
      {
        type: 'movement' as const,
        severity: 'info' as const,
        title: 'Unusual Movement',
        getMessage: () => {
          const sourceZones = zones.length > 0 ? zones : mockZones;
          const zone = sourceZones[Math.floor(Math.random() * sourceZones.length)];
          return `High movement activity detected in ${zone.zoneName}`;
        },
      },
    ];

    const selectedAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];

    addAlert({
      type: selectedAlert.type,
      severity: selectedAlert.severity,
      title: selectedAlert.title,
      message: selectedAlert.getMessage(),
    });

    // Optionally trigger notification for important alerts
    if (selectedAlert.type === 'exit') {
      onNotification?.('warning', selectedAlert.title, selectedAlert.getMessage());
    }
  }, [zones, addAlert, onNotification]);

  // Update metrics periodically
  const updateSimulationMetrics = useCallback(() => {
    const sourceZones = zones.length > 0 ? zones : mockZones;
    const sourceReaders = readers.length > 0 ? readers : mockReaders;

    const totalItems = sourceZones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const activeZones = sourceZones.filter((z) => z.isActive && z.currentOccupancy > 0).length;
    const onlineReaders = sourceReaders.filter((r) => r.status === 'online').length;

    updateMetrics({
      totalItemsTracked: totalItems,
      activeZones,
      onlineReaders,
    });
  }, [zones, readers, updateMetrics]);

  // Start/stop simulation based on demo mode
  useEffect(() => {
    if (isDemoMode && !isRunning) {
      startSimulation();
    }
  }, [isDemoMode, isRunning, startSimulation]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) {
      // Clear all intervals
      if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
      if (occupancyIntervalRef.current) clearInterval(occupancyIntervalRef.current);
      if (readerIntervalRef.current) clearInterval(readerIntervalRef.current);
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
      return;
    }

    const speedMultiplier = 1 / simulationSpeed;

    // Item movements: every 3-5 seconds (adjusted by speed)
    movementIntervalRef.current = setInterval(
      () => {
        const movement = generateMovement();
        if (movement) {
          addMovement(movement);
        }
      },
      (3000 + Math.random() * 2000) * speedMultiplier
    );

    // Occupancy changes: every 5-8 seconds
    occupancyIntervalRef.current = setInterval(
      () => {
        simulateOccupancyChange();
      },
      (5000 + Math.random() * 3000) * speedMultiplier
    );

    // Reader status: every 20-30 seconds
    readerIntervalRef.current = setInterval(
      () => {
        simulateReaderChange();
      },
      (20000 + Math.random() * 10000) * speedMultiplier
    );

    // Random alerts: every 15-30 seconds
    alertIntervalRef.current = setInterval(
      () => {
        // Only 30% chance to generate an alert each interval
        if (Math.random() < 0.3) {
          generateRandomAlert();
        }
      },
      (15000 + Math.random() * 15000) * speedMultiplier
    );

    // Update metrics: every 2 seconds
    metricsIntervalRef.current = setInterval(() => {
      updateSimulationMetrics();
    }, 2000 * speedMultiplier);

    // Initial metrics update
    updateSimulationMetrics();

    // Cleanup
    return () => {
      if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
      if (occupancyIntervalRef.current) clearInterval(occupancyIntervalRef.current);
      if (readerIntervalRef.current) clearInterval(readerIntervalRef.current);
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    };
  }, [
    isRunning,
    simulationSpeed,
    generateMovement,
    addMovement,
    simulateOccupancyChange,
    simulateReaderChange,
    generateRandomAlert,
    updateSimulationMetrics,
  ]);

  // This component doesn't render anything visible
  return null;
}
