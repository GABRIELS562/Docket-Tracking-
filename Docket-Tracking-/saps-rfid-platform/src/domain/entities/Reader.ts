import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import type { IpAddress } from '../value-objects/IpAddress';
import { InvalidReaderError } from '../errors/InvalidReaderError';

/**
 * Reader status enumeration
 */
export enum ReaderStatus {
  /** Reader is online and functioning */
  ONLINE = 'online',

  /** Reader is offline/disconnected */
  OFFLINE = 'offline',

  /** Reader is in error state */
  ERROR = 'error',

  /** Reader is attempting to connect */
  CONNECTING = 'connecting',

  /** Reader is in maintenance mode */
  MAINTENANCE = 'maintenance',
}

/**
 * Reader configuration settings
 */
export interface ReaderConfiguration {
  /** Transmit power in dBm (typically 15-31.5) */
  readonly transmitPower: number;

  /** Active antenna ports (e.g., [1, 2, 3, 4]) */
  readonly antennas: readonly number[];

  /** Read interval in milliseconds */
  readonly readInterval: number;

  /** Minimum RSSI threshold to accept reads (dBm) */
  readonly rssiThreshold: number;

  /** LLRP session number (0-3) */
  readonly session: number;

  /** Mode index for reader settings */
  readonly modeIndex: number;
}

/**
 * Reader health statistics
 */
export interface ReaderHealth {
  totalReads: number;
  successfulReads: number;
  failedReads: number;
  uptimeSeconds: number;
  lastHealthCheckAt: Date | null;
}

/**
 * Properties for creating or reconstituting a Reader
 */
export interface ReaderProps {
  readonly id: string;
  readonly name: string;
  readonly ipAddress: IpAddress;
  readonly port: number;
  readonly zoneId: string;
  readonly readerModel?: string;
  readonly serialNumber?: string;
  readonly firmwareVersion?: string;
  readonly antennaCount: number;
  readonly status: ReaderStatus;
  readonly isActive: boolean;
  readonly lastConnectedAt: Date | null;
  readonly lastReadAt: Date | null;
  readonly configuration: ReaderConfiguration;
  readonly health: ReaderHealth;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Internal mutable version of ReaderProps for entity state management
 */
type MutableReaderProps = {
  -readonly [K in keyof ReaderProps]: ReaderProps[K];
};

/**
 * Reader Entity
 *
 * @description
 * Represents an RFID reader device deployed in the laboratory.
 * Contains business rules for reader health monitoring, configuration
 * management, and status tracking.
 *
 * Business Rules:
 * - Readers must have unique IP addresses
 * - Transmit power must be within valid range (15-31.5 dBm)
 * - Antenna ports must be valid for the reader
 * - Readers can only be assigned to one zone
 * - Health statistics must be non-negative
 *
 * @example
 * ```typescript
 * const result = Reader.create({
 *   id: 'reader-001',
 *   name: 'Storage Reader A1',
 *   ipAddress,
 *   port: 5084,
 *   zoneId: 'zone-001',
 *   antennaCount: 4,
 *   configuration: defaultConfig
 * });
 * ```
 */
export class Reader {
  private static readonly MIN_TRANSMIT_POWER = 15;
  private static readonly MAX_TRANSMIT_POWER = 31.5;
  private static readonly DEFAULT_PORT = 5084;
  private static readonly MIN_RSSI = -100;
  private static readonly MAX_RSSI = 0;

  private constructor(private props: MutableReaderProps) {}

