/**
 * Item Data Transfer Object (Response)
 *
 * @description
 * This is the API contract for item responses.
 * Changes to this interface are BREAKING CHANGES for frontend clients.
 * All dates are ISO 8601 strings for JSON serializability.
 *
 * Used in:
 * - GET /api/items/:itemNumber
 * - POST /api/items (response)
 * - GET /api/items (list items)
 */
export interface ItemDTO {
  /**
   * Unique identifier
   * @example "item-1704197531234-a7f3c2d"
   */
  readonly id: string;

  /**
   * Item number
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;

  /**
   * Reference identifier (order number, project code, etc.)
   * @example "ORD-2025-0456"
   */
  readonly referenceId: string;

  /**
   * Optional serial number
   * @example "SN-123456789"
   */
  readonly serialNumber: string | null;

  /**
   * Description of the item
   * @example "Laptop Computer - Dell XPS 15"
   */
  readonly description: string;

  /**
   * Item category
   * @example "ELECTRONIC"
   */
  readonly category: string;

  /**
   * RFID EPC tag value (24 hex characters)
   * @example "E280116060002004DECA48DA"
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
  readonly status: 'registered' | 'in_transit' | 'in_processing' | 'archived' | 'disposed' | 'missing';

  /**
   * Last reader that detected this item
   * @example "reader-storage-001"
   */
  readonly lastSeenReaderId: string | null;

  /**
   * Last time item was detected (ISO 8601)
   * @example "2025-10-02T14:32:11.000Z"
   */
  readonly lastSeenAt: string | null;

  /**
   * Location confidence score (0.0 to 1.0)
   * @example 0.85
   */
  readonly locationConfidence: number | null;

  /**
   * Who received this item
   * @example "John Smith"
   */
  readonly receivedBy: string | null;

  /**
   * When item was received (ISO 8601)
   * @example "2025-10-01T09:15:00.000Z"
   */
  readonly receivedAt: string | null;

  /**
   * When item was registered in the system (ISO 8601)
   * @example "2025-10-01T09:15:30.000Z"
   */
  readonly createdAt: string;

  /**
   * When item was last updated (ISO 8601)
   * @example "2025-10-02T14:32:11.000Z"
   */
  readonly updatedAt: string;

  /**
   * Additional metadata
   */
  readonly metadata: Record<string, unknown>;
}

/**
 * Request DTO for creating a new item
 *
 * @description
 * Used in POST /api/items
 */
export interface CreateItemDTO {
  /**
   * Item number (flexible format)
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;

  /**
   * Reference identifier (order number, project code, etc.)
   * @example "ORD-2025-0456"
   */
  readonly referenceId: string;

  /**
   * Optional serial number
   * @example "SN-123456789"
   */
  readonly serialNumber?: string;

  /**
   * Description of the item
   * @example "Laptop Computer - Dell XPS 15"
   */
  readonly description: string;

  /**
   * Item category
   * @example "ELECTRONIC"
   */
  readonly category: 'equipment' | 'consumable' | 'electronic' | 'document' | 'material' | 'tool' | 'apparel' | 'container' | 'sample' | 'other';

  /**
   * RFID EPC tag value (24 hex characters)
   * @example "E280116060002004DECA48DA"
   */
  readonly rfidEpc: string;

  /**
   * Who received this item
   * @example "John Smith"
   */
  readonly receivedBy?: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request DTO for updating an item
 *
 * @description
 * Used in PATCH /api/items/:itemNumber
 * All fields are optional (partial update)
 */
export interface UpdateItemDTO {
  /**
   * Update reference ID
   */
  readonly referenceId?: string;

  /**
   * Update serial number
   */
  readonly serialNumber?: string;

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
 * Request DTO for searching items
 *
 * @description
 * Used in GET /api/items?query=...&status=...
 */
export interface SearchItemsDTO {
  /**
   * Full-text search query
   * Searches in: itemNumber, referenceId, description, serialNumber
   * @example "INV-2025"
   */
  readonly query?: string;

  /**
   * Filter by status
   * @example "registered"
   */
  readonly status?: 'registered' | 'in_transit' | 'in_processing' | 'archived' | 'disposed' | 'missing';

  /**
   * Filter by zone ID
   * @example "zone-storage-001"
   */
  readonly zoneId?: string;

  /**
   * Filter by category
   * @example "electronic"
   */
  readonly category?: string;

  /**
   * Filter items created after this date (ISO 8601)
   * @example "2025-01-01T00:00:00.000Z"
   */
  readonly createdAfter?: string;

  /**
   * Filter items created before this date (ISO 8601)
   * @example "2025-12-31T23:59:59.999Z"
   */
  readonly createdBefore?: string;

  /**
   * Filter only active items (not archived or disposed)
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
  readonly sortBy?: 'itemNumber' | 'createdAt' | 'lastSeenAt' | 'referenceId';

  /**
   * Sort direction
   * @example "desc"
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Response DTO for item search results
 *
 * @description
 * Paginated response with metadata
 */
export interface SearchItemsResponseDTO {
  /**
   * Array of matching items
   */
  readonly items: ItemDTO[];

  /**
   * Total number of matching items (before pagination)
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
 * Response DTO for item details with enriched data
 *
 * @description
 * Extended item information including zone details and recent history
 * Used in GET /api/items/:itemNumber/details
 */
export interface ItemDetailsDTO extends ItemDTO {
  /**
   * Recent location history (last 10 movements)
   */
  readonly recentHistory: ItemLocationHistoryDTO[];

  /**
   * Number of days since last seen
   * @example 2
   */
  readonly daysSinceLastSeen: number | null;

  /**
   * Whether item is currently missing
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
 * Simple location history entry for item details
 */
export interface ItemLocationHistoryDTO {
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
