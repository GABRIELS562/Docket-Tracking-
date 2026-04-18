import { DomainEvent } from './DomainEvent';

/**
 * Event: Item Marked Missing
 *
 * @description
 * Emitted when an item is marked as missing because it hasn't been detected
 * for an extended period (typically 24-72 hours depending on zone type).
 * This is a critical event requiring immediate investigation.
 *
 * **When emitted:**
 * - After scheduled missing item detection job runs
 * - When item hasn't been seen for threshold period (varies by zone)
 * - Manual marking by administrator during physical audit
 * - After reconciliation process identifies discrepancy
 *
 * **Who might subscribe:**
 * - **Alert Service**: Send URGENT alerts to manager and security (HIGH PRIORITY)
 * - **Notification Service**: Send SMS/email to stakeholders
 * - **Incident Service**: Create incident ticket for investigation
 * - **Audit Service**: Log missing event for compliance reporting
 * - **Dashboard Service**: Show missing item in red on map
 * - **Search Service**: Trigger comprehensive RFID scan of all zones
 * - **Reporting Service**: Generate missing item report
 * - **Integration Service**: Notify external systems
 *
 * @example
 * ```typescript
 * const event = new ItemMarkedMissingEvent(
 *   'item-123-abc',
 *   'INV-2025-000123',
 *   'zone-storage-001',
 *   new Date('2025-10-01T10:00:00Z'),
 *   48.5
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ItemMarkedMissingEvent extends DomainEvent {
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
     * Last zone where item was seen
     * @example "zone-storage-001"
     */
    public readonly lastSeenZoneId: string | null,

    /**
     * Last time item was detected
     * @example new Date('2025-10-01T10:00:00Z')
     */
    public readonly lastSeenAt: Date | null,

    /**
     * Hours since last detection
     * @example 48.5
     */
    public readonly hoursSinceLastSeen: number | null
  ) {
    super('ItemMarkedMissing');
  }

  protected override getPayload(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      itemNumber: this.itemNumber,
      lastSeenZoneId: this.lastSeenZoneId,
      lastSeenAt: this.lastSeenAt?.toISOString() ?? null,
      hoursSinceLastSeen: this.hoursSinceLastSeen,
      daysSinceLastSeen: this.hoursSinceLastSeen ? Math.floor(this.hoursSinceLastSeen / 24) : null,
    };
  }

  /**
   * Checks if item has been missing for more than threshold hours
   */
  isMissingLongerThan(hours: number): boolean {
    return this.hoursSinceLastSeen !== null && this.hoursSinceLastSeen > hours;
  }

  /**
   * Checks if this is a critical missing case (> 72 hours)
   */
  isCritical(): boolean {
    return this.isMissingLongerThan(72);
  }

  /**
   * Gets the number of days since last seen
   */
  getDaysSinceLastSeen(): number | null {
    return this.hoursSinceLastSeen ? Math.floor(this.hoursSinceLastSeen / 24) : null;
  }
}
