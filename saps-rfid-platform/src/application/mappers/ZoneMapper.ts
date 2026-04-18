import { Zone, ZoneType } from '../../domain/entities/Zone';

import type { ZoneDTO, CreateZoneDTO } from '../dto/ZoneDTO';
import type { Result } from 'neverthrow';

/**
 * Zone Mapper
 *
 * @description
 * Bidirectional mapper between Zone domain entities and DTOs.
 *
 * Mapping Strategy:
 * - Entity → DTO: Extract primitives, calculate occupancy metrics, convert dates to ISO 8601
 * - DTO → Entity: Validate inputs, create entity with business rules
 */
export class ZoneMapper {
  /**
   * Maps domain ZoneType enum to DTO zone type string
   */
  private static mapZoneTypeToDTO(
    zoneType: ZoneType
  ): 'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE' {
    const typeMap: Record<
      ZoneType,
      'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE'
    > = {
      [ZoneType.STORAGE]: 'STORAGE',
      [ZoneType.EXAMINATION]: 'EXAMINATION',
      [ZoneType.TRANSIT]: 'TRANSIT',
      [ZoneType.ARCHIVE]: 'ARCHIVE',
      [ZoneType.OFFICE]: 'OFFICE',
      [ZoneType.CORRIDOR]: 'CORRIDOR',
      [ZoneType.ENTRANCE]: 'ENTRANCE',
    };
    return typeMap[zoneType];
  }

  /**
   * Maps DTO zone type string to domain ZoneType enum
   */
  private static mapZoneTypeToDomain(
    zoneType: 'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE'
  ): ZoneType {
    const typeMap: Record<
      'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE',
      ZoneType
    > = {
      STORAGE: ZoneType.STORAGE,
      EXAMINATION: ZoneType.EXAMINATION,
      TRANSIT: ZoneType.TRANSIT,
      ARCHIVE: ZoneType.ARCHIVE,
      OFFICE: ZoneType.OFFICE,
      CORRIDOR: ZoneType.CORRIDOR,
      ENTRANCE: ZoneType.ENTRANCE,
    };
    return typeMap[zoneType];
  }

  /**
   * Converts a Zone entity to a DTO
   *
   * @param zone - The zone domain entity
   * @returns Zone DTO for API response
   */
  static toDTO(zone: Zone): ZoneDTO {
    const coordinates = zone.getCoordinates();
    const occupancyPercentage = zone.getOccupancyPercentage();

    return {
      id: zone.getId(),
      code: zone.getCode(),
      name: zone.getName(),
      zoneType: ZoneMapper.mapZoneTypeToDTO(zone.getZoneType()),
      capacity: zone.getCapacity(),
      currentOccupancy: zone.getCurrentOccupancy(),
      occupancyPercentage,
      occupancyStatus: ZoneMapper.getOccupancyStatus(occupancyPercentage),
      building: zone.getBuilding() ?? null,
      floorNumber: zone.getFloorNumber() ?? null,
      parentZoneId: zone.getParentZoneId(),
      isActive: zone.isActive(),
      coordinates: coordinates
        ? {
            latitude: coordinates.x,
            longitude: coordinates.y,
          }
        : null,
      readerIds: zone.getReaderIds(),
      createdAt: zone.getCreatedAt().toISOString(),
      updatedAt: zone.getUpdatedAt().toISOString(),
    };
  }

  /**
   * Converts an array of Zone entities to DTOs
   *
   * @param zones - Array of zone domain entities
   * @returns Array of Zone DTOs
   */
  static toDTOArray(zones: Zone[]): ZoneDTO[] {
    return zones.map((zone) => ZoneMapper.toDTO(zone));
  }

  /**
   * Converts a CreateZoneDTO to a Zone entity
   *
   * @param dto - The create zone DTO from API request
   * @param generatedId - Generated unique ID for the zone
   * @returns Result with Zone entity or validation error
   */
  static fromCreateDTO(dto: CreateZoneDTO, generatedId: string): Result<Zone, Error> {
    return Zone.create({
      id: generatedId,
      code: dto.code,
      name: dto.name,
      zoneType: ZoneMapper.mapZoneTypeToDomain(dto.zoneType),
      capacity: dto.capacity,
      building: dto.building,
      floorNumber: dto.floorNumber,
      parentZoneId: dto.parentZoneId,
      coordinates: dto.coordinates
        ? {
            x: dto.coordinates.latitude,
            y: dto.coordinates.longitude,
          }
        : undefined,
    });
  }

  /**
   * Helper to determine occupancy status based on percentage
   */
  private static getOccupancyStatus(
    percentage: number
  ): 'normal' | 'warning' | 'critical' | 'full' {
    if (percentage >= 100) return 'full';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }
}
