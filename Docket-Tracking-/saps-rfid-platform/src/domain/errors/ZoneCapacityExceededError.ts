import { DomainError } from './DomainError';

/**
 * Error thrown when attempting to add an item to a zone that is at capacity
 */
export class ZoneCapacityExceededError extends DomainError {
  constructor(zoneId: string, currentOccupancy: number, capacity: number) {
    super(
      `Zone ${zoneId} is at capacity (${currentOccupancy}/${capacity})`,
      'ZONE_CAPACITY_EXCEEDED',
      { zoneId, currentOccupancy, capacity }
    );
  }
}
