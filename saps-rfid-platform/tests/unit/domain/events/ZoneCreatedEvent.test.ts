import { ZoneCreatedEvent } from '@domain/events/ZoneCreatedEvent';
import { ZoneType } from '@domain/entities/Zone';

describe('ZoneCreatedEvent', () => {
  const defaultProps = {
    zoneId: 'zone-storage-003',
    zoneCode: 'STOR-C',
    zoneName: 'Storage Area C',
    zoneType: ZoneType.STORAGE,
    capacity: 500,
    building: 'Main Building',
    floorNumber: 2,
    createdBy: 'admin-user-123',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        defaultProps.floorNumber,
        defaultProps.createdBy
      );

      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.zoneCode).toBe(defaultProps.zoneCode);
      expect(event.zoneName).toBe(defaultProps.zoneName);
      expect(event.zoneType).toBe(defaultProps.zoneType);
      expect(event.capacity).toBe(defaultProps.capacity);
      expect(event.building).toBe(defaultProps.building);
      expect(event.floorNumber).toBe(defaultProps.floorNumber);
      expect(event.createdBy).toBe(defaultProps.createdBy);
    });

    it('should set eventType to ZoneCreated', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      expect(event.eventType).toBe('ZoneCreated');
    });

    it('should create event with null building', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        defaultProps.floorNumber
      );

      expect(event.building).toBeNull();
    });

    it('should create event with null floorNumber', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        null
      );

      expect(event.floorNumber).toBeNull();
    });

    it('should create event without optional createdBy', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        defaultProps.floorNumber
      );

      expect(event.createdBy).toBeUndefined();
    });

    it('should set version to 1 by default', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      expect(event.version).toBe(1);
    });

    it('should generate unique eventId', () => {
      const event1 = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      const event2 = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set occurredAt to current time', () => {
      const before = new Date();
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        defaultProps.floorNumber,
        defaultProps.createdBy
      );

      const json = event.toJSON();

      expect(json.zoneId).toBe(defaultProps.zoneId);
      expect(json.zoneCode).toBe(defaultProps.zoneCode);
      expect(json.zoneName).toBe(defaultProps.zoneName);
      expect(json.zoneType).toBe(defaultProps.zoneType);
      expect(json.capacity).toBe(defaultProps.capacity);
      expect(json.building).toBe(defaultProps.building);
      expect(json.floorNumber).toBe(defaultProps.floorNumber);
      expect(json.createdBy).toBe(defaultProps.createdBy);
    });

    it('should include base event properties in JSON', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      const json = event.toJSON();

      expect(json.eventId).toBeDefined();
      expect(json.eventType).toBe('ZoneCreated');
      expect(json.occurredAt).toBeDefined();
      expect(json.version).toBe(1);
    });

    it('should include null values in JSON', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      const json = event.toJSON();

      expect(json.building).toBeNull();
      expect(json.floorNumber).toBeNull();
    });

    it('should include undefined createdBy in JSON', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      const json = event.toJSON();

      expect(json.createdBy).toBeUndefined();
    });
  });

  describe('zone types', () => {
    const allZoneTypes = Object.values(ZoneType);

    it.each(allZoneTypes)('should handle zone type: %s', (zoneType) => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        zoneType,
        defaultProps.capacity,
        null,
        null
      );

      expect(event.zoneType).toBe(zoneType);
      expect(event.toJSON().zoneType).toBe(zoneType);
    });
  });

  describe('capacity values', () => {
    const capacities = [0, 1, 50, 100, 500, 1000, 10000];

    it.each(capacities)('should handle capacity: %d', (capacity) => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        capacity,
        null,
        null
      );

      expect(event.capacity).toBe(capacity);
      expect(event.toJSON().capacity).toBe(capacity);
    });
  });

  describe('floor numbers', () => {
    const floorNumbers = [-2, -1, 0, 1, 2, 5, 10, 50];

    it.each(floorNumbers)('should handle floor number: %d', (floor) => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        floor
      );

      expect(event.floorNumber).toBe(floor);
      expect(event.toJSON().floorNumber).toBe(floor);
    });
  });

  describe('building names', () => {
    const buildingNames = [
      'Main Building',
      'Building A',
      'Warehouse 1',
      'Distribution Center',
      'Laboratory Complex',
    ];

    it.each(buildingNames)('should handle building name: %s', (building) => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        building,
        defaultProps.floorNumber
      );

      expect(event.building).toBe(building);
      expect(event.toJSON().building).toBe(building);
    });
  });

  describe('zone codes', () => {
    const zoneCodes = ['STOR-A', 'EXAM-1', 'TRANSIT-001', 'ARCH_01', 'CORR-MAIN'];

    it.each(zoneCodes)('should handle zone code: %s', (code) => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        code,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        null,
        null
      );

      expect(event.zoneCode).toBe(code);
      expect(event.toJSON().zoneCode).toBe(code);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ZoneCreatedEvent(
        defaultProps.zoneId,
        defaultProps.zoneCode,
        defaultProps.zoneName,
        defaultProps.zoneType,
        defaultProps.capacity,
        defaultProps.building,
        defaultProps.floorNumber,
        defaultProps.createdBy
      );

      // Verify values remain unchanged
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.zoneCode).toBe(defaultProps.zoneCode);
      expect(event.zoneName).toBe(defaultProps.zoneName);
      expect(event.zoneType).toBe(defaultProps.zoneType);
      expect(event.capacity).toBe(defaultProps.capacity);
      expect(event.building).toBe(defaultProps.building);
      expect(event.floorNumber).toBe(defaultProps.floorNumber);
      expect(event.createdBy).toBe(defaultProps.createdBy);
    });
  });
});
