import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useWebSocket } from '../../services/websocket';
import type { TagReadEvent, ItemMovedEvent } from '../../services/websocket';
import { useVirtualizedAppStore } from '../../stores/virtualizedAppStore';
import type { VirtualizedItem, ZoneAggregate } from '../../stores/virtualizedAppStore';

/**
 * Virtualized Data Bridge (Phase 3.1 Integration)
 *
 * Connects WebSocket RFID events to the virtualized app store:
 * - Receives real-time tag readings from WebSocket
 * - Transforms events into virtualized items
 * - Updates zone aggregates
 * - Manages LOD based on camera distance
 * - Syncs with 3D scene state
 *
 * This component doesn't render anything visual - it's purely
 * for data flow management between the backend and the 3D scene.
 *
 * Reference: StartHere.md Phase 3.1
 */

// ============================================================================
// Constants
// ============================================================================

const ZONE_POSITIONS: Record<string, [number, number, number]> = {
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


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate LOD level based on camera distance
 */
const calculateLOD = (
  itemPosition: [number, number, number],
  cameraPosition: [number, number, number],
  lodDistances: { detailed: number; individual: number; cluster: number; aggregate: number }
): VirtualizedItem['lodLevel'] => {
  const dx = itemPosition[0] - cameraPosition[0];
  const dy = itemPosition[1] - cameraPosition[1];
  const dz = itemPosition[2] - cameraPosition[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance <= lodDistances.detailed) return 'detailed';
  if (distance <= lodDistances.individual) return 'individual';
  if (distance <= lodDistances.cluster) return 'cluster';
  return 'aggregate';
};

/**
 * Generate random position within a zone
 */
const getRandomPositionInZone = (zoneId: string): [number, number, number] => {
  const basePos = ZONE_POSITIONS[zoneId] || ZONE_POSITIONS['storage-a'];
  return [
    basePos[0] + (Math.random() - 0.5) * 20,
    basePos[1] + Math.random() * 0.5,
    basePos[2] + (Math.random() - 0.5) * 20,
  ];
};

// ============================================================================
// Main Component
// ============================================================================

const VirtualizedDataBridge = () => {
  const { camera } = useThree();

  // Extract store actions individually for stable references
  const addVisibleItems = useVirtualizedAppStore((s) => s.addVisibleItems);
  const updateZoneAggregates = useVirtualizedAppStore((s) => s.updateZoneAggregates);
  const setCameraPosition = useVirtualizedAppStore((s) => s.setCameraPosition);
  const updatePerformance = useVirtualizedAppStore((s) => s.updatePerformance);
  // Use useShallow for objects/Maps to prevent new references
  const virtualWindow = useVirtualizedAppStore(useShallow((s) => s.virtualWindow));
  const zones = useVirtualizedAppStore((s) => s.zones);
  const trackedItems = useVirtualizedAppStore((s) => s.trackedItems);

  // Use refs for store actions to avoid re-renders in effects
  const setCameraPositionRef = useRef(setCameraPosition);
  const updatePerformanceRef = useRef(updatePerformance);
  setCameraPositionRef.current = setCameraPosition;
  updatePerformanceRef.current = updatePerformance;

  // Item tracking for aggregation
  const itemsPerZone = useRef<Map<string, Set<string>>>(new Map());
  const lastCameraUpdate = useRef<number>(0);

  // Calculate zone aggregates from items
  const updateZoneStats = useCallback(() => {
    const zoneUpdates: Partial<ZoneAggregate>[] = [];

    itemsPerZone.current.forEach((items, zoneId) => {
      const existing = zones.get(zoneId);
      if (existing) {
        zoneUpdates.push({
          id: zoneId,
          itemCount: items.size,
          utilizationPercent: Math.round((items.size / existing.capacity) * 100),
          lastActivity: Date.now(),
        } as Partial<ZoneAggregate>);
      }
    });

    if (zoneUpdates.length > 0) {
      updateZoneAggregates(zoneUpdates as ZoneAggregate[]);
    }
  }, [zones, updateZoneAggregates]);

  // Handle incoming tag read events
  const handleTagRead = useCallback(
    (event: TagReadEvent) => {
      const cameraPos: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];

      const position = getRandomPositionInZone(event.zoneId);
      const lodLevel = calculateLOD(position, cameraPos, virtualWindow.lodDistances);

      // Check if item should be visible based on LOD and distance
      const isVisible = lodLevel !== 'aggregate' || trackedItems.has(event.epc);

      const item: VirtualizedItem = {
        id: event.epc,
        epc: event.epc,
        zoneId: event.zoneId,
        position,
        lastSeen: Date.now(),
        rssi: event.rssi,
        isTracked: trackedItems.has(event.epc),
        isVisible,
        lodLevel,
      };

      // Update zone tracking
      if (!itemsPerZone.current.has(event.zoneId)) {
        itemsPerZone.current.set(event.zoneId, new Set());
      }
      itemsPerZone.current.get(event.zoneId)!.add(event.epc);

      // Add to visible items if visible
      if (isVisible) {
        addVisibleItems([item]);
      }

      // Periodically update zone stats
      const now = Date.now();
      if (now - lastCameraUpdate.current > 1000) {
        updateZoneStats();
        lastCameraUpdate.current = now;
      }
    },
    [camera, virtualWindow.lodDistances, trackedItems, addVisibleItems, updateZoneStats]
  );

  // Handle item moved events
  const handleItemMoved = useCallback(
    (event: ItemMovedEvent) => {
      // Get zone IDs (support both legacy and Phase 4.1 formats)
      const fromZone = event.fromZone ?? (event.fromZoneId ? String(event.fromZoneId) : undefined);
      const toZone = event.toZone ?? (event.toZoneId ? String(event.toZoneId) : undefined);
      const epc = event.epc;

      if (!toZone || !epc) return;

      // Update zone tracking
      itemsPerZone.current.forEach((items, zoneId) => {
        if (zoneId === fromZone) {
          items.delete(epc);
        }
      });

      if (!itemsPerZone.current.has(toZone)) {
        itemsPerZone.current.set(toZone, new Set());
      }
      itemsPerZone.current.get(toZone)!.add(epc);

      // Create updated item
      const cameraPos: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];

      const position = getRandomPositionInZone(toZone);
      const lodLevel = calculateLOD(position, cameraPos, virtualWindow.lodDistances);

      const item: VirtualizedItem = {
        id: epc,
        epc: epc,
        zoneId: toZone,
        position,
        lastSeen: Date.now(),
        rssi: -50, // Default RSSI for moved items
        isTracked: trackedItems.has(epc),
        isVisible: true,
        lodLevel,
      };

      // Update visible items
      addVisibleItems([item]);
      updateZoneStats();
    },
    [camera, virtualWindow.lodDistances, trackedItems, addVisibleItems, updateZoneStats]
  );

  // WebSocket connection
  useWebSocket({
    onTagRead: handleTagRead,
    onItemMoved: handleItemMoved,
    onConnect: () => {
      console.log('🔌 VirtualizedDataBridge: Connected to WebSocket');
    },
    onDisconnect: () => {
      console.log('🔌 VirtualizedDataBridge: Disconnected from WebSocket');
    },
  });

  // Update camera position in store for LOD calculations
  useEffect(() => {
    const updateCamera = () => {
      const pos: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];

      // Get camera target (look-at point)
      const target = new THREE.Vector3();
      camera.getWorldDirection(target);
      target.multiplyScalar(10).add(camera.position);

      // Use ref to avoid dependency on setCameraPosition
      setCameraPositionRef.current(pos, [target.x, target.y, target.z]);
    };

    const interval = setInterval(updateCamera, 100);
    return () => clearInterval(interval);
  }, [camera]); // Only depend on camera, not setCameraPosition

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        // Use ref to avoid dependency on updatePerformance
        updatePerformanceRef.current({ fps });
        frameCount = 0;
        lastTime = now;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationId);
  }, []); // Empty deps - run once

  // This component doesn't render anything
  return null;
};

export default VirtualizedDataBridge;
