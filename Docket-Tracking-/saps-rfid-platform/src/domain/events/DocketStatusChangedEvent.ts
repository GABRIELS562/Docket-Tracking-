import { DomainEvent } from './DomainEvent';
import type { DocketStatus } from '../entities/Docket';

/**
 * Event: Docket Status Changed
 *
 * @description
 * Emitted when a docket's status changes (registered → in_transit → in_examination → archived → disposed).
 * This event tracks the docket lifecycle and enables workflow automation.
 *
 * **When emitted:**
 * - When docket moves through different lifecycle stages
 * - When forensic examination begins or completes
 * - When docket is archived after case closure
 * - When docket is marked for disposal
 * - When docket is manually updated by administrator
 *
 * **Who might subscribe:**
 * - **Workflow Service**: Trigger next workflow step based on status
 * - **Notification Service**: Notify case officer of status changes
 * - **Dashboard Service**: Update docket status visualization
 * - **Audit Service**: Log status changes for chain-of-custody
 * - **Reporting Service**: Update case status reports
 * - **Integration Service**: Sync status to external case management system
 * - **Alert Service**: Trigger alerts for critical status changes
 *
 * **Side effects:**
 * - Case officer notified of status change
 * - Workflow step triggered (e.g., quality check, examination request)
 * - Dashboard updated with new status
 * - Chain-of-custody record updated
 * - External system synchronized
 * - Alerts sent for critical statuses (e.g., marked for disposal)
 *
 * @example
 * ```typescript
 * const event = new DocketStatusChangedEvent(
 *   'docket-123-abc',
 *   'FSL-2025-000123',
 *   'REGISTERED',
 *   'IN_EXAMINATION',
 *   'Forensic technician started ballistics analysis',
 *   'technician-456'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class DocketStatusChangedEvent extends DomainEvent {
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
     * Status before the change
     * @example "REGISTERED"
     */
    public readonly previousStatus: DocketStatus,

    /**
     * Status after the change
     * @example "IN_EXAMINATION"
     */
    public readonly currentStatus: DocketStatus,

    /**
     * Reason for status change
     * @example "Forensic technician started ballistics analysis"
     */
    public readonly changeReason?: string,

    /**
     * Who changed the status
     * @example "technician-456"
     */
    public readonly changedBy?: string
  ) {
    super('DocketStatusChanged');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      docketId: this.docketId,
      labNumber: this.labNumber,
      previousStatus: this.previousStatus,
      currentStatus: this.currentStatus,
      changeReason: this.changeReason,
      changedBy: this.changedBy,
    };
  }

  /**
   * Checks if docket moved to examination
   */
  movedToExamination(): boolean {
    return this.currentStatus === 'IN_EXAMINATION';
  }

  /**
   * Checks if docket was archived
   */
  wasArchived(): boolean {
    return this.currentStatus === 'ARCHIVED';
  }

  /**
   * Checks if docket was disposed
   */
  wasDisposed(): boolean {
    return this.currentStatus === 'DISPOSED';
  }

  /**
   * Checks if docket was marked as missing
   */
  wasMarkedMissing(): boolean {
    return this.currentStatus === 'MISSING';
  }

  /**
   * Checks if status change requires notification
   */
  requiresNotification(): boolean {
    return this.currentStatus === 'IN_EXAMINATION' ||
           this.currentStatus === 'ARCHIVED' ||
           this.currentStatus === 'DISPOSED' ||
           this.currentStatus === 'MISSING';
  }
}
