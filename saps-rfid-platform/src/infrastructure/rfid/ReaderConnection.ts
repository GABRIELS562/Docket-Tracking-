import type { Reader } from '../../domain/entities/Reader';

/**
 * Reader Connection Interface
 *
 * @description
 * Represents a connection to a physical RFID reader.
 * This is a placeholder interface - full implementation would include:
 * - LLRP protocol connection
 * - Connection state management
 * - Automatic reconnection
 * - Event emission for tag reads
 *
 * The actual implementation will be in a separate file with LLRP client.
 */
export interface IReaderConnection {
  /**
   * Get the Reader entity this connection represents
   */
  getReader(): Reader;

  /**
   * Get reader ID
   */
  getReaderId(): string;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Check if currently reading tags
   */
  isReading(): boolean;

  /**
   * Get last error
   */
  getLastError(): Error | null;

  /**
   * Get last seen timestamp
   */
  getLastSeenAt(): Date | null;

  /**
   * Get reconnection attempt count
   */
  getReconnectionAttempts(): number;

  /**
   * Disconnect from reader
   */
  disconnect(): Promise<void>;
}

/**
 * Basic ReaderConnection implementation for testing
 *
 * @description
 * This is a simplified implementation for use in the connection pool.
 * Full LLRP implementation would be much more complex.
 */
export class ReaderConnection implements IReaderConnection {
  private connected: boolean = false;
  private reading: boolean = false;
  private lastError: Error | null = null;
  private lastSeenAt: Date | null = null;
  private reconnectionAttempts: number = 0;

  constructor(private reader: Reader) {}

  getReader(): Reader {
    return this.reader;
  }

  getReaderId(): string {
    return this.reader.getId();
  }

  isConnected(): boolean {
    return this.connected;
  }

  isReading(): boolean {
    return this.reading;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  getLastSeenAt(): Date | null {
    return this.lastSeenAt;
  }

  getReconnectionAttempts(): number {
    return this.reconnectionAttempts;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.reading = false;
  }

  // Additional methods for managing connection state
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  setReading(reading: boolean): void {
    this.reading = reading;
  }

  setLastError(error: Error | null): void {
    this.lastError = error;
  }

  updateLastSeen(): void {
    this.lastSeenAt = new Date();
  }

  incrementReconnectionAttempts(): void {
    this.reconnectionAttempts++;
  }

  resetReconnectionAttempts(): void {
    this.reconnectionAttempts = 0;
  }
}
