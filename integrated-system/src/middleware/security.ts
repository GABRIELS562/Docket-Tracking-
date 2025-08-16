/**
 * Security Middleware
 * Comprehensive security features for production
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
const xss = require('xss-clean');
const hpp = require('hpp');
import cors from 'cors';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Security headers using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Rate limiting configurations
 */
export const rateLimiters = {
  // General API rate limit
  api: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict rate limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),

  // File upload rate limit
  upload: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per window
    message: 'Too many file uploads, please try again later.',
  }),
};

/**
 * CORS configuration
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (like Postman or mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Input sanitization middleware
 */
export const inputSanitization = [
  // Prevent NoSQL injection attacks
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Attempted NoSQL injection from ${req.ip} on field ${key}`);
    },
  }),
  
  // Clean user input from malicious HTML/JS
  xss(),
  
  // Prevent HTTP Parameter Pollution
  hpp({
    whitelist: ['sort', 'filter', 'page', 'limit'], // Allow these params to have arrays
  }),
];

/**
 * CSRF protection
 */
export class CSRFProtection {
  private static tokens: Map<string, { token: string; expires: number }> = new Map();
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    
    this.tokens.set(sessionId, { token, expires });
    this.cleanExpiredTokens();
    
    return token;
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }
  
  private static cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * CSRF middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and API keys
  if (req.method === 'GET' || req.headers['x-api-key']) {
    return next();
  }
  
  const sessionId = (req as any).session?.id;
  const token = req.headers['x-csrf-token'] as string;
  
  if (!sessionId || !token) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  if (!CSRFProtection.validateToken(sessionId, token)) {
    logger.warn(`Invalid CSRF token from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
};

/**
 * API key authentication middleware
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(); // Continue to JWT auth
  }
  
  // Validate API key (in production, check against database)
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn(`Invalid API key attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Set user context from API key
  (req as any).apiKey = apiKey;
  next();
};

/**
 * Request ID middleware for tracking
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = crypto.randomBytes(16).toString('hex');
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

/**
 * Security event logging
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: (req as any).id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      duration,
    };
    
    // Log security events
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Security event', logData);
    } else if (res.statusCode >= 500) {
      logger.error('Server error', logData);
    }
  });
  
  next();
};

/**
 * Content type validation
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for GET requests
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }
  
  const contentType = req.headers['content-type'];
  
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  
  next();
};

/**
 * SQL injection prevention
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  ];
  
  const checkValue = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        logger.warn(`Potential SQL injection attempt from ${req.ip}: ${value}`);
        return true;
      }
    }
    return false;
  };
  
  // Check query params
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  // Check body params
  if (req.body) {
    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          if (checkObject(obj[key])) return true;
        } else if (checkValue(obj[key])) {
          return true;
        }
      }
      return false;
    };
    
    if (checkObject(req.body)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  next();
};

/**
 * File upload security
 */
export const fileUploadSecurity = {
  // Allowed file types
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  
  // Max file size (10MB)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  
  // Validate file
  validateFile: (file: any): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    if (!fileUploadSecurity.allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    if (file.size > fileUploadSecurity.maxFileSize) {
      return { valid: false, error: 'File size exceeds limit' };
    }
    
    // Check for double extensions
    const filename = file.originalname || file.name;
    if (filename.match(/\.(php|exe|sh|bat|cmd|com|jar|scr|vbs|js|asp|jsp|cgi)\./i)) {
      return { valid: false, error: 'Suspicious filename detected' };
    }
    
    return { valid: true };
  },
};

/**
 * Session security configuration
 */
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
    sameSite: 'strict' as const,
  },
  name: 'sessionId', // Don't use default name
};

/**
 * Apply all security middleware
 */
export const applySecurity = (app: any): void => {
  // Security headers
  app.use(securityHeaders);
  
  // CORS
  app.use(cors(corsOptions));
  
  // Body parsing security
  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Input sanitization
  inputSanitization.forEach(middleware => app.use(middleware));
  
  // Request tracking
  app.use(requestId);
  app.use(securityLogger);
  
  // Rate limiting
  app.use('/api/', rateLimiters.api);
  app.use('/api/auth/', rateLimiters.auth);
  app.use('/api/upload/', rateLimiters.upload);
  
  // Content validation
  app.use('/api/', validateContentType);
  
  // SQL injection protection
  app.use(sqlInjectionProtection);
  
  // API key authentication (optional)
  app.use('/api/', apiKeyAuth);
  
  logger.info('Security middleware applied successfully');
};

export default {
  applySecurity,
  securityHeaders,
  rateLimiters,
  corsOptions,
  inputSanitization,
  CSRFProtection,
  csrfProtection,
  apiKeyAuth,
  requestId,
  securityLogger,
  validateContentType,
  sqlInjectionProtection,
  fileUploadSecurity,
  sessionConfig,
};