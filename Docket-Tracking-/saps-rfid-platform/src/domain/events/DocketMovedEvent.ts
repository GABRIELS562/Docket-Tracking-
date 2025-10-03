import { DomainEvent } from './DomainEvent';

/**
 * Event: Docket Moved
 *
 * @description
 * Emitted when a docket moves from one zone to another. This is a high-level event
 * that represents a confirmed zone transition after processing and validation of
 * multiple tag reads. It indicates a significant change in evidence location.
 *
 * **When emitted:**
 * - After multiple consistent tag reads confirm zone change
 * - After location confidence score exceeds threshold (typically 0.7)
 * - After debouncing period to avoid false movements
 * - When docket enters a zone for the first time (fromZoneId = null)
 *
 * **Who might subscribe:**
 * - **Chain of Custody Service**: Update custody record with new location
 * - **Alert Service**: Check if movement to unauthorized zone (send alerts)
 * - **Location History Service**: Record zone transition in audit trail
 * - **Zone Occupancy Service**: Increment/decrement zone occupancy counters
 * - **Notification Service**: Notify stakeholders of evidence movement
 * - **Integration Service**: Update external case management systems
 * - **Dashboard Service**: Update real-time location map
 *
 * **Side effects:**
 * - Chain-of-custody record updated with new location
 * - Alerts triggered if moved to restricted zone
 * - Zone occupancy counters updated atomically
 * - Location history entry created
 * - Stakeholder notifications sent (email/SMS)
 * - Dashboard shows updated docket location
 *
 * @example
 * ```typescript
 * const event = new DocketMovedEvent(
 *   'docket-123-abc',
 *   'FSL-2025-000123',
 *   'zone-examination-001',
 *   'zone-storage-001',
 *   'reader-storage-001',
 *   0.95,
 *   new Date()
 * );
 * await eventBus.publish(event);
 * ```
 */
export class DocketMovedEvent extends DomainEvent {
  constructor(
    /**
     * Unique docket identifier
     * @example "docket-1704197531234-a7f3c2d"
     */
    public readonly docketId: string,

    /**
     * Forensic lab number
     * @example "FSL-2025-000123"
     */
    public readonly labNumber: string,

    /**
     * Zone the docket moved from (null if entering first zone)
     * @example "zone-examination-001" or null
     */
    public readonly fromZoneId: string | null,

    /**
     * Zone the docket moved to
     * @example "zone-storage-001"
     */
    public readonly toZoneId: string,

    /**
     * Reader that detected the movement
     * @example "reader-storage-001"
     */
    public readonly readerId: string,

    /**
     * Confidence score for this location (0.0 to 1.0)
     * Based on RSSI strength and read consistency
     * @example 0.95
     */
    public readonly locationConfidence: number,

    /**
     * When the movement occurred
     * @example new Date()
     */
    public readonly movedAt: Date
  ) {
    super('DocketMoved');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      docketId: this.docketId,
      labNumber: this.labNumber,
      fromZoneId: this.fromZoneId,
      toZoneId: this.toZoneId,
      readerId: this.readerId,
      locationConfidence: this.locationConfidence,
      movedAt: this.movedAt.toISOString(),
    };
  }

  /**
   * Checks if this is the docket's first zone entry
   */
  isFirstEntry(): boolean {
    return this.fromZoneId === null;
  }

  /**
   * Checks if location confidence is high (>= 0.8)
   */
  isHighConfidence(): boolean {
    return this.locationConfidence >= 0.8;
  }

  /**
   * Checks if location confidence is low (< 0.5)
   */
  isLowConfidence(): boolean {
    return this.locationConfidence < 0.5;
  }
}
