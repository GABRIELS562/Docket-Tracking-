import { DomainEvent } from './DomainEvent';

/**
 * Event: Item Moved
 *
 * @description
 * Emitted when an item moves from one zone to another. This is a high-level event
 * that represents a confirmed zone transition after processing and validation of
 * multiple tag reads. It indicates a significant change in item location.
 *
 * **When emitted:**
 * - After multiple consistent tag reads confirm zone change
 * - After location confidence score exceeds threshold (typically 0.7)
 * - After debouncing period to avoid false movements
 * - When item enters a zone for the first time (fromZoneId = null)
 *
 * **Who might subscribe:**
 * - **Chain of Custody Service**: Update custody record with new location
 * - **Alert Service**: Check if movement to unauthorized zone (send alerts)
 * - **Location History Service**: Record zone transition in audit trail
 * - **Zone Occupancy Service**: Increment/decrement zone occupancy counters
 * - **Notification Service**: Notify stakeholders of item movement
 * - **Integration Service**: Update external systems
 * - **Dashboard Service**: Update real-time location map
 *
 * @example
 * ```typescript
 * const event = new ItemMovedEvent(
 *   'item-123-abc',
 *   'INV-2025-000123',
 *   'zone-processing-001',
 *   'zone-storage-001',
 *   'reader-storage-001',
 *   0.95,
 *   new Date()
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ItemMovedEvent extends DomainEvent {
  constructor(
    /**
     * Unique item identifier
     * @example "item-1704197531234-a7f3c2d"
     */
    public readonly itemId: string,

    /**
     * Item number
     * @example "INV-2025-000123"
     */
    public readonly itemNumber: string,

    /**
     * Zone the item moved from (null if entering first zone)
     * @example "zone-processing-001" or null
     */
    public readonly fromZoneId: string | null,

    /**
     * Zone the item moved to
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
    super('ItemMoved');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      itemNumber: this.itemNumber,
      fromZoneId: this.fromZoneId,
      toZoneId: this.toZoneId,
      readerId: this.readerId,
      locationConfidence: this.locationConfidence,
      movedAt: this.movedAt.toISOString(),
    };
  }

  /**
   * Checks if this is the item's first zone entry
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
