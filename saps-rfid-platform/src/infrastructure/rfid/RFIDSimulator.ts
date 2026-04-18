import { injectable, inject } from 'tsyringe';

import { TagDetectedEvent } from '../../domain/events/TagDetectedEvent';

import type { IEventBus } from '../../application/interfaces/IEventBus';
import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * RFID Simulator Configuration
 */
export interface SimulatorConfig {
  /**
   * Number of simulated items to generate
   * @default 100
   */
  itemCount?: number;

  /**
   * Interval between tag read events in milliseconds
   * @default 3000 (3 seconds)
   */
  readIntervalMs?: number;

  /**
   * Probability of item movement between zones (0-1)
   * @default 0.3 (30% chance per read cycle)
   */
  movementProbability?: number;

  /**
   * Number of zones to distribute items across
   * @default 6
   */
  zoneCount?: number;

  /**
   * Simulated reader IDs
   */
  readerIds?: string[];

  /**
   * Auto-start simulation on construction
   * @default false
   */
  autoStart?: boolean;
}

/**
 * Simulated Item
 */
interface SimulatedItem {
  epc: string;
  currentZone: number;
  lastReadTime: number;
  itemType: 'box' | 'pallet' | 'asset';
  description: string;
}

/**
 * RFID Event Data
 */
export interface RFIDEventData {
  epc: string;
  readerId: string;
  zoneId: string;
  rssi: number;
  antennaPort: number;
  timestamp: Date;
}

/**
 * RFID Simulator - Generates realistic RFID events for demo/testing
 *
 * @description
 * Simulates RFID reader tag detection events without requiring physical hardware.
 * Useful for development, testing, and product demonstrations.
 *
 * **Features:**
 * - Generates realistic EPC codes (SGTIN-96 format)
 * - Simulates items moving between zones
 * - Realistic RSSI values and read patterns
 * - Configurable item count and read frequency
 * - Deterministic scenarios for demos
 *
 * **Use Cases:**
 * 1. **Development** - Test tag processing without hardware
 * 2. **Demos** - Show system capabilities with realistic data
 * 3. **Testing** - Stress test with high volumes
 * 4. **Training** - Teach operators without real inventory
 *
 * **Realistic Simulation:**
 * - EPC format: SGTIN-96 (GS1 standard)
 * - RSSI: -70dBm to -30dBm (realistic reader range)
 * - Read timing: Staggered to mimic real reader behavior
 * - Movement patterns: Items gradually move through zones
 *
 * @example
 * ```typescript
 * // Create simulator with 500 items
 * const simulator = new RFIDSimulator(logger, eventBus, {
 *   itemCount: 500,
 *   readIntervalMs: 2000,
 *   zoneCount: 8,
 *   movementProbability: 0.2,
 * });
 *
 * // Start simulation
 * simulator.start();
 *
 * // Trigger specific scenario
 * simulator.simulateItemArrival('ZONE-001', 10);
 *
 * // Stop simulation
 * simulator.stop();
 * ```
 */
