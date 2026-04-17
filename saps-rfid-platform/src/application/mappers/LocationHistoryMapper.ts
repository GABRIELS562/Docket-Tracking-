import type { LocationHistoryEntry } from '../../domain/repositories/ILocationHistoryRepository';
import type { LocationHistoryDTO } from '../dto/LocationHistoryDTO';

/**
 * Location History Mapper
 *
 * @description
 * Converts location history records to DTOs for API responses.
 */
export class LocationHistoryMapper {
  /**
   * Maps domain event type to DTO event type
   */
  private static mapEventTypeToDTO(
    eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement'
  ): 'DETECTED' | 'ENTERED' | 'EXITED' | 'MOVED' {
    const eventMap: Record<
      'tag_read' | 'zone_entry' | 'zone_exit' | 'movement',
      'DETECTED' | 'ENTERED' | 'EXITED' | 'MOVED'
    > = {
      tag_read: 'DETECTED',
      zone_entry: 'ENTERED',
      zone_exit: 'EXITED',
      movement: 'MOVED',
    };
    return eventMap[eventType];
  }

  /**
   * Converts a LocationHistoryEntry to a DTO
   *
   * @param entry - The location history entry
   * @returns Location history DTO for API response
   */
  static toDTO(entry: LocationHistoryEntry): LocationHistoryDTO {
    // Determine signal quality from RSSI
    let signalQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (entry.rssi > -40) {
      signalQuality = 'excellent';
    } else if (entry.rssi > -55) {
      signalQuality = 'good';
    } else if (entry.rssi > -70) {
      signalQuality = 'fair';
    } else {
      signalQuality = 'poor';
    }

    return {
      timestamp: entry.time.toISOString(),
      itemNumber: entry.itemNumber,
      zoneId: entry.zoneId ?? 'unknown',
      zoneName: entry.zoneName ?? 'Unknown Zone',
      readerId: entry.readerId,
      readerName: entry.readerName,
      rfidEpc: entry.rfidEpc,
      antennaPort: entry.antennaPort,
      rssi: entry.rssi,
      signalQuality,
      readCount: entry.readCount,
      locationConfidence: entry.locationConfidence ?? 0,
      eventType: LocationHistoryMapper.mapEventTypeToDTO(entry.eventType),
    };
  }

  /**
   * Converts an array of LocationHistoryEntry to DTOs
   *
   * @param entries - Array of location history entries
   * @returns Array of Location history DTOs
   */
  static toDTOArray(entries: LocationHistoryEntry[]): LocationHistoryDTO[] {
    return entries.map((entry) => LocationHistoryMapper.toDTO(entry));
  }
}
