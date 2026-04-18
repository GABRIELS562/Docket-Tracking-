/**
 * Sort Order
 *
 * @description
 * Sorting direction for list queries.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort Parameters
 *
 * @description
 * Standard sorting parameters for list endpoints.
 */
export interface SortParams<TField extends string = string> {
  /**
   * Field to sort by
   * @example "createdAt"
   */
  readonly sortBy?: TField;

  /**
   * Sort direction
   * @example "desc"
   */
  readonly sortOrder?: SortOrder;
}

/**
 * Common sortable fields for Item
 */
export type ItemSortField = 'itemNumber' | 'createdAt' | 'lastSeenAt' | 'referenceId' | 'status';

/**
 * Common sortable fields for Zone
 */
export type ZoneSortField =
  | 'code'
  | 'name'
  | 'capacity'
  | 'currentOccupancy'
  | 'occupancyPercentage'
  | 'createdAt';

/**
 * Common sortable fields for Reader
 */
export type ReaderSortField = 'name' | 'status' | 'lastConnectedAt' | 'successRate' | 'createdAt';

/**
 * Validates sort field against allowed fields
 *
 * @param field - Field to validate
 * @param allowedFields - Array of allowed fields
 * @returns Whether field is allowed
 */
export function isValidSortField(field: string | undefined, allowedFields: string[]): boolean {
  return !field || allowedFields.includes(field);
}

/**
 * Validates sort order
 *
 * @param order - Order to validate
 * @returns Whether order is valid
 */
export function isValidSortOrder(order: string | undefined): order is SortOrder {
  return !order || order === 'asc' || order === 'desc';
}
