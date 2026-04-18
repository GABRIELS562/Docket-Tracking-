import { ZoneMapper } from '@application/mappers/ZoneMapper';
import { Zone, ZoneType } from '@domain/entities/Zone';

import type { CreateZoneDTO } from '@application/dto/ZoneDTO';

describe('ZoneMapper', () => {
  describe('toDTO', () => {
    it('should convert Zone entity to DTO with all required fields', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 500,
      })._unsafeUnwrap();

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.id).toBe('zone-001');
      expect(dto.name).toBe('Storage Area A');
      expect(dto.code).toBe('STOR-A');
      expect(dto.zoneType).toBe('STORAGE');
      expect(dto.capacity).toBe(500);
      expect(dto.currentOccupancy).toBe(0);
      expect(dto.occupancyPercentage).toBe(0);
      expect(dto.occupancyStatus).toBe('normal');
      expect(dto.building).toBeNull();
      expect(dto.floorNumber).toBeNull();
      expect(dto.parentZoneId).toBeNull();
      expect(dto.isActive).toBe(true);
      expect(dto.coordinates).toBeNull();
      expect(dto.readerIds).toEqual([]);
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });

    it('should convert Zone entity with optional fields to DTO', () => {
      const zone = Zone.create({
        id: 'zone-002',
        name: 'Examination Lab B',
        code: 'EXAM-B',
        zoneType: ZoneType.EXAMINATION,
        capacity: 100,
        building: 'Main Building',
        floorNumber: 2,
        parentZoneId: 'zone-building-001',
        coordinates: { x: 34.0522, y: -118.2437 },
        readerIds: ['reader-001', 'reader-002'],
      })._unsafeUnwrap();

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.building).toBe('Main Building');
      expect(dto.floorNumber).toBe(2);
      expect(dto.parentZoneId).toBe('zone-building-001');
      expect(dto.coordinates).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
      });
      expect(dto.readerIds).toEqual(['reader-001', 'reader-002']);
    });

    it('should convert dates to ISO 8601 strings', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 500,
      })._unsafeUnwrap();

      const dto = ZoneMapper.toDTO(zone);

      // Validate ISO 8601 format
      expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(dto.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should handle all zone types correctly', () => {
      const zoneTypeMapping: Record<ZoneType, string> = {
        [ZoneType.STORAGE]: 'STORAGE',
        [ZoneType.EXAMINATION]: 'EXAMINATION',
        [ZoneType.TRANSIT]: 'TRANSIT',
        [ZoneType.ARCHIVE]: 'ARCHIVE',
        [ZoneType.OFFICE]: 'OFFICE',
        [ZoneType.CORRIDOR]: 'CORRIDOR',
        [ZoneType.ENTRANCE]: 'ENTRANCE',
      };

      for (const [zoneType, expectedDtoType] of Object.entries(zoneTypeMapping)) {
        const zone = Zone.create({
          id: `zone-${zoneType}`,
          name: `Zone ${zoneType}`,
          code: `ZONE-${zoneType}`.toUpperCase(),
          zoneType: zoneType as ZoneType,
          capacity: 100,
        })._unsafeUnwrap();

        const dto = ZoneMapper.toDTO(zone);
        expect(dto.zoneType).toBe(expectedDtoType);
      }
    });

    it('should calculate occupancy percentage correctly', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
      })._unsafeUnwrap();

      // Add 50 items
      for (let i = 0; i < 50; i++) {
        zone.addItem();
      }

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.currentOccupancy).toBe(50);
      expect(dto.occupancyPercentage).toBe(50);
      expect(dto.occupancyStatus).toBe('normal');
    });

    it('should set occupancy status to warning when >= 75%', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
      })._unsafeUnwrap();

      // Add 80 items
      for (let i = 0; i < 80; i++) {
        zone.addItem();
      }

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.occupancyPercentage).toBe(80);
      expect(dto.occupancyStatus).toBe('warning');
    });

    it('should set occupancy status to critical when >= 90%', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
      })._unsafeUnwrap();

      // Add 95 items
      for (let i = 0; i < 95; i++) {
        zone.addItem();
      }

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.occupancyPercentage).toBe(95);
      expect(dto.occupancyStatus).toBe('critical');
    });

    it('should set occupancy status to full when at 100%', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
      })._unsafeUnwrap();

      // Fill to capacity
      for (let i = 0; i < 100; i++) {
        zone.addItem();
      }

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.occupancyPercentage).toBe(100);
      expect(dto.occupancyStatus).toBe('full');
    });

    it('should handle zero capacity zone', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Zero Capacity Zone',
        code: 'ZERO-CAP',
        zoneType: ZoneType.CORRIDOR,
        capacity: 0,
      })._unsafeUnwrap();

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.capacity).toBe(0);
      expect(dto.occupancyPercentage).toBe(0);
      expect(dto.occupancyStatus).toBe('normal');
    });

    it('should handle inactive zone', () => {
      const zone = Zone.create({
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
        zoneType: ZoneType.STORAGE,
        capacity: 100,
      })._unsafeUnwrap();

      zone.deactivate();

      const dto = ZoneMapper.toDTO(zone);

      expect(dto.isActive).toBe(false);
    });
  });

  describe('toDTOArray', () => {
    it('should convert array of Zone entities to DTOs', () => {
      const zones = [
        Zone.create({
          id: 'zone-001',
          name: 'Storage A',
          code: 'STOR-A',
          zoneType: ZoneType.STORAGE,
          capacity: 500,
        })._unsafeUnwrap(),
        Zone.create({
          id: 'zone-002',
          name: 'Storage B',
          code: 'STOR-B',
          zoneType: ZoneType.STORAGE,
          capacity: 300,
        })._unsafeUnwrap(),
        Zone.create({
          id: 'zone-003',
          name: 'Archive',
          code: 'ARCH',
          zoneType: ZoneType.ARCHIVE,
          capacity: 1000,
        })._unsafeUnwrap(),
      ];

      const dtos = ZoneMapper.toDTOArray(zones);

      expect(dtos).toHaveLength(3);
      expect(dtos[0].id).toBe('zone-001');
      expect(dtos[0].name).toBe('Storage A');
      expect(dtos[1].id).toBe('zone-002');
      expect(dtos[1].name).toBe('Storage B');
      expect(dtos[2].id).toBe('zone-003');
      expect(dtos[2].zoneType).toBe('ARCHIVE');
    });

    it('should return empty array for empty input', () => {
      const dtos = ZoneMapper.toDTOArray([]);

      expect(dtos).toEqual([]);
    });
  });

  describe('fromCreateDTO', () => {
    it('should convert CreateZoneDTO to Zone entity', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR-A',
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zone = result.value;
        expect(zone.getId()).toBe('zone-new-001');
        expect(zone.getCode()).toBe('STOR-A');
        expect(zone.getName()).toBe('Storage Area A');
        expect(zone.getZoneType()).toBe(ZoneType.STORAGE);
        expect(zone.getCapacity()).toBe(500);
        expect(zone.getCurrentOccupancy()).toBe(0);
        expect(zone.isActive()).toBe(true);
      }
    });

    it('should convert CreateZoneDTO with all optional fields to Zone entity', () => {
      const dto: CreateZoneDTO = {
        code: 'EXAM-B',
        name: 'Examination Lab B',
        zoneType: 'EXAMINATION',
        capacity: 100,
        building: 'Science Building',
        floorNumber: 3,
        parentZoneId: 'zone-building-001',
        coordinates: {
          latitude: 34.0522,
          longitude: -118.2437,
        },
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-002');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zone = result.value;
        expect(zone.getBuilding()).toBe('Science Building');
        expect(zone.getFloorNumber()).toBe(3);
        expect(zone.getParentZoneId()).toBe('zone-building-001');
        expect(zone.getCoordinates()).toEqual({ x: 34.0522, y: -118.2437 });
      }
    });

    it('should handle all zone types correctly', () => {
      const zoneTypes: CreateZoneDTO['zoneType'][] = [
        'STORAGE',
        'EXAMINATION',
        'TRANSIT',
        'ARCHIVE',
        'OFFICE',
        'CORRIDOR',
        'ENTRANCE',
      ];

      for (const zoneType of zoneTypes) {
        const dto: CreateZoneDTO = {
          code: `ZONE-${zoneType}`,
          name: `Zone ${zoneType}`,
          zoneType,
          capacity: 100,
        };

        const result = ZoneMapper.fromCreateDTO(dto, `zone-${zoneType.toLowerCase()}`);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const expectedDomainType = zoneType.toLowerCase() as ZoneType;
          expect(result.value.getZoneType()).toBe(expectedDomainType);
        }
      }
    });

    it('should return error for empty zone name', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR-A',
        name: '', // Invalid: empty
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for empty zone code', () => {
      const dto: CreateZoneDTO = {
        code: '', // Invalid: empty
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for negative capacity', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR-A',
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: -10, // Invalid: negative
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for invalid zone code format', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR A', // Invalid: contains space
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should handle CreateZoneDTO without coordinates', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR-A',
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getCoordinates()).toBeUndefined();
      }
    });

    it('should handle CreateZoneDTO without optional parentZoneId', () => {
      const dto: CreateZoneDTO = {
        code: 'STOR-A',
        name: 'Storage Area A',
        zoneType: 'STORAGE',
        capacity: 500,
      };

      const result = ZoneMapper.fromCreateDTO(dto, 'zone-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getParentZoneId()).toBeNull();
      }
    });
  });
});
