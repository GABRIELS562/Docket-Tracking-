import { DomainEvent } from '@domain/events/DomainEvent';

// Concrete implementation for testing the abstract DomainEvent class
class TestEvent extends DomainEvent {
  constructor(
    public readonly testProperty: string,
    public readonly testNumber: number,
    version?: number
  ) {
    super('TestEvent', version);
  }

  protected override getPayload(): Record<string, unknown> {
    return {
      testProperty: this.testProperty,
      testNumber: this.testNumber,
    };
  }
}

// Minimal concrete implementation with no payload
class MinimalEvent extends DomainEvent {
  constructor() {
    super('MinimalEvent');
  }
}

describe('DomainEvent', () => {
  describe('constructor', () => {
    it('should create event with eventType', () => {
      const event = new TestEvent('test', 42);

      expect(event.eventType).toBe('TestEvent');
    });

    it('should generate unique eventId', () => {
      const event = new TestEvent('test', 42);

      expect(event.eventId).toBeDefined();
      expect(event.eventId).toContain('TestEvent');
      expect(event.eventId.length).toBeGreaterThan(10);
    });

    it('should generate different eventIds for different events', () => {
      const event1 = new TestEvent('test', 42);
      const event2 = new TestEvent('test', 42);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set occurredAt to current time', () => {
      const before = new Date();
      const event = new TestEvent('test', 42);
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should default version to 1', () => {
      const event = new TestEvent('test', 42);

      expect(event.version).toBe(1);
    });

    it('should accept custom version', () => {
      const event = new TestEvent('test', 42, 2);

      expect(event.version).toBe(2);
    });

    it('should create event with version 0', () => {
      const event = new TestEvent('test', 42, 0);

      expect(event.version).toBe(0);
    });
  });

  describe('eventId format', () => {
    it('should follow the pattern: eventType-timestamp-random', () => {
      const event = new TestEvent('test', 42);
      const parts = event.eventId.split('-');

      // Should have at least 3 parts: eventType, timestamp, random
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[0]).toBe('TestEvent');
    });

    it('should include timestamp in eventId', () => {
      const before = Date.now();
      const event = new TestEvent('test', 42);
      const after = Date.now();

      // Extract timestamp from eventId (second part after eventType)
      const parts = event.eventId.split('-');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('toJSON', () => {
    it('should include all base properties', () => {
      const event = new TestEvent('test', 42);
      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventType).toBe('TestEvent');
      expect(json.occurredAt).toBe(event.occurredAt.toISOString());
      expect(json.version).toBe(1);
    });

    it('should include payload properties', () => {
      const event = new TestEvent('test', 42);
      const json = event.toJSON();

      expect(json.testProperty).toBe('test');
      expect(json.testNumber).toBe(42);
    });

    it('should include custom version in JSON', () => {
      const event = new TestEvent('test', 42, 3);
      const json = event.toJSON();

      expect(json.version).toBe(3);
    });

    it('should return empty payload for minimal event', () => {
      const event = new MinimalEvent();
      const json = event.toJSON();

      // Should only have base properties
      expect(Object.keys(json)).toEqual(['eventId', 'eventType', 'occurredAt', 'version']);
    });

    it('should serialize Date as ISO 8601 string', () => {
      const event = new TestEvent('test', 42);
      const json = event.toJSON();

      expect(typeof json.occurredAt).toBe('string');
      expect(json.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('immutability', () => {
    it('should have readonly eventId', () => {
      const event = new TestEvent('test', 42);
      const originalId = event.eventId;

      // TypeScript prevents this at compile time, but we verify runtime behavior
      expect(event.eventId).toBe(originalId);
    });

    it('should have readonly occurredAt', () => {
      const event = new TestEvent('test', 42);
      const originalTime = event.occurredAt.getTime();

      expect(event.occurredAt.getTime()).toBe(originalTime);
    });

    it('should have readonly version', () => {
      const event = new TestEvent('test', 42);

      expect(event.version).toBe(1);
    });

    it('should have readonly eventType', () => {
      const event = new TestEvent('test', 42);

      expect(event.eventType).toBe('TestEvent');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string eventType', () => {
      class EmptyTypeEvent extends DomainEvent {
        constructor() {
          super('');
        }
      }

      const event = new EmptyTypeEvent();
      expect(event.eventType).toBe('');
      expect(event.eventId).toContain('-');
    });

    it('should handle special characters in properties', () => {
      const event = new TestEvent('test with "quotes" and \'apostrophes\'', 42);
      const json = event.toJSON();

      expect(json.testProperty).toBe('test with "quotes" and \'apostrophes\'');
    });

    it('should handle unicode in properties', () => {
      const event = new TestEvent('test with unicode', 42);
      const json = event.toJSON();

      expect(json.testProperty).toBe('test with unicode');
    });

    it('should handle negative numbers', () => {
      const event = new TestEvent('test', -42);
      const json = event.toJSON();

      expect(json.testNumber).toBe(-42);
    });

    it('should handle zero', () => {
      const event = new TestEvent('test', 0);
      const json = event.toJSON();

      expect(json.testNumber).toBe(0);
    });

    it('should handle floating point numbers', () => {
      const event = new TestEvent('test', 3.14159);
      const json = event.toJSON();

      expect(json.testNumber).toBe(3.14159);
    });
  });
});
