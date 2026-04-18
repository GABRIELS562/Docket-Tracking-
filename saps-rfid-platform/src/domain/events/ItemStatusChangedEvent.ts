import { DomainEvent } from './DomainEvent';

import type { ItemStatus } from '../entities/Item';

/**
 * Event: Item Status Changed
 *
 * @description
 * Emitted when an item's status changes (registered → in_transit → in_processing → archived → disposed).
 * This event tracks the item lifecycle and enables workflow automation.
 *
 * **When emitted:**
 * - When item moves through different lifecycle stages
 * - When processing begins or completes
 * - When item is archived after completion
 * - When item is marked for disposal
 * - When item is manually updated by administrator
 *
 * **Who might subscribe:**
 * - **Workflow Service**: Trigger next workflow step based on status
 * - **Notification Service**: Notify stakeholders of status changes
 * - **Dashboard Service**: Update item status visualization
 * - **Audit Service**: Log status changes for chain-of-custody
 * - **Reporting Service**: Update status reports
 * - **Integration Service**: Sync status to external systems
 * - **Alert Service**: Trigger alerts for critical status changes
 *
 * @example
 * ```typescript
 * const event = new ItemStatusChangedEvent(
 *   'item-123-abc',
 *   'INV-2025-000123',
 *   'REGISTERED',
 *   'IN_PROCESSING',
 *   'Started quality inspection',
 *   'technician-456'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ItemStatusChangedEvent extends DomainEvent {
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
     * Status before the change
     * @example "REGISTERED"
     */
    public readonly previousStatus: ItemStatus,

    /**
     * Status after the change
     * @example "IN_PROCESSING"
     */
    public readonly currentStatus: ItemStatus,

    /**
     * Reason for status change
     * @example "Started quality inspection"
     */
    public readonly changeReason?: string,

    /**
     * Who changed the status
     * @example "technician-456"
     */
    public readonly changedBy?: string
  ) {
    super('ItemStatusChanged');
  }

  protected override getPayload(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      itemNumber: this.itemNumber,
      previousStatus: this.previousStatus,
      currentStatus: this.currentStatus,
      changeReason: this.changeReason,
      changedBy: this.changedBy,
    };
  }

  /**
   * Checks if item moved to processing
   */
  movedToProcessing(): boolean {
    return this.currentStatus === 'in_processing';
  }

  /**
   * Checks if item was archived
   */
  wasArchived(): boolean {
    return this.currentStatus === 'archived';
  }

  /**
   * Checks if item was disposed
   */
  wasDisposed(): boolean {
    return this.currentStatus === 'disposed';
  }

  /**
   * Checks if item was marked as missing
   */
  wasMarkedMissing(): boolean {
    return this.currentStatus === 'missing';
  }

  /**
   * Checks if status change requires notification
   */
  requiresNotification(): boolean {
    return (
      this.currentStatus === 'in_processing' ||
      this.currentStatus === 'archived' ||
      this.currentStatus === 'disposed' ||
      this.currentStatus === 'missing'
    );
  }
}
