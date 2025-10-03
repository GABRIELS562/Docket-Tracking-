/**
 * Docket Data Transfer Object (Response)
 *
 * @description
 * This is the API contract for docket responses.
 * Changes to this interface are BREAKING CHANGES for frontend clients.
 * All dates are ISO 8601 strings for JSON serializability.
 *
 * Used in:
 * - GET /api/dockets/:labNumber
 * - POST /api/dockets (response)
 * - GET /api/dockets (list items)
 */
export interface DocketDTO {
  /**
   * Unique identifier
   * @example "docket-1704197531234-a7f3c2d"
   */
  readonly id: string;

  /**
   * Forensic lab number
   * @example "FSL-2025-000123"
   */
  readonly labNumber: string;

  /**
   * Case reference number
   * @example "CAS-2025-0456"
   */
  readonly caseNumber: string;

  /**
   * Optional exhibit number
   * @example "EXH-001"
   */
  readonly exhibitNumber: string | null;

  /**
   * Description of the evidence
   * @example "9mm Pistol - Glock 17"
   */
  readonly description: string;

  /**
   * Evidence category
   * @example "FIREARM"
   */
  readonly category: string;

  /**
   * RFID EPC tag value (24 hex characters)
   * @example "E28011606000204DECA48DA"
   */
  readonly rfidEpc: string;

  /**
   * Current zone information (null if not in a zone)
   */
  readonly currentZone: {
    readonly id: string;
    readonly name: string;
    readonly code: string;
  } | null;

  /**
   * Current status
   * @example "REGISTERED"
   */
  readonly status: 'REGISTERED' | 'IN_TRANSIT' | 'IN_EXAMINATION' | 'ARCHIVED' | 'DISPOSED' | 'MISSING';

  /**
   * Last reader that detected this docket
   * @example "reader-storage-001"
   */
  readonly lastSeenReaderId: string | null;

  /**
   * Last time docket was detected (ISO 8601)
   * @example "2025-10-02T14:32:11.000Z"
   */
  readonly lastSeenAt: string | null;

  /**
   * Location confidence score (0.0 to 1.0)
   * @example 0.85
   */
  readonly locationConfidence: number | null;

  /**
   * Who received this evidence
   * @example "Officer Smith"
   */
  readonly receivedBy: string | null;

  /**
   * When docket was received (ISO 8601)
   * @example "2025-10-01T09:15:00.000Z"
   */
  readonly receivedAt: string | null;

  /**
   * When docket was registered in the system (ISO 8601)
   * @example "2025-10-01T09:15:30.000Z"
   */
  readonly createdAt: string;

  /**
   * When docket was last updated (ISO 8601)
   * @example "2025-10-02T14:32:11.000Z"
   */
  readonly updatedAt: string;

  /**
   * Additional metadata
   */
  readonly metadata: Record<string, unknown>;
}

/**
 * Request DTO for creating a new docket
 *
 * @description
 * Used in POST /api/dockets
 */
export interface CreateDocketDTO {
  /**
   * Forensic lab number (format: FSL-YYYY-NNNNNN)
   * @example "FSL-2025-000123"
   */
  readonly labNumber: string;

  /**
   * Case reference number
   * @example "CAS-2025-0456"
   */
  readonly caseNumber: string;

  /**
   * Optional exhibit number
   * @example "EXH-001"
   */
  readonly exhibitNumber?: string;

  /**
   * Description of the evidence
   * @example "9mm Pistol - Glock 17"
   */
  readonly description: string;

  /**
   * Evidence category
   * @example "FIREARM"
   */
  readonly category: 'FIREARM' | 'DRUG' | 'DIGITAL' | 'BIOLOGICAL' | 'DOCUMENT' | 'WEAPON' | 'CLOTHING' | 'OTHER';

  /**
   * RFID EPC tag value (24 hex characters)
   * @example "E28011606000204DECA48DA"
   */
  readonly rfidEpc: string;

  /**
   * Who received this evidence
   * @example "Officer Smith"
   */
  readonly receivedBy?: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request DTO for updating a docket
 *
 * @description
 * Used in PATCH /api/dockets/:labNumber
 * All fields are optional (partial update)
 */
export interface UpdateDocketDTO {
  /**
   * Update case number
   */
  readonly caseNumber?: string;

  /**
   * Update exhibit number
   */
  readonly exhibitNumber?: string;

  /**
   * Update description
   */
  readonly description?: string;

  /**
   * Update metadata (merged with existing)
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request DTO for searching dockets
 *
 * @description
 * Used in GET /api/dockets?query=...&status=...
 */
export interface SearchDocketsDTO {
  /**
   * Full-text search query
   * Searches in: labNumber, caseNumber, description, exhibitNumber
   * @example "FSL-2025"
   */
  readonly query?: string;

  /**
   * Filter by status
   * @example "REGISTERED"
   */
  readonly status?: 'REGISTERED' | 'IN_TRANSIT' | 'IN_EXAMINATION' | 'ARCHIVED' | 'DISPOSED' | 'MISSING';

  /**
   * Filter by zone ID
   * @example "zone-storage-001"
   */
  readonly zoneId?: string;

  /**
   * Filter by category
   * @example "FIREARM"
   */
  readonly category?: string;

  /**
   * Filter dockets created after this date (ISO 8601)
   * @example "2025-01-01T00:00:00.000Z"
   */
  readonly createdAfter?: string;

  /**
   * Filter dockets created before this date (ISO 8601)
   * @example "2025-12-31T23:59:59.999Z"
   */
  readonly createdBefore?: string;

  /**
   * Filter only active dockets (not archived or disposed)
   * @example true
   */
  readonly activeOnly?: boolean;

  /**
   * Page size (default: 10, max: 100)
   * @example 20
   */
  readonly limit?: number;

  /**
   * Number of records to skip (for pagination)
   * @example 0
   */
  readonly offset?: number;

  /**
   * Sort field
   * @example "createdAt"
   */
  readonly sortBy?: 'labNumber' | 'createdAt' | 'lastSeenAt' | 'caseNumber';

  /**
   * Sort direction
   * @example "desc"
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Response DTO for docket search results
 *
 * @description
 * Paginated response with metadata
 */
export interface SearchDocketsResponseDTO {
  /**
   * Array of matching dockets
   */
  readonly dockets: DocketDTO[];

  /**
   * Total number of matching dockets (before pagination)
   * @example 150
   */
  readonly total: number;

  /**
   * Current page size
   * @example 20
   */
  readonly limit: number;

  /**
   * Current offset
   * @example 0
   */
  readonly offset: number;

  /**
   * Whether there are more results available
   * @example true
   */
  readonly hasMore: boolean;
}

/**
 * Response DTO for docket details with enriched data
 *
 * @description
 * Extended docket information including zone details and recent history
 * Used in GET /api/dockets/:labNumber/details
 */
export interface DocketDetailsDTO extends DocketDTO {
  /**
   * Recent location history (last 10 movements)
   */
  readonly recentHistory: LocationHistoryDTO[];

  /**
   * Number of days since last seen
   * @example 2
   */
  readonly daysSinceLastSeen: number | null;

  /**
   * Whether docket is currently missing
   * @example false
   */
  readonly isMissing: boolean;

  /**
   * Whether location is reliable (confidence >= 0.7)
   * @example true
   */
  readonly hasReliableLocation: boolean;
}

/**
 * Simple location history entry for docket details
 */
interface LocationHistoryDTO {
  /**
   * Timestamp (ISO 8601)
   */
  readonly timestamp: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

  /**
   * Signal strength
   */
  readonly rssi: number;

  /**
   * Location confidence
   */
  readonly confidence: number;
}
