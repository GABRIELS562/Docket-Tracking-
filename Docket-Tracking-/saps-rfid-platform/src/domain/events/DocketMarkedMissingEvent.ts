import { DomainEvent } from './DomainEvent';

/**
 * Event: Docket Marked Missing
 *
 * @description
 * Emitted when a docket is marked as missing because it hasn't been detected
 * for an extended period (typically 24-72 hours depending on zone type).
 * This is a critical event requiring immediate investigation.
 *
 * **When emitted:**
 * - After scheduled missing docket detection job runs
 * - When docket hasn't been seen for threshold period (varies by zone)
 * - Manual marking by administrator during physical audit
 * - After reconciliation process identifies discrepancy
 *
 * **Who might subscribe:**
 * - **Alert Service**: Send URGENT alerts to lab manager and security (HIGH PRIORITY)
 * - **Notification Service**: Send SMS/email to case officer and stakeholders
 * - **Incident Service**: Create incident ticket for investigation
 * - **Audit Service**: Log missing event for compliance reporting
 * - **Dashboard Service**: Show missing docket in red on map
 * - **Search Service**: Trigger comprehensive RFID scan of all zones
 * - **Reporting Service**: Generate missing docket report
 * - **Integration Service**: Notify law enforcement and case management systems
 *
 * **Side effects:**
 * - URGENT alert sent to lab manager and security team
 * - Incident ticket created in tracking system
 * - Case officer notified via SMS and email
 * - Dashboard shows docket in red "missing" status
 * - Full facility scan initiated
 * - Missing evidence report generated
 * - Law enforcement notified (for critical evidence)
 * - Chain-of-custody investigation initiated
 *
 * @example
 * ```typescript
 * const event = new DocketMarkedMissingEvent(
 *   'docket-123-abc',
 *   'FSL-2025-000123',
 *   'zone-storage-001',
 *   new Date('2025-10-01T10:00:00Z'),
 *   48.5
 * );
 * await eventBus.publish(event);
 * ```
 */
export class DocketMarkedMissingEvent extends DomainEvent {
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
     * Last zone where docket was seen
     * @example "zone-storage-001"
     */
    public readonly lastSeenZoneId: string | null,

    /**
     * Last time docket was detected
     * @example new Date('2025-10-01T10:00:00Z')
     */
    public readonly lastSeenAt: Date | null,

    /**
     * Hours since last detection
     * @example 48.5
     */
    public readonly hoursSinceLastSeen: number | null
  ) {
    super('DocketMarkedMissing');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      docketId: this.docketId,
      labNumber: this.labNumber,
      lastSeenZoneId: this.lastSeenZoneId,
      lastSeenAt: this.lastSeenAt?.toISOString() ?? null,
      hoursSinceLastSeen: this.hoursSinceLastSeen,
      daysSinceLastSeen: this.hoursSinceLastSeen
        ? Math.floor(this.hoursSinceLastSeen / 24)
        : null,
    };
  }

  /**
   * Checks if docket has been missing for more than threshold hours
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
