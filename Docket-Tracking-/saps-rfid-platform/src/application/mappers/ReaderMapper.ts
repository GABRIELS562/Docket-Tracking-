import { Result, ok, err } from 'neverthrow';
import { Reader } from '../../domain/entities/Reader';
import { IpAddress } from '../../domain/value-objects/IpAddress';
import type { ReaderDTO, CreateReaderDTO } from '../dto/ReaderDTO';

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
   * Converts a Reader entity to a DTO
   *
   * @param reader - The reader domain entity
   * @param zoneName - Optional zone name for denormalization
   * @returns Reader DTO for API response
   */
  static toDTO(reader: Reader, zoneName: string | null = null): ReaderDTO {
    const config = reader.getConfiguration();
    const successRate = reader.getSuccessRate();

    return {
      id: reader.getId(),
      name: reader.getName(),
      readerModel: reader.getReaderModel(),
      ipAddress: reader.getIpAddress().getValue(),
      port: reader.getPort(),
      zoneId: reader.getZoneId(),
      zoneName,
      status: reader.getStatus(),
      antennaCount: reader.getAntennaCount(),
      isActive: reader.isActive(),
      lastConnectedAt: reader.getLastConnectedAt()?.toISOString() ?? null,
      lastReadAt: reader.getLastReadAt()?.toISOString() ?? null,
      successfulReads: reader.getSuccessfulReads(),
      failedReads: reader.getFailedReads(),
      successRate,
      uptimeSeconds: reader.getUptimeSeconds(),
      lastError: reader.getLastError(),
      configuration: {
        transmitPower: config.transmitPower,
        activeAntennas: config.activeAntennas,
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
  static fromCreateDTO(
    dto: CreateReaderDTO,
    generatedId: string
  ): Result<Reader, Error> {
    // Validate IP address
    const ipAddressResult = IpAddress.create(dto.ipAddress);
    if (ipAddressResult.isErr()) {
      return err(ipAddressResult.error);
    }

    // Create reader entity
    return Reader.create({
      id: generatedId,
      name: dto.name,
      readerModel: dto.readerModel,
      ipAddress: ipAddressResult.value,
      port: dto.port,
      zoneId: dto.zoneId,
      antennaCount: dto.antennaCount,
      configuration: dto.configuration,
    });
  }
}
