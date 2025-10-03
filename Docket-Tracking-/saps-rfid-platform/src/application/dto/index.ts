/**
 * Application Layer DTOs - Central Export
 *
 * @description
 * This is the single import point for all Data Transfer Objects (DTOs).
 * DTOs are the API contract between backend and frontend.
 *
 * All DTOs are:
 * - JSON-serializable (no Date objects, only ISO 8601 strings)
 * - Immutable (all properties readonly)
 * - Well-documented with JSDoc and @example tags
 * - Type-safe (no 'any' types)
 *
 * Usage:
 * ```typescript
 * import { DocketDTO, CreateDocketDTO, PaginatedResponse } from '@/application/dto';
 * ```
 */

// ============================================================================
// Docket DTOs
// ============================================================================
export type {
  DocketDTO,
  CreateDocketDTO,
  UpdateDocketDTO,
  SearchDocketsDTO,
  SearchDocketsResponseDTO,
  DocketDetailsDTO,
} from './DocketDTO';

// ============================================================================
// Zone DTOs
// ============================================================================
export type {
  ZoneDTO,
  CreateZoneDTO,
  UpdateZoneDTO,
  ZoneOccupancyDTO,
  ZoneWithDocketsDTO,
} from './ZoneDTO';

// ============================================================================
// Reader DTOs
// ============================================================================
export type {
  ReaderDTO,
  CreateReaderDTO,
  UpdateReaderConfigurationDTO,
  UpdateReaderStatusDTO,
  ReaderHealthStatsDTO,
  ReadersStatusSummaryDTO,
} from './ReaderDTO';

// ============================================================================
// Location History DTOs
// ============================================================================
export type {
  LocationHistoryDTO,
  QueryLocationHistoryDTO,
  ZoneVisitSummaryDTO,
  ReadStatisticsDTO,
} from './LocationHistoryDTO';

// ============================================================================
// Common/Shared DTOs
// ============================================================================
export type {
  // Pagination
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  // API Responses
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  // Sorting
  SortOrder,
  SortParams,
  DocketSortField,
  ZoneSortField,
  ReaderSortField,
} from './common';

export {
  // Pagination helpers
  createPaginationMeta,
  createPaginatedResponse,
  // API response helpers
  ApiErrorCode,
  createSuccessResponse,
  createErrorResponse,
  // Sorting validators
  isValidSortField,
  isValidSortOrder,
} from './common';