@injectable()
export class RFIDSimulator {
  private items: Map<string, SimulatedItem>;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: Required<SimulatorConfig>;
  private eventCounter: number = 0;

  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('IEventBus') private eventBus: IEventBus,
    config?: SimulatorConfig
  ) {
    // Apply configuration with defaults
    this.config = {
      itemCount: config?.itemCount ?? 100,
      readIntervalMs: config?.readIntervalMs ?? 3000,
      movementProbability: config?.movementProbability ?? 0.3,
      zoneCount: config?.zoneCount ?? 6,
      readerIds: config?.readerIds ?? [
        'reader-001',
        'reader-002',
        'reader-003',
        'reader-004',
        'reader-005',
        'reader-006',
      ],
      autoStart: config?.autoStart ?? false,
    };

    this.items = new Map();
    this.generateItems();

    this.logger.info('RFID Simulator initialized', {
      itemCount: this.config.itemCount,
      zoneCount: this.config.zoneCount,
      readInterval: `${this.config.readIntervalMs}ms`,
    });

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Generate simulated inventory items
   *
   * @description
   * Creates realistic simulated items with:
   * - SGTIN-96 EPC codes (GS1 standard)
   * - Random initial zone placement
   * - Mix of item types (boxes, pallets, assets)
   * - Descriptive labels
   */
  private generateItems(): void {
    const categories = ['Electronics', 'Equipment', 'Supplies', 'Tools', 'Materials', 'Components'];

    for (let i = 0; i < this.config.itemCount; i++) {
      // Generate SGTIN-96 EPC
      const epc = this.generateEPC(i);

      // Random item type (weighted: 70% boxes, 20% assets, 10% pallets)
      const rand = Math.random();
      const itemType = rand < 0.7 ? 'box' : rand < 0.9 ? 'asset' : 'pallet';

      // Random initial zone
      const currentZone = Math.floor(Math.random() * this.config.zoneCount);

      // Random category
      const category = categories[Math.floor(Math.random() * categories.length)];

      const item: SimulatedItem = {
        epc,
        currentZone,
        lastReadTime: Date.now(),
        itemType,
        description: `${category} ${itemType.charAt(0).toUpperCase()}${itemType.slice(1)} #${i + 1}`,
      };

      this.items.set(epc, item);
    }

    this.logger.info('Generated simulated items', {
      total: this.items.size,
      byType: {
        boxes: Array.from(this.items.values()).filter((i) => i.itemType === 'box').length,
        pallets: Array.from(this.items.values()).filter((i) => i.itemType === 'pallet').length,
        assets: Array.from(this.items.values()).filter((i) => i.itemType === 'asset').length,
      },
    });
  }

  /**
   * Generate realistic SGTIN-96 EPC code
   *
   * @param serialNumber - Item serial number
   * @returns EPC hex string
   *
   * @description
   * SGTIN-96 format (96 bits):
   * - Header: 8 bits (0x30 for SGTIN-96)
   * - Filter: 3 bits (001 = POS item)
   * - Partition: 3 bits (100 = 7 digit company, 5 digit item)
   * - Company Prefix: 24-40 bits
   * - Item Reference: 20-24 bits
   * - Serial Number: 38 bits
   */
  private generateEPC(serialNumber: number): string {
    // Use a fixed company prefix for demo (GS1 Company Prefix: 0614141)
    const header = '30'; // SGTIN-96
    const filterPartition = '5'; // Filter 1 (001), Partition 4 (100)
    const companyPrefix = '0614141'; // 7 digits
    const itemReference = '12345'; // 5 digits (matches partition 4)
    const serial = serialNumber.toString().padStart(10, '0'); // 38 bits allows up to 274B

    // Convert to hex (simplified - real implementation would pack bits properly)
    const epcString = `${header}${filterPartition}${companyPrefix}${itemReference}${serial}`;

    // Pad to 24 hex characters (96 bits)
    return epcString.padEnd(24, '0').substring(0, 24).toUpperCase();
  }

  /**
   * Start simulation
   *
   * @description
   * Begins generating periodic RFID read events.
   * Events are emitted via the event bus for processing.
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Simulator already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting RFID simulation');

    this.intervalHandle = setInterval(() => {
      this.generateReadCycle();
    }, this.config.readIntervalMs);

    // Allow Node.js to exit
    this.intervalHandle.unref();

    // Emit initial reads immediately
    this.generateReadCycle();
  }

  /**
   * Stop simulation
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.logger.info('RFID simulation stopped', {
      totalEvents: this.eventCounter,
    });
  }

  /**
   * Generate a single read cycle
   *
   * @description
   * Simulates one read cycle where:
   * 1. Random subset of items are "read" by readers
   * 2. Some items may move to different zones
   * 3. Tag read events are emitted
   */
  private generateReadCycle(): void {
    const itemsArray = Array.from(this.items.values());

    // Read a random subset of items (20-40% per cycle)
    const readPercentage = 0.2 + Math.random() * 0.2;
    const itemsToRead = Math.floor(itemsArray.length * readPercentage);

    // Shuffle and select random items
    const shuffled = itemsArray.sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, itemsToRead);

    this.logger.debug('Generating read cycle', {
      totalItems: itemsArray.length,
      itemsToRead: selectedItems.length,
    });

    for (const item of selectedItems) {
      // Possibly move item to different zone
      if (Math.random() < this.config.movementProbability) {
        const oldZone = item.currentZone;
        item.currentZone = Math.floor(Math.random() * this.config.zoneCount);

        if (item.currentZone !== oldZone) {
          this.logger.debug('Item moved', {
            epc: item.epc,
            from: `zone-${oldZone}`,
            to: `zone-${item.currentZone}`,
          });
        }
      }

      // Generate tag read event
      this.emitTagRead(item);
      item.lastReadTime = Date.now();
    }
  }

  /**
   * Emit a simulated tag read event
   *
   * @param item - Item that was read
   *
   * @description
   * Generates realistic RFID read event with:
   * - RSSI between -70dBm and -30dBm
   * - Random antenna port (1-4)
   * - Accurate timestamp
   */
  private emitTagRead(item: SimulatedItem): void {
    // Select reader based on zone
    const readerIndex = item.currentZone % this.config.readerIds.length;
    const readerId = this.config.readerIds[readerIndex] ?? `reader-${readerIndex}`;
    const zoneId = `zone-${item.currentZone.toString().padStart(3, '0')}`;

    // Realistic RSSI (-70dBm to -30dBm, higher = closer)
    const rssi = Math.round(-70 + Math.random() * 40);

    // Random antenna port (1-4)
    const antennaPort = 1 + Math.floor(Math.random() * 4);

    const timestamp = new Date();

    // Create and publish proper domain event
    const event = new TagDetectedEvent(item.epc, readerId, zoneId, rssi, antennaPort, timestamp);

    // Emit via event bus
    this.eventBus.publish(event);

    this.eventCounter++;

    this.logger.debug('Tag read simulated', {
      epc: item.epc,
      zone: zoneId,
      reader: readerId,
      rssi,
    });
  }

  /**
   * Simulate item arrival scenario
   *
   * @param zoneId - Zone where items arrive
   * @param count - Number of items to simulate
   *
   * @description
   * Demo scenario: Simulate receiving shipment with multiple items
   * arriving at once in a specific zone.
   */
  simulateItemArrival(zoneId: string, count: number = 10): void {
    this.logger.info('Simulating item arrival', {
      zone: zoneId,
      count,
    });

    const zoneNumber = parseInt(zoneId.replace(/\D/g, ''), 10);
    const itemsArray = Array.from(this.items.values());

    // Select random items not in this zone
    const itemsToMove = itemsArray
      .filter((item) => item.currentZone !== zoneNumber)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    for (const item of itemsToMove) {
      item.currentZone = zoneNumber;
      this.emitTagRead(item);
      item.lastReadTime = Date.now();
    }

    this.logger.info('Item arrival simulated', {
      zone: zoneId,
      itemsArrived: itemsToMove.length,
    });
  }

  /**
   * Simulate item search scenario
   *
   * @param epc - EPC code to search for
   *
   * @description
   * Demo scenario: Trigger immediate read of specific item
   * to demonstrate search and locate functionality.
   */
  simulateItemSearch(epc: string): void {
    const item = this.items.get(epc);

    if (!item) {
      this.logger.warn('Item not found in simulator', { epc });
      return;
    }

    this.logger.info('Simulating item search', {
      epc,
      zone: `zone-${item.currentZone}`,
    });

    // Emit multiple reads to simulate "locate" operation
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emitTagRead(item);
      }, i * 500);
    }
  }

  /**
   * Get simulator statistics
   */
  getStats() {
    const itemsByZone: Record<number, number> = {};

    for (let i = 0; i < this.config.zoneCount; i++) {
      itemsByZone[i] = 0;
    }

    for (const item of this.items.values()) {
      itemsByZone[item.currentZone]++;
    }

    return {
      isRunning: this.isRunning,
      totalItems: this.items.size,
      eventsGenerated: this.eventCounter,
      itemsByZone,
      config: this.config,
    };
  }

  /**
   * Reset simulation
   *
   * @description
   * Stops simulation and regenerates all items with fresh data.
   */
  reset(): void {
    this.stop();
    this.items.clear();
    this.eventCounter = 0;
    this.generateItems();

    this.logger.info('Simulator reset complete');
  }

  /**
   * Dispose of simulator resources
   */
  dispose(): void {
    this.stop();
    this.items.clear();
    this.logger.info('RFID Simulator disposed');
  }
}
