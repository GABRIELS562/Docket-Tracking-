import { z } from 'zod';

/**
 * Item Categories
 *
 * Generic categories applicable to any inventory tracking system.
 * Tenants can extend with custom categories via metadata.
 */
export const itemCategories = [
  'equipment',
  'consumable',
  'electronic',
  'document',
  'material',
  'tool',
  'apparel',
  'container',
  'sample',
  'other',
] as const;

/**
 * Item Statuses
 *
 * Generic status values for item lifecycle tracking.
 */
export const itemStatuses = [
  'registered',
  'in_transit',
  'in_processing',
  'archived',
  'disposed',
  'missing',
] as const;

/**
 * Validation schema for creating an item
 *
 * Validates all required fields and formats for item registration.
 * Uses flexible item number format to support various industries.
 */
export const createItemSchema = z.object({
  itemNumber: z
    .string()
    .min(1, 'Item number is required')
    .max(50, 'Item number must be less than 50 characters')
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\-\/_]{0,49}$/,
      'Item number must start with alphanumeric and contain only alphanumeric, hyphens, underscores, or slashes'
    ),

  referenceId: z
    .string()
    .max(100, 'Reference ID must be less than 100 characters')
    .optional()
    .default('N/A'),

  rfidEpc: z
    .string()
    .length(24, 'RFID EPC must be exactly 24 characters')
    .regex(/^[0-9A-Fa-f]{24}$/, 'RFID EPC must be 24 hexadecimal characters'),

  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),

  category: z.enum(itemCategories, {
    errorMap: () => ({
      message: `Category must be one of: ${itemCategories.join(', ')}`,
    }),
  }),

  serialNumber: z.string().max(100, 'Serial number must be less than 100 characters').optional(),

  receivedBy: z.string().max(100, 'Received by must be less than 100 characters').optional(),

  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Validation schema for item search query parameters
 */
export const searchItemsQuerySchema = z.object({
  q: z.string().max(200, 'Search query must be less than 200 characters').optional(),

  status: z.enum(itemStatuses).optional(),

  zoneId: z.string().optional(),

  category: z.enum(itemCategories).optional(),

  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('10'),

  offset: z
    .string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .refine((n) => n >= 0, 'Offset must be non-negative')
    .optional()
    .default('0'),

  sortBy: z
    .enum(['itemNumber', 'referenceId', 'createdAt', 'lastSeenAt'])
    .optional()
    .default('createdAt'),

  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Validation schema for item history query parameters
 */
export const itemHistoryQuerySchema = z
  .object({
    hours: z
      .string()
      .regex(/^\d+$/, 'Hours must be a number')
      .transform(Number)
      .refine((n) => n >= 1 && n <= 168, 'Hours must be between 1 and 168 (7 days)')
      .optional(),

    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .refine((n) => n >= 1 && n <= 1000, 'Limit must be between 1 and 1000')
      .optional(),

    startTime: z
      .string()
      .datetime({ message: 'Start time must be a valid ISO 8601 datetime' })
      .optional(),

    endTime: z
      .string()
      .datetime({ message: 'End time must be a valid ISO 8601 datetime' })
      .optional(),
  })
  .refine(
    (data) => {
      // If one of startTime/endTime is provided, both must be provided
      if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
        return false;
      }
      return true;
    },
    { message: 'Both startTime and endTime must be provided together' }
  )
  .refine(
    (data) => {
      // If both provided, startTime must be before endTime
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
      }
      return true;
    },
    { message: 'startTime must be before endTime' }
  );

/**
 * Validation schema for item number URL parameter
 *
 * Uses flexible format to support various item number patterns:
 * - Numeric: 12345
 * - Year-based: INV-2025-000123
 * - Prefix-based: ASSET-001
 * - Slash-based: 12345/25
 */
export const itemNumberParamSchema = z.object({
  itemNumber: z
    .string()
    .min(1, 'Item number is required')
    .max(50, 'Item number must be less than 50 characters')
    .regex(/^[A-Za-z0-9][A-Za-z0-9\-\/_]{0,49}$/, 'Invalid item number format'),
});

/**
 * Validation schema for zone ID URL parameter
 */
export const zoneIdParamSchema = z.object({
  zoneId: z
    .string()
    .min(1, 'Zone ID is required')
    .max(36, 'Zone ID must be less than 36 characters'),
});

/**
 * Validation schema for zone items query parameters
 */
export const zoneItemsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200, 'Limit must be between 1 and 200')
    .optional()
    .default('50'),

  recentOnly: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
});

/**
 * Type exports for use in controllers and tests
 */
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type SearchItemsQuery = z.infer<typeof searchItemsQuerySchema>;
export type ItemHistoryQuery = z.infer<typeof itemHistoryQuerySchema>;
export type ZoneItemsQuery = z.infer<typeof zoneItemsQuerySchema>;
