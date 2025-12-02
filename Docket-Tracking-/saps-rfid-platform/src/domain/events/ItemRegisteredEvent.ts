import { DomainEvent } from './DomainEvent';

/**
 * Event: Item Registered
 *
 * @description
 * Emitted when a new item is registered in the RFID tracking system.
 * This is the first event in an item's lifecycle and marks the beginning of tracking.
 *
 * **When emitted:**
 * - After an operator scans a new item's barcode/QR code
 * - After an RFID tag is assigned to the item
 * - After all required registration fields are validated
 * - Before the item enters any zone
 *
 * **Who might subscribe:**
 * - **Notification Service**: Send confirmation email to manager
 * - **Statistics Service**: Update dashboard with new item count
 * - **Audit Service**: Log registration event for compliance
 * - **Workflow Service**: Trigger initial quality check workflow
 * - **Integration Service**: Notify external inventory systems
 *
 * @example
 * ```typescript
 * const event = new ItemRegisteredEvent(
 *   'item-123-abc',
 *   'INV-2025-000123',
 *   'E280116060002004DECA48DA',
 *   'ORD-2025-0456',
 *   'ELECTRONIC',
 *   'John Smith'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ItemRegisteredEvent extends DomainEvent {
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
     * RFID EPC tag value
     * @example "E280116060002004DECA48DA"
     */
    public readonly rfidEpc: string,

    /**
     * Associated reference ID (order number, project code, etc.)
     * @example "ORD-2025-0456"
     */
    public readonly referenceId: string,

    /**
     * Item category
     * @example "ELECTRONIC"
     */
    public readonly category: string,

    /**
     * Who registered this item
     * @example "John Smith"
     */
    public readonly registeredBy?: string
  ) {
    super('ItemRegistered');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      itemNumber: this.itemNumber,
      rfidEpc: this.rfidEpc,
      referenceId: this.referenceId,
      category: this.category,
      registeredBy: this.registeredBy,
    };
  }
}
