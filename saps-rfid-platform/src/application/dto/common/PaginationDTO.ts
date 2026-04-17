/**
 * Pagination Request Parameters
 *
 * @description
 * Standard pagination parameters for all list endpoints.
 * Used in query strings for GET requests.
 */
export interface PaginationParams {
  /**
   * Page size (number of items per page)
   * Default: 10, Min: 1, Max: 100
   * @example 20
   */
  readonly limit?: number;

  /**
   * Number of items to skip (for offset-based pagination)
   * Default: 0, Min: 0
   * @example 0
   */
  readonly offset?: number;

  /**
   * Page number (alternative to offset)
   * Default: 1, Min: 1
   * @example 1
   */
  readonly page?: number;
}

/**
 * Pagination Metadata
 *
 * @description
 * Metadata about pagination state, included in all paginated responses.
 */
export interface PaginationMeta {
  /**
   * Total number of items across all pages
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
   * Current page number (1-indexed)
   * @example 1
   */
  readonly page: number;

  /**
   * Total number of pages
   * @example 8
   */
  readonly totalPages: number;

  /**
   * Whether there are more results available
   * @example true
   */
  readonly hasMore: boolean;

  /**
   * Whether there is a previous page
   * @example false
   */
  readonly hasPrevious: boolean;
}

/**
 * Paginated Response Wrapper
 *
 * @description
 * Generic wrapper for paginated list responses.
 * Provides consistent structure across all list endpoints.
 *
 * @example
 * ```typescript
 * // GET /api/items returns:
 * {
 *   "data": [...],
 *   "pagination": {
 *     "total": 150,
 *     "limit": 20,
 *     "offset": 0,
 *     "page": 1,
 *     "totalPages": 8,
 *     "hasMore": true,
 *     "hasPrevious": false
 *   }
 * }
 * ```
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items for current page
   */
  readonly data: T[];

  /**
   * Pagination metadata
   */
  readonly pagination: PaginationMeta;
}

/**
 * Helper to create pagination metadata
 *
 * @param total - Total number of items
 * @param limit - Page size
 * @param offset - Offset
 * @returns Pagination metadata object
 */
export function createPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  return {
    total,
    limit,
    offset,
    page,
    totalPages,
    hasMore: offset + limit < total,
    hasPrevious: offset > 0,
  };
}

/**
 * Helper to create paginated response
 *
 * @param data - Array of items
 * @param total - Total number of items
 * @param limit - Page size
 * @param offset - Offset
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(total, limit, offset),
  };
}
