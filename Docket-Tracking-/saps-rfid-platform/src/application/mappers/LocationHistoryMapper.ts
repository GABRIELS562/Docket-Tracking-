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
      zoneId: entry.zoneId,
      zoneName: entry.zoneName,
      readerId: entry.readerId,
      readerName: entry.readerName,
      rfidEpc: entry.rfidEpc,
      antennaPort: entry.antennaPort,
      rssi: entry.rssi,
      signalQuality,
      readCount: entry.readCount,
      locationConfidence: entry.locationConfidence,
      eventType: entry.eventType,
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
