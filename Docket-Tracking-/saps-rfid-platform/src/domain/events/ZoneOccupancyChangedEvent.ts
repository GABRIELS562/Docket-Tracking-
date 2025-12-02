import { DomainEvent } from './DomainEvent';

/**
 * Event: Zone Occupancy Changed
 *
 * @description
 * Emitted when a zone's occupancy count changes (item added or removed).
 * This event enables capacity management, alerts, and occupancy analytics.
 *
 * **When emitted:**
 * - After an item enters or leaves a zone (triggered by ItemMoved event)
 * - After manual occupancy adjustment by administrator
 * - After system reconciliation corrects occupancy count
 *
 * **Who might subscribe:**
 * - **Alert Service**: Send alerts when capacity thresholds crossed (75%, 90%, 100%)
 * - **Dashboard Service**: Update real-time occupancy charts and heat maps
 * - **Capacity Planning Service**: Analyze occupancy trends for planning
 * - **Notification Service**: Notify facility manager when zones near capacity
 * - **Reporting Service**: Generate occupancy reports and statistics
 * - **Auto-routing Service**: Redirect items to alternative zones if full
 *
 * **Side effects:**
 * - Critical alert sent when zone reaches 90% capacity
 * - Full zone alert sent when zone reaches 100% capacity
 * - Dashboard updated with new occupancy percentage
 * - Occupancy statistics recalculated
 * - Heat map colors updated
 *
 * @example
 * ```typescript
 * const event = new ZoneOccupancyChangedEvent(
 *   'zone-storage-001',
 *   'Storage Area A',
 *   341,
 *   342,
 *   500,
 *   'item_added'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ZoneOccupancyChangedEvent extends DomainEvent {
  constructor(
    /**
     * Zone identifier
     * @example "zone-storage-001"
     */
    public readonly zoneId: string,

    /**
     * Zone name
     * @example "Evidence Storage A"
     */
    public readonly zoneName: string,

    /**
     * Occupancy before the change
     * @example 341
     */
    public readonly previousOccupancy: number,

    /**
     * Occupancy after the change
     * @example 342
     */
    public readonly currentOccupancy: number,

    /**
     * Maximum zone capacity
     * @example 500
     */
    public readonly capacity: number,

    /**
     * Why the occupancy changed
     * @example "item_added"
     */
    public readonly changeReason: 'item_added' | 'item_removed' | 'manual_adjustment'
  ) {
    super('ZoneOccupancyChanged');
  }

  protected getPayload(): Record<string, unknown> {
    const occupancyPercentage = (this.currentOccupancy / this.capacity) * 100;

    return {
      zoneId: this.zoneId,
      zoneName: this.zoneName,
      previousOccupancy: this.previousOccupancy,
      currentOccupancy: this.currentOccupancy,
      capacity: this.capacity,
      occupancyPercentage,
      previousPercentage: (this.previousOccupancy / this.capacity) * 100,
      changeReason: this.changeReason,
      availableSpace: this.capacity - this.currentOccupancy,
    };
  }

  /**
   * Gets current occupancy percentage
   */
  getOccupancyPercentage(): number {
    return (this.currentOccupancy / this.capacity) * 100;
  }

  /**
   * Checks if the zone crossed a capacity threshold
   * @param threshold - Percentage threshold (e.g., 75, 90, 100)
   */
  crossedThreshold(threshold: number): boolean {
    const prevPercentage = (this.previousOccupancy / this.capacity) * 100;
    const currPercentage = (this.currentOccupancy / this.capacity) * 100;

    return (
      (prevPercentage < threshold && currPercentage >= threshold) ||
      (prevPercentage >= threshold && currPercentage < threshold)
    );
  }

  /**
   * Checks if the zone became full
   */
  becameFull(): boolean {
    return this.previousOccupancy < this.capacity && this.currentOccupancy >= this.capacity;
  }

  /**
   * Checks if the zone became available (was full, now has space)
   */
  becameAvailable(): boolean {
    return this.previousOccupancy >= this.capacity && this.currentOccupancy < this.capacity;
  }

  /**
   * Checks if occupancy is in warning range (75-89%)
   */
  isInWarningRange(): boolean {
    const percentage = this.getOccupancyPercentage();
    return percentage >= 75 && percentage < 90;
  }

  /**
   * Checks if occupancy is in critical range (90-99%)
   */
  isInCriticalRange(): boolean {
    const percentage = this.getOccupancyPercentage();
    return percentage >= 90 && percentage < 100;
  }
}
