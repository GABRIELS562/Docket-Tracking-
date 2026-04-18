import { ZoneOccupancyChangedEvent } from '@domain/events/ZoneOccupancyChangedEvent';

describe('ZoneOccupancyChangedEvent', () => {
  const defaultProps = {
    zoneId: 'zone-storage-001',
    zoneName: 'Storage Area A',
    previousOccupancy: 341,
    currentOccupancy: 342,
    capacity: 500,
    changeReason: 'item_added' as const,
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.zoneName).toBe(defaultProps.zoneName);
      expect(event.previousOccupancy).toBe(defaultProps.previousOccupancy);
      expect(event.currentOccupancy).toBe(defaultProps.currentOccupancy);
      expect(event.capacity).toBe(defaultProps.capacity);
      expect(event.changeReason).toBe(defaultProps.changeReason);
    });

    it('should set eventType to ZoneOccupancyChanged', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      expect(event.eventType).toBe('ZoneOccupancyChanged');
    });

    it('should set version to 1 by default', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      expect(event.version).toBe(1);
    });

    it('should generate unique eventId', () => {
      const event1 = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      const event2 = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('getPayload / toJSON', () => {
    it('should include all event-specific properties in JSON', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      const json = event.toJSON();

      expect(json.zoneId).toBe(defaultProps.zoneId);
      expect(json.zoneName).toBe(defaultProps.zoneName);
      expect(json.previousOccupancy).toBe(defaultProps.previousOccupancy);
      expect(json.currentOccupancy).toBe(defaultProps.currentOccupancy);
      expect(json.capacity).toBe(defaultProps.capacity);
      expect(json.changeReason).toBe(defaultProps.changeReason);
    });

    it('should include calculated occupancyPercentage in JSON', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        341,
        342,
        500,
        'item_added'
      );

      const json = event.toJSON();

      expect(json.occupancyPercentage).toBe(68.4); // 342/500 * 100
    });

    it('should include calculated previousPercentage in JSON', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        341,
        342,
        500,
        'item_added'
      );

      const json = event.toJSON();

      expect(json.previousPercentage).toBe(68.2); // 341/500 * 100
    });

    it('should include calculated availableSpace in JSON', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        341,
        342,
        500,
        'item_added'
      );

      const json = event.toJSON();

      expect(json.availableSpace).toBe(158); // 500 - 342
    });
  });

  describe('getOccupancyPercentage', () => {
    it('should calculate percentage correctly', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        0,
        250,
        500,
        'item_added'
      );

      expect(event.getOccupancyPercentage()).toBe(50);
    });

    it('should return 0 for empty zone', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        1,
        0,
        500,
        'item_removed'
      );

      expect(event.getOccupancyPercentage()).toBe(0);
    });

    it('should return 100 for full zone', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        499,
        500,
        500,
        'item_added'
      );

      expect(event.getOccupancyPercentage()).toBe(100);
    });

    it('should handle fractional percentages', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        0,
        333,
        1000,
        'item_added'
      );

      expect(event.getOccupancyPercentage()).toBeCloseTo(33.3, 1);
    });
  });

  describe('crossedThreshold', () => {
    describe('crossing 75% threshold upward', () => {
      it('should return true when crossing from below to above 75%', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          74,
          76,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(75)).toBe(true);
      });

      it('should return true when crossing exactly to 75%', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          74,
          75,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(75)).toBe(true);
      });
    });

    describe('crossing 75% threshold downward', () => {
      it('should return true when crossing from above to below 75%', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          76,
          74,
          100,
          'item_removed'
        );

        expect(event.crossedThreshold(75)).toBe(true);
      });
    });

    describe('not crossing threshold', () => {
      it('should return false when staying below threshold', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          70,
          72,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(75)).toBe(false);
      });

      it('should return false when staying above threshold', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          80,
          82,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(75)).toBe(false);
      });
    });

    describe('crossing 90% threshold', () => {
      it('should return true when crossing from below to above 90%', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          89,
          91,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(90)).toBe(true);
      });
    });

    describe('crossing 100% threshold', () => {
      it('should return true when becoming full', () => {
        const event = new ZoneOccupancyChangedEvent(
          defaultProps.zoneId,
          defaultProps.zoneName,
          99,
          100,
          100,
          'item_added'
        );

        expect(event.crossedThreshold(100)).toBe(true);
      });
    });
  });

  describe('becameFull', () => {
    it('should return true when reaching capacity', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        499,
        500,
        500,
        'item_added'
      );

      expect(event.becameFull()).toBe(true);
    });

    it('should return false when already at capacity', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        500,
        500,
        500,
        'manual_adjustment'
      );

      expect(event.becameFull()).toBe(false);
    });

    it('should return false when below capacity', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        400,
        450,
        500,
        'item_added'
      );

      expect(event.becameFull()).toBe(false);
    });

    it('should return false when decreasing from full', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        500,
        499,
        500,
        'item_removed'
      );

      expect(event.becameFull()).toBe(false);
    });
  });

  describe('becameAvailable', () => {
    it('should return true when going from full to not full', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        500,
        499,
        500,
        'item_removed'
      );

      expect(event.becameAvailable()).toBe(true);
    });

    it('should return false when was not full', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        400,
        399,
        500,
        'item_removed'
      );

      expect(event.becameAvailable()).toBe(false);
    });

    it('should return false when becoming full', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        499,
        500,
        500,
        'item_added'
      );

      expect(event.becameAvailable()).toBe(false);
    });

    it('should return false when still full', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        500,
        500,
        500,
        'manual_adjustment'
      );

      expect(event.becameAvailable()).toBe(false);
    });
  });

  describe('isInWarningRange', () => {
    it('should return true at 75%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        74,
        75,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(true);
    });

    it('should return true at 80%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        79,
        80,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(true);
    });

    it('should return true at 89%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        88,
        89,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(true);
    });

    it('should return false at 74%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        73,
        74,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(false);
    });

    it('should return false at 90%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        89,
        90,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(false);
    });
  });

  describe('isInCriticalRange', () => {
    it('should return true at 90%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        89,
        90,
        100,
        'item_added'
      );

      expect(event.isInCriticalRange()).toBe(true);
    });

    it('should return true at 95%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        94,
        95,
        100,
        'item_added'
      );

      expect(event.isInCriticalRange()).toBe(true);
    });

    it('should return true at 99%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        98,
        99,
        100,
        'item_added'
      );

      expect(event.isInCriticalRange()).toBe(true);
    });

    it('should return false at 89%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        88,
        89,
        100,
        'item_added'
      );

      expect(event.isInCriticalRange()).toBe(false);
    });

    it('should return false at 100%', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        99,
        100,
        100,
        'item_added'
      );

      expect(event.isInCriticalRange()).toBe(false);
    });
  });

  describe('change reasons', () => {
    const changeReasons = ['item_added', 'item_removed', 'manual_adjustment'] as const;

    it.each(changeReasons)('should handle change reason: %s', (reason) => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        reason
      );

      expect(event.changeReason).toBe(reason);
      expect(event.toJSON().changeReason).toBe(reason);
    });
  });

  describe('range classifications consistency', () => {
    it('should have no overlap between warning and critical ranges', () => {
      // Test boundary: 89% should be warning, not critical
      const eventAt89 = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        88,
        89,
        100,
        'item_added'
      );
      expect(eventAt89.isInWarningRange()).toBe(true);
      expect(eventAt89.isInCriticalRange()).toBe(false);

      // Test boundary: 90% should be critical, not warning
      const eventAt90 = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        89,
        90,
        100,
        'item_added'
      );
      expect(eventAt90.isInWarningRange()).toBe(false);
      expect(eventAt90.isInCriticalRange()).toBe(true);
    });

    it('should classify 50% as neither warning nor critical', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        49,
        50,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(false);
      expect(event.isInCriticalRange()).toBe(false);
    });

    it('should classify 100% as neither warning nor critical (full)', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        99,
        100,
        100,
        'item_added'
      );

      expect(event.isInWarningRange()).toBe(false);
      expect(event.isInCriticalRange()).toBe(false);
      expect(event.becameFull()).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const event = new ZoneOccupancyChangedEvent(
        defaultProps.zoneId,
        defaultProps.zoneName,
        defaultProps.previousOccupancy,
        defaultProps.currentOccupancy,
        defaultProps.capacity,
        defaultProps.changeReason
      );

      // Verify values remain unchanged
      expect(event.zoneId).toBe(defaultProps.zoneId);
      expect(event.zoneName).toBe(defaultProps.zoneName);
      expect(event.previousOccupancy).toBe(defaultProps.previousOccupancy);
      expect(event.currentOccupancy).toBe(defaultProps.currentOccupancy);
      expect(event.capacity).toBe(defaultProps.capacity);
      expect(event.changeReason).toBe(defaultProps.changeReason);
    });
  });
});
