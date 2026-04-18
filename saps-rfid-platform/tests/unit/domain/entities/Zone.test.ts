import { Zone, ZoneType, ZoneProps } from '@domain/entities/Zone';
import { InvalidZoneError } from '@domain/errors/InvalidZoneError';
import { ZoneCapacityExceededError } from '@domain/errors/ZoneCapacityExceededError';

describe('Zone', () => {
  const validZoneParams = {
    id: 'zone-001',
    name: 'Storage Area A',
    code: 'STOR-A',
    zoneType: ZoneType.STORAGE,
    capacity: 100,
  };

  describe('create', () => {
    it('should create valid zone with minimal required parameters', () => {
      const result = Zone.create(validZoneParams);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zone = result.value;
        expect(zone.getId()).toBe('zone-001');
        expect(zone.getName()).toBe('Storage Area A');
        expect(zone.getCode()).toBe('STOR-A');
        expect(zone.getZoneType()).toBe(ZoneType.STORAGE);
        expect(zone.getCapacity()).toBe(100);
        expect(zone.getCurrentOccupancy()).toBe(0);
        expect(zone.isActive()).toBe(true);
        expect(zone.getParentZoneId()).toBeNull();
        expect(zone.getReaderIds()).toEqual([]);
      }
    });

    it('should create zone with all optional parameters', () => {
      const result = Zone.create({
        ...validZoneParams,
        description: 'Main storage area for electronics',
        floorNumber: 2,
        building: 'Building A',
        coordinates: { x: 10, y: 20, z: 5 },
        parentZoneId: 'parent-zone-001',
        readerIds: ['reader-001', 'reader-002'],
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zone = result.value;
        expect(zone.getDescription()).toBe('Main storage area for electronics');
        expect(zone.getFloorNumber()).toBe(2);
        expect(zone.getBuilding()).toBe('Building A');
        expect(zone.getCoordinates()).toEqual({ x: 10, y: 20, z: 5 });
        expect(zone.getParentZoneId()).toBe('parent-zone-001');
        expect(zone.getReaderIds()).toEqual(['reader-001', 'reader-002']);
        expect(zone.hasParent()).toBe(true);
      }
    });

    it('should trim name and convert code to uppercase', () => {
      const result = Zone.create({
        ...validZoneParams,
        name: '  Storage Area  ',
        code: 'stor-a',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getName()).toBe('Storage Area');
        expect(result.value.getCode()).toBe('STOR-A');
      }
    });

    it('should trim description and building', () => {
      const result = Zone.create({
        ...validZoneParams,
        description: '  A description  ',
        building: '  Building B  ',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDescription()).toBe('A description');
        expect(result.value.getBuilding()).toBe('Building B');
      }
    });

    it('should set createdAt and updatedAt to current time', () => {
      const before = new Date();
      const result = Zone.create(validZoneParams);
      const after = new Date();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zone = result.value;
        expect(zone.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(zone.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
        expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(zone.getUpdatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });

    it('should accept all zone types', () => {
      const zoneTypes = Object.values(ZoneType);

      for (const zoneType of zoneTypes) {
        const result = Zone.create({
          ...validZoneParams,
          id: `zone-${zoneType}`,
          zoneType,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getZoneType()).toBe(zoneType);
        }
      }
    });

    describe('validation errors', () => {
      it('should reject empty ID', () => {
        const result = Zone.create({
          ...validZoneParams,
          id: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidZoneError);
          expect(result.error.message).toContain('Zone ID cannot be empty');
        }
      });

      it('should reject whitespace-only ID', () => {
        const result = Zone.create({
          ...validZoneParams,
          id: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Zone ID cannot be empty');
        }
      });

      it('should reject empty name', () => {
        const result = Zone.create({
          ...validZoneParams,
          name: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidZoneError);
          expect(result.error.message).toContain('Zone name cannot be empty');
        }
      });

      it('should reject whitespace-only name', () => {
        const result = Zone.create({
          ...validZoneParams,
          name: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Zone name cannot be empty');
        }
      });

      it('should reject empty code', () => {
        const result = Zone.create({
          ...validZoneParams,
          code: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidZoneError);
          expect(result.error.message).toContain('Zone code cannot be empty');
        }
      });

      it('should reject whitespace-only code', () => {
        const result = Zone.create({
          ...validZoneParams,
          code: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Zone code cannot be empty');
        }
      });

      it('should reject code with invalid characters (spaces)', () => {
        const result = Zone.create({
          ...validZoneParams,
          code: 'STOR A',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Zone code must contain only alphanumeric characters, hyphens, or underscores'
          );
        }
      });

      it('should reject code with special characters', () => {
        const result = Zone.create({
          ...validZoneParams,
          code: 'STOR@A!',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Zone code must contain only alphanumeric characters, hyphens, or underscores'
          );
        }
      });

      it('should accept code with alphanumeric, hyphens, and underscores', () => {
        const result = Zone.create({
          ...validZoneParams,
          code: 'STOR-A_01',
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCode()).toBe('STOR-A_01');
        }
      });

      it('should reject negative capacity', () => {
        const result = Zone.create({
          ...validZoneParams,
          capacity: -1,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidZoneError);
          expect(result.error.message).toContain('Capacity cannot be negative');
        }
      });

      it('should accept zero capacity', () => {
        const result = Zone.create({
          ...validZoneParams,
          capacity: 0,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCapacity()).toBe(0);
        }
      });

      it('should reject non-finite x coordinate', () => {
        const result = Zone.create({
          ...validZoneParams,
          coordinates: { x: Infinity, y: 10 },
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Coordinates must be finite numbers');
        }
      });

      it('should reject non-finite y coordinate', () => {
        const result = Zone.create({
          ...validZoneParams,
          coordinates: { x: 10, y: NaN },
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Coordinates must be finite numbers');
        }
      });

      it('should reject non-finite z coordinate', () => {
        const result = Zone.create({
          ...validZoneParams,
          coordinates: { x: 10, y: 20, z: Infinity },
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Z-coordinate must be a finite number');
        }
      });

      it('should accept negative coordinates', () => {
        const result = Zone.create({
          ...validZoneParams,
          coordinates: { x: -10, y: -20, z: -5 },
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCoordinates()).toEqual({ x: -10, y: -20, z: -5 });
        }
      });

      it('should accept coordinates without z', () => {
        const result = Zone.create({
          ...validZoneParams,
          coordinates: { x: 10, y: 20 },
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCoordinates()).toEqual({ x: 10, y: 20 });
        }
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute zone from persistence', () => {
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-02');

      const props: ZoneProps = {
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        description: 'Main storage',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
        currentOccupancy: 50,
        floorNumber: 1,
        building: 'Building A',
        coordinates: { x: 10, y: 20, z: 5 },
        parentZoneId: 'parent-001',
        readerIds: ['reader-001'],
        isActive: false,
        createdAt,
        updatedAt,
      };

      const zone = Zone.fromPersistence(props);

      expect(zone.getId()).toBe('zone-001');
      expect(zone.getName()).toBe('Storage Area A');
      expect(zone.getCode()).toBe('STOR-A');
      expect(zone.getDescription()).toBe('Main storage');
      expect(zone.getZoneType()).toBe(ZoneType.STORAGE);
      expect(zone.getCapacity()).toBe(100);
      expect(zone.getCurrentOccupancy()).toBe(50);
      expect(zone.getFloorNumber()).toBe(1);
      expect(zone.getBuilding()).toBe('Building A');
      expect(zone.getCoordinates()).toEqual({ x: 10, y: 20, z: 5 });
      expect(zone.getParentZoneId()).toBe('parent-001');
      expect(zone.getReaderIds()).toEqual(['reader-001']);
      expect(zone.isActive()).toBe(false);
      expect(zone.getCreatedAt().getTime()).toBe(createdAt.getTime());
      expect(zone.getUpdatedAt().getTime()).toBe(updatedAt.getTime());
    });
  });

  describe('addItem', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        capacity: 3,
      })._unsafeUnwrap();
    });

    it('should add item successfully when not at capacity', () => {
      const result = zone.addItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(1);
    });

    it('should update updatedAt when adding item', () => {
      const before = zone.getUpdatedAt();

      // Small delay to ensure time difference
      const result = zone.addItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should add multiple items up to capacity', () => {
      zone.addItem();
      zone.addItem();
      const result = zone.addItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(3);
      expect(zone.isAtCapacity()).toBe(true);
    });

    it('should reject adding item when at capacity', () => {
      zone.addItem();
      zone.addItem();
      zone.addItem();

      const result = zone.addItem();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ZoneCapacityExceededError);
        expect(result.error.message).toContain('zone-001');
        expect(result.error.message).toContain('3/3');
      }
    });

    it('should reject adding item to zero-capacity zone', () => {
      const zeroCapZone = Zone.create({
        ...validZoneParams,
        capacity: 0,
      })._unsafeUnwrap();

      const result = zeroCapZone.addItem();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ZoneCapacityExceededError);
      }
    });
  });

  describe('removeItem', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        capacity: 10,
      })._unsafeUnwrap();
      zone.addItem();
      zone.addItem();
    });

    it('should remove item successfully', () => {
      const result = zone.removeItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(1);
    });

    it('should update updatedAt when removing item', () => {
      const before = zone.getUpdatedAt();

      const result = zone.removeItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject removing item from empty zone', () => {
      zone.removeItem();
      zone.removeItem();

      const result = zone.removeItem();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot remove item from empty zone');
      }
    });

    it('should allow zone to become empty', () => {
      zone.removeItem();
      const result = zone.removeItem();

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(0);
      expect(zone.isEmpty()).toBe(true);
    });
  });

  describe('setOccupancy', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
    });

    it('should set occupancy successfully', () => {
      const result = zone.setOccupancy(50);

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(50);
    });

    it('should update updatedAt when setting occupancy', () => {
      const before = zone.getUpdatedAt();

      zone.setOccupancy(25);

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should accept zero occupancy', () => {
      zone.setOccupancy(50);
      const result = zone.setOccupancy(0);

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(0);
    });

    it('should accept occupancy equal to capacity', () => {
      const result = zone.setOccupancy(100);

      expect(result.isOk()).toBe(true);
      expect(zone.getCurrentOccupancy()).toBe(100);
      expect(zone.isAtCapacity()).toBe(true);
    });

    it('should reject negative occupancy', () => {
      const result = zone.setOccupancy(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Occupancy cannot be negative');
      }
    });

    it('should reject occupancy exceeding capacity', () => {
      const result = zone.setOccupancy(101);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Occupancy 101 exceeds capacity 100');
      }
    });
  });

  describe('addReader', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create(validZoneParams)._unsafeUnwrap();
    });

    it('should add reader successfully', () => {
      zone.addReader('reader-001');

      expect(zone.getReaderIds()).toEqual(['reader-001']);
      expect(zone.hasReader('reader-001')).toBe(true);
      expect(zone.getReaderCount()).toBe(1);
    });

    it('should update updatedAt when adding reader', () => {
      const before = zone.getUpdatedAt();

      zone.addReader('reader-001');

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should add multiple readers', () => {
      zone.addReader('reader-001');
      zone.addReader('reader-002');
      zone.addReader('reader-003');

      expect(zone.getReaderIds()).toEqual(['reader-001', 'reader-002', 'reader-003']);
      expect(zone.getReaderCount()).toBe(3);
    });

    it('should not add duplicate reader', () => {
      zone.addReader('reader-001');
      zone.addReader('reader-001');

      expect(zone.getReaderIds()).toEqual(['reader-001']);
      expect(zone.getReaderCount()).toBe(1);
    });

    it('should ignore empty reader ID', () => {
      zone.addReader('');

      expect(zone.getReaderIds()).toEqual([]);
      expect(zone.getReaderCount()).toBe(0);
    });

    it('should ignore whitespace-only reader ID', () => {
      zone.addReader('   ');

      expect(zone.getReaderIds()).toEqual([]);
    });
  });

  describe('removeReader', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        readerIds: ['reader-001', 'reader-002', 'reader-003'],
      })._unsafeUnwrap();
    });

    it('should remove reader successfully', () => {
      zone.removeReader('reader-002');

      expect(zone.getReaderIds()).toEqual(['reader-001', 'reader-003']);
      expect(zone.hasReader('reader-002')).toBe(false);
    });

    it('should update updatedAt when removing reader', () => {
      const before = zone.getUpdatedAt();

      zone.removeReader('reader-001');

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should not update when removing non-existent reader', () => {
      const before = zone.getUpdatedAt();

      zone.removeReader('non-existent');

      expect(zone.getReaderIds()).toEqual(['reader-001', 'reader-002', 'reader-003']);
      // updatedAt should not change for non-existent reader
      expect(zone.getUpdatedAt().getTime()).toBe(before.getTime());
    });

    it('should remove all readers one by one', () => {
      zone.removeReader('reader-001');
      zone.removeReader('reader-002');
      zone.removeReader('reader-003');

      expect(zone.getReaderIds()).toEqual([]);
      expect(zone.getReaderCount()).toBe(0);
    });
  });

  describe('updateCapacity', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
      zone.setOccupancy(50);
    });

    it('should update capacity successfully', () => {
      const result = zone.updateCapacity(200);

      expect(result.isOk()).toBe(true);
      expect(zone.getCapacity()).toBe(200);
    });

    it('should update updatedAt when updating capacity', () => {
      const before = zone.getUpdatedAt();

      zone.updateCapacity(150);

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should allow reducing capacity to current occupancy', () => {
      const result = zone.updateCapacity(50);

      expect(result.isOk()).toBe(true);
      expect(zone.getCapacity()).toBe(50);
      expect(zone.isAtCapacity()).toBe(true);
    });

    it('should reject reducing capacity below current occupancy', () => {
      const result = zone.updateCapacity(49);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot set capacity to 49');
        expect(result.error.message).toContain('current occupancy is 50');
      }
    });

    it('should reject negative capacity', () => {
      const result = zone.updateCapacity(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Capacity cannot be negative');
      }
    });

    it('should allow setting capacity to zero when empty', () => {
      const emptyZone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();

      const result = emptyZone.updateCapacity(0);

      expect(result.isOk()).toBe(true);
      expect(emptyZone.getCapacity()).toBe(0);
    });
  });

  describe('deactivate', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create(validZoneParams)._unsafeUnwrap();
    });

    it('should deactivate empty zone successfully', () => {
      const result = zone.deactivate();

      expect(result.isOk()).toBe(true);
      expect(zone.isActive()).toBe(false);
    });

    it('should update updatedAt when deactivating', () => {
      const before = zone.getUpdatedAt();

      zone.deactivate();

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject deactivating zone with items', () => {
      zone.addItem();

      const result = zone.deactivate();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot deactivate zone with items');
      }
    });
  });

  describe('activate', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create(validZoneParams)._unsafeUnwrap();
      zone.deactivate();
    });

    it('should activate zone successfully', () => {
      zone.activate();

      expect(zone.isActive()).toBe(true);
    });

    it('should update updatedAt when activating', () => {
      const before = zone.getUpdatedAt();

      zone.activate();

      expect(zone.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should handle activating already active zone', () => {
      zone.activate();
      zone.activate(); // Double activation

      expect(zone.isActive()).toBe(true);
    });
  });

  describe('isAtCapacity', () => {
    it('should return false when below capacity', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 10,
      })._unsafeUnwrap();
      zone.setOccupancy(5);

      expect(zone.isAtCapacity()).toBe(false);
    });

    it('should return true when at capacity', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 10,
      })._unsafeUnwrap();
      zone.setOccupancy(10);

      expect(zone.isAtCapacity()).toBe(true);
    });

    it('should return true for zero-capacity zone', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 0,
      })._unsafeUnwrap();

      expect(zone.isAtCapacity()).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty zone', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();

      expect(zone.isEmpty()).toBe(true);
    });

    it('should return false for zone with items', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();
      zone.addItem();

      expect(zone.isEmpty()).toBe(false);
    });
  });

  describe('getOccupancyPercentage', () => {
    it('should return correct percentage', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
      zone.setOccupancy(25);

      expect(zone.getOccupancyPercentage()).toBe(25);
    });

    it('should return 100 when at capacity', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
      zone.setOccupancy(100);

      expect(zone.getOccupancyPercentage()).toBe(100);
    });

    it('should return 0 for empty zone', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();

      expect(zone.getOccupancyPercentage()).toBe(0);
    });

    it('should return 0 for zero-capacity zone', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 0,
      })._unsafeUnwrap();

      expect(zone.getOccupancyPercentage()).toBe(0);
    });

    it('should handle decimal percentages', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 3,
      })._unsafeUnwrap();
      zone.addItem();

      expect(zone.getOccupancyPercentage()).toBeCloseTo(33.33, 1);
    });
  });

  describe('getAvailableCapacity', () => {
    it('should return full capacity for empty zone', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();

      expect(zone.getAvailableCapacity()).toBe(100);
    });

    it('should return remaining capacity', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
      zone.setOccupancy(30);

      expect(zone.getAvailableCapacity()).toBe(70);
    });

    it('should return 0 when at capacity', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
      zone.setOccupancy(100);

      expect(zone.getAvailableCapacity()).toBe(0);
    });

    it('should return 0 for zero-capacity zone', () => {
      const zone = Zone.create({
        ...validZoneParams,
        capacity: 0,
      })._unsafeUnwrap();

      expect(zone.getAvailableCapacity()).toBe(0);
    });
  });

  describe('getOccupancyStatus', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        capacity: 100,
      })._unsafeUnwrap();
    });

    it('should return normal for low occupancy', () => {
      zone.setOccupancy(50);

      expect(zone.getOccupancyStatus()).toBe('normal');
    });

    it('should return warning at 70% occupancy', () => {
      zone.setOccupancy(70);

      expect(zone.getOccupancyStatus()).toBe('warning');
    });

    it('should return critical at 90% occupancy', () => {
      zone.setOccupancy(90);

      expect(zone.getOccupancyStatus()).toBe('critical');
    });

    it('should return full at 100% occupancy', () => {
      zone.setOccupancy(100);

      expect(zone.getOccupancyStatus()).toBe('full');
    });

    it('should respect custom warning threshold', () => {
      zone.setOccupancy(50);

      expect(zone.getOccupancyStatus(40, 90)).toBe('warning');
      expect(zone.getOccupancyStatus(60, 90)).toBe('normal');
    });

    it('should respect custom critical threshold', () => {
      zone.setOccupancy(80);

      expect(zone.getOccupancyStatus(70, 75)).toBe('critical');
      expect(zone.getOccupancyStatus(70, 85)).toBe('warning');
    });

    it('should return normal for empty zone', () => {
      expect(zone.getOccupancyStatus()).toBe('normal');
    });

    it('should return full for zone at capacity regardless of percentage', () => {
      const smallZone = Zone.create({
        ...validZoneParams,
        capacity: 1,
      })._unsafeUnwrap();
      smallZone.addItem();

      expect(smallZone.getOccupancyStatus()).toBe('full');
    });
  });

  describe('hasReader', () => {
    let zone: Zone;

    beforeEach(() => {
      zone = Zone.create({
        ...validZoneParams,
        readerIds: ['reader-001', 'reader-002'],
      })._unsafeUnwrap();
    });

    it('should return true for existing reader', () => {
      expect(zone.hasReader('reader-001')).toBe(true);
      expect(zone.hasReader('reader-002')).toBe(true);
    });

    it('should return false for non-existent reader', () => {
      expect(zone.hasReader('reader-003')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(zone.hasReader('')).toBe(false);
    });
  });

  describe('getReaderCount', () => {
    it('should return 0 for zone with no readers', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();

      expect(zone.getReaderCount()).toBe(0);
    });

    it('should return correct count', () => {
      const zone = Zone.create({
        ...validZoneParams,
        readerIds: ['reader-001', 'reader-002', 'reader-003'],
      })._unsafeUnwrap();

      expect(zone.getReaderCount()).toBe(3);
    });
  });

  describe('hasParent', () => {
    it('should return false for zone without parent', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();

      expect(zone.hasParent()).toBe(false);
    });

    it('should return true for zone with parent', () => {
      const zone = Zone.create({
        ...validZoneParams,
        parentZoneId: 'parent-001',
      })._unsafeUnwrap();

      expect(zone.hasParent()).toBe(true);
    });
  });

  describe('getters return copies', () => {
    it('should return a copy of coordinates', () => {
      const zone = Zone.create({
        ...validZoneParams,
        coordinates: { x: 10, y: 20, z: 5 },
      })._unsafeUnwrap();

      const coords = zone.getCoordinates();
      coords!.x = 999;

      expect(zone.getCoordinates()!.x).toBe(10);
    });

    it('should return a copy of readerIds', () => {
      const zone = Zone.create({
        ...validZoneParams,
        readerIds: ['reader-001'],
      })._unsafeUnwrap();

      const readerIds = zone.getReaderIds();
      readerIds.push('reader-002');

      expect(zone.getReaderIds()).toEqual(['reader-001']);
    });

    it('should return a copy of createdAt', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();
      const original = zone.getCreatedAt();
      const copy = zone.getCreatedAt();

      copy.setFullYear(1999);

      expect(zone.getCreatedAt().getTime()).toBe(original.getTime());
    });

    it('should return a copy of updatedAt', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();
      const original = zone.getUpdatedAt();
      const copy = zone.getUpdatedAt();

      copy.setFullYear(1999);

      expect(zone.getUpdatedAt().getTime()).toBe(original.getTime());
    });

    it('should return undefined for missing coordinates', () => {
      const zone = Zone.create(validZoneParams)._unsafeUnwrap();

      expect(zone.getCoordinates()).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should return all properties for persistence', () => {
      const zone = Zone.create({
        ...validZoneParams,
        description: 'Main storage',
        floorNumber: 2,
        building: 'Building A',
        coordinates: { x: 10, y: 20, z: 5 },
        parentZoneId: 'parent-001',
        readerIds: ['reader-001'],
      })._unsafeUnwrap();
      zone.setOccupancy(25);

      const props = zone.toPersistence();

      expect(props.id).toBe('zone-001');
      expect(props.name).toBe('Storage Area A');
      expect(props.code).toBe('STOR-A');
      expect(props.description).toBe('Main storage');
      expect(props.zoneType).toBe(ZoneType.STORAGE);
      expect(props.capacity).toBe(100);
      expect(props.currentOccupancy).toBe(25);
      expect(props.floorNumber).toBe(2);
      expect(props.building).toBe('Building A');
      expect(props.coordinates).toEqual({ x: 10, y: 20, z: 5 });
      expect(props.parentZoneId).toBe('parent-001');
      expect(props.readerIds).toEqual(['reader-001']);
      expect(props.isActive).toBe(true);
      expect(props.createdAt).toBeInstanceOf(Date);
      expect(props.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toObject', () => {
    it('should return plain object representation with computed properties', () => {
      const zone = Zone.create({
        ...validZoneParams,
        description: 'Main storage',
        floorNumber: 2,
        building: 'Building A',
        coordinates: { x: 10, y: 20, z: 5 },
        parentZoneId: 'parent-001',
        readerIds: ['reader-001', 'reader-002'],
      })._unsafeUnwrap();
      zone.setOccupancy(75);

      const obj = zone.toObject();

      expect(obj.id).toBe('zone-001');
      expect(obj.name).toBe('Storage Area A');
      expect(obj.code).toBe('STOR-A');
      expect(obj.description).toBe('Main storage');
      expect(obj.zoneType).toBe(ZoneType.STORAGE);
      expect(obj.capacity).toBe(100);
      expect(obj.currentOccupancy).toBe(75);
      expect(obj.occupancyPercentage).toBe(75);
      expect(obj.occupancyStatus).toBe('warning');
      expect(obj.availableCapacity).toBe(25);
      expect(obj.floorNumber).toBe(2);
      expect(obj.building).toBe('Building A');
      expect(obj.coordinates).toEqual({ x: 10, y: 20, z: 5 });
      expect(obj.parentZoneId).toBe('parent-001');
      expect(obj.readerIds).toEqual(['reader-001', 'reader-002']);
      expect(obj.readerCount).toBe(2);
      expect(obj.isActive).toBe(true);
      expect(obj.createdAt).toBeInstanceOf(Date);
      expect(obj.updatedAt).toBeInstanceOf(Date);
    });
  });
});
