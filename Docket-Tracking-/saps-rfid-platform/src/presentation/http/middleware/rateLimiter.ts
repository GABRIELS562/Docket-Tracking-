import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting middleware
 *
 * Protects API from abuse and DoS attacks
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
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
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
