import { TagDetectedEvent } from '@domain/events/TagDetectedEvent';

describe('TagDetectedEvent', () => {
  const defaultProps = {
    rfidEpc: 'E280116060002004DECA48DA',
    readerId: 'reader-storage-001',
    zoneId: 'zone-storage-001',
    rssi: -45.5,
    antennaPort: 2,
    timestamp: new Date('2025-01-15T10:30:00Z'),
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.rssi).toBe(defaultProps.rssi);
      expect(event.antennaPort).toBe(defaultProps.antennaPort);
      expect(event.timestamp.getTime()).toBe(defaultProps.timestamp.getTime());
    });

    it('should set eventType to TagDetected', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.eventType).toBe('TagDetected');
    });

    it('should set version to 1 by default', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.version).toBe(1);
    });

    it('should generate unique eventId', () => {
      const event1 = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      const event2 = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      const json = event.toJSON();

      expect(json.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(json.readerId).toBe(defaultProps.readerId);
      expect(json.zoneId).toBe(defaultProps.zoneId);
      expect(json.rssi).toBe(defaultProps.rssi);
      expect(json.antennaPort).toBe(defaultProps.antennaPort);
      expect(json.timestamp).toBe(defaultProps.timestamp.toISOString());
    });

    it('should serialize timestamp as ISO 8601 string', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      const json = event.toJSON();

      expect(json.timestamp).toBe('2025-01-15T10:30:00.000Z');
    });
  });

  describe('getSignalQuality', () => {
    describe('excellent signal (> -40 dBm)', () => {
      it('should return excellent for -30 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -30,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('excellent');
      });

      it('should return excellent for -39.9 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -39.9,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('excellent');
      });

      it('should return excellent for -20 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -20,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('excellent');
      });
    });

    describe('good signal (-40 to -55 dBm)', () => {
      it('should return good for -40 dBm (boundary)', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -40,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('good');
      });

      it('should return good for -45 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -45,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('good');
      });

      it('should return good for -54.9 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -54.9,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('good');
      });
    });

    describe('fair signal (-55 to -70 dBm)', () => {
      it('should return fair for -55 dBm (boundary)', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -55,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('fair');
      });

      it('should return fair for -60 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -60,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('fair');
      });

      it('should return fair for -69.9 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -69.9,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('fair');
      });
    });

    describe('poor signal (<= -70 dBm)', () => {
      it('should return poor for -70 dBm (boundary)', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -70,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('poor');
      });

      it('should return poor for -80 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -80,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('poor');
      });

      it('should return poor for -90 dBm', () => {
        const event = new TagDetectedEvent(
          defaultProps.rfidEpc,
          defaultProps.readerId,
          defaultProps.zoneId,
          -90,
          defaultProps.antennaPort,
          defaultProps.timestamp
        );

        expect(event.getSignalQuality()).toBe('poor');
      });
    });
  });

  describe('isStrongRead', () => {
    it('should return true for RSSI > -55 dBm', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -54,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.isStrongRead()).toBe(true);
    });

    it('should return true for -30 dBm', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -30,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.isStrongRead()).toBe(true);
    });

    it('should return false for RSSI = -55 dBm (boundary)', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -55,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.isStrongRead()).toBe(false);
    });

    it('should return false for -60 dBm', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -60,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.isStrongRead()).toBe(false);
    });

    it('should return false for -80 dBm', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -80,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.isStrongRead()).toBe(false);
    });
  });

  describe('antenna ports', () => {
    const antennaPorts = [1, 2, 3, 4, 5, 6, 7, 8];

    it.each(antennaPorts)('should handle antenna port: %d', (port) => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        port,
        defaultProps.timestamp
      );

      expect(event.antennaPort).toBe(port);
      expect(event.toJSON().antennaPort).toBe(port);
    });
  });

  describe('EPC formats', () => {
    const epcFormats = [
      'E280116060002004DECA48DA',
      'E2801160600020040000ABCD',
      '300833B2DDD9014000000000',
      'AABBCCDD11223344',
      '0123456789ABCDEF01234567',
    ];

    it.each(epcFormats)('should handle EPC format: %s', (epc) => {
      const event = new TagDetectedEvent(
        epc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.rfidEpc).toBe(epc);
      expect(event.toJSON().rfidEpc).toBe(epc);
    });
  });

  describe('RSSI values', () => {
    const rssiValues = [-30, -40, -45.5, -55, -60, -70, -80, -90];

    it.each(rssiValues)('should handle RSSI value: %d dBm', (rssi) => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.rssi).toBe(rssi);
      expect(event.toJSON().rssi).toBe(rssi);
    });
  });

  describe('signal quality and strong read consistency', () => {
    it('should be consistent: excellent signal is always a strong read', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -30,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.getSignalQuality()).toBe('excellent');
      expect(event.isStrongRead()).toBe(true);
    });

    it('should be consistent: good signal is always a strong read', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -50,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.getSignalQuality()).toBe('good');
      expect(event.isStrongRead()).toBe(true);
    });

    it('should be consistent: fair signal is NOT a strong read', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -60,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.getSignalQuality()).toBe('fair');
      expect(event.isStrongRead()).toBe(false);
    });

    it('should be consistent: poor signal is NOT a strong read', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        -80,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      expect(event.getSignalQuality()).toBe('poor');
      expect(event.isStrongRead()).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new TagDetectedEvent(
        defaultProps.rfidEpc,
        defaultProps.readerId,
        defaultProps.zoneId,
        defaultProps.rssi,
        defaultProps.antennaPort,
        defaultProps.timestamp
      );

      // Verify values remain unchanged
      expect(event.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.rssi).toBe(defaultProps.rssi);
      expect(event.antennaPort).toBe(defaultProps.antennaPort);
    });
  });
});
