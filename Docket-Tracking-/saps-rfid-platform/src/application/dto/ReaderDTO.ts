/**
 * Reader Data Transfer Object (Response)
 *
 * @description
 * This is the API contract for RFID reader responses.
 * Changes to this interface are BREAKING CHANGES for frontend clients.
 *
 * Used in:
 * - GET /api/readers/:id
 * - POST /api/readers (response)
 * - GET /api/readers (list items)
 */
export interface ReaderDTO {
  /**
   * Unique reader identifier
   * @example "reader-storage-001"
   */
  readonly id: string;

  /**
   * Reader name
   * @example "Storage Reader A1"
   */
  readonly name: string;

  /**
   * Reader model
   * @example "Impinj R700"
   */
  readonly readerModel: string;

  /**
   * IP address
   * @example "192.168.1.100"
   */
  readonly ipAddress: string;

  /**
   * Network port
   * @example 5084
   */
  readonly port: number;

  /**
   * Zone ID where reader is installed
   * @example "zone-storage-001"
   */
  readonly zoneId: string;

  /**
   * Zone name (denormalized for convenience)
   * @example "Evidence Storage A"
   */
  readonly zoneName: string | null;

  /**
   * Current reader status
   * @example "ONLINE"
   */
  readonly status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING' | 'MAINTENANCE';

  /**
   * Number of antennas
   * @example 4
   */
  readonly antennaCount: number;

  /**
   * Whether reader is active
   * @example true
   */
  readonly isActive: boolean;

  /**
   * Last time reader connected (ISO 8601)
   * @example "2025-10-02T14:35:22.000Z"
   */
  readonly lastConnectedAt: string | null;

  /**
   * Last time reader performed a read (ISO 8601)
   * @example "2025-10-02T14:35:30.000Z"
   */
  readonly lastReadAt: string | null;

  /**
   * Total successful reads
   * @example 15234
   */
  readonly successfulReads: number;

  /**
   * Total failed reads
   * @example 42
   */
  readonly failedReads: number;

  /**
   * Success rate percentage (0-100)
   * @example 99.72
   */
  readonly successRate: number;

  /**
   * Uptime in seconds
   * @example 345600
   */
  readonly uptimeSeconds: number;

  /**
   * Last error message (if any)
   * @example null
   */
  readonly lastError: string | null;

  /**
   * Reader configuration
   */
  readonly configuration: {
    /**
     * Transmit power in dBm
     * @example 30.0
     */
    readonly transmitPower: number;

    /**
     * Active antenna ports
     * @example [1, 2, 3, 4]
     */
    readonly activeAntennas: number[];

    /**
     * RSSI threshold in dBm
     * @example -70
     */
    readonly rssiThreshold: number;

    /**
     * Session number (0-3)
     * @example 2
     */
    readonly session: number;

    /**
     * Mode index
     * @example 1000
     */
    readonly modeIndex: number;
  };

  /**
   * When reader was registered (ISO 8601)
   * @example "2025-01-15T10:00:00.000Z"
   */
  readonly createdAt: string;

  /**
   * When reader was last updated (ISO 8601)
   * @example "2025-10-02T14:35:30.000Z"
   */
  readonly updatedAt: string;
}

/**
 * Request DTO for registering a new reader
 *
 * @description
 * Used in POST /api/readers
 */
export interface CreateReaderDTO {
  /**
   * Reader name
   * @example "Storage Reader B1"
   */
  readonly name: string;

  /**
   * Reader model
   * @example "Impinj R700"
   */
  readonly readerModel: string;

  /**
   * IP address
   * @example "192.168.1.101"
   */
  readonly ipAddress: string;

  /**
   * Network port
   * @example 5084
   */
  readonly port: number;

  /**
   * Zone ID where reader will be installed
   * @example "zone-storage-002"
   */
  readonly zoneId: string;

  /**
   * Number of antennas
   * @example 4
   */
  readonly antennaCount: number;

  /**
   * Reader configuration (optional, uses defaults if not provided)
   */
  readonly configuration?: {
    readonly transmitPower?: number;
    readonly activeAntennas?: number[];
    readonly rssiThreshold?: number;
    readonly session?: number;
    readonly modeIndex?: number;
  };
}

/**
 * Request DTO for updating reader configuration
 *
 * @description
 * Used in PATCH /api/readers/:id/configuration
 */
export interface UpdateReaderConfigurationDTO {
  /**
   * Transmit power in dBm (15-31.5)
   */
  readonly transmitPower?: number;

  /**
   * Active antenna ports
   */
  readonly activeAntennas?: number[];

  /**
   * RSSI threshold in dBm
   */
  readonly rssiThreshold?: number;

  /**
   * Session number (0-3)
   */
  readonly session?: number;

  /**
   * Mode index
   */
  readonly modeIndex?: number;
}

/**
 * Request DTO for updating reader status
 *
 * @description
 * Used in PATCH /api/readers/:id/status
 */
export interface UpdateReaderStatusDTO {
  /**
   * New reader status
   */
  readonly status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING' | 'MAINTENANCE';

  /**
   * Optional error message (required if status is ERROR)
   */
  readonly errorMessage?: string;
}

/**
 * Response DTO for reader health statistics
 *
 * @description
 * Aggregated health metrics for monitoring
 * Used in GET /api/readers/health
 */
export interface ReaderHealthStatsDTO {
  /**
   * Reader ID
   */
  readonly readerId: string;

  /**
   * Reader name
   */
  readonly readerName: string;

  /**
   * Current status
   */
  readonly status: string;

  /**
   * Zone ID
   */
  readonly zoneId: string;

  /**
   * Whether reader is healthy (online and functioning)
   */
  readonly isHealthy: boolean;

  /**
   * Total reads
   */
  readonly totalReads: number;

  /**
   * Successful reads
   */
  readonly successfulReads: number;

  /**
   * Failed reads
   */
  readonly failedReads: number;

  /**
   * Success rate percentage
   */
  readonly successRate: number;

  /**
   * Uptime in seconds
   */
  readonly uptimeSeconds: number;

  /**
   * Seconds since last connection
   */
  readonly secondsSinceLastConnection: number | null;

  /**
   * Last error message
   */
  readonly lastError: string | null;
}

/**
 * Response DTO for bulk reader status
 *
 * @description
 * Summary of all readers for dashboard
 * Used in GET /api/readers/status
 */
export interface ReadersStatusSummaryDTO {
  /**
   * Total number of readers
   */
  readonly total: number;

  /**
   * Number of online readers
   */
  readonly online: number;

  /**
   * Number of offline readers
   */
  readonly offline: number;

  /**
   * Number of readers in error state
   */
  readonly error: number;

  /**
   * Overall health percentage
   */
  readonly healthPercentage: number;

  /**
   * Individual reader statuses
   */
  readonly readers: SimpleReaderStatusDTO[];
}

/**
 * Simplified reader status for summaries
 */
interface SimpleReaderStatusDTO {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly zoneId: string;
  readonly isHealthy: boolean;
}
