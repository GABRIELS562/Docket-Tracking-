import type { 
  IndividualGuest, 
  TokenValidationResult, 
  SecurityConfig, 
  GuestValidationRules 
} from '../types';
import { individualGuests, guestTokenMap } from '../data/individualGuests';

// Security configuration
export const securityConfig: SecurityConfig = {
  tokenLength: 8, // 8 random characters after firstname-lastname
  allowedAttempts: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
  requireHttps: true,
  ipBlacklist: [],
  ipWhitelist: []
};

// Guest validation rules
export const validationRules: GuestValidationRules = {
  emailRequired: true,
  phoneRequired: false,
  minNameLength: 2,
  maxNameLength: 50,
  allowedDomains: [], // Empty means all domains allowed
  blockedDomains: ['tempmail.org', '10minutemail.com', 'guerrillamail.com']
};

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number; lockedUntil?: number }>();

/**
 * Validates a guest token and returns detailed validation result
 * @param token - The guest token to validate
 * @param clientIp - Client IP address for security checks
 * @returns TokenValidationResult with guest data or error information
 */
export function validateToken(token: string, clientIp?: string): TokenValidationResult {
  try {
    // Input sanitization
    const sanitizedToken = sanitizeToken(token);
    
    if (!sanitizedToken) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    // Rate limiting check
    if (clientIp) {
      const rateLimitResult = checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return {
          isValid: false,
          error: 'Too many attempts. Please try again later.',
          securityFlags: {
            rateLimited: true,
            suspiciousActivity: false,
            ipBlocked: false
          }
        };
      }
    }

    // IP security checks
    if (clientIp && !isIpAllowed(clientIp)) {
      return {
        isValid: false,
        error: 'Access denied from this location',
        securityFlags: {
          rateLimited: false,
          suspiciousActivity: false,
          ipBlocked: true
        }
      };
    }

    // Token format validation
    if (!isValidTokenFormat(sanitizedToken)) {
      if (clientIp) recordFailedAttempt(clientIp);
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    // Guest lookup
    const guest = guestTokenMap.get(sanitizedToken);
    
    if (!guest) {
      if (clientIp) recordFailedAttempt(clientIp);
      return {
        isValid: false,
        error: 'Invalid invitation token'
      };
    }

    // Update guest access tracking
    updateGuestAccess(guest);
    
    // Clear failed attempts on successful validation
    if (clientIp) clearFailedAttempts(clientIp);

    return {
      isValid: true,
      guest: guest,
      securityFlags: {
        rateLimited: false,
        suspiciousActivity: false,
        ipBlocked: false
      }
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      error: 'Validation service unavailable'
    };
  }
}

/**
 * Gets guest information by token (without security checks for internal use)
 * @param token - The guest token
 * @returns IndividualGuest or null
 */
export function getGuestInfo(token: string): IndividualGuest | null {
  const sanitizedToken = sanitizeToken(token);
  return sanitizedToken ? guestTokenMap.get(sanitizedToken) || null : null;
}

/**
 * Checks if a guest is eligible for a plus-one
 * @param token - The guest token
 * @returns boolean indicating plus-one eligibility
 */
export function isEligibleForPlusOne(token: string): boolean {
  const guest = getGuestInfo(token);
  return guest ? guest.plusOneEligible : false;
}

/**
 * Validates guest data against security rules
 * @param guestData - Partial guest data to validate
 * @returns Object with validation results
 */
