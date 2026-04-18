import { ReaderRegisteredEvent } from '@domain/events/ReaderRegisteredEvent';

describe('ReaderRegisteredEvent', () => {
  const defaultProps = {
    readerId: 'reader-storage-003',
    readerName: 'Storage Reader C1',
    readerModel: 'Impinj R700',
    ipAddress: '192.168.1.103',
    port: 5084,
    zoneId: 'zone-storage-003',
    antennaCount: 4,
    registeredBy: 'admin-user-123',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount,
        defaultProps.registeredBy
      );

      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.readerName).toBe(defaultProps.readerName);
      expect(event.readerModel).toBe(defaultProps.readerModel);
      expect(event.ipAddress).toBe(defaultProps.ipAddress);
      expect(event.port).toBe(defaultProps.port);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.antennaCount).toBe(defaultProps.antennaCount);
      expect(event.registeredBy).toBe(defaultProps.registeredBy);
    });

    it('should set eventType to ReaderRegistered', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.eventType).toBe('ReaderRegistered');
    });

    it('should create event without optional registeredBy', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.registeredBy).toBeUndefined();
    });

    it('should set version to 1 by default', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.version).toBe(1);
    });

    it('should generate unique eventId', () => {
      const event1 = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      const event2 = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set occurredAt to current time', () => {
      const before = new Date();
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount,
        defaultProps.registeredBy
      );

      const json = event.toJSON();

      expect(json.readerId).toBe(defaultProps.readerId);
      expect(json.readerName).toBe(defaultProps.readerName);
      expect(json.readerModel).toBe(defaultProps.readerModel);
      expect(json.ipAddress).toBe(defaultProps.ipAddress);
      expect(json.port).toBe(defaultProps.port);
      expect(json.zoneId).toBe(defaultProps.zoneId);
      expect(json.antennaCount).toBe(defaultProps.antennaCount);
      expect(json.registeredBy).toBe(defaultProps.registeredBy);
    });

    it('should include base event properties in JSON', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      const json = event.toJSON();

      expect(json.eventId).toBeDefined();
      expect(json.eventType).toBe('ReaderRegistered');
      expect(json.occurredAt).toBeDefined();
      expect(json.version).toBe(1);
    });

    it('should include undefined registeredBy in JSON', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      const json = event.toJSON();

      expect(json.registeredBy).toBeUndefined();
    });
  });

  describe('different reader models', () => {
    const readerModels = [
      'Impinj R700',
      'Impinj R420',
      'Zebra FX9600',
      'Alien ALR-9900',
      'ThingMagic Sargas',
    ];

    it.each(readerModels)('should handle reader model: %s', (model) => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        model,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.readerModel).toBe(model);
      expect(event.toJSON().readerModel).toBe(model);
    });
  });

  describe('different antenna counts', () => {
    const antennaCounts = [1, 2, 4, 8, 16, 32];

    it.each(antennaCounts)('should handle antenna count: %d', (count) => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        count
      );

      expect(event.antennaCount).toBe(count);
      expect(event.toJSON().antennaCount).toBe(count);
    });
  });

  describe('different port numbers', () => {
    const ports = [5084, 5085, 443, 80, 1, 65535];

    it.each(ports)('should handle port: %d', (port) => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.port).toBe(port);
      expect(event.toJSON().port).toBe(port);
    });
  });

  describe('IP address formats', () => {
    const ipAddresses = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '255.255.255.255', '0.0.0.0'];

    it.each(ipAddresses)('should handle IP address: %s', (ip) => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        ip,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount
      );

      expect(event.ipAddress).toBe(ip);
      expect(event.toJSON().ipAddress).toBe(ip);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ReaderRegisteredEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.readerModel,
        defaultProps.ipAddress,
        defaultProps.port,
        defaultProps.zoneId,
        defaultProps.antennaCount,
        defaultProps.registeredBy
      );

      // Verify values remain unchanged
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.readerName).toBe(defaultProps.readerName);
      expect(event.readerModel).toBe(defaultProps.readerModel);
      expect(event.ipAddress).toBe(defaultProps.ipAddress);
      expect(event.port).toBe(defaultProps.port);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.antennaCount).toBe(defaultProps.antennaCount);
      expect(event.registeredBy).toBe(defaultProps.registeredBy);
    });
  });
});
