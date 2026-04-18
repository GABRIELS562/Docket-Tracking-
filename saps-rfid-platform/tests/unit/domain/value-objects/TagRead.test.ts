import { TagRead } from '@domain/value-objects/TagRead';
import { RfidEpc } from '@domain/value-objects/RfidEpc';

describe('TagRead', () => {
  const validEpc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
  const pastTimestamp = new Date(Date.now() - 1000); // 1 second ago

  const validParams = {
    epc: validEpc,
    rssi: -45.5,
    antennaPort: 1,
    readerId: 'reader-001',
    timestamp: pastTimestamp,
  };

  describe('create', () => {
    describe('valid inputs', () => {
      it('should create TagRead with valid parameters', () => {
        const result = TagRead.create(validParams);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getEpc().equals(validEpc)).toBe(true);
          expect(result.value.getRssi()).toBe(-45.5);
          expect(result.value.getAntennaPort()).toBe(1);
          expect(result.value.getReaderId()).toBe('reader-001');
          expect(result.value.getReadCount()).toBe(1); // default value
        }
      });

      it('should create TagRead with explicit read count', () => {
        const result = TagRead.create({
          ...validParams,
          readCount: 5,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getReadCount()).toBe(5);
        }
      });

      it('should accept minimum valid RSSI (-100)', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: -100,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getRssi()).toBe(-100);
        }
      });

      it('should accept maximum valid RSSI (0)', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: 0,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getRssi()).toBe(0);
        }
      });

      it('should accept minimum antenna port (1)', () => {
        const result = TagRead.create({
          ...validParams,
          antennaPort: 1,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getAntennaPort()).toBe(1);
        }
      });

      it('should accept maximum antenna port (32)', () => {
        const result = TagRead.create({
          ...validParams,
          antennaPort: 32,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getAntennaPort()).toBe(32);
        }
      });

      it('should accept decimal RSSI values', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: -55.75,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getRssi()).toBe(-55.75);
        }
      });
    });

    describe('invalid RSSI', () => {
      it('should reject RSSI below -100', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: -101,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid RSSI value');
          expect(result.error.message).toContain('-101');
          expect(result.error.message).toContain('-100 and 0 dBm');
        }
      });

      it('should reject RSSI above 0', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: 1,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid RSSI value');
          expect(result.error.message).toContain('1');
        }
      });

      it('should reject positive RSSI values', () => {
        const result = TagRead.create({
          ...validParams,
          rssi: 10,
        });

        expect(result.isErr()).toBe(true);
      });
    });

    describe('invalid antenna port', () => {
      it('should reject antenna port 0', () => {
        const result = TagRead.create({
          ...validParams,
          antennaPort: 0,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid antenna port');
          expect(result.error.message).toContain('0');
          expect(result.error.message).toContain('between 1 and 32');
        }
      });

      it('should reject negative antenna port', () => {
        const result = TagRead.create({
          ...validParams,
          antennaPort: -1,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid antenna port');
        }
      });

      it('should reject antenna port above 32', () => {
        const result = TagRead.create({
          ...validParams,
          antennaPort: 33,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid antenna port');
          expect(result.error.message).toContain('33');
        }
      });
    });

    describe('invalid reader ID', () => {
      it('should reject empty reader ID', () => {
        const result = TagRead.create({
          ...validParams,
          readerId: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Reader ID cannot be empty');
        }
      });

      it('should reject whitespace-only reader ID', () => {
        const result = TagRead.create({
          ...validParams,
          readerId: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Reader ID cannot be empty');
        }
      });

      it('should reject tabs-only reader ID', () => {
        const result = TagRead.create({
          ...validParams,
          readerId: '\t\t',
        });

        expect(result.isErr()).toBe(true);
      });
    });

    describe('invalid timestamp', () => {
      it('should reject future timestamp', () => {
        const futureDate = new Date(Date.now() + 60000); // 1 minute in future
        const result = TagRead.create({
          ...validParams,
          timestamp: futureDate,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Timestamp cannot be in the future');
        }
      });
    });

    describe('invalid read count', () => {
      it('should reject read count of 0', () => {
        const result = TagRead.create({
          ...validParams,
          readCount: 0,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Read count must be at least 1');
        }
      });

      it('should reject negative read count', () => {
        const result = TagRead.create({
          ...validParams,
          readCount: -5,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Read count must be at least 1');
        }
      });
    });
  });

  describe('getEpc', () => {
    it('should return the EPC value object', () => {
      const tagRead = TagRead.create(validParams)._unsafeUnwrap();

      expect(tagRead.getEpc()).toBe(validEpc);
      expect(tagRead.getEpc().getValue()).toBe('E280116060002004DECA48DA');
    });
  });

  describe('getRssi', () => {
    it('should return the RSSI value', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -65.25,
      })._unsafeUnwrap();

      expect(tagRead.getRssi()).toBe(-65.25);
    });
  });

  describe('getAntennaPort', () => {
    it('should return the antenna port', () => {
      const tagRead = TagRead.create({
        ...validParams,
        antennaPort: 4,
      })._unsafeUnwrap();

      expect(tagRead.getAntennaPort()).toBe(4);
    });
  });

  describe('getReaderId', () => {
    it('should return the reader ID', () => {
      const tagRead = TagRead.create({
        ...validParams,
        readerId: 'warehouse-reader-42',
      })._unsafeUnwrap();

      expect(tagRead.getReaderId()).toBe('warehouse-reader-42');
    });
  });

  describe('getTimestamp', () => {
    it('should return a copy of the timestamp', () => {
      const tagRead = TagRead.create(validParams)._unsafeUnwrap();
      const timestamp1 = tagRead.getTimestamp();
      const timestamp2 = tagRead.getTimestamp();

      expect(timestamp1.getTime()).toBe(pastTimestamp.getTime());
      expect(timestamp1).not.toBe(timestamp2); // Different object instances
      expect(timestamp1.getTime()).toBe(timestamp2.getTime()); // Same value
    });
  });

  describe('getReadCount', () => {
    it('should return default read count of 1', () => {
      const tagRead = TagRead.create(validParams)._unsafeUnwrap();

      expect(tagRead.getReadCount()).toBe(1);
    });

    it('should return explicit read count', () => {
      const tagRead = TagRead.create({
        ...validParams,
        readCount: 10,
      })._unsafeUnwrap();

      expect(tagRead.getReadCount()).toBe(10);
    });
  });

  describe('getSignalQuality', () => {
    it('should return excellent for RSSI > -40', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -30,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('excellent');
    });

    it('should return excellent for RSSI = -39.9', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -39.9,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('excellent');
    });

    it('should return good for RSSI = -40', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -40,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('good');
    });

    it('should return good for RSSI between -40 and -55', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -50,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('good');
    });

    it('should return fair for RSSI = -55', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -55,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('fair');
    });

    it('should return fair for RSSI between -55 and -70', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -65,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('fair');
    });

    it('should return poor for RSSI = -70', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -70,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('poor');
    });

    it('should return poor for RSSI < -70', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -85,
      })._unsafeUnwrap();

      expect(tagRead.getSignalQuality()).toBe('poor');
    });
  });

  describe('isSignalReliable', () => {
    it('should return true for signal above default threshold (-70)', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -65,
      })._unsafeUnwrap();

      expect(tagRead.isSignalReliable()).toBe(true);
    });

    it('should return false for signal at default threshold (-70)', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -70,
      })._unsafeUnwrap();

      expect(tagRead.isSignalReliable()).toBe(false);
    });

    it('should return false for signal below default threshold', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -75,
      })._unsafeUnwrap();

      expect(tagRead.isSignalReliable()).toBe(false);
    });

    it('should use custom threshold', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -55,
      })._unsafeUnwrap();

      expect(tagRead.isSignalReliable(-50)).toBe(false);
      expect(tagRead.isSignalReliable(-60)).toBe(true);
    });

    it('should return true for strong signal with strict threshold', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -35,
      })._unsafeUnwrap();

      expect(tagRead.isSignalReliable(-40)).toBe(true);
    });
  });

  describe('getAgeMs', () => {
    it('should return positive age for past timestamp', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 5000), // 5 seconds ago
      })._unsafeUnwrap();

      const age = tagRead.getAgeMs();

      expect(age).toBeGreaterThanOrEqual(5000);
      expect(age).toBeLessThan(6000); // Allow some execution time
    });

    it('should return small age for recent timestamp', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 100), // 100ms ago
      })._unsafeUnwrap();

      const age = tagRead.getAgeMs();

      expect(age).toBeGreaterThanOrEqual(100);
      expect(age).toBeLessThan(500);
    });
  });

  describe('isRecent', () => {
    it('should return true for read within default 5000ms', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 1000), // 1 second ago
      })._unsafeUnwrap();

      expect(tagRead.isRecent()).toBe(true);
    });

    it('should return false for read older than default 5000ms', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
      })._unsafeUnwrap();

      expect(tagRead.isRecent()).toBe(false);
    });

    it('should use custom max age', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 3000), // 3 seconds ago
      })._unsafeUnwrap();

      expect(tagRead.isRecent(2000)).toBe(false);
      expect(tagRead.isRecent(5000)).toBe(true);
    });

    it('should return true for boundary case', () => {
      const tagRead = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 5000), // exactly 5 seconds ago
      })._unsafeUnwrap();

      expect(tagRead.isRecent(5000)).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for equal TagReads', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
        readCount: 3,
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp,
        readCount: 3,
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(true);
    });

    it('should return false for different EPC', () => {
      const timestamp = new Date(Date.now() - 1000);
      const differentEpc = RfidEpc.create('000000000000000000000000')._unsafeUnwrap();

      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        epc: differentEpc,
        rssi: validParams.rssi,
        antennaPort: validParams.antennaPort,
        readerId: validParams.readerId,
        timestamp,
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });

    it('should return false for different RSSI', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
        rssi: -45,
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp,
        rssi: -50,
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });

    it('should return false for different antenna port', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
        antennaPort: 1,
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp,
        antennaPort: 2,
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });

    it('should return false for different reader ID', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
        readerId: 'reader-001',
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp,
        readerId: 'reader-002',
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });

    it('should return false for different timestamp', () => {
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 1000),
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp: new Date(Date.now() - 2000),
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });

    it('should return false for different read count', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead1 = TagRead.create({
        ...validParams,
        timestamp,
        readCount: 1,
      })._unsafeUnwrap();
      const tagRead2 = TagRead.create({
        ...validParams,
        timestamp,
        readCount: 5,
      })._unsafeUnwrap();

      expect(tagRead1.equals(tagRead2)).toBe(false);
    });
  });

  describe('toObject', () => {
    it('should return plain object representation', () => {
      const timestamp = new Date(Date.now() - 1000);
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -50,
        antennaPort: 2,
        readerId: 'test-reader',
        timestamp,
        readCount: 3,
      })._unsafeUnwrap();

      const obj = tagRead.toObject();

      expect(obj.epc).toBe('E280116060002004DECA48DA');
      expect(obj.rssi).toBe(-50);
      expect(obj.antennaPort).toBe(2);
      expect(obj.readerId).toBe('test-reader');
      expect(obj.timestamp.getTime()).toBe(timestamp.getTime());
      expect(obj.readCount).toBe(3);
      expect(obj.signalQuality).toBe('good');
    });

    it('should include correct signal quality for excellent signal', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -30,
      })._unsafeUnwrap();

      expect(tagRead.toObject().signalQuality).toBe('excellent');
    });

    it('should include correct signal quality for fair signal', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -60,
      })._unsafeUnwrap();

      expect(tagRead.toObject().signalQuality).toBe('fair');
    });

    it('should include correct signal quality for poor signal', () => {
      const tagRead = TagRead.create({
        ...validParams,
        rssi: -80,
      })._unsafeUnwrap();

      expect(tagRead.toObject().signalQuality).toBe('poor');
    });

    it('should return a new timestamp object', () => {
      const tagRead = TagRead.create(validParams)._unsafeUnwrap();
      const obj1 = tagRead.toObject();
      const obj2 = tagRead.toObject();

      expect(obj1.timestamp).not.toBe(obj2.timestamp);
      expect(obj1.timestamp.getTime()).toBe(obj2.timestamp.getTime());
    });
  });

  describe('edge cases', () => {
    it('should handle reader ID with special characters', () => {
      const result = TagRead.create({
        ...validParams,
        readerId: 'reader_001-zone/A.bay:1',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReaderId()).toBe('reader_001-zone/A.bay:1');
      }
    });

    it('should handle very long reader ID', () => {
      const longReaderId = 'reader-' + 'a'.repeat(1000);
      const result = TagRead.create({
        ...validParams,
        readerId: longReaderId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReaderId()).toBe(longReaderId);
      }
    });

    it('should handle large read count', () => {
      const result = TagRead.create({
        ...validParams,
        readCount: 1000000,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReadCount()).toBe(1000000);
      }
    });

    it('should handle very old timestamp', () => {
      const veryOldDate = new Date('2000-01-01T00:00:00Z');
      const result = TagRead.create({
        ...validParams,
        timestamp: veryOldDate,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp().getTime()).toBe(veryOldDate.getTime());
      }
    });

    it('should handle timestamp at epoch', () => {
      const epochDate = new Date(0);
      const result = TagRead.create({
        ...validParams,
        timestamp: epochDate,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp().getTime()).toBe(0);
      }
    });

    it('should handle RSSI boundary values precisely', () => {
      // Test -100 (boundary)
      const atMinBoundary = TagRead.create({
        ...validParams,
        rssi: -100,
      });
      expect(atMinBoundary.isOk()).toBe(true);

      // Test -100.001 (just outside)
      const justBelowMin = TagRead.create({
        ...validParams,
        rssi: -100.001,
      });
      expect(justBelowMin.isErr()).toBe(true);

      // Test 0 (boundary)
      const atMaxBoundary = TagRead.create({
        ...validParams,
        rssi: 0,
      });
      expect(atMaxBoundary.isOk()).toBe(true);

      // Test 0.001 (just outside)
      const justAboveMax = TagRead.create({
        ...validParams,
        rssi: 0.001,
      });
      expect(justAboveMax.isErr()).toBe(true);
    });
  });
});
