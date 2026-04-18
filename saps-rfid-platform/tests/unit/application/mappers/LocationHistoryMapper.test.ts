import { LocationHistoryMapper } from '@application/mappers/LocationHistoryMapper';

import type { LocationHistoryEntry } from '@domain/repositories/ILocationHistoryRepository';

describe('LocationHistoryMapper', () => {
  describe('toDTO', () => {
    it('should convert LocationHistoryEntry to DTO with all required fields', () => {
      const entry: LocationHistoryEntry = {
        time: new Date('2025-10-02T14:32:11.123Z'),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Storage Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 2,
        rssi: -45.5,
        readCount: 15,
        locationConfidence: 0.85,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.timestamp).toBe('2025-10-02T14:32:11.123Z');
      expect(dto.itemNumber).toBe('INV-2025-000123');
      expect(dto.zoneId).toBe('zone-001');
      expect(dto.zoneName).toBe('Storage Area A');
      expect(dto.readerId).toBe('reader-001');
      expect(dto.readerName).toBe('Storage Reader A1');
      expect(dto.rfidEpc).toBe('E280116060002004DECA48DA');
      expect(dto.antennaPort).toBe(2);
      expect(dto.rssi).toBe(-45.5);
      expect(dto.readCount).toBe(15);
      expect(dto.locationConfidence).toBe(0.85);
      expect(dto.eventType).toBe('DETECTED');
    });

    it('should convert dates to ISO 8601 strings', () => {
      const entry: LocationHistoryEntry = {
        time: new Date('2025-10-02T14:32:11.000Z'),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Storage Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 1,
        locationConfidence: 0.75,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      // Validate ISO 8601 format
      expect(dto.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should handle all event types correctly', () => {
      const eventTypeMapping: Record<LocationHistoryEntry['eventType'], string> = {
        tag_read: 'DETECTED',
        zone_entry: 'ENTERED',
        zone_exit: 'EXITED',
        movement: 'MOVED',
      };

      for (const [domainEventType, expectedDtoEventType] of Object.entries(eventTypeMapping)) {
        const entry: LocationHistoryEntry = {
          time: new Date(),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-001',
          zoneName: 'Storage Area A',
          readerId: 'reader-001',
          readerName: 'Reader A1',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 1,
          rssi: -50,
          readCount: 1,
          locationConfidence: 0.75,
          eventType: domainEventType as LocationHistoryEntry['eventType'],
        };

        const dto = LocationHistoryMapper.toDTO(entry);
        expect(dto.eventType).toBe(expectedDtoEventType);
      }
    });

    it('should determine signal quality as excellent for RSSI > -40', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -35, // Excellent signal
        readCount: 1,
        locationConfidence: 0.95,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.signalQuality).toBe('excellent');
    });

    it('should determine signal quality as good for RSSI between -55 and -40', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50, // Good signal
        readCount: 1,
        locationConfidence: 0.85,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.signalQuality).toBe('good');
    });

    it('should determine signal quality as fair for RSSI between -70 and -55', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -60, // Fair signal
        readCount: 1,
        locationConfidence: 0.7,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.signalQuality).toBe('fair');
    });

    it('should determine signal quality as poor for RSSI <= -70', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -75, // Poor signal
        readCount: 1,
        locationConfidence: 0.5,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.signalQuality).toBe('poor');
    });

    it('should handle boundary RSSI values correctly', () => {
      // Test at -40 boundary
      const entryAt40: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -40, // Exactly at boundary
        readCount: 1,
        locationConfidence: 0.9,
        eventType: 'tag_read',
      };

      const dtoAt40 = LocationHistoryMapper.toDTO(entryAt40);
      expect(dtoAt40.signalQuality).toBe('good');

      // Test at -55 boundary
      const entryAt55: LocationHistoryEntry = {
        ...entryAt40,
        rssi: -55, // Exactly at boundary
      };

      const dtoAt55 = LocationHistoryMapper.toDTO(entryAt55);
      expect(dtoAt55.signalQuality).toBe('fair');

      // Test at -70 boundary
      const entryAt70: LocationHistoryEntry = {
        ...entryAt40,
        rssi: -70, // Exactly at boundary
      };

      const dtoAt70 = LocationHistoryMapper.toDTO(entryAt70);
      expect(dtoAt70.signalQuality).toBe('poor');
    });

    it('should handle null zoneId with default value', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: null, // null zoneId
        zoneName: null,
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 1,
        locationConfidence: 0.75,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.zoneId).toBe('unknown');
      expect(dto.zoneName).toBe('Unknown Zone');
    });

    it('should handle null zoneName with default value', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: null, // null zoneName
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 1,
        locationConfidence: 0.75,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.zoneId).toBe('zone-001');
      expect(dto.zoneName).toBe('Unknown Zone');
    });

    it('should handle null locationConfidence with default value', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 1,
        locationConfidence: null, // null confidence
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.locationConfidence).toBe(0);
    });

    it('should preserve valid locationConfidence value', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 1,
        locationConfidence: 0.95,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.locationConfidence).toBe(0.95);
    });

    it('should handle high read count values', () => {
      const entry: LocationHistoryEntry = {
        time: new Date(),
        itemId: 'item-001',
        itemNumber: 'INV-2025-000123',
        zoneId: 'zone-001',
        zoneName: 'Storage Area A',
        readerId: 'reader-001',
        readerName: 'Reader A1',
        rfidEpc: 'E280116060002004DECA48DA',
        antennaPort: 1,
        rssi: -50,
        readCount: 10000, // High read count
        locationConfidence: 0.99,
        eventType: 'tag_read',
      };

      const dto = LocationHistoryMapper.toDTO(entry);

      expect(dto.readCount).toBe(10000);
    });

    it('should handle different antenna ports', () => {
      for (let port = 1; port <= 4; port++) {
        const entry: LocationHistoryEntry = {
          time: new Date(),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-001',
          zoneName: 'Storage Area A',
          readerId: 'reader-001',
          readerName: 'Reader A1',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: port,
          rssi: -50,
          readCount: 1,
          locationConfidence: 0.75,
          eventType: 'tag_read',
        };

        const dto = LocationHistoryMapper.toDTO(entry);

        expect(dto.antennaPort).toBe(port);
      }
    });
  });

  describe('toDTOArray', () => {
    it('should convert array of LocationHistoryEntry to DTOs', () => {
      const entries: LocationHistoryEntry[] = [
        {
          time: new Date('2025-10-02T14:32:11.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-001',
          zoneName: 'Storage Area A',
          readerId: 'reader-001',
          readerName: 'Reader A1',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 1,
          rssi: -45,
          readCount: 5,
          locationConfidence: 0.85,
          eventType: 'tag_read',
        },
        {
          time: new Date('2025-10-02T14:35:22.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-002',
          zoneName: 'Transit Area',
          readerId: 'reader-002',
          readerName: 'Transit Reader',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 2,
          rssi: -55,
          readCount: 3,
          locationConfidence: 0.7,
          eventType: 'zone_entry',
        },
        {
          time: new Date('2025-10-02T14:40:00.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-003',
          zoneName: 'Examination Lab',
          readerId: 'reader-003',
          readerName: 'Lab Reader',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 1,
          rssi: -35,
          readCount: 10,
          locationConfidence: 0.95,
          eventType: 'movement',
        },
      ];

      const dtos = LocationHistoryMapper.toDTOArray(entries);

      expect(dtos).toHaveLength(3);
      expect(dtos[0].timestamp).toBe('2025-10-02T14:32:11.000Z');
      expect(dtos[0].zoneId).toBe('zone-001');
      expect(dtos[0].eventType).toBe('DETECTED');
      expect(dtos[1].timestamp).toBe('2025-10-02T14:35:22.000Z');
      expect(dtos[1].zoneId).toBe('zone-002');
      expect(dtos[1].eventType).toBe('ENTERED');
      expect(dtos[2].timestamp).toBe('2025-10-02T14:40:00.000Z');
      expect(dtos[2].zoneId).toBe('zone-003');
      expect(dtos[2].eventType).toBe('MOVED');
    });

    it('should return empty array for empty input', () => {
      const dtos = LocationHistoryMapper.toDTOArray([]);

      expect(dtos).toEqual([]);
    });

    it('should preserve order of entries', () => {
      const entries: LocationHistoryEntry[] = [
        {
          time: new Date('2025-10-02T10:00:00.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000001',
          zoneId: 'zone-001',
          zoneName: 'Zone 1',
          readerId: 'reader-001',
          readerName: 'Reader 1',
          rfidEpc: 'E280116060002004DECA48D1',
          antennaPort: 1,
          rssi: -50,
          readCount: 1,
          locationConfidence: 0.8,
          eventType: 'tag_read',
        },
        {
          time: new Date('2025-10-02T11:00:00.000Z'),
          itemId: 'item-002',
          itemNumber: 'INV-2025-000002',
          zoneId: 'zone-002',
          zoneName: 'Zone 2',
          readerId: 'reader-002',
          readerName: 'Reader 2',
          rfidEpc: 'E280116060002004DECA48D2',
          antennaPort: 2,
          rssi: -55,
          readCount: 2,
          locationConfidence: 0.75,
          eventType: 'zone_entry',
        },
        {
          time: new Date('2025-10-02T12:00:00.000Z'),
          itemId: 'item-003',
          itemNumber: 'INV-2025-000003',
          zoneId: 'zone-003',
          zoneName: 'Zone 3',
          readerId: 'reader-003',
          readerName: 'Reader 3',
          rfidEpc: 'E280116060002004DECA48D3',
          antennaPort: 3,
          rssi: -60,
          readCount: 3,
          locationConfidence: 0.7,
          eventType: 'zone_exit',
        },
      ];

      const dtos = LocationHistoryMapper.toDTOArray(entries);

      expect(dtos[0].timestamp).toBe('2025-10-02T10:00:00.000Z');
      expect(dtos[0].itemNumber).toBe('INV-2025-000001');
      expect(dtos[1].timestamp).toBe('2025-10-02T11:00:00.000Z');
      expect(dtos[1].itemNumber).toBe('INV-2025-000002');
      expect(dtos[2].timestamp).toBe('2025-10-02T12:00:00.000Z');
      expect(dtos[2].itemNumber).toBe('INV-2025-000003');
    });

    it('should handle array with single entry', () => {
      const entries: LocationHistoryEntry[] = [
        {
          time: new Date('2025-10-02T14:32:11.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: 'zone-001',
          zoneName: 'Storage Area A',
          readerId: 'reader-001',
          readerName: 'Reader A1',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 1,
          rssi: -45,
          readCount: 1,
          locationConfidence: 0.85,
          eventType: 'tag_read',
        },
      ];

      const dtos = LocationHistoryMapper.toDTOArray(entries);

      expect(dtos).toHaveLength(1);
      expect(dtos[0].itemNumber).toBe('INV-2025-000123');
    });

    it('should handle entries with null values correctly', () => {
      const entries: LocationHistoryEntry[] = [
        {
          time: new Date('2025-10-02T14:32:11.000Z'),
          itemId: 'item-001',
          itemNumber: 'INV-2025-000123',
          zoneId: null,
          zoneName: null,
          readerId: 'reader-001',
          readerName: 'Reader A1',
          rfidEpc: 'E280116060002004DECA48DA',
          antennaPort: 1,
          rssi: -75,
          readCount: 1,
          locationConfidence: null,
          eventType: 'tag_read',
        },
      ];

      const dtos = LocationHistoryMapper.toDTOArray(entries);

      expect(dtos).toHaveLength(1);
      expect(dtos[0].zoneId).toBe('unknown');
      expect(dtos[0].zoneName).toBe('Unknown Zone');
      expect(dtos[0].locationConfidence).toBe(0);
      expect(dtos[0].signalQuality).toBe('poor');
    });

    it('should handle large arrays efficiently', () => {
      const entries: LocationHistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        time: new Date(Date.now() - i * 1000),
        itemId: `item-${i}`,
        itemNumber: `INV-2025-${String(i).padStart(6, '0')}`,
        zoneId: `zone-${i % 10}`,
        zoneName: `Zone ${i % 10}`,
        readerId: `reader-${i % 5}`,
        readerName: `Reader ${i % 5}`,
        rfidEpc: `E280116060002004DECA${String(i).padStart(4, '0')}`,
        antennaPort: (i % 4) + 1,
        rssi: -40 - (i % 40),
        readCount: i + 1,
        locationConfidence: 0.5 + (i % 50) / 100,
        eventType: ['tag_read', 'zone_entry', 'zone_exit', 'movement'][
          i % 4
        ] as LocationHistoryEntry['eventType'],
      }));

      const startTime = Date.now();
      const dtos = LocationHistoryMapper.toDTOArray(entries);
      const endTime = Date.now();

      expect(dtos).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
