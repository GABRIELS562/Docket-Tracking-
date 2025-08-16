import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, param, query, validationResult } from 'express-validator';
import { auditLog } from '../utils/logger';
import { cache } from '../utils/cache';

// Rate limiting configuration
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: options.message || 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id ? `user_${req.user.id}` : req.ip;
    },
    onLimitReached: (req: Request) => {
      auditLog.securityViolation(req.ip, 'rate_limit_exceeded', {
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });
    }
  });
};

// Slow down middleware for API abuse protection
export const createSlowDown = (options: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
  maxDelayMs?: number;
}) => {
  return slowDown({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    delayAfter: options.delayAfter || 50, // allow 50 requests per windowMs without delay
    delayMs: options.delayMs || 500, // add 500ms delay per request after delayAfter
    maxDelayMs: options.maxDelayMs || 10000, // max delay of 10 seconds
    keyGenerator: (req: Request) => {
      return req.user?.id ? `user_${req.user.id}` : req.ip;
    }
  });
};

// Brute force protection for login endpoints
export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

// API rate limiting
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // configurable
  message: 'API rate limit exceeded'
});

// Strict rate limiting for admin endpoints
export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Admin API rate limit exceeded'
});

// File upload rate limiting
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || '10'),
  message: 'File upload rate limit exceeded'
});

// Input validation middleware
export const validateInput = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Log validation failures for security monitoring
      auditLog.securityViolation(req.ip, 'input_validation_failed', {
        errors: errors.array(),
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
      });

      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: errors.array()
      });
      return;
    }

    next();
  };
};

// Common validation rules
export const validationRules = {
  // Object validation
  objectCode: body('object_code')
    .isLength({ min: 3, max: 50 })
    .matches(/^[A-Z0-9\-]+$/)
    .withMessage('Object code must be 3-50 characters, uppercase letters, numbers, and hyphens only'),

  objectName: body('name')
    .isLength({ min: 1, max: 255 })
    .trim()
    .escape()
    .withMessage('Name must be 1-255 characters'),

  objectType: body('object_type')
    .isIn(['docket', 'evidence', 'equipment', 'file', 'tool'])
    .withMessage('Invalid object type'),

  objectDescription: body('description')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .escape()
    .withMessage('Description must be less than 2000 characters'),

  // ID validation
  objectId: param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid object ID'),

  // Authentication validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  password: body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character'),

  // Search validation
  searchQuery: query('search')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query must be less than 100 characters'),

  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be between 1 and 10000'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      auditLog.securityViolation(clientIP, 'ip_not_whitelisted', {
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
      return;
    }

    next();
  };
};

// Content Security Policy headers
export const cspMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));

  next();
};

// Anti-bot protection using challenge-response
export const antibotChallenge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|httpclient/i,
    /python-requests|java\/|go-http/i
  ];

  const userAgent = req.get('User-Agent') || '';
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious) {
    const challengeKey = `challenge_${req.ip}`;
    const challenge = Math.random().toString(36).substring(7);
    
    // Store challenge in cache for 5 minutes
    await cache.set(challengeKey, challenge, 300);
    
    auditLog.securityViolation(req.ip, 'suspicious_user_agent', {
      userAgent,
      endpoint: req.originalUrl,
      challenge
    });

    res.status(418).json({
      success: false,
      error: 'Bot detection triggered',
      challenge,
      message: 'Include X-Challenge header with the challenge value in your next request'
    });
    return;
  }

  // Check if challenge header is present for previously flagged IPs
  const challengeKey = `challenge_${req.ip}`;
  const expectedChallenge = await cache.get(challengeKey);
  
  if (expectedChallenge) {
    const providedChallenge = req.get('X-Challenge');
    
    if (providedChallenge !== expectedChallenge) {
      res.status(418).json({
        success: false,
        error: 'Invalid or missing challenge response'
      });
      return;
    }
    
    // Clear challenge after successful validation
    await cache.del(challengeKey);
  }

  next();
};

// SQL injection detection
export const sqlInjectionDetection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\'|\-\-|;|\||\*)/g,
    /(script|javascript|vbscript|onload|onerror)/gi
  ];

  const checkForInjection = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForInjection(obj[key], `${path}.${key}`)) {
          return true;
        }
      }
    }

    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    auditLog.securityViolation(req.ip, 'sql_injection_attempt', {
      body: req.body,
      query: req.query,
      params: req.params,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });

    res.status(400).json({
      success: false,
      error: 'Invalid characters detected in request'
    });
    return;
  }

  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      auditLog.securityViolation(req.ip, 'request_size_exceeded', {
        contentLength,
        maxSize,
        endpoint: req.originalUrl,
        userId: req.user?.id
      });

      res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
      return;
    }

    next();
  };
};

// Helper function to parse size strings
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}

// Combine all security middlewares
export const securityMiddleware = [
  cspMiddleware,
  sqlInjectionDetection,
  antibotChallenge,
  requestSizeLimit('10mb')
];

export default {
  createRateLimit,
  createSlowDown,
  loginRateLimit,
  apiRateLimit,
  adminRateLimit,
  uploadRateLimit,
  validateInput,
  validationRules,
  ipWhitelist,
  securityMiddleware
};