  /**
   * Creates a new Reader entity
   *
   * @param params - Reader creation parameters
   * @returns Result containing Reader or Error
   */
  static create(params: {
    id: string;
    name: string;
    ipAddress: IpAddress;
    port?: number;
    zoneId: string;
    readerModel?: string;
    serialNumber?: string;
    firmwareVersion?: string;
    antennaCount?: number;
    configuration: ReaderConfiguration;
  }): Result<Reader, InvalidReaderError> {
    // Validate ID
    if (params.id.trim().length === 0) {
      return err(new InvalidReaderError('Reader ID cannot be empty'));
    }

    // Validate name
    if (params.name.trim().length === 0) {
      return err(new InvalidReaderError('Reader name cannot be empty'));
    }

    // Validate zone ID
    if (params.zoneId.trim().length === 0) {
      return err(new InvalidReaderError('Zone ID cannot be empty'));
    }

    // Validate port
    const port = params.port ?? Reader.DEFAULT_PORT;
    if (port < 1 || port > 65535) {
      return err(new InvalidReaderError('Port must be between 1 and 65535'));
    }

    // Validate antenna count
    const antennaCount = params.antennaCount ?? 4;
    if (antennaCount < 1 || antennaCount > 32) {
      return err(new InvalidReaderError('Antenna count must be between 1 and 32'));
    }

    // Validate configuration
    const configValidation = Reader.validateConfiguration(params.configuration, antennaCount);
    if (configValidation.isErr()) {
      return err(configValidation.error);
    }

    const now = new Date();

    const reader = new Reader({
      id: params.id,
      name: params.name.trim(),
      ipAddress: params.ipAddress,
      port,
      zoneId: params.zoneId,
      readerModel: params.readerModel?.trim(),
      serialNumber: params.serialNumber?.trim(),
      firmwareVersion: params.firmwareVersion?.trim(),
      antennaCount,
      status: ReaderStatus.OFFLINE,
      isActive: true,
      lastConnectedAt: null,
      lastReadAt: null,
      configuration: params.configuration,
      health: {
        totalReads: 0,
        successfulReads: 0,
        failedReads: 0,
        uptimeSeconds: 0,
        lastHealthCheckAt: null,
      },
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    return ok(reader);
  }

  /**
   * Validates reader configuration
   */
  private static validateConfiguration(
    config: ReaderConfiguration,
    antennaCount: number
  ): Result<void, InvalidReaderError> {
    // Validate transmit power
    if (
      config.transmitPower < Reader.MIN_TRANSMIT_POWER ||
      config.transmitPower > Reader.MAX_TRANSMIT_POWER
    ) {
      return err(
        new InvalidReaderError(
          `Transmit power must be between ${Reader.MIN_TRANSMIT_POWER} and ${Reader.MAX_TRANSMIT_POWER} dBm`
        )
      );
    }

    // Validate antennas
    if (config.antennas.length === 0) {
      return err(new InvalidReaderError('At least one antenna must be configured'));
    }

    for (const antenna of config.antennas) {
      if (antenna < 1 || antenna > antennaCount) {
        return err(
          new InvalidReaderError(`Antenna port ${antenna} is invalid (must be 1-${antennaCount})`)
        );
      }
    }

    // Validate RSSI threshold
    if (config.rssiThreshold < Reader.MIN_RSSI || config.rssiThreshold > Reader.MAX_RSSI) {
      return err(
        new InvalidReaderError(
          `RSSI threshold must be between ${Reader.MIN_RSSI} and ${Reader.MAX_RSSI} dBm`
        )
      );
    }

    // Validate session
    if (config.session < 0 || config.session > 3) {
      return err(new InvalidReaderError('Session must be between 0 and 3'));
    }

    // Validate read interval
    if (config.readInterval < 100) {
      return err(new InvalidReaderError('Read interval must be at least 100ms'));
    }

    return ok(undefined);
  }

  /**
   * Reconstitutes a Reader from persistence
   *
   * @param props - Complete reader properties from database
   * @returns Reader instance
   */
  static fromPersistence(props: ReaderProps): Reader {
    return new Reader(props);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getId(): string {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getIpAddress(): IpAddress {
    return this.props.ipAddress;
  }

  getPort(): number {
    return this.props.port;
  }

  getZoneId(): string {
    return this.props.zoneId;
  }

  getReaderModel(): string | undefined {
    return this.props.readerModel;
  }

  getSerialNumber(): string | undefined {
    return this.props.serialNumber;
  }

  getFirmwareVersion(): string | undefined {
    return this.props.firmwareVersion;
  }

  getAntennaCount(): number {
    return this.props.antennaCount;
  }

  getStatus(): ReaderStatus {
    return this.props.status;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getLastConnectedAt(): Date | null {
    return this.props.lastConnectedAt ? new Date(this.props.lastConnectedAt) : null;
  }

  getLastReadAt(): Date | null {
    return this.props.lastReadAt ? new Date(this.props.lastReadAt) : null;
  }

  getConfiguration(): ReaderConfiguration {
    return { ...this.props.configuration };
  }

  getHealth(): ReaderHealth {
    return { ...this.props.health };
  }

  getErrorMessage(): string | null {
    return this.props.errorMessage;
  }

  getCreatedAt(): Date {
    return new Date(this.props.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Marks the reader as online
   */
  markOnline(): void {
    this.props.status = ReaderStatus.ONLINE;
    this.props.lastConnectedAt = new Date();
    this.props.errorMessage = null;
    this.props.updatedAt = new Date();
  }

  /**
   * Marks the reader as offline
   */
  markOffline(): void {
    this.props.status = ReaderStatus.OFFLINE;
    this.props.updatedAt = new Date();
  }

  /**
   * Marks the reader as connecting
   */
  markConnecting(): void {
    this.props.status = ReaderStatus.CONNECTING;
    this.props.updatedAt = new Date();
  }

  /**
   * Marks the reader in error state
   *
   * @param errorMessage - Description of the error
   */
  markError(errorMessage: string): void {
    this.props.status = ReaderStatus.ERROR;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  /**
   * Marks the reader in maintenance mode
   */
  markMaintenance(): void {
    this.props.status = ReaderStatus.MAINTENANCE;
    this.props.updatedAt = new Date();
  }

  /**
   * Updates the last read timestamp
   */
  updateLastRead(): void {
    this.props.lastReadAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Records a successful tag read
   *
   * @param count - Number of tags read (default: 1)
   */
  recordSuccessfulRead(count: number = 1): void {
    this.props.health.totalReads += count;
    this.props.health.successfulReads += count;
    this.props.lastReadAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Records a failed tag read
   *
   * @param count - Number of failed reads (default: 1)
   */
  recordFailedRead(count: number = 1): void {
    this.props.health.totalReads += count;
    this.props.health.failedReads += count;
    this.props.updatedAt = new Date();
  }

  /**
   * Updates the reader's uptime
   *
   * @param seconds - Uptime in seconds
   */
  updateUptime(seconds: number): Result<void, Error> {
    if (seconds < 0) {
      return err(new Error('Uptime cannot be negative'));
    }

    this.props.health.uptimeSeconds = seconds;
    this.props.health.lastHealthCheckAt = new Date();
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Updates the reader's configuration
   *
   * @param config - New configuration (partial or full)
   * @returns Result indicating success or failure
   */
  updateConfiguration(
    config: Partial<ReaderConfiguration>
  ): Result<void, InvalidReaderError> {
    const newConfig: ReaderConfiguration = {
      ...this.props.configuration,
      ...config,
    };

    // Validate new configuration
    const validation = Reader.validateConfiguration(newConfig, this.props.antennaCount);
    if (validation.isErr()) {
      return validation;
    }

    this.props.configuration = newConfig;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Assigns the reader to a different zone
   *
   * @param zoneId - The new zone ID
   * @returns Result indicating success or failure
   */
  assignToZone(zoneId: string): Result<void, Error> {
    if (zoneId.trim().length === 0) {
      return err(new Error('Zone ID cannot be empty'));
    }

    this.props.zoneId = zoneId;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Deactivates the reader
   */
  deactivate(): void {
    this.props.isActive = false;
    this.props.status = ReaderStatus.OFFLINE;
    this.props.updatedAt = new Date();
  }

  /**
   * Activates the reader
   */
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Resets health statistics
   */
  resetHealthStats(): void {
    this.props.health = {
      totalReads: 0,
      successfulReads: 0,
      failedReads: 0,
      uptimeSeconds: 0,
      lastHealthCheckAt: new Date(),
    };
    this.props.updatedAt = new Date();
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Checks if the reader is healthy (online and functioning)
   */
  isHealthy(): boolean {
    return this.props.status === ReaderStatus.ONLINE && this.props.isActive;
  }

  /**
   * Checks if the reader is online
   */
  isOnline(): boolean {
    return this.props.status === ReaderStatus.ONLINE;
  }

  /**
   * Checks if the reader is offline
   */
  isOffline(): boolean {
    return this.props.status === ReaderStatus.OFFLINE;
  }

  /**
   * Checks if the reader is in error state
   */
  isInError(): boolean {
    return this.props.status === ReaderStatus.ERROR;
  }

  /**
   * Returns the number of seconds since last connection
   *
   * @returns Seconds since last connection, or null if never connected
   */
  getSecondsSinceLastConnection(): number | null {
    if (!this.props.lastConnectedAt) {
      return null;
    }

    return Math.floor((Date.now() - this.props.lastConnectedAt.getTime()) / 1000);
  }

  /**
   * Returns the number of seconds since last read
   *
   * @returns Seconds since last read, or null if no reads yet
   */
  getSecondsSinceLastRead(): number | null {
    if (!this.props.lastReadAt) {
      return null;
    }

    return Math.floor((Date.now() - this.props.lastReadAt.getTime()) / 1000);
  }

  /**
   * Calculates the read success rate
   *
   * @returns Success rate as a percentage (0-100), or null if no reads
   */
  getSuccessRate(): number | null {
    if (this.props.health.totalReads === 0) {
      return null;
    }

    return (this.props.health.successfulReads / this.props.health.totalReads) * 100;
  }

  /**
   * Checks if the reader should be considered stale
   *
   * @param thresholdSeconds - Seconds without activity before stale (default: 300)
   * @returns true if reader hasn't been seen recently
   */
  isStale(thresholdSeconds: number = 300): boolean {
    const secondsSince = this.getSecondsSinceLastConnection();
    return secondsSince !== null && secondsSince > thresholdSeconds;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Returns properties for persistence
   */
  toPersistence(): ReaderProps {
    return { ...this.props };
  }

  /**
   * Returns a plain object representation
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      ipAddress: this.props.ipAddress.getValue(),
      port: this.props.port,
      zoneId: this.props.zoneId,
      readerModel: this.props.readerModel,
      serialNumber: this.props.serialNumber,
      firmwareVersion: this.props.firmwareVersion,
      antennaCount: this.props.antennaCount,
      status: this.props.status,
      isActive: this.props.isActive,
      isHealthy: this.isHealthy(),
      lastConnectedAt: this.props.lastConnectedAt,
      lastReadAt: this.props.lastReadAt,
      secondsSinceLastConnection: this.getSecondsSinceLastConnection(),
      secondsSinceLastRead: this.getSecondsSinceLastRead(),
      configuration: this.props.configuration,
      health: this.props.health,
      successRate: this.getSuccessRate(),
      errorMessage: this.props.errorMessage,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
