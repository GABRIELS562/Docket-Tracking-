import { DomainEvent } from './DomainEvent';

/**
 * Event: Reader Registered
 *
 * @description
 * Emitted when a new RFID reader is registered in the system. This event
 * enables initialization of reader monitoring and configuration.
 *
 * **When emitted:**
 * - After administrator registers a new RFID reader
 * - After successful reader configuration and network test
 * - After reader is assigned to a zone
 * - Before reader starts detecting tags
 *
 * **Who might subscribe:**
 * - **Monitoring Service**: Begin health checks and heartbeat monitoring
 * - **Dashboard Service**: Add reader to zone map
 * - **Configuration Service**: Apply default reader settings
 * - **Notification Service**: Notify facility manager of new reader
 * - **Audit Service**: Log reader registration for compliance
 * - **Statistics Service**: Initialize read counters for reader
 * - **Integration Service**: Register reader in network monitoring system
 *
 * **Side effects:**
 * - Heartbeat monitoring started (30-second intervals)
 * - Reader appears on zone map
 * - Default configuration applied
 * - Network monitoring system updated
 * - Performance tracking initialized
 *
 * @example
 * ```typescript
 * const event = new ReaderRegisteredEvent(
 *   'reader-storage-003',
 *   'Storage Reader C1',
 *   'Impinj R700',
 *   '192.168.1.103',
 *   5084,
 *   'zone-storage-003',
 *   4,
 *   'admin-user-123'
 * );
 * await eventBus.publish(event);
 * ```
 */
export class ReaderRegisteredEvent extends DomainEvent {
  constructor(
    /**
     * Unique reader identifier
     * @example "reader-storage-003"
     */
    public readonly readerId: string,

    /**
     * Reader name
     * @example "Storage Reader C1"
     */
    public readonly readerName: string,

    /**
     * Reader model
     * @example "Impinj R700"
     */
    public readonly readerModel: string,

    /**
     * IP address
     * @example "192.168.1.103"
     */
    public readonly ipAddress: string,

    /**
     * Network port
     * @example 5084
     */
    public readonly port: number,

    /**
     * Zone where reader is installed
     * @example "zone-storage-003"
     */
    public readonly zoneId: string,

    /**
     * Number of antennas
     * @example 4
     */
    public readonly antennaCount: number,

    /**
     * Who registered this reader
     * @example "admin-user-123"
     */
    public readonly registeredBy?: string
  ) {
    super('ReaderRegistered');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      readerId: this.readerId,
      readerName: this.readerName,
      readerModel: this.readerModel,
      ipAddress: this.ipAddress,
      port: this.port,
      zoneId: this.zoneId,
      antennaCount: this.antennaCount,
      registeredBy: this.registeredBy,
    };
  }
}
