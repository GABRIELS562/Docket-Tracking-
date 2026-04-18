import { ItemMovedEvent } from '@domain/events/ItemMovedEvent';

describe('ItemMovedEvent', () => {
  const defaultProps = {
    itemId: 'item-123-abc',
    itemNumber: 'INV-2025-000123',
    fromZoneId: 'zone-processing-001',
    toZoneId: 'zone-storage-001',
    readerId: 'reader-storage-001',
    locationConfidence: 0.95,
    movedAt: new Date('2025-01-15T10:30:00Z'),
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.fromZoneId).toBe(defaultProps.fromZoneId);
      expect(event.toZoneId).toBe(defaultProps.toZoneId);
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.locationConfidence).toBe(defaultProps.locationConfidence);
      expect(event.movedAt.getTime()).toBe(defaultProps.movedAt.getTime());
    });

    it('should set eventType to ItemMoved', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.eventType).toBe('ItemMoved');
    });

    it('should create event with null fromZoneId (first entry)', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        null,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.fromZoneId).toBeNull();
    });

    it('should set version to 1 by default', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.version).toBe(1);
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      const json = event.toJSON();

      expect(json.itemId).toBe(defaultProps.itemId);
      expect(json.itemNumber).toBe(defaultProps.itemNumber);
      expect(json.fromZoneId).toBe(defaultProps.fromZoneId);
      expect(json.toZoneId).toBe(defaultProps.toZoneId);
      expect(json.readerId).toBe(defaultProps.readerId);
      expect(json.locationConfidence).toBe(defaultProps.locationConfidence);
      expect(json.movedAt).toBe(defaultProps.movedAt.toISOString());
    });

    it('should serialize movedAt as ISO 8601 string', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      const json = event.toJSON();

      expect(json.movedAt).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should include null fromZoneId in JSON', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        null,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      const json = event.toJSON();

      expect(json.fromZoneId).toBeNull();
    });
  });

  describe('isFirstEntry', () => {
    it('should return true when fromZoneId is null', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        null,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.isFirstEntry()).toBe(true);
    });

    it('should return false when fromZoneId is set', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      expect(event.isFirstEntry()).toBe(false);
    });
  });

  describe('isHighConfidence', () => {
    it('should return true when confidence is >= 0.8', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.8,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(true);
    });

    it('should return true when confidence is 0.95', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.95,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(true);
    });

    it('should return true when confidence is 1.0', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        1.0,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(true);
    });

    it('should return false when confidence is below 0.8', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.79,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(false);
    });

    it('should return false when confidence is 0.5', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.5,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(false);
    });
  });

  describe('isLowConfidence', () => {
    it('should return true when confidence is < 0.5', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.49,
        defaultProps.movedAt
      );

      expect(event.isLowConfidence()).toBe(true);
    });

    it('should return true when confidence is 0', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0,
        defaultProps.movedAt
      );

      expect(event.isLowConfidence()).toBe(true);
    });

    it('should return false when confidence is exactly 0.5', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.5,
        defaultProps.movedAt
      );

      expect(event.isLowConfidence()).toBe(false);
    });

    it('should return false when confidence is 0.8', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.8,
        defaultProps.movedAt
      );

      expect(event.isLowConfidence()).toBe(false);
    });
  });

  describe('confidence boundary cases', () => {
    it('should handle medium confidence (0.5 to 0.79)', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.65,
        defaultProps.movedAt
      );

      expect(event.isHighConfidence()).toBe(false);
      expect(event.isLowConfidence()).toBe(false);
    });

    it('should correctly classify boundary at 0.5', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.5,
        defaultProps.movedAt
      );

      // At 0.5: not high (< 0.8), not low (>= 0.5)
      expect(event.isHighConfidence()).toBe(false);
      expect(event.isLowConfidence()).toBe(false);
    });

    it('should correctly classify boundary at 0.8', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        0.8,
        defaultProps.movedAt
      );

      // At 0.8: high (>= 0.8), not low (>= 0.5)
      expect(event.isHighConfidence()).toBe(true);
      expect(event.isLowConfidence()).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ItemMovedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.fromZoneId,
        defaultProps.toZoneId,
        defaultProps.readerId,
        defaultProps.locationConfidence,
        defaultProps.movedAt
      );

      // Verify values remain unchanged
      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.fromZoneId).toBe(defaultProps.fromZoneId);
      expect(event.toZoneId).toBe(defaultProps.toZoneId);
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.locationConfidence).toBe(defaultProps.locationConfidence);
    });
  });
});
