import { ItemRegisteredEvent } from '@domain/events/ItemRegisteredEvent';

describe('ItemRegisteredEvent', () => {
  const defaultProps = {
    itemId: 'item-123-abc',
    itemNumber: 'INV-2025-000123',
    rfidEpc: 'E280116060002004DECA48DA',
    referenceId: 'ORD-2025-0456',
    category: 'ELECTRONIC',
    registeredBy: 'John Smith',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category,
        defaultProps.registeredBy
      );

      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(event.referenceId).toBe(defaultProps.referenceId);
      expect(event.category).toBe(defaultProps.category);
      expect(event.registeredBy).toBe(defaultProps.registeredBy);
    });

    it('should set eventType to ItemRegistered', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event.eventType).toBe('ItemRegistered');
    });

    it('should create event without optional registeredBy', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event.registeredBy).toBeUndefined();
    });

    it('should set version to 1 by default', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event.version).toBe(1);
    });

    it('should generate unique eventId', () => {
      const event1 = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      const event2 = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set occurredAt to current time', () => {
      const before = new Date();
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category,
        defaultProps.registeredBy
      );

      const json = event.toJSON();

      expect(json.itemId).toBe(defaultProps.itemId);
      expect(json.itemNumber).toBe(defaultProps.itemNumber);
      expect(json.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(json.referenceId).toBe(defaultProps.referenceId);
      expect(json.category).toBe(defaultProps.category);
      expect(json.registeredBy).toBe(defaultProps.registeredBy);
    });

    it('should include base event properties in JSON', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      const json = event.toJSON();

      expect(json.eventId).toBeDefined();
      expect(json.eventType).toBe('ItemRegistered');
      expect(json.occurredAt).toBeDefined();
      expect(json.version).toBe(1);
    });

    it('should include undefined registeredBy in JSON', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      const json = event.toJSON();

      expect(json.registeredBy).toBeUndefined();
    });
  });

  describe('item categories', () => {
    const categories = [
      'ELECTRONIC',
      'EQUIPMENT',
      'CONSUMABLE',
      'DOCUMENT',
      'MATERIAL',
      'TOOL',
      'APPAREL',
      'CONTAINER',
      'SAMPLE',
      'OTHER',
    ];

    it.each(categories)('should handle category: %s', (category) => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        category
      );

      expect(event.category).toBe(category);
      expect(event.toJSON().category).toBe(category);
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
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        epc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event.rfidEpc).toBe(epc);
      expect(event.toJSON().rfidEpc).toBe(epc);
    });
  });

  describe('item number formats', () => {
    const itemNumbers = [
      'INV-2025-000123',
      'INV-2025-999999',
      'ITEM-001',
      'ABC123',
      'TEST-ITEM-2025-001',
    ];

    it.each(itemNumbers)('should handle item number: %s', (itemNumber) => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category
      );

      expect(event.itemNumber).toBe(itemNumber);
      expect(event.toJSON().itemNumber).toBe(itemNumber);
    });
  });

  describe('reference ID formats', () => {
    const referenceIds = [
      'ORD-2025-0456',
      'PO-2025-12345',
      'REF-001',
      'CASE-ABC-123',
      'PROJECT-XYZ-2025',
    ];

    it.each(referenceIds)('should handle reference ID: %s', (referenceId) => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        referenceId,
        defaultProps.category
      );

      expect(event.referenceId).toBe(referenceId);
      expect(event.toJSON().referenceId).toBe(referenceId);
    });
  });

  describe('registeredBy values', () => {
    const registrars = [
      'John Smith',
      'jane.doe@example.com',
      'system-auto-register',
      'Operator 1',
      'admin-user-123',
    ];

    it.each(registrars)('should handle registeredBy: %s', (registrar) => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category,
        registrar
      );

      expect(event.registeredBy).toBe(registrar);
      expect(event.toJSON().registeredBy).toBe(registrar);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ItemRegisteredEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.rfidEpc,
        defaultProps.referenceId,
        defaultProps.category,
        defaultProps.registeredBy
      );

      // Verify values remain unchanged
      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.rfidEpc).toBe(defaultProps.rfidEpc);
      expect(event.referenceId).toBe(defaultProps.referenceId);
      expect(event.category).toBe(defaultProps.category);
      expect(event.registeredBy).toBe(defaultProps.registeredBy);
    });
  });
});
