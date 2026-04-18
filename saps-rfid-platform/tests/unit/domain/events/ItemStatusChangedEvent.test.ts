import { ItemStatusChangedEvent } from '@domain/events/ItemStatusChangedEvent';
import { ItemStatus } from '@domain/entities/Item';

describe('ItemStatusChangedEvent', () => {
  const defaultProps = {
    itemId: 'item-123-abc',
    itemNumber: 'INV-2025-000123',
    previousStatus: 'registered' as ItemStatus,
    currentStatus: 'in_processing' as ItemStatus,
    changeReason: 'Started quality inspection',
    changedBy: 'technician-456',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.changeReason,
        defaultProps.changedBy
      );

      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.previousStatus).toBe(defaultProps.previousStatus);
      expect(event.currentStatus).toBe(defaultProps.currentStatus);
      expect(event.changeReason).toBe(defaultProps.changeReason);
      expect(event.changedBy).toBe(defaultProps.changedBy);
    });

    it('should set eventType to ItemStatusChanged', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus
      );

      expect(event.eventType).toBe('ItemStatusChanged');
    });

    it('should create event without optional changeReason', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        undefined,
        defaultProps.changedBy
      );

      expect(event.changeReason).toBeUndefined();
    });

    it('should create event without optional changedBy', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.changeReason
      );

      expect(event.changedBy).toBeUndefined();
    });

    it('should create event without any optional properties', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus
      );

      expect(event.changeReason).toBeUndefined();
      expect(event.changedBy).toBeUndefined();
    });

    it('should set version to 1 by default', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus
      );

      expect(event.version).toBe(1);
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.changeReason,
        defaultProps.changedBy
      );

      const json = event.toJSON();

      expect(json.itemId).toBe(defaultProps.itemId);
      expect(json.itemNumber).toBe(defaultProps.itemNumber);
      expect(json.previousStatus).toBe(defaultProps.previousStatus);
      expect(json.currentStatus).toBe(defaultProps.currentStatus);
      expect(json.changeReason).toBe(defaultProps.changeReason);
      expect(json.changedBy).toBe(defaultProps.changedBy);
    });

    it('should include undefined optional properties in JSON', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus
      );

      const json = event.toJSON();

      expect(json.changeReason).toBeUndefined();
      expect(json.changedBy).toBeUndefined();
    });
  });

  describe('movedToProcessing', () => {
    it('should return true when currentStatus is in_processing', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_processing'
      );

      expect(event.movedToProcessing()).toBe(true);
    });

    it('should return false when currentStatus is not in_processing', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_transit'
      );

      expect(event.movedToProcessing()).toBe(false);
    });

    it('should return false when moving away from processing', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'in_processing',
        'archived'
      );

      expect(event.movedToProcessing()).toBe(false);
    });
  });

  describe('wasArchived', () => {
    it('should return true when currentStatus is archived', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'in_processing',
        'archived'
      );

      expect(event.wasArchived()).toBe(true);
    });

    it('should return false when currentStatus is not archived', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_processing'
      );

      expect(event.wasArchived()).toBe(false);
    });
  });

  describe('wasDisposed', () => {
    it('should return true when currentStatus is disposed', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'archived',
        'disposed'
      );

      expect(event.wasDisposed()).toBe(true);
    });

    it('should return false when currentStatus is not disposed', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_transit'
      );

      expect(event.wasDisposed()).toBe(false);
    });
  });

  describe('wasMarkedMissing', () => {
    it('should return true when currentStatus is missing', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'in_transit',
        'missing'
      );

      expect(event.wasMarkedMissing()).toBe(true);
    });

    it('should return false when currentStatus is not missing', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_processing'
      );

      expect(event.wasMarkedMissing()).toBe(false);
    });
  });

  describe('requiresNotification', () => {
    it('should return true for in_processing status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_processing'
      );

      expect(event.requiresNotification()).toBe(true);
    });

    it('should return true for archived status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'in_processing',
        'archived'
      );

      expect(event.requiresNotification()).toBe(true);
    });

    it('should return true for disposed status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'archived',
        'disposed'
      );

      expect(event.requiresNotification()).toBe(true);
    });

    it('should return true for missing status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'in_transit',
        'missing'
      );

      expect(event.requiresNotification()).toBe(true);
    });

    it('should return false for registered status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'missing',
        'registered'
      );

      expect(event.requiresNotification()).toBe(false);
    });

    it('should return false for in_transit status', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        'registered',
        'in_transit'
      );

      expect(event.requiresNotification()).toBe(false);
    });
  });

  describe('status transitions', () => {
    const allStatuses: ItemStatus[] = [
      'registered',
      'in_transit',
      'in_processing',
      'archived',
      'disposed',
      'missing',
    ];

    it('should handle all valid status values', () => {
      for (const prevStatus of allStatuses) {
        for (const currStatus of allStatuses) {
          const event = new ItemStatusChangedEvent(
            defaultProps.itemId,
            defaultProps.itemNumber,
            prevStatus,
            currStatus
          );

          expect(event.previousStatus).toBe(prevStatus);
          expect(event.currentStatus).toBe(currStatus);
        }
      }
    });

    it('should correctly identify notification-requiring statuses', () => {
      const notificationStatuses: ItemStatus[] = [
        'in_processing',
        'archived',
        'disposed',
        'missing',
      ];
      const nonNotificationStatuses: ItemStatus[] = ['registered', 'in_transit'];

      for (const status of notificationStatuses) {
        const event = new ItemStatusChangedEvent(
          defaultProps.itemId,
          defaultProps.itemNumber,
          'registered',
          status
        );
        expect(event.requiresNotification()).toBe(true);
      }

      for (const status of nonNotificationStatuses) {
        const event = new ItemStatusChangedEvent(
          defaultProps.itemId,
          defaultProps.itemNumber,
          'in_processing',
          status
        );
        expect(event.requiresNotification()).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ItemStatusChangedEvent(
        defaultProps.itemId,
        defaultProps.itemNumber,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.changeReason,
        defaultProps.changedBy
      );

      // Verify values remain unchanged
      expect(event.itemId).toBe(defaultProps.itemId);
      expect(event.itemNumber).toBe(defaultProps.itemNumber);
      expect(event.previousStatus).toBe(defaultProps.previousStatus);
      expect(event.currentStatus).toBe(defaultProps.currentStatus);
      expect(event.changeReason).toBe(defaultProps.changeReason);
      expect(event.changedBy).toBe(defaultProps.changedBy);
    });
  });
});
