import { DomainEvent } from './DomainEvent';

/**
 * Event: Tag Detected
 *
 * @description
 * Emitted when an RFID reader detects a tag. This is a low-level event that
 * represents raw hardware detection before any business logic processing.
 * It's the foundation for all location tracking and zone transition detection.
 *
 * **When emitted:**
 * - Immediately after an RFID reader successfully reads a tag
 * - Before any business logic determines if this is a movement
 * - Multiple times per second for tags in reader range (deduplicated by application layer)
 * - Independently for each antenna that detects the tag
 *
 * **Who might subscribe:**
 * - **Location Processor**: Aggregate reads to determine docket location
 * - **Real-time Dashboard**: Update live tag detection map via WebSocket
 * - **Zone Occupancy Service**: Calculate current zone occupancy
 * - **Audit Service**: Log raw RFID reads for forensic analysis
 * - **Performance Monitor**: Track reader performance and detection rates
 * - **Alert Service**: Trigger alerts for unexpected detections
 *
 * **Side effects:**
 * - Real-time dashboard shows tag blip on zone map
 * - Read count incremented for reader statistics
 * - Raw detection logged to time-series database (TimescaleDB)
 * - Signal strength analyzed for quality monitoring
 *
 * **Performance Note:**
 * This event can fire thousands of times per minute in a busy facility.
 * Handlers MUST be optimized for high throughput (<10ms processing time).
 *
 * @example
 * ```typescript
 * const event = new TagDetectedEvent(
 *   'E28011606000204DECA48DA',
 *   'reader-storage-001',
 *   'zone-storage-001',
 *   -45.5,
 *   2,
 *   new Date()
 * );
 * await eventBus.publish(event);
 * ```
 */
export class TagDetectedEvent extends DomainEvent {
  constructor(
    /**
     * RFID EPC tag value
     * @example "E28011606000204DECA48DA"
     */
    public readonly rfidEpc: string,

    /**
     * Reader that detected the tag
     * @example "reader-storage-001"
     */
    public readonly readerId: string,

    /**
     * Zone where the reader is located
     * @example "zone-storage-001"
     */
    public readonly zoneId: string,

    /**
     * Signal strength (RSSI) in dBm
     * Typical range: -30 (very strong) to -90 (very weak)
     * @example -45.5
     */
    public readonly rssi: number,

    /**
     * Antenna port that detected the tag
     * @example 2
     */
    public readonly antennaPort: number,

    /**
     * Timestamp of detection (from reader hardware if available)
     * @example new Date()
     */
    public readonly timestamp: Date
  ) {
    super('TagDetected');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rfidEpc: this.rfidEpc,
      readerId: this.readerId,
      zoneId: this.zoneId,
      rssi: this.rssi,
      antennaPort: this.antennaPort,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Determines signal quality based on RSSI
   */
  getSignalQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.rssi > -40) return 'excellent';
    if (this.rssi > -55) return 'good';
    if (this.rssi > -70) return 'fair';
    return 'poor';
  }

  /**
   * Checks if this is a strong read (RSSI > -55 dBm)
   */
  isStrongRead(): boolean {
    return this.rssi > -55;
  }
}
