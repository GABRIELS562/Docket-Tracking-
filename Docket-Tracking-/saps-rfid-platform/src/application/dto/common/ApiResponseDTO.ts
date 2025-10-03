/**
 * API Success Response
 *
 * @description
 * Standard wrapper for successful API responses.
 * Provides consistent structure across all endpoints.
 *
 * @example
 * ```json
 * {
 *   "success": true,
 *   "data": { ... },
 *   "timestamp": "2025-10-03T10:30:00.000Z"
 * }
 * ```
 */
export interface ApiSuccessResponse<T> {
  /**
   * Indicates successful response
   * @example true
   */
  readonly success: true;

  /**
   * Response data (DTO or array of DTOs)
   */
  readonly data: T;

  /**
   * Server timestamp (ISO 8601)
   * @example "2025-10-03T10:30:00.000Z"
   */
  readonly timestamp: string;

  /**
   * Optional metadata (e.g., pagination, statistics)
   */
  readonly meta?: Record<string, unknown>;
}

/**
 * API Error Response
 *
 * @description
 * Standard wrapper for error responses.
 * Provides consistent error structure across all endpoints.
 *
 * @example
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid lab number format",
 *     "details": { "field": "labNumber", "value": "INVALID" }
 *   },
 *   "timestamp": "2025-10-03T10:30:00.000Z"
 * }
 * ```
 */
export interface ApiErrorResponse {
  /**
   * Indicates error response
   * @example false
   */
  readonly success: false;

  /**
   * Error details
   */
  readonly error: {
    /**
     * Error code (machine-readable)
     * @example "VALIDATION_ERROR"
     */
    readonly code: string;

    /**
     * Human-readable error message
     * @example "Invalid lab number format"
     */
    readonly message: string;

    /**
     * Optional additional error details
     */
    readonly details?: Record<string, unknown>;

    /**
     * Optional stack trace (only in development)
     */
    readonly stack?: string;
  };

  /**
   * Server timestamp (ISO 8601)
   * @example "2025-10-03T10:30:00.000Z"
   */
  readonly timestamp: string;
}

/**
 * API Response (Success or Error)
 *
 * @description
 * Union type for all API responses.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Common Error Codes
 *
 * @description
 * Standard error codes used across the API.
 */
export enum ApiErrorCode {
  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_LAB_NUMBER = 'INVALID_LAB_NUMBER',
  INVALID_EPC = 'INVALID_EPC',
  INVALID_IP_ADDRESS = 'INVALID_IP_ADDRESS',

  // Not Found Errors (404)
  DOCKET_NOT_FOUND = 'DOCKET_NOT_FOUND',
  ZONE_NOT_FOUND = 'ZONE_NOT_FOUND',
  READER_NOT_FOUND = 'READER_NOT_FOUND',

  // Conflict Errors (409)
  DUPLICATE_LAB_NUMBER = 'DUPLICATE_LAB_NUMBER',
  DUPLICATE_EPC = 'DUPLICATE_EPC',
  ZONE_CAPACITY_EXCEEDED = 'ZONE_CAPACITY_EXCEEDED',

  // Business Logic Errors (422)
  INVALID_ZONE_TRANSITION = 'INVALID_ZONE_TRANSITION',
  INVALID_READER_STATUS = 'INVALID_READER_STATUS',

  // Server Errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

/**
 * Helper to create success response
 *
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns API success response
 *
 * @example
 * ```typescript
 * return createSuccessResponse(docketDTO);
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    meta,
  };
}

/**
 * Helper to create error response
 *
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 * @param stack - Optional stack trace
 * @returns API error response
 *
 * @example
 * ```typescript
 * return createErrorResponse(
 *   ApiErrorCode.DOCKET_NOT_FOUND,
 *   'Docket with lab number FSL-2025-000123 not found',
 *   { labNumber: 'FSL-2025-000123' }
 * );
 * ```
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  stack?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      stack,
    },
    timestamp: new Date().toISOString(),
  };
}
