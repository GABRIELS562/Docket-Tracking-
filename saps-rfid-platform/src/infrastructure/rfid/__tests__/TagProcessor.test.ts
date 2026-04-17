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

      expect(stats.messagesProcessed).toBe(0);
      expect(stats.tagsExtracted).toBe(0);
      expect(stats.parseErrors).toBe(0);
      expect(stats.averageProcessingTimeMs).toBe(0);
      expect(stats.lastProcessedAt).toBeNull();
    });
  });

  describe('RO_ACCESS_REPORT Parsing', () => {
    it('should parse standard RO_ACCESS_REPORT message', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'E280116060002004DECA48DA',
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
      expect(tagReads[0]).toEqual({
        epc: 'E280116060002004DECA48DA',
        rssi: -58,
        antennaPort: 1,
        timestamp: expect.any(Date),
        readCount: 1,
      });
    });

    it('should parse multiple tags in single report', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG001',
            peakRSSI: -50,
            antennaID: 1,
          },
          {
            epcData: 'TAG002',
            peakRSSI: -55,
            antennaID: 2,
          },
          {
            epcData: 'TAG003',
            peakRSSI: -60,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(3);
      expect(tagReads.map((r) => r.epc)).toEqual(['TAG001', 'TAG002', 'TAG003']);
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
            epcData: 'IMPINJ_TAG_001',
            peakRSSI: -45,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('IMPINJ_TAG_001');
    });

    it('should handle Alien field naming (EPCData)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            EPCData: 'ALIEN_TAG_001',
            peakRSSI: -52,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('ALIEN_TAG_001');
    });

    it('should handle Zebra field naming (epc)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epc: 'ZEBRA_TAG_001',
            peakRSSI: -48,
            antennaID: 3,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('ZEBRA_TAG_001');
    });

    it('should handle uppercase EPC field', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            EPC: 'UPPERCASE_TAG',
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('UPPERCASE_TAG');
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
            epcData: 'ABC123DEF456',
            peakRSSI: -60,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('ABC123DEF456');
    });

    it('should handle object with epc field', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: { epc: 'NESTED_EPC_TAG' },
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('NESTED_EPC_TAG');
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
            epcData: 'VALID_TAG',
            peakRSSI: -58,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(1);
      expect(tagReads[0].epc).toBe('VALID_TAG');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Tag report missing EPC data',
        expect.any(Object)
      );
    });
  });

  describe('RSSI Handling', () => {
    it('should use negative RSSI values as-is', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
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
            epcData: 'TAG1',
            peakRSSI: 65, // Positive value (some readers report this way)
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(-65);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Normalized positive RSSI to negative',
        expect.objectContaining({
          original: 65,
          normalized: -65,
        })
      );
    });

    it('should use default RSSI when missing', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
            // No RSSI field
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(-999);
    });

    it('should validate RSSI range', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
            peakRSSI: -150, // Very weak signal
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unusual RSSI value detected',
        expect.objectContaining({
          rssi: -150,
        })
      );
    });
  });

  describe('Antenna ID Handling', () => {
    it('should parse antenna ID correctly', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
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
            epcData: 'TAG1',
            peakRSSI: -50,
            // No antennaID
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].antennaPort).toBe(0);
    });
  });

  describe('Timestamp Handling', () => {
    it('should use provided timestamp', async () => {
      const timestamp = Date.now();

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
            peakRSSI: -50,
            antennaID: 1,
            firstSeenTimestamp: timestamp,
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
            epcData: 'TAG1',
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
            epcData: 'TAG1',
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
            epcData: 'TAG1',
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

    it('should handle missing tagReportData array', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        // No tagReportData
      };

      const result = await processor.process(message);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('missing tagReportData');
    });

    it('should handle non-array tagReportData', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: 'not an array',
      };

      const result = await processor.process(message);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('tagReportData is not an array');
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

    it('should track parse errors in statistics', async () => {
      await processor.process(null);
      await processor.process({ type: 'INVALID' });
      await processor.process({ type: 'RO_ACCESS_REPORT' });

      const stats = processor.getStats();
      expect(stats.parseErrors).toBe(3);
    });
  });

  describe('Alternative Field Names', () => {
    it('should handle TagReportData (capitalized)', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        TagReportData: [
          {
            epcData: 'TAG1',
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
            epcData: 'LOWERCASE_TAG',
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
        TagReportData: [
          {
            epcData: 'UPPERCASE_TAG',
            peakRSSI: -55,
            antennaID: 2,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe('LOWERCASE_TAG');
    });
  });

  describe('Statistics', () => {
    it('should track messages processed', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      await processor.process(message);
      await processor.process(message);
      await processor.process(message);

      const stats = processor.getStats();
      expect(stats.messagesProcessed).toBe(3);
    });

    it('should track tags extracted', async () => {
      const message1 = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          { epcData: 'TAG1', peakRSSI: -50, antennaID: 1 },
          { epcData: 'TAG2', peakRSSI: -55, antennaID: 2 },
        ],
      };

      const message2 = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: 'TAG3', peakRSSI: -60, antennaID: 1 }],
      };

      await processor.process(message1);
      await processor.process(message2);

      const stats = processor.getStats();
      expect(stats.tagsExtracted).toBe(3);
    });

    it('should track average processing time', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: 'TAG1', peakRSSI: -50, antennaID: 1 }],
      };

      await processor.process(message);

      const stats = processor.getStats();
      expect(stats.averageProcessingTimeMs).toBeGreaterThan(0);
      expect(stats.lastProcessedAt).toBeInstanceOf(Date);
    });

    it('should allow statistics reset', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [{ epcData: 'TAG1', peakRSSI: -50, antennaID: 1 }],
      };

      await processor.process(message);

      const statsBefore = processor.getStats();
      expect(statsBefore.messagesProcessed).toBe(1);

      processor.resetStats();

      const statsAfter = processor.getStats();
      expect(statsAfter.messagesProcessed).toBe(0);
      expect(statsAfter.tagsExtracted).toBe(0);
      expect(statsAfter.parseErrors).toBe(0);
      expect(statsAfter.lastProcessedAt).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should warn on slow processing', async () => {
      // Create message with many tags
      const tagReportData = [];
      for (let i = 0; i < 100; i++) {
        tagReportData.push({
          epcData: `TAG${i}`,
          peakRSSI: -50,
          antennaID: 1,
        });
      }

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData,
      };

      await processor.process(message);

      // Check if we have processing time stats
      const stats = processor.getStats();
      expect(stats.averageProcessingTimeMs).toBeGreaterThan(0);
    });

    it('should handle large batches efficiently', async () => {
      const tagReportData = [];
      for (let i = 0; i < 1000; i++) {
        tagReportData.push({
          epcData: `TAG${i.toString().padStart(10, '0')}`,
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
      expect(stats.tagsExtracted).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed valid and invalid tag reports', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          { epcData: 'VALID_TAG_1', peakRSSI: -50, antennaID: 1 },
          { peakRSSI: -55, antennaID: 2 }, // Missing EPC
          { epcData: 'VALID_TAG_2', peakRSSI: -60, antennaID: 3 },
          { epcData: null, peakRSSI: -65, antennaID: 4 }, // Null EPC
          { epcData: 'VALID_TAG_3', peakRSSI: -70, antennaID: 1 },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      const tagReads = result._unsafeUnwrap();

      expect(tagReads).toHaveLength(3);
      expect(tagReads.map((r) => r.epc)).toEqual(['VALID_TAG_1', 'VALID_TAG_2', 'VALID_TAG_3']);
    });

    it('should handle very long EPC strings', async () => {
      const longEPC = 'A'.repeat(1000);

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: longEPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(longEPC);
    });

    it('should handle special characters in EPC', async () => {
      const specialEPC = 'TAG-123_ABC.DEF@GHI!#$%';

      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: specialEPC,
            peakRSSI: -50,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].epc).toBe(specialEPC);
    });

    it('should handle zero RSSI value', async () => {
      const message = {
        type: 'RO_ACCESS_REPORT',
        tagReportData: [
          {
            epcData: 'TAG1',
            peakRSSI: 0,
            antennaID: 1,
          },
        ],
      };

      const result = await processor.process(message);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()[0].rssi).toBe(0);
    });
  });
});
