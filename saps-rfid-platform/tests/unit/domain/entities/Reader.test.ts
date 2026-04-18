import { Reader, ReaderStatus, ReaderConfiguration } from '@domain/entities/Reader';
import { IpAddress } from '@domain/value-objects/IpAddress';

describe('Reader', () => {
  let ipAddress: IpAddress;
  let validConfiguration: ReaderConfiguration;

  beforeEach(() => {
    ipAddress = IpAddress.create('192.168.1.100')._unsafeUnwrap();
    validConfiguration = {
      transmitPower: 25,
      antennas: [1, 2, 3, 4],
      readInterval: 500,
      rssiThreshold: -70,
      session: 2,
      modeIndex: 0,
    };
  });

  describe('create', () => {
    it('should create valid reader with required fields', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reader = result.value;
        expect(reader.getId()).toBe('reader-001');
        expect(reader.getName()).toBe('Storage Reader A1');
        expect(reader.getIpAddress()).toBe(ipAddress);
        expect(reader.getPort()).toBe(5084); // Default port
        expect(reader.getZoneId()).toBe('zone-001');
        expect(reader.getAntennaCount()).toBe(4); // Default
        expect(reader.getStatus()).toBe(ReaderStatus.OFFLINE);
        expect(reader.isActive()).toBe(true);
        expect(reader.getLastConnectedAt()).toBeNull();
        expect(reader.getLastReadAt()).toBeNull();
        expect(reader.getErrorMessage()).toBeNull();
      }
    });

    it('should create reader with all optional fields', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5085,
        zoneId: 'zone-001',
        readerModel: 'Impinj Speedway R420',
        serialNumber: 'SN-123456',
        firmwareVersion: '5.12.0',
        antennaCount: 8,
        configuration: validConfiguration,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reader = result.value;
        expect(reader.getPort()).toBe(5085);
        expect(reader.getReaderModel()).toBe('Impinj Speedway R420');
        expect(reader.getSerialNumber()).toBe('SN-123456');
        expect(reader.getFirmwareVersion()).toBe('5.12.0');
        expect(reader.getAntennaCount()).toBe(8);
      }
    });

    it('should reject empty ID', () => {
      const result = Reader.create({
        id: '',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader ID cannot be empty');
      }
    });

    it('should reject whitespace-only ID', () => {
      const result = Reader.create({
        id: '   ',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader ID cannot be empty');
      }
    });

    it('should reject empty name', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: '',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader name cannot be empty');
      }
    });

    it('should reject whitespace-only name', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: '   ',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader name cannot be empty');
      }
    });

    it('should trim name', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: '  Storage Reader A1  ',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getName()).toBe('Storage Reader A1');
      }
    });

    it('should reject empty zone ID', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: '',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    it('should reject whitespace-only zone ID', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: '   ',
        configuration: validConfiguration,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    describe('port validation', () => {
      it('should reject port below 1', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          port: 0,
          zoneId: 'zone-001',
          configuration: validConfiguration,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Port must be between 1 and 65535');
        }
      });

      it('should reject port above 65535', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          port: 65536,
          zoneId: 'zone-001',
          configuration: validConfiguration,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Port must be between 1 and 65535');
        }
      });

      it('should accept port at lower boundary (1)', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          port: 1,
          zoneId: 'zone-001',
          configuration: validConfiguration,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPort()).toBe(1);
        }
      });

      it('should accept port at upper boundary (65535)', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          port: 65535,
          zoneId: 'zone-001',
          configuration: validConfiguration,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPort()).toBe(65535);
        }
      });
    });

    describe('antenna count validation', () => {
      it('should reject antenna count below 1', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          antennaCount: 0,
          configuration: validConfiguration,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Antenna count must be between 1 and 32');
        }
      });

      it('should reject antenna count above 32', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          antennaCount: 33,
          configuration: validConfiguration,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Antenna count must be between 1 and 32');
        }
      });

      it('should accept antenna count at lower boundary (1)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          antennas: [1],
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          antennaCount: 1,
          configuration: config,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getAntennaCount()).toBe(1);
        }
      });

      it('should accept antenna count at upper boundary (32)', () => {
        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          antennaCount: 32,
          configuration: validConfiguration,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getAntennaCount()).toBe(32);
        }
      });
    });

    describe('configuration validation', () => {
      it('should reject transmit power below minimum (15 dBm)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          transmitPower: 14.9,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Transmit power must be between 15 and 31.5 dBm');
        }
      });

      it('should reject transmit power above maximum (31.5 dBm)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          transmitPower: 32,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Transmit power must be between 15 and 31.5 dBm');
        }
      });

      it('should accept transmit power at boundaries', () => {
        const configMin: ReaderConfiguration = {
          ...validConfiguration,
          transmitPower: 15,
        };

        const configMax: ReaderConfiguration = {
          ...validConfiguration,
          transmitPower: 31.5,
        };

        const resultMin = Reader.create({
          id: 'reader-001',
          name: 'Reader Min',
          ipAddress,
          zoneId: 'zone-001',
          configuration: configMin,
        });

        const resultMax = Reader.create({
          id: 'reader-002',
          name: 'Reader Max',
          ipAddress,
          zoneId: 'zone-001',
          configuration: configMax,
        });

        expect(resultMin.isOk()).toBe(true);
        expect(resultMax.isOk()).toBe(true);
      });

      it('should reject empty antennas array', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          antennas: [],
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('At least one antenna must be configured');
        }
      });

      it('should reject antenna port below 1', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          antennas: [0, 1, 2],
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Antenna port 0 is invalid');
        }
      });

      it('should reject antenna port exceeding antenna count', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          antennas: [1, 2, 5], // Port 5 is invalid for default 4 antennas
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Antenna port 5 is invalid (must be 1-4)');
        }
      });

      it('should reject RSSI threshold below minimum (-100 dBm)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          rssiThreshold: -101,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('RSSI threshold must be between -100 and 0 dBm');
        }
      });

      it('should reject RSSI threshold above maximum (0 dBm)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          rssiThreshold: 1,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('RSSI threshold must be between -100 and 0 dBm');
        }
      });

      it('should accept RSSI threshold at boundaries', () => {
        const configMin: ReaderConfiguration = {
          ...validConfiguration,
          rssiThreshold: -100,
        };

        const configMax: ReaderConfiguration = {
          ...validConfiguration,
          rssiThreshold: 0,
        };

        const resultMin = Reader.create({
          id: 'reader-001',
          name: 'Reader Min',
          ipAddress,
          zoneId: 'zone-001',
          configuration: configMin,
        });

        const resultMax = Reader.create({
          id: 'reader-002',
          name: 'Reader Max',
          ipAddress,
          zoneId: 'zone-001',
          configuration: configMax,
        });

        expect(resultMin.isOk()).toBe(true);
        expect(resultMax.isOk()).toBe(true);
      });

      it('should reject session below 0', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          session: -1,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Session must be between 0 and 3');
        }
      });

      it('should reject session above 3', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          session: 4,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Session must be between 0 and 3');
        }
      });

      it('should accept all valid session values (0-3)', () => {
        for (let session = 0; session <= 3; session++) {
          const config: ReaderConfiguration = {
            ...validConfiguration,
            session,
          };

          const result = Reader.create({
            id: `reader-${session}`,
            name: `Reader Session ${session}`,
            ipAddress,
            zoneId: 'zone-001',
            configuration: config,
          });

          expect(result.isOk()).toBe(true);
        }
      });

      it('should reject read interval below 100ms', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          readInterval: 99,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Read interval must be at least 100ms');
        }
      });

      it('should accept read interval at minimum (100ms)', () => {
        const config: ReaderConfiguration = {
          ...validConfiguration,
          readInterval: 100,
        };

        const result = Reader.create({
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          zoneId: 'zone-001',
          configuration: config,
        });

        expect(result.isOk()).toBe(true);
      });
    });

    it('should initialize health statistics to zero', () => {
      const result = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value.getHealth();
        expect(health.totalReads).toBe(0);
        expect(health.successfulReads).toBe(0);
        expect(health.failedReads).toBe(0);
        expect(health.uptimeSeconds).toBe(0);
        expect(health.lastHealthCheckAt).toBeNull();
      }
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute reader from persistence data', () => {
      const now = new Date();
      const lastConnected = new Date(now.getTime() - 3600000);

      const props = {
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        readerModel: 'Impinj R420',
        serialNumber: 'SN-123',
        firmwareVersion: '5.12.0',
        antennaCount: 4,
        status: ReaderStatus.ONLINE,
        isActive: true,
        lastConnectedAt: lastConnected,
        lastReadAt: now,
        configuration: validConfiguration,
        health: {
          totalReads: 1000,
          successfulReads: 950,
          failedReads: 50,
          uptimeSeconds: 86400,
          lastHealthCheckAt: now,
        },
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: now,
      };

      const reader = Reader.fromPersistence(props);

      expect(reader.getId()).toBe('reader-001');
      expect(reader.getName()).toBe('Storage Reader A1');
      expect(reader.getStatus()).toBe(ReaderStatus.ONLINE);
      expect(reader.getHealth().totalReads).toBe(1000);
      expect(reader.getHealth().successfulReads).toBe(950);
    });
  });

  describe('status transitions', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    describe('markOnline', () => {
      it('should mark reader as online', () => {
        reader.markOnline();

        expect(reader.getStatus()).toBe(ReaderStatus.ONLINE);
        expect(reader.isOnline()).toBe(true);
        expect(reader.isOffline()).toBe(false);
        expect(reader.getLastConnectedAt()).not.toBeNull();
        expect(reader.getErrorMessage()).toBeNull();
      });

      it('should clear error message when going online', () => {
        reader.markError('Connection failed');
        expect(reader.getErrorMessage()).toBe('Connection failed');

        reader.markOnline();

        expect(reader.getErrorMessage()).toBeNull();
      });
    });

    describe('markOffline', () => {
      it('should mark reader as offline', () => {
        reader.markOnline();
        reader.markOffline();

        expect(reader.getStatus()).toBe(ReaderStatus.OFFLINE);
        expect(reader.isOffline()).toBe(true);
        expect(reader.isOnline()).toBe(false);
      });
    });

    describe('markConnecting', () => {
      it('should mark reader as connecting', () => {
        reader.markConnecting();

        expect(reader.getStatus()).toBe(ReaderStatus.CONNECTING);
      });
    });

    describe('markError', () => {
      it('should mark reader in error state with message', () => {
        reader.markError('LLRP connection timeout');

        expect(reader.getStatus()).toBe(ReaderStatus.ERROR);
        expect(reader.isInError()).toBe(true);
        expect(reader.getErrorMessage()).toBe('LLRP connection timeout');
      });
    });

    describe('markMaintenance', () => {
      it('should mark reader in maintenance mode', () => {
        reader.markMaintenance();

        expect(reader.getStatus()).toBe(ReaderStatus.MAINTENANCE);
      });
    });
  });

  describe('read operations', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    describe('updateLastRead', () => {
      it('should update last read timestamp', () => {
        const before = new Date();
        reader.updateLastRead();

        expect(reader.getLastReadAt()).not.toBeNull();
        expect(reader.getLastReadAt()!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });
    });

    describe('recordSuccessfulRead', () => {
      it('should record successful read with default count', () => {
        reader.recordSuccessfulRead();

        const health = reader.getHealth();
        expect(health.totalReads).toBe(1);
        expect(health.successfulReads).toBe(1);
        expect(health.failedReads).toBe(0);
        expect(reader.getLastReadAt()).not.toBeNull();
      });

      it('should record successful read with custom count', () => {
        reader.recordSuccessfulRead(10);

        const health = reader.getHealth();
        expect(health.totalReads).toBe(10);
        expect(health.successfulReads).toBe(10);
      });

      it('should accumulate reads over multiple calls', () => {
        reader.recordSuccessfulRead(5);
        reader.recordSuccessfulRead(3);
        reader.recordSuccessfulRead();

        const health = reader.getHealth();
        expect(health.totalReads).toBe(9);
        expect(health.successfulReads).toBe(9);
      });
    });

    describe('recordFailedRead', () => {
      it('should record failed read with default count', () => {
        reader.recordFailedRead();

        const health = reader.getHealth();
        expect(health.totalReads).toBe(1);
        expect(health.failedReads).toBe(1);
        expect(health.successfulReads).toBe(0);
      });

      it('should record failed read with custom count', () => {
        reader.recordFailedRead(5);

        const health = reader.getHealth();
        expect(health.totalReads).toBe(5);
        expect(health.failedReads).toBe(5);
      });

      it('should track mixed successful and failed reads', () => {
        reader.recordSuccessfulRead(100);
        reader.recordFailedRead(10);
        reader.recordSuccessfulRead(50);
        reader.recordFailedRead(5);

        const health = reader.getHealth();
        expect(health.totalReads).toBe(165);
        expect(health.successfulReads).toBe(150);
        expect(health.failedReads).toBe(15);
      });
    });
  });

  describe('updateUptime', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    it('should update uptime successfully', () => {
      const result = reader.updateUptime(86400);

      expect(result.isOk()).toBe(true);
      expect(reader.getHealth().uptimeSeconds).toBe(86400);
      expect(reader.getHealth().lastHealthCheckAt).not.toBeNull();
    });

    it('should accept zero uptime', () => {
      const result = reader.updateUptime(0);

      expect(result.isOk()).toBe(true);
      expect(reader.getHealth().uptimeSeconds).toBe(0);
    });

    it('should reject negative uptime', () => {
      const result = reader.updateUptime(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Uptime cannot be negative');
      }
    });
  });

  describe('updateConfiguration', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    it('should update partial configuration', () => {
      const result = reader.updateConfiguration({
        transmitPower: 28,
      });

      expect(result.isOk()).toBe(true);
      const config = reader.getConfiguration();
      expect(config.transmitPower).toBe(28);
      expect(config.antennas).toEqual([1, 2, 3, 4]); // unchanged
      expect(config.readInterval).toBe(500); // unchanged
    });

    it('should update multiple configuration fields', () => {
      const result = reader.updateConfiguration({
        transmitPower: 30,
        rssiThreshold: -60,
        readInterval: 1000,
      });

      expect(result.isOk()).toBe(true);
      const config = reader.getConfiguration();
      expect(config.transmitPower).toBe(30);
      expect(config.rssiThreshold).toBe(-60);
      expect(config.readInterval).toBe(1000);
    });

    it('should reject invalid transmit power update', () => {
      const result = reader.updateConfiguration({
        transmitPower: 35, // Too high
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Transmit power must be between 15 and 31.5 dBm');
      }
    });

    it('should reject invalid antenna ports in update', () => {
      const result = reader.updateConfiguration({
        antennas: [1, 2, 5], // Port 5 invalid for 4-antenna reader
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Antenna port 5 is invalid');
      }
    });

    it('should reject empty antennas array in update', () => {
      const result = reader.updateConfiguration({
        antennas: [],
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('At least one antenna must be configured');
      }
    });
  });

  describe('assignToZone', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    it('should assign reader to new zone', () => {
      const result = reader.assignToZone('zone-002');

      expect(result.isOk()).toBe(true);
      expect(reader.getZoneId()).toBe('zone-002');
    });

    it('should reject empty zone ID', () => {
      const result = reader.assignToZone('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    it('should reject whitespace-only zone ID', () => {
      const result = reader.assignToZone('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });
  });

  describe('activate / deactivate', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    it('should deactivate reader', () => {
      reader.markOnline();
      reader.deactivate();

      expect(reader.isActive()).toBe(false);
      expect(reader.getStatus()).toBe(ReaderStatus.OFFLINE);
    });

    it('should activate reader', () => {
      reader.deactivate();
      expect(reader.isActive()).toBe(false);

      reader.activate();

      expect(reader.isActive()).toBe(true);
    });
  });

  describe('resetHealthStats', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    it('should reset all health statistics', () => {
      // Accumulate some stats
      reader.recordSuccessfulRead(100);
      reader.recordFailedRead(10);
      reader.updateUptime(86400);

      // Verify stats are accumulated
      expect(reader.getHealth().totalReads).toBe(110);

      // Reset
      reader.resetHealthStats();

      const health = reader.getHealth();
      expect(health.totalReads).toBe(0);
      expect(health.successfulReads).toBe(0);
      expect(health.failedReads).toBe(0);
      expect(health.uptimeSeconds).toBe(0);
      expect(health.lastHealthCheckAt).not.toBeNull(); // Set to current time
    });
  });

  describe('query methods', () => {
    let reader: Reader;

    beforeEach(() => {
      reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();
    });

    describe('isHealthy', () => {
      it('should return true when online and active', () => {
        reader.markOnline();

        expect(reader.isHealthy()).toBe(true);
      });

      it('should return false when offline', () => {
        expect(reader.isHealthy()).toBe(false);
      });

      it('should return false when in error state', () => {
        reader.markError('Connection failed');

        expect(reader.isHealthy()).toBe(false);
      });

      it('should return false when online but inactive', () => {
        reader.markOnline();
        reader.deactivate();

        expect(reader.isHealthy()).toBe(false);
      });
    });

    describe('getSecondsSinceLastConnection', () => {
      it('should return null for never-connected reader', () => {
        expect(reader.getSecondsSinceLastConnection()).toBeNull();
      });

      it('should calculate seconds since last connection', () => {
        reader.markOnline();

        // Small delay to ensure time passes
        const seconds = reader.getSecondsSinceLastConnection();
        expect(seconds).not.toBeNull();
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThan(10); // Should be very recent
      });
    });

    describe('getSecondsSinceLastRead', () => {
      it('should return null for reader with no reads', () => {
        expect(reader.getSecondsSinceLastRead()).toBeNull();
      });

      it('should calculate seconds since last read', () => {
        reader.updateLastRead();

        const seconds = reader.getSecondsSinceLastRead();
        expect(seconds).not.toBeNull();
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThan(10); // Should be very recent
      });
    });

    describe('getSuccessRate', () => {
      it('should return null for reader with no reads', () => {
        expect(reader.getSuccessRate()).toBeNull();
      });

      it('should calculate 100% success rate', () => {
        reader.recordSuccessfulRead(100);

        expect(reader.getSuccessRate()).toBe(100);
      });

      it('should calculate 0% success rate', () => {
        reader.recordFailedRead(100);

        expect(reader.getSuccessRate()).toBe(0);
      });

      it('should calculate mixed success rate', () => {
        reader.recordSuccessfulRead(90);
        reader.recordFailedRead(10);

        expect(reader.getSuccessRate()).toBe(90);
      });

      it('should calculate fractional success rate', () => {
        reader.recordSuccessfulRead(1);
        reader.recordFailedRead(2);

        const rate = reader.getSuccessRate();
        expect(rate).toBeCloseTo(33.33, 1);
      });
    });

    describe('isStale', () => {
      it('should return false for never-connected reader', () => {
        expect(reader.isStale()).toBe(false);
      });

      it('should return false for recently connected reader', () => {
        reader.markOnline();

        expect(reader.isStale()).toBe(false);
      });

      it('should use custom threshold', () => {
        reader.markOnline();

        // With default threshold (300 seconds), should not be stale
        expect(reader.isStale(300)).toBe(false);

        // A reader that was just connected (0 seconds ago) is not stale
        // because isStale checks if secondsSince > threshold (not >=)
        // So 0 > 0 is false
        expect(reader.isStale(0)).toBe(false);
      });

      it('should return true when seconds since connection exceeds threshold', () => {
        // Create a reader from persistence with an old lastConnectedAt
        const oldDate = new Date(Date.now() - 600000); // 600 seconds ago (10 minutes)

        const props = {
          id: 'reader-001',
          name: 'Storage Reader A1',
          ipAddress,
          port: 5084,
          zoneId: 'zone-001',
          readerModel: undefined,
          serialNumber: undefined,
          firmwareVersion: undefined,
          antennaCount: 4,
          status: ReaderStatus.ONLINE,
          isActive: true,
          lastConnectedAt: oldDate,
          lastReadAt: null,
          configuration: validConfiguration,
          health: {
            totalReads: 0,
            successfulReads: 0,
            failedReads: 0,
            uptimeSeconds: 0,
            lastHealthCheckAt: null,
          },
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const staleReader = Reader.fromPersistence(props);

        // With 300 second threshold, reader connected 600 seconds ago should be stale
        expect(staleReader.isStale(300)).toBe(true);

        // With 1000 second threshold, reader connected 600 seconds ago should not be stale
        expect(staleReader.isStale(1000)).toBe(false);
      });
    });
  });

  describe('toPersistence', () => {
    it('should return all properties for persistence', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        port: 5084,
        zoneId: 'zone-001',
        readerModel: 'Impinj R420',
        serialNumber: 'SN-123',
        firmwareVersion: '5.12.0',
        antennaCount: 4,
        configuration: validConfiguration,
      })._unsafeUnwrap();

      reader.markOnline();
      reader.recordSuccessfulRead(50);

      const props = reader.toPersistence();

      expect(props.id).toBe('reader-001');
      expect(props.name).toBe('Storage Reader A1');
      expect(props.ipAddress).toBe(ipAddress);
      expect(props.port).toBe(5084);
      expect(props.zoneId).toBe('zone-001');
      expect(props.readerModel).toBe('Impinj R420');
      expect(props.serialNumber).toBe('SN-123');
      expect(props.firmwareVersion).toBe('5.12.0');
      expect(props.antennaCount).toBe(4);
      expect(props.status).toBe(ReaderStatus.ONLINE);
      expect(props.isActive).toBe(true);
      expect(props.configuration).toEqual(validConfiguration);
      expect(props.health.totalReads).toBe(50);
      expect(props.health.successfulReads).toBe(50);
      expect(props.createdAt).toBeInstanceOf(Date);
      expect(props.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toObject', () => {
    it('should return plain object representation', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();

      reader.markOnline();
      reader.recordSuccessfulRead(90);
      reader.recordFailedRead(10);

      const obj = reader.toObject();

      expect(obj.id).toBe('reader-001');
      expect(obj.name).toBe('Storage Reader A1');
      expect(obj.ipAddress).toBe('192.168.1.100');
      expect(obj.port).toBe(5084);
      expect(obj.zoneId).toBe('zone-001');
      expect(obj.status).toBe(ReaderStatus.ONLINE);
      expect(obj.isActive).toBe(true);
      expect(obj.isHealthy).toBe(true);
      expect(obj.successRate).toBe(90);
      expect(obj.configuration).toEqual(validConfiguration);
    });

    it('should include computed values', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();

      const obj = reader.toObject();

      expect(obj.secondsSinceLastConnection).toBeNull();
      expect(obj.secondsSinceLastRead).toBeNull();
      expect(obj.successRate).toBeNull();
    });
  });

  describe('getConfiguration returns copy', () => {
    it('should return a copy of configuration', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();

      const config1 = reader.getConfiguration();
      const config2 = reader.getConfiguration();

      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // Same values
    });
  });

  describe('getHealth returns copy', () => {
    it('should return a copy of health stats', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();

      const health1 = reader.getHealth();
      const health2 = reader.getHealth();

      expect(health1).not.toBe(health2); // Different object references
      expect(health1).toEqual(health2); // Same values
    });
  });

  describe('date getters return copies', () => {
    it('should return new Date instances', () => {
      const reader = Reader.create({
        id: 'reader-001',
        name: 'Storage Reader A1',
        ipAddress,
        zoneId: 'zone-001',
        configuration: validConfiguration,
      })._unsafeUnwrap();

      reader.markOnline();

      const lastConnected1 = reader.getLastConnectedAt();
      const lastConnected2 = reader.getLastConnectedAt();

      expect(lastConnected1).not.toBe(lastConnected2); // Different object references
      expect(lastConnected1!.getTime()).toBe(lastConnected2!.getTime()); // Same time

      const created1 = reader.getCreatedAt();
      const created2 = reader.getCreatedAt();

      expect(created1).not.toBe(created2);
      expect(created1.getTime()).toBe(created2.getTime());
    });
  });

  describe('ReaderStatus enum', () => {
    it('should have all expected status values', () => {
      expect(ReaderStatus.ONLINE).toBe('online');
      expect(ReaderStatus.OFFLINE).toBe('offline');
      expect(ReaderStatus.ERROR).toBe('error');
      expect(ReaderStatus.CONNECTING).toBe('connecting');
      expect(ReaderStatus.MAINTENANCE).toBe('maintenance');
    });
  });
});
