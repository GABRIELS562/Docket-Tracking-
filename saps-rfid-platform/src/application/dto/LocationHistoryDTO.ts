/**
 * Location History Data Transfer Object (Response)
 *
 * @description
 * This is the API contract for location history responses.
 * Used for tracking RFID tag reads and item movements over time.
 *
 * Used in:
 * - GET /api/location-history
 * - GET /api/items/:itemNumber/history
 * - GET /api/zones/:id/activity
 */
export interface LocationHistoryDTO {
  /**
   * When the tag was read (ISO 8601)
   * @example "2025-10-02T14:32:11.123Z"
   */
  readonly timestamp: string;

  /**
   * Item number of the item
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;

  /**
   * Zone ID where tag was read
   * @example "zone-storage-001"
   */
  readonly zoneId: string;

  /**
   * Zone name
   * @example "Storage Area A"
   */
  readonly zoneName: string;

  /**
   * Reader ID that detected the tag
   * @example "reader-storage-001"
   */
  readonly readerId: string;

  /**
   * Reader name
   * @example "Storage Reader A1"
   */
  readonly readerName: string;

  /**
   * RFID EPC tag value
   * @example "E280116060002004DECA48DA"
   */
  readonly rfidEpc: string;

  /**
   * Antenna port number that detected the tag
   * @example 2
   */
  readonly antennaPort: number;

  /**
   * Signal strength in dBm
   * @example -45.5
   */
  readonly rssi: number;

  /**
   * Signal quality classification
   * @example "good"
   */
  readonly signalQuality: 'excellent' | 'good' | 'fair' | 'poor';

  /**
   * Number of consecutive reads
   * @example 15
   */
  readonly readCount: number;

  /**
   * Location confidence score (0.0 to 1.0)
   * @example 0.85
   */
  readonly locationConfidence: number;

  /**
   * Event type
   * @example "DETECTED"
   */
  readonly eventType: 'DETECTED' | 'ENTERED' | 'EXITED' | 'MOVED';
}

/**
 * Request DTO for querying location history
 *
 * @description
 * Used in GET /api/location-history
 */
export interface QueryLocationHistoryDTO {
  /**
   * Filter by item number
   * @example "INV-2025-000123"
   */
  readonly itemNumber?: string;

  /**
   * Filter by zone ID
   * @example "zone-storage-001"
   */
  readonly zoneId?: string;

  /**
   * Filter by reader ID
   * @example "reader-storage-001"
   */
  readonly readerId?: string;

  /**
   * Filter by RFID EPC
   * @example "E280116060002004DECA48DA"
   */
  readonly rfidEpc?: string;

  /**
   * Start time (ISO 8601)
   * @example "2025-10-01T00:00:00.000Z"
   */
  readonly startTime?: string;

  /**
   * End time (ISO 8601)
   * @example "2025-10-02T23:59:59.999Z"
   */
  readonly endTime?: string;

  /**
   * Filter by event type
   * @example "DETECTED"
   */
  readonly eventType?: 'DETECTED' | 'ENTERED' | 'EXITED' | 'MOVED';

  /**
   * Minimum signal strength threshold
   * @example -70
   */
  readonly minRssi?: number;

  /**
   * Page size (default: 100, max: 1000)
   * @example 100
   */
  readonly limit?: number;

  /**
   * Number of records to skip
   * @example 0
   */
  readonly offset?: number;
}

/**
 * Response DTO for zone visit summary
 *
 * @description
 * Aggregated data about item visits to a zone
 * Used in GET /api/zones/:id/visits
 */
export interface ZoneVisitSummaryDTO {
  /**
   * Item number
   */
  readonly itemNumber: string;

  /**
   * Zone ID
   */
  readonly zoneId: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

  /**
   * First time seen in this zone (ISO 8601)
   */
  readonly firstSeenAt: string;

  /**
   * Last time seen in this zone (ISO 8601)
   */
  readonly lastSeenAt: string;

  /**
   * Total duration in zone (seconds)
   */
  readonly durationSeconds: number;

  /**
   * Total number of reads
   */
  readonly totalReads: number;

  /**
   * Average signal strength
   */
  readonly averageRssi: number;

  /**
   * Number of unique readers that detected this item
   */
  readonly uniqueReaders: number;
}

/**
 * Response DTO for read statistics
 *
 * @description
 * Aggregated statistics for RFID reads
 * Used in GET /api/analytics/read-stats
 */
export interface ReadStatisticsDTO {
  /**
   * Time period start (ISO 8601)
   */
  readonly periodStart: string;

  /**
   * Time period end (ISO 8601)
   */
  readonly periodEnd: string;

  /**
   * Total number of reads
   */
  readonly totalReads: number;

  /**
   * Number of unique items read
   */
  readonly uniqueItems: number;

  /**
   * Number of unique zones
   */
  readonly uniqueZones: number;

  /**
   * Number of unique readers
   */
  readonly uniqueReaders: number;

  /**
   * Average signal strength
   */
  readonly averageRssi: number;

  /**
   * Average reads per item
   */
  readonly averageReadsPerItem: number;

  /**
   * Peak read time (hour of day, 0-23)
   */
  readonly peakHour: number;

  /**
   * Busiest zone ID
   */
  readonly busiestZoneId: string;

  /**
   * Busiest zone name
   */
  readonly busiestZoneName: string;

  /**
   * Most active reader ID
   */
  readonly mostActiveReaderId: string;

  /**
   * Most active reader name
   */
  readonly mostActiveReaderName: string;
}
