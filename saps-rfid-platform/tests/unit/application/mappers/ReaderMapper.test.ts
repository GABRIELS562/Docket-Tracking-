import { ReaderMapper } from '@application/mappers/ReaderMapper';
import { Reader, ReaderStatus } from '@domain/entities/Reader';
import { IpAddress } from '@domain/value-objects/IpAddress';

import type { CreateReaderDTO } from '@application/dto/ReaderDTO';

describe('ReaderMapper', () => {
  let ipAddress: IpAddress;

  beforeEach(() => {
    ipAddress = IpAddress.create('192.168.1.100')._unsafeUnwrap();
  });

  describe('toDTO', () => {
    it('should convert Reader entity to DTO with all required fields', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1, 2, 3, 4],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.id).toBe('reader-001');
      expect(dto.name).toBe('Storage Reader A1');
      expect(dto.ipAddress).toBe('192.168.1.100');
      expect(dto.port).toBe(5084);
      expect(dto.zoneId).toBe('zone-001');
      expect(dto.zoneName).toBeNull();
      expect(dto.status).toBe('OFFLINE');
      expect(dto.antennaCount).toBe(4);
      expect(dto.isActive).toBe(true);
      expect(dto.lastConnectedAt).toBeNull();
      expect(dto.lastReadAt).toBeNull();
      expect(dto.successfulReads).toBe(0);
      expect(dto.failedReads).toBe(0);
      expect(dto.successRate).toBe(100);
      expect(dto.uptimeSeconds).toBe(0);
      expect(dto.lastError).toBeNull();
      expect(dto.readerModel).toBeNull();
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });

    it('should include configuration in DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 28.5,
          antennas: [1, 3],
          readInterval: 500,
          rssiThreshold: -65,
          session: 1,
          modeIndex: 500,
        },
      })._unsafeUnwrap();

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.configuration.transmitPower).toBe(28.5);
      expect(dto.configuration.activeAntennas).toEqual([1, 3]);
      expect(dto.configuration.rssiThreshold).toBe(-65);
      expect(dto.configuration.session).toBe(1);
      expect(dto.configuration.modeIndex).toBe(500);
    });

    it('should convert Reader entity with reader model to DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        readerModel: 'Impinj R700',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1, 2, 3, 4],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.readerModel).toBe('Impinj R700');
    });

    it('should convert Reader entity with zone name to DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1, 2, 3, 4],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      const dto = ReaderMapper.toDTO(reader, 'Storage Area A');

      expect(dto.zoneName).toBe('Storage Area A');
    });

    it('should convert dates to ISO 8601 strings', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      const dto = ReaderMapper.toDTO(reader);

      // Validate ISO 8601 format
      expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(dto.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should handle all reader statuses correctly', () => {
      const statusMapping: Record<ReaderStatus, string> = {
        [ReaderStatus.ONLINE]: 'ONLINE',
        [ReaderStatus.OFFLINE]: 'OFFLINE',
        [ReaderStatus.ERROR]: 'ERROR',
        [ReaderStatus.CONNECTING]: 'CONNECTING',
        [ReaderStatus.MAINTENANCE]: 'MAINTENANCE',
      };

      for (const [readerStatus, expectedDtoStatus] of Object.entries(statusMapping)) {
        const reader = Reader.create({
          id: `reader-${readerStatus}`,
          name: `Reader ${readerStatus}`,
          ipAddress,
          port: 5084,
          zoneId: 'zone-001',
          antennaCount: 4,
          configuration: {
            transmitPower: 30,
            antennas: [1],
            readInterval: 1000,
            rssiThreshold: -70,
            session: 2,
            modeIndex: 1000,
          },
        })._unsafeUnwrap();

        // Set status
        switch (readerStatus as ReaderStatus) {
          case ReaderStatus.ONLINE:
            reader.markOnline();
            break;
          case ReaderStatus.ERROR:
            reader.markError('Test error');
            break;
          case ReaderStatus.CONNECTING:
            reader.markConnecting();
            break;
          case ReaderStatus.MAINTENANCE:
            reader.markMaintenance();
            break;
          // OFFLINE is default
        }

        const dto = ReaderMapper.toDTO(reader);
        expect(dto.status).toBe(expectedDtoStatus);
      }
    });

    it('should convert Reader with successful reads to DTO with correct success rate', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      reader.recordSuccessfulRead(95);
      reader.recordFailedRead(5);

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.successfulReads).toBe(95);
      expect(dto.failedReads).toBe(5);
      expect(dto.successRate).toBe(95);
    });

    it('should handle Reader with error message', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      reader.markError('Connection timeout');

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.status).toBe('ERROR');
      expect(dto.lastError).toBe('Connection timeout');
    });

    it('should convert Reader with connection timestamps to DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      reader.markOnline();
      reader.recordSuccessfulRead();

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.lastConnectedAt).not.toBeNull();
      expect(dto.lastReadAt).not.toBeNull();
      expect(dto.lastConnectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(dto.lastReadAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should convert inactive Reader to DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      reader.deactivate();

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.isActive).toBe(false);
    });

    it('should convert Reader with uptime to DTO', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 30,
          antennas: [1],
          readInterval: 1000,
          rssiThreshold: -70,
          session: 2,
          modeIndex: 1000,
        },
      })._unsafeUnwrap();

      reader.updateUptime(86400); // 1 day in seconds

      const dto = ReaderMapper.toDTO(reader);

      expect(dto.uptimeSeconds).toBe(86400);
    });
  });

  describe('toDTOArray', () => {
    it('should convert array of Reader entities to DTOs', () => {
      const readers = [
        Reader.create({
          id: 'reader-001',
          name: 'Reader A',
          ipAddress: IpAddress.create('192.168.1.101')._unsafeUnwrap(),
          port: 5084,
          zoneId: 'zone-001',
          antennaCount: 4,
          configuration: {
            transmitPower: 30,
            antennas: [1],
            readInterval: 1000,
            rssiThreshold: -70,
            session: 2,
            modeIndex: 1000,
          },
        })._unsafeUnwrap(),
        Reader.create({
          id: 'reader-002',
          name: 'Reader B',
          ipAddress: IpAddress.create('192.168.1.102')._unsafeUnwrap(),
          port: 5084,
          zoneId: 'zone-002',
          antennaCount: 2,
          configuration: {
            transmitPower: 25,
            antennas: [1, 2],
            readInterval: 1000,
            rssiThreshold: -65,
            session: 1,
            modeIndex: 500,
          },
        })._unsafeUnwrap(),
      ];

      const dtos = ReaderMapper.toDTOArray(readers);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('reader-001');
      expect(dtos[0].name).toBe('Reader A');
      expect(dtos[0].ipAddress).toBe('192.168.1.101');
      expect(dtos[1].id).toBe('reader-002');
      expect(dtos[1].name).toBe('Reader B');
      expect(dtos[1].ipAddress).toBe('192.168.1.102');
    });

    it('should return empty array for empty input', () => {
      const dtos = ReaderMapper.toDTOArray([]);

      expect(dtos).toEqual([]);
    });
  });

  describe('fromCreateDTO', () => {
    it('should convert CreateReaderDTO to Reader entity', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reader = result.value;
        expect(reader.getId()).toBe('reader-new-001');
        expect(reader.getName()).toBe('New Reader');
        expect(reader.getReaderModel()).toBe('Impinj R700');
        expect(reader.getIpAddress().getValue()).toBe('192.168.1.200');
        expect(reader.getPort()).toBe(5084);
        expect(reader.getZoneId()).toBe('zone-001');
        expect(reader.getAntennaCount()).toBe(4);
        expect(reader.getStatus()).toBe(ReaderStatus.OFFLINE);
        expect(reader.isActive()).toBe(true);
      }
    });

    it('should use default configuration when not provided', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value.getConfiguration();
        expect(config.transmitPower).toBe(30); // default
        expect(config.antennas).toEqual([1]); // default
        expect(config.rssiThreshold).toBe(-70); // default
        expect(config.session).toBe(2); // default
        expect(config.modeIndex).toBe(1000); // default
      }
    });

    it('should use custom configuration when provided', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 28.5,
          activeAntennas: [1, 2, 3],
          rssiThreshold: -60,
          session: 1,
          modeIndex: 500,
        },
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value.getConfiguration();
        expect(config.transmitPower).toBe(28.5);
        expect(config.antennas).toEqual([1, 2, 3]);
        expect(config.rssiThreshold).toBe(-60);
        expect(config.session).toBe(1);
        expect(config.modeIndex).toBe(500);
      }
    });

    it('should use partial custom configuration with defaults', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 25,
          // Other fields not provided
        },
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value.getConfiguration();
        expect(config.transmitPower).toBe(25);
        expect(config.antennas).toEqual([1]); // default
        expect(config.rssiThreshold).toBe(-70); // default
        expect(config.session).toBe(2); // default
        expect(config.modeIndex).toBe(1000); // default
      }
    });

    it('should return error for invalid IP address', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: 'invalid-ip', // Invalid
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for empty IP address', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '', // Invalid: empty
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for empty reader name', () => {
      const dto: CreateReaderDTO = {
        name: '', // Invalid: empty
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for empty zone ID', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: '', // Invalid: empty
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for invalid port', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 70000, // Invalid: > 65535
        zoneId: 'zone-001',
        antennaCount: 4,
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for transmit power out of range', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          transmitPower: 35, // Invalid: > 31.5
        },
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for invalid antenna port', () => {
      const dto: CreateReaderDTO = {
        name: 'New Reader',
        readerModel: 'Impinj R700',
        ipAddress: '192.168.1.200',
        port: 5084,
        zoneId: 'zone-001',
        antennaCount: 4,
        configuration: {
          activeAntennas: [1, 5], // Invalid: antenna 5 > antennaCount 4
        },
      };

      const result = ReaderMapper.fromCreateDTO(dto, 'reader-new-001');

      expect(result.isErr()).toBe(true);
    });
  });
});
