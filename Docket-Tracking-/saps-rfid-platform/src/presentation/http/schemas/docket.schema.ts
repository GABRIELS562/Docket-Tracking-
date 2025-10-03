import { z } from 'zod';

/**
 * Validation schema for creating a docket
 *
 * Validates all required fields and formats for docket registration
 */
export const createDocketSchema = z.object({
  labNumber: z
    .string()
    .regex(/^FSL-\d{4}-\d{6}$/, 'Lab number must be in format FSL-YYYY-NNNNNN'),

  caseReference: z
    .string()
    .min(1, 'Case reference is required')
    .max(500, 'Case reference must be less than 500 characters'),

  rfidEpc: z
    .string()
    .length(24, 'RFID EPC must be exactly 24 characters')
    .regex(/^[0-9A-Fa-f]{24}$/, 'RFID EPC must be 24 hexadecimal characters'),

  evidenceType: z.string().optional(),

  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Validation schema for docket search query parameters
 */
export const searchDocketsQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'archived', 'missing']).optional(),
  zoneId: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('10'),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional()
    .default('0'),
  sortBy: z.enum(['labNumber', 'caseReference', 'createdAt', 'lastSeenAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Validation schema for docket history query parameters
 */
export const docketHistoryQuerySchema = z.object({
  hours: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 168, 'Hours must be between 1 and 168 (7 days)')
    .optional()
    .default('24'),
});

/**
 * Validation schema for lab number parameter
 */
export const labNumberParamSchema = z.object({
  labNumber: z.string().regex(/^FSL-\d{4}-\d{6}$/, 'Invalid lab number format'),
});
