import { DomainEvent } from './DomainEvent';

/**
 * Event: Docket Registered
 *
 * @description
 * Emitted when a new evidence docket is registered in the RFID tracking system.
 * This is the first event in a docket's lifecycle and marks the beginning of tracking.
 *
 * **When emitted:**
 * - After a forensic technician scans a new evidence bag's QR code
 * - After an RFID tag is assigned to the docket
 * - After all required registration fields are validated
 * - Before the docket enters any zone
 *
 * **Who might subscribe:**
 * - **Notification Service**: Send confirmation email to lab manager
 * - **Statistics Service**: Update dashboard with new docket count
 * - **Audit Service**: Log registration event for compliance
 * - **Workflow Service**: Trigger initial quality check workflow
 * - **Integration Service**: Notify external case management system
 *
 * **Side effects:**
 * - Confirmation notification sent to registered user
 * - Dashboard statistics updated in real-time
 * - Audit log entry created
 * - Initial chain-of-custody record established
 *
 * @example
 * ```typescript
 * const event = new DocketRegisteredEvent(
 *   'docket-123-abc',
 *   'FSL-2025-000123',
 *   'E28011606000204DECA48DA',
 *   'CAS-2025-0456',
 *   'FIREARM',
 *   'Officer Smith'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class DocketRegisteredEvent extends DomainEvent {
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
     * RFID EPC tag value
     * @example "E28011606000204DECA48DA"
     */
    public readonly rfidEpc: string,

    /**
     * Associated case number
     * @example "CAS-2025-0456"
     */
    public readonly caseNumber: string,

    /**
     * Evidence category
     * @example "FIREARM"
     */
    public readonly category: string,

    /**
     * Who registered this docket
     * @example "Officer Smith"
     */
    public readonly registeredBy?: string
  ) {
    super('DocketRegistered');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      docketId: this.docketId,
      labNumber: this.labNumber,
      rfidEpc: this.rfidEpc,
      caseNumber: this.caseNumber,
      category: this.category,
      registeredBy: this.registeredBy,
    };
  }
}
