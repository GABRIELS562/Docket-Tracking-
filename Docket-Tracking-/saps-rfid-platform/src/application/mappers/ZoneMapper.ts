import { Result } from 'neverthrow';
import { Zone, type ZoneType } from '../../domain/entities/Zone';
import type { ZoneDTO, CreateZoneDTO } from '../dto/ZoneDTO';

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
      zoneType: zone.getZoneType(),
      capacity: zone.getCapacity(),
      currentOccupancy: zone.getCurrentOccupancy(),
      occupancyPercentage,
      occupancyStatus: this.getOccupancyStatus(occupancyPercentage),
      building: zone.getBuilding(),
      floorNumber: zone.getFloorNumber(),
      parentZoneId: zone.getParentZoneId(),
      isActive: zone.isActive(),
      coordinates: coordinates
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
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
  static fromCreateDTO(
    dto: CreateZoneDTO,
    generatedId: string
  ): Result<Zone, Error> {
    return Zone.create({
      id: generatedId,
      code: dto.code,
      name: dto.name,
      zoneType: dto.zoneType as ZoneType,
      capacity: dto.capacity,
      building: dto.building,
      floorNumber: dto.floorNumber,
      parentZoneId: dto.parentZoneId,
      coordinates: dto.coordinates,
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
