import {
  ZoneAssignmentService,
  ZoneAssignmentDecision,
} from '@domain/services/ZoneAssignmentService';
import { TagRead } from '@domain/value-objects/TagRead';
import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { IpAddress } from '@domain/value-objects/IpAddress';
import { Reader, ReaderConfiguration } from '@domain/entities/Reader';
import { Zone, ZoneType } from '@domain/entities/Zone';

describe('ZoneAssignmentService', () => {
  let service: ZoneAssignmentService;

  // Helper to create a mock TagRead
  const createMockTagRead = (params: {
    rssi: number;
    antennaPort?: number;
    readerId: string;
    timestamp?: Date;
    readCount?: number;
  }): TagRead => {
    const epc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
    return TagRead.create({
      epc,
      rssi: params.rssi,
      antennaPort: params.antennaPort ?? 1,
      readerId: params.readerId,
      timestamp: params.timestamp ?? new Date(),
      readCount: params.readCount ?? 1,
    })._unsafeUnwrap();
  };

  // Helper to create a mock Reader
  const createMockReader = (id: string, zoneId: string): Reader => {
    const ipAddress = IpAddress.create('192.168.1.100')._unsafeUnwrap();
    const config: ReaderConfiguration = {
      transmitPower: 25,
      antennas: [1, 2, 3, 4],
      readInterval: 500,
      rssiThreshold: -70,
      session: 2,
      modeIndex: 0,
    };

    return Reader.create({
      id,
      name: `Reader ${id}`,
      ipAddress,
      port: 5084,
      zoneId,
      antennaCount: 4,
      configuration: config,
    })._unsafeUnwrap();
  };

  // Helper to create a mock Zone
  const createMockZone = (id: string, options?: { parentZoneId?: string | null }): Zone => {
    return Zone.create({
      id,
      name: `Zone ${id}`,
      code: id.toUpperCase().replace(/-/g, '_'),
      zoneType: ZoneType.STORAGE,
      capacity: 100,
      parentZoneId: options?.parentZoneId,
    })._unsafeUnwrap();
  };

  beforeEach(() => {
    service = new ZoneAssignmentService();
  });

  describe('determineZoneFromSingleRead', () => {
    it('should assign zone based on reader zone', () => {
      const tagRead = createMockTagRead({ rssi: -50, readerId: 'reader-001' });
      const reader = createMockReader('reader-001', 'zone-a');

      const result = service.determineZoneFromSingleRead(tagRead, reader, null);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decision = result.value;
        expect(decision.zoneId).toBe('zone-a');
        expect(decision.readerId).toBe('reader-001');
      }
    });

    it('should calculate confidence based on tag read quality', () => {
      const strongRead = createMockTagRead({ rssi: -35, readerId: 'reader-001', readCount: 5 });
      const reader = createMockReader('reader-001', 'zone-a');

      const result = service.determineZoneFromSingleRead(strongRead, reader, null);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should detect zone change when current zone differs from reader zone', () => {
      const tagRead = createMockTagRead({ rssi: -50, readerId: 'reader-001' });
      const reader = createMockReader('reader-001', 'zone-b');

      const result = service.determineZoneFromSingleRead(tagRead, reader, 'zone-a');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decision = result.value;
        expect(decision.isZoneChange).toBe(true);
        expect(decision.previousZoneId).toBe('zone-a');
        expect(decision.zoneId).toBe('zone-b');
      }
    });

    it('should not detect zone change when current zone equals reader zone', () => {
      const tagRead = createMockTagRead({ rssi: -50, readerId: 'reader-001' });
      const reader = createMockReader('reader-001', 'zone-a');

      const result = service.determineZoneFromSingleRead(tagRead, reader, 'zone-a');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decision = result.value;
        expect(decision.isZoneChange).toBe(false);
        expect(decision.previousZoneId).toBe('zone-a');
        expect(decision.zoneId).toBe('zone-a');
      }
    });

    it('should not detect zone change when current zone is null', () => {
      const tagRead = createMockTagRead({ rssi: -50, readerId: 'reader-001' });
      const reader = createMockReader('reader-001', 'zone-a');

      const result = service.determineZoneFromSingleRead(tagRead, reader, null);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isZoneChange).toBe(false);
        expect(result.value.previousZoneId).toBeNull();
      }
    });

    it('should include reader ID in decision', () => {
      const tagRead = createMockTagRead({ rssi: -50, readerId: 'reader-specific' });
      const reader = createMockReader('reader-specific', 'zone-a');

      const result = service.determineZoneFromSingleRead(tagRead, reader, null);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.readerId).toBe('reader-specific');
      }
    });
  });

  describe('determineZoneFromMultipleReads', () => {
    describe('validation', () => {
      it('should return error for empty tag reads array', () => {
        const readers = new Map<string, Reader>();

        const result = service.determineZoneFromMultipleReads([], readers, null);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('No tag reads provided');
        }
      });

      it('should return error when no valid zones found (all readers unknown)', () => {
        const tagReads = [createMockTagRead({ rssi: -50, readerId: 'unknown-reader' })];
        const readers = new Map<string, Reader>(); // Empty map

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('No valid zones found');
        }
      });
    });

    describe('zone selection', () => {
      it('should select zone with highest confidence based on read quality', () => {
        // Create readers for different zones
        const readerA = createMockReader('reader-a', 'zone-a');
        const readerB1 = createMockReader('reader-b1', 'zone-b');
        const readerB2 = createMockReader('reader-b2', 'zone-b');

        const readers = new Map<string, Reader>();
        readers.set('reader-a', readerA);
        readers.set('reader-b1', readerB1);
        readers.set('reader-b2', readerB2);

        // Use old timestamps to prevent hitting max confidence
        const oldTimestamp = new Date(Date.now() - 60000);

        // Zone-a: single weak, old read
        // Zone-b: multiple consistent, less old reads with antenna diversity
        const recentTimestamp = new Date(Date.now() - 5000);
        const tagReads = [
          createMockTagRead({
            rssi: -85,
            readerId: 'reader-a',
            antennaPort: 1,
            timestamp: oldTimestamp,
          }),
          createMockTagRead({
            rssi: -45,
            readerId: 'reader-b1',
            antennaPort: 1,
            timestamp: recentTimestamp,
          }),
          createMockTagRead({
            rssi: -46,
            readerId: 'reader-b1',
            antennaPort: 2,
            timestamp: recentTimestamp,
          }),
          createMockTagRead({
            rssi: -44,
            readerId: 'reader-b2',
            antennaPort: 3,
            timestamp: recentTimestamp,
          }),
          createMockTagRead({
            rssi: -47,
            readerId: 'reader-b2',
            antennaPort: 4,
            timestamp: recentTimestamp,
          }),
        ];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Zone-b should win due to better reads
          expect(result.value.zoneId).toBe('zone-b');
        }
      });

      it('should consider multiple reads in same zone', () => {
        const reader1 = createMockReader('reader-001', 'zone-a');
        const reader2 = createMockReader('reader-002', 'zone-a');
        const reader3 = createMockReader('reader-003', 'zone-b');

        const readers = new Map<string, Reader>();
        readers.set('reader-001', reader1);
        readers.set('reader-002', reader2);
        readers.set('reader-003', reader3);

        // Multiple reads in zone-a with moderate signal
        const tagReads = [
          createMockTagRead({ rssi: -50, readerId: 'reader-001', antennaPort: 1 }),
          createMockTagRead({ rssi: -52, readerId: 'reader-001', antennaPort: 2 }),
          createMockTagRead({ rssi: -48, readerId: 'reader-002', antennaPort: 3 }),
          createMockTagRead({ rssi: -55, readerId: 'reader-003', antennaPort: 4 }),
        ];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Zone-a should win with 3 reads vs zone-b with 1 read
          expect(result.value.zoneId).toBe('zone-a');
        }
      });

      it('should skip tag reads with unknown readers', () => {
        const reader = createMockReader('reader-001', 'zone-a');

        const readers = new Map<string, Reader>();
        readers.set('reader-001', reader);

        const tagReads = [
          createMockTagRead({ rssi: -50, readerId: 'reader-001' }),
          createMockTagRead({ rssi: -35, readerId: 'unknown-reader' }), // Should be skipped
        ];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.zoneId).toBe('zone-a');
        }
      });
    });

    describe('minimum confidence threshold', () => {
      it('should accept assignment above minimum confidence', () => {
        const reader = createMockReader('reader-001', 'zone-a');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        const tagReads = [createMockTagRead({ rssi: -45, readerId: 'reader-001', readCount: 3 })];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null, 0.5);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.confidence).toBeGreaterThanOrEqual(0.5);
        }
      });

      it('should keep current zone when confidence is below threshold and current zone exists', () => {
        const reader = createMockReader('reader-001', 'zone-new');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        // Poor quality reads - old timestamp and weak signal
        const oldTimestamp = new Date(Date.now() - 120000);
        const tagReads = [
          createMockTagRead({ rssi: -95, readerId: 'reader-001', timestamp: oldTimestamp }),
        ];

        const result = service.determineZoneFromMultipleReads(
          tagReads,
          readers,
          'zone-current',
          0.99
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Should keep current zone due to low confidence
          expect(result.value.zoneId).toBe('zone-current');
          expect(result.value.isZoneChange).toBe(false);
        }
      });

      it('should return error when confidence below threshold and no current zone', () => {
        const reader = createMockReader('reader-001', 'zone-a');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        // Very poor quality reads
        const oldTimestamp = new Date(Date.now() - 300000);
        const tagReads = [
          createMockTagRead({ rssi: -99, readerId: 'reader-001', timestamp: oldTimestamp }),
        ];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null, 0.99);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Unable to determine zone with sufficient confidence'
          );
        }
      });

      it('should use custom minimum confidence threshold', () => {
        const reader = createMockReader('reader-001', 'zone-a');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        // Moderate quality read
        const oldTimestamp = new Date(Date.now() - 60000);
        const tagReads = [
          createMockTagRead({ rssi: -70, readerId: 'reader-001', timestamp: oldTimestamp }),
        ];

        // With very high threshold - should keep current zone
        const highThresholdResult = service.determineZoneFromMultipleReads(
          tagReads,
          readers,
          'zone-current',
          0.99
        );

        // With low threshold - should assign new zone
        const lowThresholdResult = service.determineZoneFromMultipleReads(
          tagReads,
          readers,
          'zone-current',
          0.1
        );

        expect(highThresholdResult.isOk()).toBe(true);
        expect(lowThresholdResult.isOk()).toBe(true);

        if (highThresholdResult.isOk()) {
          expect(highThresholdResult.value.zoneId).toBe('zone-current');
        }
        if (lowThresholdResult.isOk()) {
          expect(lowThresholdResult.value.zoneId).toBe('zone-a');
        }
      });
    });

    describe('zone change detection', () => {
      it('should detect zone change when best zone differs from current', () => {
        const reader = createMockReader('reader-001', 'zone-new');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        const tagReads = [createMockTagRead({ rssi: -40, readerId: 'reader-001', readCount: 5 })];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, 'zone-old');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isZoneChange).toBe(true);
          expect(result.value.previousZoneId).toBe('zone-old');
          expect(result.value.zoneId).toBe('zone-new');
        }
      });

      it('should not detect zone change when best zone equals current', () => {
        const reader = createMockReader('reader-001', 'zone-a');
        const readers = new Map<string, Reader>([['reader-001', reader]]);

        const tagReads = [createMockTagRead({ rssi: -40, readerId: 'reader-001', readCount: 5 })];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, 'zone-a');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isZoneChange).toBe(false);
          expect(result.value.previousZoneId).toBe('zone-a');
        }
      });
    });

    describe('reader selection for zone', () => {
      it('should use reader with strongest signal for zone assignment', () => {
        const reader1 = createMockReader('reader-weak', 'zone-a');
        const reader2 = createMockReader('reader-strong', 'zone-a');

        const readers = new Map<string, Reader>([
          ['reader-weak', reader1],
          ['reader-strong', reader2],
        ]);

        const tagReads = [
          createMockTagRead({ rssi: -70, readerId: 'reader-weak' }),
          createMockTagRead({ rssi: -35, readerId: 'reader-strong' }),
        ];

        const result = service.determineZoneFromMultipleReads(tagReads, readers, null);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.readerId).toBe('reader-strong');
        }
      });
    });
  });

  describe('isValidTransition', () => {
    it('should return true when not a zone change', () => {
      const decision: ZoneAssignmentDecision = {
        zoneId: 'zone-a',
        confidence: 0.5,
        readerId: 'reader-001',
        isZoneChange: false,
        previousZoneId: 'zone-a',
      };

      const zones = new Map<string, Zone>();

      const result = service.isValidTransition(decision, zones);

      expect(result).toBe(true);
    });

    it('should return false when confidence is below 0.5', () => {
      const decision: ZoneAssignmentDecision = {
        zoneId: 'zone-b',
        confidence: 0.4,
        readerId: 'reader-001',
        isZoneChange: true,
        previousZoneId: 'zone-a',
      };

      const zones = new Map<string, Zone>();

      const result = service.isValidTransition(decision, zones);

      expect(result).toBe(false);
    });

    it('should return false when destination zone does not exist', () => {
      const decision: ZoneAssignmentDecision = {
        zoneId: 'non-existent-zone',
        confidence: 0.9,
        readerId: 'reader-001',
        isZoneChange: true,
        previousZoneId: 'zone-a',
      };

      const zones = new Map<string, Zone>();

      const result = service.isValidTransition(decision, zones);

      expect(result).toBe(false);
    });

    describe('adjacent zones', () => {
      it('should accept lower confidence (0.5+) for sibling zones (same parent)', () => {
        const zoneA = createMockZone('zone-a', { parentZoneId: 'parent-zone' });
        const zoneB = createMockZone('zone-b', { parentZoneId: 'parent-zone' });

        const zones = new Map<string, Zone>([
          ['zone-a', zoneA],
          ['zone-b', zoneB],
        ]);

        const decision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.55,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a',
        };

        const result = service.isValidTransition(decision, zones);

        expect(result).toBe(true);
      });

      it('should accept lower confidence (0.5+) for parent-child zones', () => {
        const parentZone = createMockZone('parent-zone', { parentZoneId: null });
        const childZone = createMockZone('child-zone', { parentZoneId: 'parent-zone' });

        const zones = new Map<string, Zone>([
          ['parent-zone', parentZone],
          ['child-zone', childZone],
        ]);

        const decisionToChild: ZoneAssignmentDecision = {
          zoneId: 'child-zone',
          confidence: 0.55,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'parent-zone',
        };

        const decisionToParent: ZoneAssignmentDecision = {
          zoneId: 'parent-zone',
          confidence: 0.55,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'child-zone',
        };

        expect(service.isValidTransition(decisionToChild, zones)).toBe(true);
        expect(service.isValidTransition(decisionToParent, zones)).toBe(true);
      });
    });

    describe('non-adjacent zones', () => {
      it('should require higher confidence (0.8+) for non-adjacent zones', () => {
        // Two zones with no parent relationship
        const zoneA = createMockZone('zone-a', { parentZoneId: null });
        const zoneB = createMockZone('zone-b', { parentZoneId: null });

        const zones = new Map<string, Zone>([
          ['zone-a', zoneA],
          ['zone-b', zoneB],
        ]);

        const lowConfidenceDecision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.75,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a',
        };

        const highConfidenceDecision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.85,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a',
        };

        expect(service.isValidTransition(lowConfidenceDecision, zones)).toBe(false);
        expect(service.isValidTransition(highConfidenceDecision, zones)).toBe(true);
      });

      it('should require high confidence for zones with different parents', () => {
        const zoneA = createMockZone('zone-a', { parentZoneId: 'parent-1' });
        const zoneB = createMockZone('zone-b', { parentZoneId: 'parent-2' });

        const zones = new Map<string, Zone>([
          ['zone-a', zoneA],
          ['zone-b', zoneB],
        ]);

        const decision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.75,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a',
        };

        expect(service.isValidTransition(decision, zones)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle null previous zone (first assignment)', () => {
        const zone = createMockZone('zone-a');
        const zones = new Map<string, Zone>([['zone-a', zone]]);

        const decision: ZoneAssignmentDecision = {
          zoneId: 'zone-a',
          confidence: 0.6,
          readerId: 'reader-001',
          isZoneChange: false,
          previousZoneId: null,
        };

        expect(service.isValidTransition(decision, zones)).toBe(true);
      });

      it('should handle missing from zone in zones map', () => {
        const zoneB = createMockZone('zone-b');
        const zones = new Map<string, Zone>([['zone-b', zoneB]]);
        // zone-a not in map

        const decision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.9,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a', // Not in zones map
        };

        // Should still work - destination exists, from zone not found is treated as non-adjacent
        expect(service.isValidTransition(decision, zones)).toBe(true);
      });

      it('should handle zones with null parent (root zones)', () => {
        const zoneA = createMockZone('zone-a', { parentZoneId: null });
        const zoneB = createMockZone('zone-b', { parentZoneId: null });

        const zones = new Map<string, Zone>([
          ['zone-a', zoneA],
          ['zone-b', zoneB],
        ]);

        // Two root zones are NOT considered adjacent (null !== null check returns false)
        const decision: ZoneAssignmentDecision = {
          zoneId: 'zone-b',
          confidence: 0.6,
          readerId: 'reader-001',
          isZoneChange: true,
          previousZoneId: 'zone-a',
        };

        // Should require high confidence (non-adjacent)
        expect(service.isValidTransition(decision, zones)).toBe(false);
      });
    });
  });

  describe('shouldMarkAsLeft', () => {
    it('should return true when age exceeds threshold', () => {
      expect(service.shouldMarkAsLeft(15000, 10000)).toBe(true);
      expect(service.shouldMarkAsLeft(11000, 10000)).toBe(true);
    });

    it('should return false when age is within threshold', () => {
      expect(service.shouldMarkAsLeft(5000, 10000)).toBe(false);
      expect(service.shouldMarkAsLeft(9999, 10000)).toBe(false);
    });

    it('should return false when age equals threshold', () => {
      expect(service.shouldMarkAsLeft(10000, 10000)).toBe(false);
    });

    it('should use default threshold of 10000ms', () => {
      expect(service.shouldMarkAsLeft(15000)).toBe(true);
      expect(service.shouldMarkAsLeft(5000)).toBe(false);
    });

    it('should handle zero age', () => {
      expect(service.shouldMarkAsLeft(0, 10000)).toBe(false);
    });

    it('should handle custom thresholds', () => {
      // Short threshold (1 second)
      expect(service.shouldMarkAsLeft(1500, 1000)).toBe(true);
      expect(service.shouldMarkAsLeft(500, 1000)).toBe(false);

      // Long threshold (1 minute)
      expect(service.shouldMarkAsLeft(90000, 60000)).toBe(true);
      expect(service.shouldMarkAsLeft(30000, 60000)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical zone transition workflow', () => {
      // Setup readers in two zones
      const reader1 = createMockReader('reader-zone-a', 'zone-a');
      const reader2 = createMockReader('reader-zone-b', 'zone-b');
      const readers = new Map<string, Reader>([
        ['reader-zone-a', reader1],
        ['reader-zone-b', reader2],
      ]);

      // Setup zones
      const zoneA = createMockZone('zone-a', { parentZoneId: 'building-1' });
      const zoneB = createMockZone('zone-b', { parentZoneId: 'building-1' });
      const zones = new Map<string, Zone>([
        ['zone-a', zoneA],
        ['zone-b', zoneB],
      ]);

      // Step 1: Item detected in zone-a
      const initialReads = [
        createMockTagRead({ rssi: -45, readerId: 'reader-zone-a', readCount: 3 }),
      ];

      const initialResult = service.determineZoneFromMultipleReads(initialReads, readers, null);
      expect(initialResult.isOk()).toBe(true);
      if (initialResult.isOk()) {
        expect(initialResult.value.zoneId).toBe('zone-a');
        expect(initialResult.value.isZoneChange).toBe(false);
      }

      // Step 2: Item moves to zone-b
      // Zone-b has strong recent reads, zone-a has weak old reads
      const oldTimestamp = new Date(Date.now() - 60000);
      const moveReads = [
        createMockTagRead({ rssi: -90, readerId: 'reader-zone-a', timestamp: oldTimestamp }),
        createMockTagRead({ rssi: -35, readerId: 'reader-zone-b' }),
        createMockTagRead({ rssi: -36, readerId: 'reader-zone-b', antennaPort: 2 }),
      ];

      const moveResult = service.determineZoneFromMultipleReads(moveReads, readers, 'zone-a');
      expect(moveResult.isOk()).toBe(true);
      if (moveResult.isOk()) {
        expect(moveResult.value.zoneId).toBe('zone-b');
        expect(moveResult.value.isZoneChange).toBe(true);

        // Validate transition
        const isValid = service.isValidTransition(moveResult.value, zones);
        expect(isValid).toBe(true); // Adjacent zones (same parent)
      }
    });

    it('should handle boundary detection with similar signal strengths', () => {
      // Two readers at zone boundary
      const reader1 = createMockReader('reader-1', 'zone-a');
      const reader2 = createMockReader('reader-2', 'zone-b');
      const readers = new Map<string, Reader>([
        ['reader-1', reader1],
        ['reader-2', reader2],
      ]);

      // Similar signal strength from both zones (boundary condition)
      const boundaryReads = [
        createMockTagRead({ rssi: -55, readerId: 'reader-1', antennaPort: 1 }),
        createMockTagRead({ rssi: -54, readerId: 'reader-2', antennaPort: 1 }),
        createMockTagRead({ rssi: -56, readerId: 'reader-1', antennaPort: 2 }),
        createMockTagRead({ rssi: -53, readerId: 'reader-2', antennaPort: 2 }),
      ];

      const result = service.determineZoneFromMultipleReads(boundaryReads, readers, 'zone-a');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // At boundary with similar signals, either zone is acceptable
        expect(['zone-a', 'zone-b']).toContain(result.value.zoneId);
        expect(result.value.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should handle loss of signal (item left zone)', () => {
      // Simulate time passing with no reads
      const lastReadAgeMs = 15000; // 15 seconds since last read

      const shouldLeave = service.shouldMarkAsLeft(lastReadAgeMs, 10000);
      expect(shouldLeave).toBe(true);
    });
  });
});
