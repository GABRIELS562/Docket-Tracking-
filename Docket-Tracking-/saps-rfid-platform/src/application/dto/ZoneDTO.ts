/**
 * Zone Data Transfer Object (Response)
 *
 * @description
 * This is the API contract for zone responses.
 * Changes to this interface are BREAKING CHANGES for frontend clients.
 *
 * Used in:
 * - GET /api/zones/:id
 * - POST /api/zones (response)
 * - GET /api/zones (list items)
 */
export interface ZoneDTO {
  /**
   * Unique zone identifier
   * @example "zone-storage-001"
   */
  readonly id: string;

  /**
   * Zone code (short identifier)
   * @example "STOR-A"
   */
  readonly code: string;

  /**
   * Zone name
   * @example "Storage Area A"
   */
  readonly name: string;

  /**
   * Zone type
   * @example "STORAGE"
   */
  readonly zoneType: 'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE';

  /**
   * Maximum capacity (number of items)
   * @example 500
   */
  readonly capacity: number;

  /**
   * Current number of items
   * @example 342
   */
  readonly currentOccupancy: number;

  /**
   * Occupancy percentage (0-100)
   * @example 68
   */
  readonly occupancyPercentage: number;

  /**
   * Occupancy status classification
   * @example "normal"
   */
  readonly occupancyStatus: 'normal' | 'warning' | 'critical' | 'full';

  /**
   * Building name
   * @example "Main Building"
   */
  readonly building: string | null;

  /**
   * Floor number
   * @example 2
   */
  readonly floorNumber: number | null;

  /**
   * Parent zone ID (for hierarchical zones)
   * @example "zone-building-001"
   */
  readonly parentZoneId: string | null;

  /**
   * Whether zone is active
   * @example true
   */
  readonly isActive: boolean;

  /**
   * Geographic coordinates (if available)
   */
  readonly coordinates: {
    readonly latitude: number;
    readonly longitude: number;
  } | null;

  /**
   * Reader IDs assigned to this zone
   * @example ["reader-001", "reader-002"]
   */
  readonly readerIds: string[];

  /**
   * When zone was created (ISO 8601)
   * @example "2025-01-15T10:00:00.000Z"
   */
  readonly createdAt: string;

  /**
   * When zone was last updated (ISO 8601)
   * @example "2025-10-02T14:30:00.000Z"
   */
  readonly updatedAt: string;
}

/**
 * Request DTO for creating a new zone
 *
 * @description
 * Used in POST /api/zones
 */
export interface CreateZoneDTO {
  /**
   * Zone code (short identifier)
   * @example "STOR-B"
   */
  readonly code: string;

  /**
   * Zone name
   * @example "Storage Area B"
   */
  readonly name: string;

  /**
   * Zone type
   * @example "STORAGE"
   */
  readonly zoneType: 'STORAGE' | 'EXAMINATION' | 'TRANSIT' | 'ARCHIVE' | 'OFFICE' | 'CORRIDOR' | 'ENTRANCE';

  /**
   * Maximum capacity
   * @example 500
   */
  readonly capacity: number;

  /**
   * Building name
   * @example "Main Building"
   */
  readonly building?: string;

  /**
   * Floor number
   * @example 2
   */
  readonly floorNumber?: number;

  /**
   * Parent zone ID
   * @example "zone-building-001"
   */
  readonly parentZoneId?: string;

  /**
   * Geographic coordinates
   */
  readonly coordinates?: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

/**
 * Request DTO for updating a zone
 *
 * @description
 * Used in PATCH /api/zones/:id
 * All fields are optional (partial update)
 */
export interface UpdateZoneDTO {
  /**
   * Update zone name
   */
  readonly name?: string;

  /**
   * Update capacity
   */
  readonly capacity?: number;

  /**
   * Update building
   */
  readonly building?: string;

  /**
   * Update floor number
   */
  readonly floorNumber?: number;

  /**
   * Update coordinates
   */
  readonly coordinates?: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

/**
 * Response DTO for zone with occupancy details
 *
 * @description
 * Extended zone information for dashboard/monitoring
 * Used in GET /api/zones/occupancy
 */
export interface ZoneOccupancyDTO {
  /**
   * Zone ID
   */
  readonly zoneId: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

  /**
   * Zone code
   */
  readonly zoneCode: string;

  /**
   * Current occupancy
   */
  readonly currentOccupancy: number;

  /**
   * Maximum capacity
   */
  readonly capacity: number;

  /**
   * Available space
   */
  readonly availableCapacity: number;

  /**
   * Occupancy percentage
   */
  readonly occupancyPercentage: number;

  /**
   * Status classification
   */
  readonly occupancyStatus: 'normal' | 'warning' | 'critical' | 'full';

  /**
   * Number of active readers in zone
   */
  readonly activeReaders: number;
}

/**
 * Response DTO for zone with items
 *
 * @description
 * Zone with list of items currently in the zone
 * Used in GET /api/zones/:id/items
 */
export interface ZoneWithItemsDTO {
  /**
   * Zone information
   */
  readonly zone: ZoneDTO;

  /**
   * Total number of items in zone
   */
  readonly totalItems: number;

  /**
   * Recent items (limited list)
   */
  readonly recentItems: SimpleItemDTO[];
}

/**
 * Simplified item DTO for zone listings
 */
interface SimpleItemDTO {
  readonly itemNumber: string;
  readonly description: string;
  readonly category: string;
  readonly lastSeenAt: string | null;
}
