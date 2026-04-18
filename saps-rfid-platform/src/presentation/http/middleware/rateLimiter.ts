import rateLimit from 'express-rate-limit';

import type { AuthenticatedRequest } from './authMiddleware';
import type { Request, Response } from 'express';

/**
 * Subscription tier rate limit configuration
 *
 * @description
 * Defines API rate limits based on tenant subscription tier.
 * Higher tiers get more generous limits.
 */
export interface TierRateLimits {
  /** Requests per minute */
  requestsPerMinute: number;
  /** Requests per hour */
  requestsPerHour: number;
  /** Burst limit (short-term peak) */
  burstLimit: number;
}

/**
 * Rate limit configurations by subscription tier
 */
export const TIER_RATE_LIMITS: Record<string, TierRateLimits> = {
  free: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    burstLimit: 10,
  },
  starter: {
    requestsPerMinute: 60,
    requestsPerHour: 2000,
    burstLimit: 20,
  },
  professional: {
    requestsPerMinute: 120,
    requestsPerHour: 5000,
    burstLimit: 50,
  },
  enterprise: {
    requestsPerMinute: 300,
    requestsPerHour: 20000,
    burstLimit: 100,
  },
};

/**
 * Default tier for unauthenticated or unknown tier requests
 */
const DEFAULT_TIER = 'starter';

/**
 * Standard error response for rate limiting
 */
const rateLimitExceededResponse = {
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
};

/**
 * Generates a rate limit key based on tenant ID or IP address
 *
 * @description
 * For authenticated requests, uses tenant ID as the key to enforce
 * per-tenant rate limits. Falls back to IP address for unauthenticated requests.
 *
 * @param req - Express request (may be authenticated)
 * @returns Rate limit key string
 */
function getTenantOrIpKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;

  // Use tenant ID if available (authenticated request)
  if (authReq.tenantId) {
    return `tenant:${authReq.tenantId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Gets the subscription tier for rate limit lookup
 *
 * @description
 * Extracts the tenant's subscription tier from the request.
 * Falls back to default tier if not available.
 *
 * @param req - Express request
 * @returns Subscription tier string
 */
function getSubscriptionTier(req: Request): string {
  const authReq = req as AuthenticatedRequest;

  // Get tier from tenant context (will be set by auth middleware)
  // For now, we use a default tier. In production, this would
  // come from the Tenant entity's subscriptionTier property.
  if (authReq.tenantId) {
    // TODO: Enhance to lookup actual tier from tenant cache/context
    // For Phase 1, all authenticated tenants get starter tier
    return DEFAULT_TIER;
  }

  // Unauthenticated requests get the most restrictive (free) tier
  return 'free';
}

/**
 * Gets rate limits for a tier with guaranteed defaults
 *
 * @param tier - Subscription tier name
 * @returns TierRateLimits for the specified tier
 */
function getLimitsForTier(tier: string): TierRateLimits {
  return (
    TIER_RATE_LIMITS[tier] ??
    TIER_RATE_LIMITS[DEFAULT_TIER] ?? {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      burstLimit: 10,
    }
  );
}

/**
 * Rate Limiting middleware (IP-based)
 *
 * Protects API from abuse and DoS attacks using IP-based limiting.
 *
 * Configuration:
 * - Window: 1 minute (60 seconds)
 * - Max requests: 100 per IP per window
 * - Headers: Standard rate limit headers enabled
 *
 * Response when exceeded:
 * - HTTP 429 Too Many Requests
 * - Structured JSON error
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per IP
  message: rateLimitExceededResponse,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for sensitive endpoints
 *
 * More restrictive limits for authentication, registration, etc.
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tenant-based rate limiter (per-minute)
 *
 * @description
 * Rate limiting based on tenant ID with tier-based limits.
 * Authenticated requests are limited per tenant, unauthenticated per IP.
 *
 * Features:
 * - Uses tenant ID as key for authenticated requests
 * - Falls back to IP for unauthenticated requests
 * - Dynamic limits based on subscription tier
 * - Returns tenant info in rate limit headers
 */
export const tenantRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: (req: Request): number => {
    const tier = getSubscriptionTier(req);
    const limits = getLimitsForTier(tier);
    return limits.requestsPerMinute;
  },
  keyGenerator: getTenantOrIpKey,
  message: rateLimitExceededResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    const tier = getSubscriptionTier(req);
    const limits = getLimitsForTier(tier);

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: {
          tier,
          limit: limits.requestsPerMinute,
          window: '1 minute',
          tenantId: authReq.tenantId || null,
        },
      },
    });
  },
});

/**
 * Tenant-based hourly rate limiter
 *
 * @description
 * Provides longer-term rate limiting to prevent sustained abuse.
 * Complements the per-minute limiter for overall usage control.
 */
export const tenantHourlyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: (req: Request): number => {
    const tier = getSubscriptionTier(req);
    const limits = getLimitsForTier(tier);
    return limits.requestsPerHour;
  },
  keyGenerator: (req: Request): string => {
    // Use separate namespace to avoid collision with minute limiter
    return `hourly:${getTenantOrIpKey(req)}`;
  },
  message: {
    success: false,
    error: {
      code: 'HOURLY_RATE_LIMIT_EXCEEDED',
      message: 'Hourly request limit exceeded, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    const tier = getSubscriptionTier(req);
    const limits = getLimitsForTier(tier);

    res.status(429).json({
      success: false,
      error: {
        code: 'HOURLY_RATE_LIMIT_EXCEEDED',
        message: 'Hourly request limit exceeded, please try again later',
        details: {
          tier,
          limit: limits.requestsPerHour,
          window: '1 hour',
          tenantId: authReq.tenantId || null,
        },
      },
    });
  },
});

/**
 * Burst rate limiter for sudden traffic spikes
 *
 * @description
 * Very short window to prevent burst attacks while allowing
 * normal traffic patterns. Uses a 5-second sliding window.
 */
export const burstRateLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 second window
  max: (req: Request): number => {
    const tier = getSubscriptionTier(req);
    const limits = getLimitsForTier(tier);
    return limits.burstLimit;
  },
  keyGenerator: (req: Request): string => {
    return `burst:${getTenantOrIpKey(req)}`;
  },
  message: {
    success: false,
    error: {
      code: 'BURST_LIMIT_EXCEEDED',
      message: 'Request rate too high, please slow down',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Creates a custom rate limiter with tenant-aware configuration
 *
 * @description
 * Factory function for creating specialized rate limiters
 * with custom windows and limits while maintaining tenant awareness.
 *
 * @param windowMs - Time window in milliseconds
 * @param maxMultiplier - Multiplier applied to tier's base limit
 * @param keyPrefix - Prefix for rate limit key (to separate limiters)
 * @returns Configured rate limiter middleware
 *
 * @example
 * ```typescript
 * // Create a 10-minute limiter with 2x the per-minute limit
 * const customLimiter = createTenantRateLimiter(
 *   10 * 60 * 1000,
 *   (limits) => limits.requestsPerMinute * 10,
 *   'custom'
 * );
 * ```
 */
export function createTenantRateLimiter(
  windowMs: number,
  maxCalculator: (limits: TierRateLimits) => number,
  keyPrefix: string = 'custom'
): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    max: (req: Request): number => {
      const tier = getSubscriptionTier(req);
      const limits = getLimitsForTier(tier);
      return maxCalculator(limits);
    },
    keyGenerator: (req: Request): string => {
      return `${keyPrefix}:${getTenantOrIpKey(req)}`;
    },
    message: rateLimitExceededResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * API endpoint specific rate limiters
 *
 * @description
 * Pre-configured limiters for specific API endpoints that need
 * custom rate limiting strategies.
 */
export const apiRateLimiters = {
  /**
   * Tag read ingestion endpoint limiter
   * Higher limits for high-volume RFID data ingestion
   */
  tagReads: rateLimit({
    windowMs: 60 * 1000,
    max: (req: Request): number => {
      const tier = getSubscriptionTier(req);
      const limits = getLimitsForTier(tier);
      // Tag reads need much higher limits
      return limits.requestsPerMinute * 10;
    },
    keyGenerator: (req: Request): string => {
      return `tag-reads:${getTenantOrIpKey(req)}`;
    },
    message: {
      success: false,
      error: {
        code: 'TAG_READ_RATE_LIMIT',
        message: 'Tag read ingestion rate exceeded',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * Search endpoint limiter
   * Slightly more restrictive due to potential database load
   */
  search: rateLimit({
    windowMs: 60 * 1000,
    max: (req: Request): number => {
      const tier = getSubscriptionTier(req);
      const limits = getLimitsForTier(tier);
      // Search is more expensive, so lower limit
      return Math.floor(limits.requestsPerMinute * 0.5);
    },
    keyGenerator: (req: Request): string => {
      return `search:${getTenantOrIpKey(req)}`;
    },
    message: {
      success: false,
      error: {
        code: 'SEARCH_RATE_LIMIT',
        message: 'Search request rate exceeded',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * Analytics/reporting endpoint limiter
   * Most restrictive due to heavy database queries
   */
  analytics: rateLimit({
    windowMs: 60 * 1000,
    max: (req: Request): number => {
      const tier = getSubscriptionTier(req);
      const limits = getLimitsForTier(tier);
      // Analytics queries are expensive
      return Math.floor(limits.requestsPerMinute * 0.25);
    },
    keyGenerator: (req: Request): string => {
      return `analytics:${getTenantOrIpKey(req)}`;
    },
    message: {
      success: false,
      error: {
        code: 'ANALYTICS_RATE_LIMIT',
        message: 'Analytics request rate exceeded',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  /**
   * Export endpoint limiter
   * Very restrictive as exports can be resource-intensive
   */
  export: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minute window
    max: (req: Request): number => {
      const tier = getSubscriptionTier(req);
      switch (tier) {
        case 'enterprise':
          return 20;
        case 'professional':
          return 10;
        case 'starter':
          return 5;
        default:
          return 2;
      }
    },
    keyGenerator: (req: Request): string => {
      return `export:${getTenantOrIpKey(req)}`;
    },
    message: {
      success: false,
      error: {
        code: 'EXPORT_RATE_LIMIT',
        message: 'Export request rate exceeded, please wait before trying again',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};
