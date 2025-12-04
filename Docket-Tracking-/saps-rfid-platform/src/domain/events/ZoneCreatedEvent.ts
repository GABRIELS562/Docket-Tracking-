import { DomainEvent } from './DomainEvent';
import type { ZoneType } from '../entities/Zone';

/**
 * Event: Zone Created
 *
 * @description
 * Emitted when a new zone is created in the facility. This event enables
 * initialization of zone-related services and configuration.
 *
 * **When emitted:**
 * - After administrator creates a new zone via admin portal
 * - After successful zone validation and persistence
 * - Before any readers are assigned to the zone
 *
 * **Who might subscribe:**
 * - **Dashboard Service**: Add new zone to facility map
 * - **Statistics Service**: Initialize occupancy tracking for zone
 * - **Notification Service**: Notify facility manager of new zone
 * - **Audit Service**: Log zone creation for compliance
 * - **Configuration Service**: Set up default zone policies
 * - **Integration Service**: Sync zone to external building management system
 *
 * **Side effects:**
 * - Zone appears on facility map and floor plans
 * - Occupancy tracking initialized with 0/capacity
 * - Default access policies applied
 * - Facility manager notified
 * - Building management system updated
 *
 * @example
 * ```typescript
 * const event = new ZoneCreatedEvent(
 *   'zone-storage-003',
 *   'STOR-C',
 *   'Storage Area C',
 *   'STORAGE',
 *   500,
 *   'Main Building',
 *   2,
 *   'admin-user-123'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ZoneCreatedEvent extends DomainEvent {
  constructor(
    /**
     * Unique zone identifier
     * @example "zone-storage-003"
     */
    public readonly zoneId: string,

    /**
     * Zone code (short identifier)
     * @example "STOR-C"
     */
    public readonly zoneCode: string,

    /**
     * Zone name
     * @example "Storage Area C"
     */
    public readonly zoneName: string,

    /**
     * Zone type
     * @example "STORAGE"
     */
    public readonly zoneType: ZoneType,

    /**
     * Maximum capacity
     * @example 500
     */
    public readonly capacity: number,

    /**
     * Building name
     * @example "Main Building"
     */
    public readonly building: string | null,

    /**
     * Floor number
     * @example 2
     */
    public readonly floorNumber: number | null,

    /**
     * Who created this zone
     * @example "admin-user-123"
     */
    public readonly createdBy?: string
  ) {
    super('ZoneCreated');
  }

  protected override getPayload(): Record<string, unknown> {
    return {
      zoneId: this.zoneId,
      zoneCode: this.zoneCode,
      zoneName: this.zoneName,
      zoneType: this.zoneType,
      capacity: this.capacity,
      building: this.building,
      floorNumber: this.floorNumber,
      createdBy: this.createdBy,
    };
  }
}
