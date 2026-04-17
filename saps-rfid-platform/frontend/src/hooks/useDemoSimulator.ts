import { useEffect, useRef, useCallback, useState } from 'react';
import type { TagReadEvent, ItemMovedEvent } from '../services/websocket';

/**
 * Zone configuration matching SAPS Forensic Laboratory workflow
 */
const DEMO_ZONES = [
  { id: 'entry', name: 'Entry into Lab', weight: 10 },
  { id: 'extractions', name: 'Extractions - Sgt Pillay', weight: 20 },
  { id: 'qpcr-lab', name: 'QPCR Lab - Sgt Mulder', weight: 20 },
  { id: 'pcr-lab', name: 'PCR Lab - WO Jacobs', weight: 18 },
  { id: 'electrophoresis', name: 'Electrophoresis Lab', weight: 15 },
  { id: 'genemapper', name: 'GeneMapper ID - WO Daniels', weight: 12 },
  { id: 'chain-custody', name: 'Confirm Chain of Custody', weight: 5 },
];

/**
 * 4 Hero Demo Items - Always available for demo presentations
 * These items have fixed zones and are easily searchable
 */
export const HERO_DEMO_ITEMS = [
  {
    epc: 'LAB-0001',
    zone: 'entry',
    caseNumber: 'CAS-2024-001847',
    description: 'Murder Investigation - Sandton',
    officer: 'Det. van der Berg',
    priority: 'critical' as const,
  },
  {
    epc: 'LAB-0002',
    zone: 'extractions',
    caseNumber: 'CAS-2024-001923',
    description: 'Robbery - Johannesburg CBD',
    officer: 'Sgt Pillay',
    priority: 'high' as const,
  },
  {
    epc: 'LAB-0003',
    zone: 'pcr-lab',
    caseNumber: 'CAS-2024-002156',
    description: 'Sexual Assault - Pretoria',
    officer: 'WO Jacobs',
    priority: 'critical' as const,
  },
  {
    epc: 'LAB-0004',
    zone: 'chain-custody',
    caseNumber: 'CAS-2024-001654',
    description: 'Burglary - Centurion',
    officer: 'Evidence Officer',
    priority: 'medium' as const,
  },
];

/**
 * Generate EPC code
 * All items use LAB-XXXX format for consistency
 */
const generateEPC = (index: number): string => {
  // All items use LAB-XXXX format for SAPS Forensics demo
  return `LAB-${String(index + 1).padStart(4, '0')}`;
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
  return 'entry';
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

    // First, add the 4 hero demo items with fixed zones
    for (const hero of HERO_DEMO_ITEMS) {
      items.set(hero.epc, {
        epc: hero.epc,
        zone: hero.zone,
        lastMoved: Date.now() - Math.random() * 3600000, // Within last hour
      });
    }

    // Then add remaining items with random zones
    for (let i = HERO_DEMO_ITEMS.length; i < itemCount; i++) {
      const epc = generateEPC(i);
      items.set(epc, {
        epc,
        zone: getRandomZone(),
        lastMoved: Date.now() - Math.random() * 60000,
      });
    }
    itemsRef.current = items;

    console.log(`📦 Demo Simulator: Initialized ${itemCount} items (including ${HERO_DEMO_ITEMS.length} hero items)`);
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
