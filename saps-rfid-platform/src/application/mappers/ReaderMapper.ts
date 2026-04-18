import { err } from 'neverthrow';

import { Reader, ReaderStatus } from '../../domain/entities/Reader';
import { IpAddress } from '../../domain/value-objects/IpAddress';

import type { ReaderDTO, CreateReaderDTO } from '../dto/ReaderDTO';
import type { Result } from 'neverthrow';

/**
 * Reader Mapper
 *
 * @description
 * Bidirectional mapper between Reader domain entities and DTOs.
 *
 * Mapping Strategy:
 * - Entity → DTO: Extract primitives, calculate success rate, convert dates to ISO 8601
 * - DTO → Entity: Validate IP address, create entity with configuration
 */
export class ReaderMapper {
  /**
   * Maps domain ReaderStatus enum to DTO status string
   */
  private static mapStatusToDTO(
    status: ReaderStatus
  ): 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING' | 'MAINTENANCE' {
    const statusMap: Record<
      ReaderStatus,
      'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING' | 'MAINTENANCE'
    > = {
      [ReaderStatus.ONLINE]: 'ONLINE',
      [ReaderStatus.OFFLINE]: 'OFFLINE',
      [ReaderStatus.ERROR]: 'ERROR',
      [ReaderStatus.CONNECTING]: 'CONNECTING',
      [ReaderStatus.MAINTENANCE]: 'MAINTENANCE',
    };
    return statusMap[status];
  }

  /**
   * Converts a Reader entity to a DTO
   *
   * @param reader - The reader domain entity
   * @param zoneName - Optional zone name for denormalization
   * @returns Reader DTO for API response
   */
  static toDTO(reader: Reader, zoneName: string | null = null): ReaderDTO {
    const config = reader.getConfiguration();
    const health = reader.getHealth();
    const totalReads = health.successfulReads + health.failedReads;
    const successRate =
      totalReads > 0 ? Math.round((health.successfulReads / totalReads) * 10000) / 100 : 100;

    return {
      id: reader.getId(),
      name: reader.getName(),
      readerModel: reader.getReaderModel() ?? null,
      ipAddress: reader.getIpAddress().getValue(),
      port: reader.getPort(),
      zoneId: reader.getZoneId(),
      zoneName,
      status: ReaderMapper.mapStatusToDTO(reader.getStatus()),
      antennaCount: reader.getAntennaCount(),
      isActive: reader.isActive(),
      lastConnectedAt: reader.getLastConnectedAt()?.toISOString() ?? null,
      lastReadAt: reader.getLastReadAt()?.toISOString() ?? null,
      successfulReads: health.successfulReads,
      failedReads: health.failedReads,
      successRate,
      uptimeSeconds: health.uptimeSeconds,
      lastError: reader.getErrorMessage(),
      configuration: {
        transmitPower: config.transmitPower,
        activeAntennas: [...config.antennas],
        rssiThreshold: config.rssiThreshold,
        session: config.session,
        modeIndex: config.modeIndex,
      },
      createdAt: reader.getCreatedAt().toISOString(),
      updatedAt: reader.getUpdatedAt().toISOString(),
    };
  }

  /**
   * Converts an array of Reader entities to DTOs
   *
   * @param readers - Array of reader domain entities
   * @returns Array of Reader DTOs
   */
  static toDTOArray(readers: Reader[]): ReaderDTO[] {
    return readers.map((reader) => ReaderMapper.toDTO(reader));
  }

  /**
   * Converts a CreateReaderDTO to a Reader entity
   *
   * @param dto - The create reader DTO from API request
   * @param generatedId - Generated unique ID for the reader
   * @returns Result with Reader entity or validation error
   */
  static fromCreateDTO(dto: CreateReaderDTO, generatedId: string): Result<Reader, Error> {
    // Validate IP address
    const ipAddressResult = IpAddress.create(dto.ipAddress);
    if (ipAddressResult.isErr()) {
      return err(ipAddressResult.error);
    }

    // Build configuration with defaults
    const configuration = {
      transmitPower: dto.configuration?.transmitPower ?? 30,
      antennas: dto.configuration?.activeAntennas ?? [1],
      readInterval: 1000,
      rssiThreshold: dto.configuration?.rssiThreshold ?? -70,
      session: dto.configuration?.session ?? 2,
      modeIndex: dto.configuration?.modeIndex ?? 1000,
    };

    // Create reader entity
    return Reader.create({
      id: generatedId,
      name: dto.name,
      readerModel: dto.readerModel,
      ipAddress: ipAddressResult.value,
      port: dto.port,
      zoneId: dto.zoneId,
      antennaCount: dto.antennaCount,
      configuration,
    });
  }
}
