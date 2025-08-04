// Security utilities for wedding website

import { createHash, createHmac } from 'crypto';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  RSVP_SUBMISSION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    blockDurationMs: 30 * 60 * 1000 // 30 minutes block
  },
  EMAIL_SENDING: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 2,
    blockDurationMs: 10 * 60 * 1000 // 10 minutes block
  },
  GENERAL_API: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60,
    blockDurationMs: 5 * 60 * 1000 // 5 minutes block
  }
};

// Guest token validation
export const validateGuestToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // Token format: {guestId}.{timestamp}.{signature}
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [guestId, timestamp, signature] = parts;
  
  // Validate timestamp (token should not be older than 1 year)
  const tokenTime = parseInt(timestamp, 10);
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  
  if (isNaN(tokenTime) || (now - tokenTime) > oneYear) {
    return false;
  }
  
  // Validate signature
  const secret = import.meta.env.VITE_GUEST_TOKEN_SECRET;
  if (!secret) {
    console.error('Guest token secret not configured');
    return false;
  }
  
  const expectedSignature = createHmac('sha256', secret)
    .update(`${guestId}.${timestamp}`)
    .digest('hex')
    .substring(0, 16); // First 16 characters
  
  return signature === expectedSignature;
};

// Generate secure guest token
export const generateGuestToken = (guestId: string): string => {
  const timestamp = Date.now().toString();
  const secret = import.meta.env.VITE_GUEST_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error('Guest token secret not configured');
  }
  
  const signature = createHmac('sha256', secret)
    .update(`${guestId}.${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  
  return `${guestId}.${timestamp}.${signature}`;
};

// Rate limiting
export const checkRateLimit = (
  identifier: string, 
  limitType: keyof typeof RATE_LIMITS
): { allowed: boolean; resetTime?: number; remaining?: number } => {
  const config = RATE_LIMITS[limitType];
  const now = Date.now();
  const key = `${limitType}:${identifier}`;
  
  const existing = rateLimitStore.get(key);
  
  // If no existing record or window has expired
  if (!existing || now >= existing.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // If within rate limit
  if (existing.count < config.maxRequests) {
    existing.count++;
    rateLimitStore.set(key, existing);
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime
    };
  }
  
  // Rate limit exceeded
  return {
    allowed: false,
    resetTime: existing.resetTime
  };
};

// Content Security Policy
export const generateCSPHeader = (): string => {
  const nonce = createHash('sha256')
    .update(Date.now().toString())
    .digest('base64')
    .substring(0, 16);
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.emailjs.com https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://sheets.googleapis.com https://api.emailjs.com https://www.google-analytics.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `report-uri ${import.meta.env.VITE_CSP_REPORT_URI || '/api/csp-report'}`
  ].join('; ');
  
  return csp;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Validate email address
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validate guest name
export const validateGuestName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s\-\.\']+$/;
  return nameRegex.test(name) && name.length >= 2 && name.length <= 100;
};

// API key domain validation
export const validateDomain = (apiKey: string, allowedDomains: string[]): boolean => {
  const currentDomain = window.location.hostname;
  
  // In development, allow localhost
  if (import.meta.env.DEV && (currentDomain === 'localhost' || currentDomain === '127.0.0.1')) {
    return true;
  }
  
  return allowedDomains.includes(currentDomain);
};

// Secure data storage
export const secureStorage = {
  set: (key: string, value: any, expirationMinutes = 60): void => {
    const item = {
      value,
      expiry: Date.now() + (expirationMinutes * 60 * 1000),
      checksum: createHash('sha256').update(JSON.stringify(value)).digest('hex')
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store data securely:', error);
    }
  },
  
  get: (key: string): any => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check expiration
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      // Verify integrity
      const expectedChecksum = createHash('sha256')
        .update(JSON.stringify(item.value))
        .digest('hex');
      
      if (item.checksum !== expectedChecksum) {
        console.warn('Data integrity check failed for key:', key);
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn('Failed to retrieve secure data:', error);
      return null;
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(key);
  }
};

// Error reporting with privacy considerations
export const reportSecurityEvent = (
  event: string, 
  details: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' = 'medium'
): void => {
  if (!import.meta.env.VITE_ERROR_REPORTING_ENABLED) return;
  
  // Remove sensitive information
  const sanitizedDetails = Object.keys(details).reduce((acc, key) => {
    const value = details[key];
    
    // Don't log sensitive fields
    if (['password', 'token', 'secret', 'key', 'email'].some(sensitive => 
      key.toLowerCase().includes(sensitive))) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = value;
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  const securityEvent = {
    event,
    details: sanitizedDetails,
    severity,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionId: createHash('sha256')
      .update(navigator.userAgent + Date.now().toString())
      .digest('hex')
      .substring(0, 16)
  };
  
  // Send to monitoring service
  if (import.meta.env.VITE_SENTRY_DSN) {
    // Integration with Sentry or similar service
    console.log('Security Event:', securityEvent);
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.warn('Security Event:', securityEvent);
  }
};

// HTTPS enforcement
export const enforceHTTPS = (): void => {
  if (import.meta.env.PROD && window.location.protocol !== 'https:') {
    window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
  }
};

// Initialize security measures
export const initializeSecurity = (): void => {
  // Enforce HTTPS in production
  enforceHTTPS();
  
  // Set up CSP reporting
  if (import.meta.env.VITE_CSP_REPORT_URI) {
    document.addEventListener('securitypolicyviolation', (event) => {
      reportSecurityEvent('csp_violation', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI
      }, 'medium');
    });
  }
  
  // Monitor for security events
  window.addEventListener('error', (event) => {
    if (event.error && event.error.name === 'SecurityError') {
      reportSecurityEvent('security_error', {
        message: event.error.message,
        filename: event.filename,
        lineno: event.lineno
      }, 'high');
    }
  });
  
  // Detect potential XSS attempts
  const originalWrite = document.write;
  document.write = function(content: string) {
    if (/<script|javascript:|on\w+=/i.test(content)) {
      reportSecurityEvent('potential_xss', {
        content: content.substring(0, 100)
      }, 'high');
      return;
    }
    return originalWrite.apply(document, arguments);
  };
};