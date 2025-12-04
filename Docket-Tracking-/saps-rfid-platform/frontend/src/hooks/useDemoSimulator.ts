import { useEffect, useRef, useCallback, useState } from 'react';
import type { TagReadEvent, ItemMovedEvent } from '../services/websocket';

/**
 * Zone configuration matching the U-shaped warehouse layout
 */
const DEMO_ZONES = [
  { id: 'receiving', name: 'Receiving', weight: 15 },
  { id: 'shipping', name: 'Shipping', weight: 15 },
  { id: 'storage-a', name: 'Storage A', weight: 25 },
  { id: 'storage-b', name: 'Storage B', weight: 25 },
  { id: 'processing', name: 'Processing', weight: 8 },
  { id: 'staging', name: 'Staging', weight: 7 },
  { id: 'secure-storage', name: 'Secure Storage', weight: 3 },
  { id: 'returns', name: 'Returns', weight: 2 },
];

/**
 * Generate a random EPC code
 */
const generateEPC = (index: number): string => {
  const prefix = '3050614141';
  const serial = index.toString().padStart(8, '0');
  return `${prefix}${serial}`.substring(0, 24).toUpperCase();
};

/**
 * Get weighted random zone
 */
const getRandomZone = (): string => {
  const totalWeight = DEMO_ZONES.reduce((sum, z) => sum + z.weight, 0);
  let random = Math.random() * totalWeight;

  for (const zone of DEMO_ZONES) {
    random -= zone.weight;
    if (random <= 0) return zone.id;
  }
  return 'storage-a';
};

/**
 * Demo item structure
 */
interface DemoItem {
  epc: string;
  zone: string;
  lastMoved: number;
}

/**
 * Demo Simulator Handlers
 */
interface DemoSimulatorHandlers {
  onTagRead?: (event: TagReadEvent) => void;
  onItemMoved?: (event: ItemMovedEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Demo Simulator Options
 */
interface DemoSimulatorOptions {
  enabled?: boolean;
  itemCount?: number;
  readIntervalMs?: number;
  movementProbability?: number;
  itemsPerCycle?: number;
}

/**
 * Frontend Demo Simulator Hook
 *
 * Generates realistic RFID events for demos without requiring backend.
 * Perfect for presentations and offline development.
 *
 * Features:
 * - Simulates 250+ items across warehouse zones
 * - Realistic movement patterns
 * - Random RSSI values
 * - Item movements between zones
 *
 * @example
 * ```tsx
 * useDemoSimulator({
 *   onTagRead: (event) => console.log('Tag:', event.epc),
 *   onItemMoved: (event) => console.log('Moved:', event),
 * }, { enabled: true, itemCount: 100 });
 * ```
 */
export const useDemoSimulator = (
  handlers: DemoSimulatorHandlers,
  options: DemoSimulatorOptions = {}
) => {
  const {
    enabled = true,
    itemCount = 250,
    readIntervalMs = 1800,
    movementProbability = 0.15,
    itemsPerCycle = 12,
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const itemsRef = useRef<Map<string, DemoItem>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Initialize items
  useEffect(() => {
    if (!enabled) return;

    const items = new Map<string, DemoItem>();
    for (let i = 0; i < itemCount; i++) {
      const epc = generateEPC(i);
      items.set(epc, {
        epc,
        zone: getRandomZone(),
        lastMoved: Date.now() - Math.random() * 60000,
      });
    }
    itemsRef.current = items;

    console.log(`📦 Demo Simulator: Initialized ${itemCount} items`);
  }, [enabled, itemCount]);

  // Generate read cycle
  const generateReadCycle = useCallback(() => {
    const items = Array.from(itemsRef.current.values());
    if (items.length === 0) return;

    // Select random items for this cycle
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, Math.min(itemsPerCycle, items.length));

    for (const item of selectedItems) {
      const shouldMove = Math.random() < movementProbability;

      if (shouldMove) {
        const oldZone = item.zone;
        const newZone = getRandomZone();

        if (newZone !== oldZone) {
          item.zone = newZone;
          item.lastMoved = Date.now();

          // Emit item moved event
          const movedEvent: ItemMovedEvent = {
            epc: item.epc,
            fromZone: oldZone,
            toZone: newZone,
            timestamp: new Date().toISOString(),
          };
          handlersRef.current.onItemMoved?.(movedEvent);
        }
      }

      // Emit tag read event
      const tagEvent: TagReadEvent = {
        epc: item.epc,
        readerId: `reader-${item.zone}`,
        zoneId: item.zone,
        rssi: Math.round(-70 + Math.random() * 40),
        antennaPort: 1 + Math.floor(Math.random() * 4),
        signalQuality: Math.random() > 0.7 ? 'excellent' : Math.random() > 0.4 ? 'good' : 'fair',
        timestamp: new Date().toISOString(),
      };
      handlersRef.current.onTagRead?.(tagEvent);
    }
  }, [movementProbability, itemsPerCycle]);

  // Start/stop simulation
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      return;
    }

    // Notify connection
    handlersRef.current.onConnect?.();
    setIsRunning(true);

    console.log(`📦 Demo Simulator: Started (${readIntervalMs}ms interval)`);

    // Initial burst of reads
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => generateReadCycle(), i * 300);
      }
    }, 500);

    // Start interval
    intervalRef.current = setInterval(generateReadCycle, readIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      handlersRef.current.onDisconnect?.();
      setIsRunning(false);
      console.log('📦 Demo Simulator: Stopped');
    };
  }, [enabled, readIntervalMs, generateReadCycle]);

  // Trigger item arrival demo scenario
  const simulateItemArrival = useCallback((zoneId: string, count: number = 5) => {
    const items = Array.from(itemsRef.current.values())
      .filter(item => item.zone !== zoneId)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    for (const item of items) {
      const oldZone = item.zone;
      item.zone = zoneId;
      item.lastMoved = Date.now();

      const movedEvent: ItemMovedEvent = {
        epc: item.epc,
        fromZone: oldZone,
        toZone: zoneId,
        timestamp: new Date().toISOString(),
      };
      handlersRef.current.onItemMoved?.(movedEvent);

      const tagEvent: TagReadEvent = {
        epc: item.epc,
        readerId: `reader-${zoneId}`,
        zoneId: zoneId,
        rssi: Math.round(-40 + Math.random() * 15),
        antennaPort: 1,
        signalQuality: 'excellent',
        timestamp: new Date().toISOString(),
      };
      handlersRef.current.onTagRead?.(tagEvent);
    }

    console.log(`📦 Demo: ${count} items arrived at ${zoneId}`);
  }, []);

  return {
    isRunning,
    itemCount: itemsRef.current.size,
    simulateItemArrival,
  };
};

export default useDemoSimulator;
