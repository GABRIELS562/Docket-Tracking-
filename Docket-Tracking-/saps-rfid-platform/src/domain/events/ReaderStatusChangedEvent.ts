import { DomainEvent } from './DomainEvent';
import { ReaderStatus } from '../entities/Reader';

/**
 * Event: Reader Status Changed
 *
 * @description
 * Emitted when an RFID reader's operational status changes (online, offline, error, etc.).
 * This event enables hardware monitoring, alerting, and maintenance workflows.
 *
 * **When emitted:**
 * - After reader heartbeat timeout (typically 30 seconds)
 * - When reader successfully reconnects after being offline
 * - When reader encounters hardware or connection error
 * - When reader is manually put into maintenance mode
 * - When reader configuration changes affect status
 *
 * **Who might subscribe:**
 * - **Alert Service**: Send alerts when critical readers go offline
 * - **Monitoring Dashboard**: Update reader status map in real-time
 * - **Maintenance Service**: Create maintenance tickets for offline readers
 * - **Zone Service**: Mark zone as partially monitored if reader offline
 * - **Statistics Service**: Track reader uptime and reliability metrics
 * - **Notification Service**: Notify facility manager of reader issues
 * - **Integration Service**: Report reader status to network monitoring system
 *
 * **Side effects:**
 * - Alert sent when reader goes offline (severity based on zone criticality)
 * - Maintenance ticket created for offline/error status
 * - Dashboard shows reader status in red/yellow/green
 * - Zone marked as "partially monitored" if reader offline
 * - Uptime statistics updated
 * - Network monitoring system notified
 * - Backup reader activated if available
 *
 * @example
 * ```typescript
 * const event = new ReaderStatusChangedEvent(
 *   'reader-storage-001',
 *   'Storage Reader A1',
 *   'ONLINE',
 *   'OFFLINE',
 *   'zone-storage-001',
 *   'Connection timeout after 30 seconds'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ReaderStatusChangedEvent extends DomainEvent {
  constructor(
    /**
     * Reader identifier
     * @example "reader-storage-001"
     */
    public readonly readerId: string,

    /**
     * Reader name
     * @example "Storage Reader A1"
     */
    public readonly readerName: string,

    /**
     * Status before the change
     * @example "ONLINE"
     */
    public readonly previousStatus: ReaderStatus,

    /**
     * Status after the change
     * @example "OFFLINE"
     */
    public readonly currentStatus: ReaderStatus,

    /**
     * Zone where reader is installed
     * @example "zone-storage-001"
     */
    public readonly zoneId: string,

    /**
     * Error message if status is ERROR
     * @example "Connection timeout after 30 seconds"
     */
    public readonly errorMessage?: string
  ) {
    super('ReaderStatusChanged');
  }

  protected override getPayload(): Record<string, unknown> {
    return {
      readerId: this.readerId,
      readerName: this.readerName,
      previousStatus: this.previousStatus,
      currentStatus: this.currentStatus,
      zoneId: this.zoneId,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Checks if the reader went offline
   */
  wentOffline(): boolean {
    return this.previousStatus !== ReaderStatus.OFFLINE && this.currentStatus === ReaderStatus.OFFLINE;
  }

  /**
   * Checks if the reader came online
   */
  cameOnline(): boolean {
    return this.previousStatus !== ReaderStatus.ONLINE && this.currentStatus === ReaderStatus.ONLINE;
  }

  /**
   * Checks if the reader encountered an error
   */
  encounteredError(): boolean {
    return this.currentStatus === ReaderStatus.ERROR;
  }

  /**
   * Checks if the reader recovered from error
   */
  recoveredFromError(): boolean {
    return this.previousStatus === ReaderStatus.ERROR && this.currentStatus === ReaderStatus.ONLINE;
  }

  /**
   * Checks if this requires immediate attention
   */
  requiresImmediateAttention(): boolean {
    return this.currentStatus === ReaderStatus.ERROR || this.currentStatus === ReaderStatus.OFFLINE;
  }
}
