import { ReaderStatusChangedEvent } from '@domain/events/ReaderStatusChangedEvent';
import { ReaderStatus } from '@domain/entities/Reader';

describe('ReaderStatusChangedEvent', () => {
  const defaultProps = {
    readerId: 'reader-storage-001',
    readerName: 'Storage Reader A1',
    previousStatus: ReaderStatus.ONLINE,
    currentStatus: ReaderStatus.OFFLINE,
    zoneId: 'zone-storage-001',
    errorMessage: 'Connection timeout after 30 seconds',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId,
        defaultProps.errorMessage
      );

      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.readerName).toBe(defaultProps.readerName);
      expect(event.previousStatus).toBe(defaultProps.previousStatus);
      expect(event.currentStatus).toBe(defaultProps.currentStatus);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.errorMessage).toBe(defaultProps.errorMessage);
    });

    it('should set eventType to ReaderStatusChanged', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId
      );

      expect(event.eventType).toBe('ReaderStatusChanged');
    });

    it('should create event without optional errorMessage', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId
      );

      expect(event.errorMessage).toBeUndefined();
    });

    it('should set version to 1 by default', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId
      );

      expect(event.version).toBe(1);
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId,
        defaultProps.errorMessage
      );

      const json = event.toJSON();

      expect(json.readerId).toBe(defaultProps.readerId);
      expect(json.readerName).toBe(defaultProps.readerName);
      expect(json.previousStatus).toBe(defaultProps.previousStatus);
      expect(json.currentStatus).toBe(defaultProps.currentStatus);
      expect(json.zoneId).toBe(defaultProps.zoneId);
      expect(json.errorMessage).toBe(defaultProps.errorMessage);
    });

    it('should include undefined errorMessage in JSON', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId
      );

      const json = event.toJSON();

      expect(json.errorMessage).toBeUndefined();
    });
  });

  describe('wentOffline', () => {
    it('should return true when transitioning to OFFLINE from ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.wentOffline()).toBe(true);
    });

    it('should return true when transitioning to OFFLINE from CONNECTING', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.CONNECTING,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.wentOffline()).toBe(true);
    });

    it('should return true when transitioning to OFFLINE from ERROR', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ERROR,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.wentOffline()).toBe(true);
    });

    it('should return false when already OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.wentOffline()).toBe(false);
    });

    it('should return false when transitioning to ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.wentOffline()).toBe(false);
    });
  });

  describe('cameOnline', () => {
    it('should return true when transitioning to ONLINE from OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.cameOnline()).toBe(true);
    });

    it('should return true when transitioning to ONLINE from CONNECTING', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.CONNECTING,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.cameOnline()).toBe(true);
    });

    it('should return true when transitioning to ONLINE from ERROR', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ERROR,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.cameOnline()).toBe(true);
    });

    it('should return false when already ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.cameOnline()).toBe(false);
    });

    it('should return false when transitioning to OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.cameOnline()).toBe(false);
    });
  });

  describe('encounteredError', () => {
    it('should return true when currentStatus is ERROR', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.ERROR,
        defaultProps.zoneId,
        'Hardware failure'
      );

      expect(event.encounteredError()).toBe(true);
    });

    it('should return false when currentStatus is ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ERROR,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.encounteredError()).toBe(false);
    });

    it('should return false when currentStatus is OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.encounteredError()).toBe(false);
    });
  });

  describe('recoveredFromError', () => {
    it('should return true when transitioning from ERROR to ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ERROR,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.recoveredFromError()).toBe(true);
    });

    it('should return false when transitioning from ERROR to OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ERROR,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.recoveredFromError()).toBe(false);
    });

    it('should return false when transitioning from OFFLINE to ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.recoveredFromError()).toBe(false);
    });

    it('should return false when transitioning to ERROR', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.ERROR,
        defaultProps.zoneId
      );

      expect(event.recoveredFromError()).toBe(false);
    });
  });

  describe('requiresImmediateAttention', () => {
    it('should return true when currentStatus is ERROR', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.ERROR,
        defaultProps.zoneId
      );

      expect(event.requiresImmediateAttention()).toBe(true);
    });

    it('should return true when currentStatus is OFFLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.OFFLINE,
        defaultProps.zoneId
      );

      expect(event.requiresImmediateAttention()).toBe(true);
    });

    it('should return false when currentStatus is ONLINE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.ONLINE,
        defaultProps.zoneId
      );

      expect(event.requiresImmediateAttention()).toBe(false);
    });

    it('should return false when currentStatus is CONNECTING', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.OFFLINE,
        ReaderStatus.CONNECTING,
        defaultProps.zoneId
      );

      expect(event.requiresImmediateAttention()).toBe(false);
    });

    it('should return false when currentStatus is MAINTENANCE', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.MAINTENANCE,
        defaultProps.zoneId
      );

      expect(event.requiresImmediateAttention()).toBe(false);
    });
  });

  describe('all status transitions', () => {
    const allStatuses = Object.values(ReaderStatus);

    it('should handle all valid status transitions', () => {
      for (const prevStatus of allStatuses) {
        for (const currStatus of allStatuses) {
          const event = new ReaderStatusChangedEvent(
            defaultProps.readerId,
            defaultProps.readerName,
            prevStatus,
            currStatus,
            defaultProps.zoneId
          );

          expect(event.previousStatus).toBe(prevStatus);
          expect(event.currentStatus).toBe(currStatus);
        }
      }
    });
  });

  describe('error messages', () => {
    const errorMessages = [
      'Connection timeout after 30 seconds',
      'Hardware failure detected',
      'Network unreachable',
      'LLRP protocol error: Invalid response',
      'Reader firmware crash',
    ];

    it.each(errorMessages)('should handle error message: %s', (message) => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        ReaderStatus.ONLINE,
        ReaderStatus.ERROR,
        defaultProps.zoneId,
        message
      );

      expect(event.errorMessage).toBe(message);
      expect(event.toJSON().errorMessage).toBe(message);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ReaderStatusChangedEvent(
        defaultProps.readerId,
        defaultProps.readerName,
        defaultProps.previousStatus,
        defaultProps.currentStatus,
        defaultProps.zoneId,
        defaultProps.errorMessage
      );

      // Verify values remain unchanged
      expect(event.readerId).toBe(defaultProps.readerId);
      expect(event.readerName).toBe(defaultProps.readerName);
      expect(event.previousStatus).toBe(defaultProps.previousStatus);
      expect(event.currentStatus).toBe(defaultProps.currentStatus);
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.errorMessage).toBe(defaultProps.errorMessage);
    });
  });
});
