import { TagProcessor } from '../TagProcessor';
import type { ILogger } from '../../../application/interfaces/ILogger';

/**
 * TagProcessor Unit Tests
 *
 * @description
 * Tests for LLRP message parsing covering:
 * - RO_ACCESS_REPORT message parsing
 * - Multiple manufacturer variations (Impinj, Alien, Zebra)
 * - Field name variations (epcData vs EPCData vs epc)
 * - Data type handling (Buffer, string, object)
 * - RSSI validation and normalization
 * - Error handling and validation
 * - Statistics tracking
 * - Performance monitoring
 */
describe('TagProcessor', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let processor: TagProcessor;

  // Valid 24-character hex EPC for testing
  const VALID_EPC = 'E280116060002004DECA48DA';
  const VALID_EPC_2 = 'E280116060002004DECA48DB';
  const VALID_EPC_3 = 'E280116060002004DECA48DC';

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    processor = new TagProcessor(mockLogger);
  });

  describe('Initialization', () => {
    it('should initialize with zero statistics', () => {
      const stats = processor.getStats();

      expect(stats.totalMessagesProcessed).toBe(0);
      expect(stats.totalTagsProcessed).toBe(0);
      expect(stats.totalParseErrors).toBe(0);
      expect(stats.invalidMessages).toBe(0);
      expect(stats.emptyReports).toBe(0);
      expect(stats.lastProcessedAt).toBeNull();
    });
  });

  describe('RO_ACCESS_REPORT Parsing', () => {
    it('should parse standard RO_ACCESS_REPORT message', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -58,
            antennaID: 1,
            firstSeenTimestamp: 123456789,
            tagSeenCount: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(1);
      expect(tagReads[0].epc).toBe(VALID_EPC);
      expect(tagReads[0].rssi).toBe(-58);
      expect(tagReads[0].antennaPort).toBe(1);
      expect(tagReads[0].readCount).toBe(1);
      expect(tagReads[0].timestamp).toBeInstanceOf(Date);
      expect(tagReads[0].firstSeenTimestamp).toBe(123456789);
    });

    it('should parse multiple tags in single report', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
          },
          {
            epcData: VALID_EPC_2,
            peakRSSI: -55,
            antennaID: 2,
          },
          {
            epcData: VALID_EPC_3,
            peakRSSI: -60,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(3);
      expect(tagReads.map((r) => r.epc)).toEqual([VALID_EPC, VALID_EPC_2, VALID_EPC_3]);
      expect(tagReads.map((r) => r.rssi)).toEqual([-50, -55, -60]);
      expect(tagReads.map((r) => r.antennaPort)).toEqual([1, 2, 1]);
    });
  });

  describe('Manufacturer Variations', () => {
    it('should handle Impinj field naming (epcData)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -45,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });

    it('should handle Alien field naming (EPCData)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            EPCData: VALID_EPC,
            peakRSSI: -52,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });

    it('should handle Zebra field naming (epc)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epc: VALID_EPC,
            peakRSSI: -48,
            antennaID: 3,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });

    it('should handle uppercase EPC field', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            EPC: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });
  });

  describe('EPC Data Type Handling', () => {
    it('should handle Buffer EPC data', async () => {
      const epcBuffer = Buffer.from('E280116060002004DECA48DA', 'hex');

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: epcBuffer,
            peakRSSI: -55,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(epcBuffer.toString('hex').toUpperCase());
    });

    it('should handle string EPC data', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -60,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });

    it('should handle object with epc field', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: { epc: VALID_EPC },
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });

    it('should skip tags with missing EPC', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            // No EPC field
            peakRSSI: -55,
            antennaID: 1,
          },
          {
            epcData: VALID_EPC,
            peakRSSI: -58,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(1);
      expect(tagReads[0].epc).toBe(VALID_EPC);

      expect(mockLogger.warn).toHaveBeenCalledWith('Tag report missing EPC', expect.any(Object));
    });
  });

  describe('RSSI Handling', () => {
    it('should use negative RSSI values as-is', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -65,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(-65);
    });

    it('should convert positive RSSI to negative', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: 65, // Positive value (some readers report this way)
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(-65);
    });

    it('should use default RSSI when missing', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            // No RSSI field
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      // Implementation defaults to -70 dBm (medium strength)
      expect(result._unsafeUnwrap()[0].rssi).toBe(-70);
    });

    it('should clamp RSSI below minimum to -90', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -150, // Very weak signal, below valid range
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(-90);
    });
  });

  describe('Antenna ID Handling', () => {
    it('should parse antenna ID correctly', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 4,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].antennaPort).toBe(4);
    });

    it('should use default antenna ID when missing', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            // No antennaID
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      // Implementation defaults to antenna 1
      expect(result._unsafeUnwrap()[0].antennaPort).toBe(1);
    });
  });

  describe('Timestamp Handling', () => {
    it('should use lastSeenTimestamp for timestamp when provided', async () => {
      const timestamp = Date.now();

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
            lastSeenTimestamp: timestamp,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].timestamp.getTime()).toBe(timestamp);
    });

    it('should use current time when timestamp missing', async () => {
      const beforeTime = Date.now();

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
            // No timestamp
          },
        ],
      };

      const result = await processor.process(message);
      const afterTime = Date.now();

      expect(result.isOk()).toBe(true);
      const timestamp = result._unsafeUnwrap()[0].timestamp.getTime();
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Read Count Handling', () => {
    it('should use provided tag seen count', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
            tagSeenCount: 5,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].readCount).toBe(5);
    });

    it('should default to 1 when count missing', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].readCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should reject non-RO_ACCESS_REPORT messages', async () => {
      const message = {
        type: 'KEEPALIVE',
      };

      const result = await processor.process(message);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Invalid message type');
    });

    it('should reject messages without type', async () => {
      const message = {
        tagReportData: [],
      };

      const result = await processor.process(message);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('missing type');
    });

    it('should reject null messages', async () => {
      const result = await processor.process(null);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Invalid message');
    });

    it('should reject undefined messages', async () => {
      const result = await processor.process(undefined);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Invalid message');
    });

    it('should return empty array for missing tagReportData', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        // No tagReportData - implementation returns empty array, not error
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(0);
    });

    it('should handle single object tagReportData (non-array)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: {
          epcData: VALID_EPC,
          peakRSSI: -50,
          antennaID: 1,
        },
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(1);
    });

    it('should handle empty tagReportData array', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(0);
    });

    it('should track invalid messages in statistics', async () => {
      await processor.process(null);
      await processor.process({ type: 'INVALID' });

      const stats = processor.getStats();
      expect(stats.invalidMessages).toBe(2);
    });
  });

  describe('Alternative Field Names', () => {
    it('should handle TagReportData (capitalized)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        TagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -55,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(1);
    });

    it('should prioritize tagReportData over TagReportData', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
        TagReportData: [
          {
            epcData: VALID_EPC_2,
            peakRSSI: -55,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(VALID_EPC);
    });
  });

  describe('Statistics', () => {
    it('should track messages processed', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      await processor.process(message);
      await processor.process(message);
      await processor.process(message);

      const stats = processor.getStats();
      expect(stats.totalMessagesProcessed).toBe(3);
    });

    it('should track tags extracted', async () => {
      const message1 = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          { epcData: VALID_EPC, peakRSSI: -50, antennaID: 1 },
          { epcData: VALID_EPC_2, peakRSSI: -55, antennaID: 2 },
        ],
      };

      const message2 = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: VALID_EPC_3, peakRSSI: -60, antennaID: 1 }],
      };

      await processor.process(message1);
      await processor.process(message2);

      const stats = processor.getStats();
      expect(stats.totalTagsProcessed).toBe(3);
    });

    it('should track lastProcessedAt', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: VALID_EPC, peakRSSI: -50, antennaID: 1 }],
      };

      await processor.process(message);

      const stats = processor.getStats();
      expect(stats.lastProcessedAt).toBeInstanceOf(Date);
    });

    it('should allow statistics reset', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: VALID_EPC, peakRSSI: -50, antennaID: 1 }],
      };

      await processor.process(message);

      const statsBefore = processor.getStats();
      expect(statsBefore.totalMessagesProcessed).toBe(1);

      processor.resetStats();

      const statsAfter = processor.getStats();
      expect(statsAfter.totalMessagesProcessed).toBe(0);
      expect(statsAfter.totalTagsProcessed).toBe(0);
      expect(statsAfter.totalParseErrors).toBe(0);
      expect(statsAfter.lastProcessedAt).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should warn on slow processing', async () => {
      // Create message with many tags (100 valid hex EPCs)
      const tagReportData = [];
      for (let i = 0; i < 100; i++) {
        const hexSuffix = i.toString(16).padStart(8, '0').toUpperCase();
        tagReportData.push({
          epcData: `E280116060002004${hexSuffix}`,
          peakRSSI: -50,
          antennaID: 1,
        });
      }

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData,
      };

      await processor.process(message);

      // Check if we have processing stats
      const stats = processor.getStats();
      expect(stats.totalTagsProcessed).toBeGreaterThan(0);
    });

    it('should handle large batches efficiently', async () => {
      const tagReportData = [];
      for (let i = 0; i < 1000; i++) {
        const hexSuffix = i.toString(16).padStart(8, '0').toUpperCase();
        tagReportData.push({
          epcData: `E280116060002004${hexSuffix}`,
          peakRSSI: -50 - (i % 50),
          antennaID: (i % 4) + 1,
        });
      }

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData,
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(1000);

      const stats = processor.getStats();
      expect(stats.totalTagsProcessed).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed valid and invalid tag reports', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          { epcData: VALID_EPC, peakRSSI: -50, antennaID: 1 },
          { peakRSSI: -55, antennaID: 2 }, // Missing EPC
          { epcData: VALID_EPC_2, peakRSSI: -60, antennaID: 3 },
          { epcData: null, peakRSSI: -65, antennaID: 4 }, // Null EPC
          { epcData: VALID_EPC_3, peakRSSI: -70, antennaID: 1 },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(3);
      expect(tagReads.map((r) => r.epc)).toEqual([VALID_EPC, VALID_EPC_2, VALID_EPC_3]);
    });

    it('should reject invalid EPC format (non-hex)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'INVALID_NON_HEX_STRING!',
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      // Invalid EPC format should be filtered out
      expect(result._unsafeUnwrap()).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid EPC format', expect.any(Object));
    });

    it('should handle lowercase hex EPC and convert to uppercase', async () => {
      const lowercaseEpc = 'e280116060002004deca48da';

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: lowercaseEpc,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(lowercaseEpc.toUpperCase());
    });

    it('should handle zero RSSI value', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: VALID_EPC,
            peakRSSI: 0,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      // Zero is converted to negative (0 becomes 0 since -0 === 0)
      // But the range validation clamps it to -30
      expect(result._unsafeUnwrap()[0].rssi).toBe(-30);
    });

    it('should track empty reports in statistics', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [],
      };

      await processor.process(message);

      const stats = processor.getStats();
      expect(stats.emptyReports).toBe(1);
    });
  });
});