export function validateGuestData(guestData: Partial<IndividualGuest>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Name validation
  if (guestData.firstName) {
    if (guestData.firstName.length < validationRules.minNameLength) {
      errors.push('First name is too short');
    }
    if (guestData.firstName.length > validationRules.maxNameLength) {
      errors.push('First name is too long');
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(guestData.firstName)) {
      errors.push('First name contains invalid characters');
    }
  }

  if (guestData.lastName) {
    if (guestData.lastName.length < validationRules.minNameLength) {
      errors.push('Last name is too short');
    }
    if (guestData.lastName.length > validationRules.maxNameLength) {
      errors.push('Last name is too long');
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(guestData.lastName)) {
      errors.push('Last name contains invalid characters');
    }
  }

  // Email validation
  if (guestData.email) {
    if (!isValidEmail(guestData.email)) {
      errors.push('Invalid email address');
    }
    if (isBlockedEmailDomain(guestData.email)) {
      errors.push('Email domain is not allowed');
    }
  } else if (validationRules.emailRequired) {
    errors.push('Email address is required');
  }

  // Phone validation
  if (guestData.phone) {
    if (!isValidPhone(guestData.phone)) {
      errors.push('Invalid phone number');
    }
  } else if (validationRules.phoneRequired) {
    errors.push('Phone number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a secure token for a new guest
 * @param firstName - Guest's first name
 * @param lastName - Guest's last name
 * @returns Generated token string
 */
export function generateGuestToken(firstName: string, lastName: string): string {
  const normalizedFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const randomPart = generateSecureRandomString(securityConfig.tokenLength);
  
  return `${normalizedFirst}-${normalizedLast}-${randomPart}`;
}

/**
 * Checks if a token is already in use
 * @param token - Token to check
 * @returns boolean indicating if token exists
 */
export function isTokenInUse(token: string): boolean {
  return guestTokenMap.has(token);
}

// Private helper functions

function sanitizeToken(token: string): string {
  if (!token || typeof token !== 'string') return '';
  
  // Remove any potentially dangerous characters, keep only alphanumeric and hyphens
  return token.toLowerCase().replace(/[^a-z0-9\-]/g, '').trim();
}

function isValidTokenFormat(token: string): boolean {
  // Expected format: firstname-lastname-8randomchars
  const tokenRegex = /^[a-z]+-[a-z]+-[a-z0-9]{8}$/;
  return tokenRegex.test(token);
}

function checkRateLimit(clientIp: string): { allowed: boolean; attemptsLeft: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record) {
    return { allowed: true, attemptsLeft: securityConfig.allowedAttempts - 1 };
  }

  // Check if still locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, attemptsLeft: 0 };
  }

  // Reset if lockout period has passed
  if (record.lockedUntil && now >= record.lockedUntil) {
    rateLimitStore.delete(clientIp);
    return { allowed: true, attemptsLeft: securityConfig.allowedAttempts - 1 };
  }

  // Check if within time window and under limit
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  if (now - record.lastAttempt > timeWindow) {
    // Reset counter if outside time window
    rateLimitStore.delete(clientIp);
    return { allowed: true, attemptsLeft: securityConfig.allowedAttempts - 1 };
  }

  return {
    allowed: record.attempts < securityConfig.allowedAttempts,
    attemptsLeft: Math.max(0, securityConfig.allowedAttempts - record.attempts)
  };
}

function recordFailedAttempt(clientIp: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp) || { attempts: 0, lastAttempt: now };

  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= securityConfig.allowedAttempts) {
    record.lockedUntil = now + securityConfig.lockoutDuration;
  }

  rateLimitStore.set(clientIp, record);
}

function clearFailedAttempts(clientIp: string): void {
  rateLimitStore.delete(clientIp);
}

function isIpAllowed(clientIp: string): boolean {
  // Check blacklist
  if (securityConfig.ipBlacklist && securityConfig.ipBlacklist.includes(clientIp)) {
    return false;
  }

  // Check whitelist (if defined, only whitelisted IPs are allowed)
  if (securityConfig.ipWhitelist && securityConfig.ipWhitelist.length > 0) {
    return securityConfig.ipWhitelist.includes(clientIp);
  }

  return true;
}

function updateGuestAccess(guest: IndividualGuest): void {
  // In a real application, this would update the database
  guest.lastAccessed = new Date();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? (validationRules.blockedDomains || []).includes(domain) : false;
}

function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check for valid US phone number (10 or 11 digits)
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}

function generateSecureRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto API if available (browser), fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for Node.js or older browsers
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

/**
 * Security audit function to check for potential issues
 * @returns Array of security warnings/issues
 */
export function performSecurityAudit(): string[] {
  const warnings: string[] = [];

  // Check for duplicate tokens
  const tokens = new Set<string>();
  const duplicates = new Set<string>();
  
  individualGuests.forEach(guest => {
    if (tokens.has(guest.token)) {
      duplicates.add(guest.token);
    } else {
      tokens.add(guest.token);
    }
  });

  if (duplicates.size > 0) {
    warnings.push(`Found ${duplicates.size} duplicate tokens`);
  }

  // Check token format consistency
  const invalidTokens = individualGuests.filter(guest => 
    !isValidTokenFormat(guest.token)
  );

  if (invalidTokens.length > 0) {
    warnings.push(`Found ${invalidTokens.length} tokens with invalid format`);
  }

  // Check for weak tokens (predictable patterns)
  const weakTokens = individualGuests.filter(guest => {
    const parts = guest.token.split('-');
    if (parts.length !== 3) return true;
    
    const randomPart = parts[2];
    // Check for obvious patterns
    return /^(.)\1+$/.test(randomPart) || // All same character
           /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(randomPart); // Sequential
  });

  if (weakTokens.length > 0) {
    warnings.push(`Found ${weakTokens.length} potentially weak tokens`);
  }

  return warnings;
}

/**
 * Generate a comprehensive security report
 * @returns Object with security metrics and recommendations
 */
export function generateSecurityReport(): {
  guestCount: number;
  tokenStrength: 'weak' | 'medium' | 'strong';
  securityIssues: string[];
  recommendations: string[];
} {
  const warnings = performSecurityAudit();
  
  let tokenStrength: 'weak' | 'medium' | 'strong' = 'strong';
  if (warnings.length > 5) {
    tokenStrength = 'weak';
  } else if (warnings.length > 2) {
    tokenStrength = 'medium';
  }

  const recommendations: string[] = [];
  
  if (warnings.length > 0) {
    recommendations.push('Review and regenerate tokens with security issues');
  }
  
  if (securityConfig.tokenLength < 8) {
    recommendations.push('Increase token length to at least 8 characters');
  }
  
  if (!securityConfig.requireHttps) {
    recommendations.push('Enable HTTPS requirement for production');
  }

  return {
    guestCount: individualGuests.length,
    tokenStrength,
    securityIssues: warnings,
    recommendations
  };
}