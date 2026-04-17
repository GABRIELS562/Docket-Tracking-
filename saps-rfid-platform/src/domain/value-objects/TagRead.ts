import { ok, err } from 'neverthrow';

import type { RfidEpc } from './RfidEpc';
import type { Result } from 'neverthrow';

/**
 * Value Object representing a single RFID tag read event
 *
 * @description
 * Immutable value object capturing details of an RFID tag detection.
 * Contains the tag identifier, signal strength, antenna information, and timestamp.
 *
 * @example
 * ```typescript
 * const tagRead = TagRead.create({
 *   epc: rfidEpc,
 *   rssi: -45.5,
 *   antennaPort: 1,
 *   readerId: 'reader-001',
 *   timestamp: new Date()
 * }).unwrap();
 * ```
 */
export class TagRead {
  private constructor(
    private readonly epc: RfidEpc,
    private readonly rssi: number,
    private readonly antennaPort: number,
    private readonly readerId: string,
    private readonly timestamp: Date,
    private readonly readCount: number
  ) {}

  /**
   * Creates a TagRead value object
   *
   * @param params - Tag read parameters
   * @returns Result containing TagRead or Error
   */
  static create(params: {
    epc: RfidEpc;
    rssi: number;
    antennaPort: number;
    readerId: string;
    timestamp: Date;
    readCount?: number;
  }): Result<TagRead, Error> {
    // Validate RSSI (Received Signal Strength Indicator)
    // Typical range: -80 dBm (weak) to -20 dBm (strong)
    if (params.rssi < -100 || params.rssi > 0) {
      return err(new Error(`Invalid RSSI value: ${params.rssi}. Must be between -100 and 0 dBm`));
    }

    // Validate antenna port (typically 1-4 for most readers)
    if (params.antennaPort < 1 || params.antennaPort > 32) {
      return err(
        new Error(`Invalid antenna port: ${params.antennaPort}. Must be between 1 and 32`)
      );
    }

    // Validate reader ID
    if (params.readerId.trim().length === 0) {
      return err(new Error('Reader ID cannot be empty'));
    }

    // Validate timestamp is not in the future
    if (params.timestamp.getTime() > Date.now()) {
      return err(new Error('Timestamp cannot be in the future'));
    }

    // Validate read count
    const readCount = params.readCount ?? 1;
    if (readCount < 1) {
      return err(new Error('Read count must be at least 1'));
    }

    return ok(
      new TagRead(
        params.epc,
        params.rssi,
        params.antennaPort,
        params.readerId,
        params.timestamp,
        readCount
      )
    );
  }

  /**
   * Returns the RFID EPC value object
   */
  getEpc(): RfidEpc {
    return this.epc;
  }

  /**
   * Returns the RSSI (Received Signal Strength Indicator) in dBm
   *
   * Typical ranges:
   * - Excellent: > -40 dBm
   * - Good: -40 to -55 dBm
   * - Fair: -55 to -70 dBm
   * - Poor: < -70 dBm
   */
  getRssi(): number {
    return this.rssi;
  }

  /**
   * Returns the antenna port number that detected the tag
   */
  getAntennaPort(): number {
    return this.antennaPort;
  }

  /**
   * Returns the reader ID that detected the tag
   */
  getReaderId(): string {
    return this.readerId;
  }

  /**
   * Returns the timestamp when the tag was read
   */
  getTimestamp(): Date {
    return new Date(this.timestamp);
  }

  /**
   * Returns the number of times this tag was read (for aggregated reads)
   */
  getReadCount(): number {
    return this.readCount;
  }

  /**
   * Returns the signal quality classification
   *
   * @returns Signal quality: 'excellent', 'good', 'fair', or 'poor'
   */
  getSignalQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.rssi > -40) return 'excellent';
    if (this.rssi > -55) return 'good';
    if (this.rssi > -70) return 'fair';
    return 'poor';
  }

  /**
   * Checks if the signal is strong enough for reliable tracking
   *
   * @param threshold - Minimum acceptable RSSI (default: -70 dBm)
   * @returns true if signal is above threshold
   */
  isSignalReliable(threshold: number = -70): boolean {
    return this.rssi > threshold;
  }

  /**
   * Returns the age of this read in milliseconds
   */
  getAgeMs(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * Checks if this read is recent (within specified milliseconds)
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 5000ms)
   * @returns true if the read is within the max age
   */
  isRecent(maxAgeMs: number = 5000): boolean {
    return this.getAgeMs() <= maxAgeMs;
  }

  /**
   * Checks equality with another TagRead
   *
   * @param other - The TagRead to compare with
   * @returns true if all fields match
   */
  equals(other: TagRead): boolean {
    return (
      this.epc.equals(other.epc) &&
      this.rssi === other.rssi &&
      this.antennaPort === other.antennaPort &&
      this.readerId === other.readerId &&
      this.timestamp.getTime() === other.timestamp.getTime() &&
      this.readCount === other.readCount
    );
  }

  /**
   * Returns a plain object representation
   */
  toObject(): {
    epc: string;
    rssi: number;
    antennaPort: number;
    readerId: string;
    timestamp: Date;
    readCount: number;
    signalQuality: string;
  } {
    return {
      epc: this.epc.getValue(),
      rssi: this.rssi,
      antennaPort: this.antennaPort,
      readerId: this.readerId,
      timestamp: this.getTimestamp(),
      readCount: this.readCount,
      signalQuality: this.getSignalQuality(),
    };
  }
}
