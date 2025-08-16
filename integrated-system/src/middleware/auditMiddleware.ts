/**
 * Audit Middleware
 * Automatically logs API requests for compliance and security
 */

import { Request, Response, NextFunction } from 'express';
import AuditService from '../services/AuditService';
import { logger } from '../utils/logger';

interface AuditableRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  startTime?: number;
  correlationId?: string;
}

// Configuration for audit logging
const AUDIT_CONFIG = {
  // HTTP methods to audit
  auditMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  
  // Endpoints to always audit (regardless of method)
  criticalEndpoints: [
    '/api/auth/login',
    '/api/auth/logout', 
    '/api/users',
    '/api/dockets',
    '/api/storage',
    '/api/rfid'
  ],
  
  // Endpoints to exclude from audit
  excludeEndpoints: [
    '/api/health',
    '/api/ping',
    '/favicon.ico'
  ],
  
  // Sensitive fields to mask in logs
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'creditCard'
  ],
  
  // Resource type mapping
  resourceTypeMap: {
    '/api/users': 'user',
    '/api/dockets': 'docket',
    '/api/storage': 'storage_box',
    '/api/rfid': 'rfid_tag',
    '/api/auth': 'user_session',
    '/api/reports': 'report',
    '/api/analytics': 'analytics'
  }
};

/**
 * Main audit middleware function
 */
export const auditMiddleware = (req: AuditableRequest, res: Response, next: NextFunction) => {
  // Skip non-auditable requests
  if (!shouldAuditRequest(req)) {
    return next();
  }

  // Add correlation ID for request tracking
  req.correlationId = generateCorrelationId();
  req.startTime = Date.now();

  // Store original res.json to capture response data
  const originalJson = res.json;
  let responseData: any = null;
  let statusCode = 200;

  res.json = function(data: any) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  // Capture the original end function
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    // Log the audit event after response
    setImmediate(() => {
      logAuditEvent(req, res, responseData, statusCode);
    });
    
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Determine if request should be audited
 */
function shouldAuditRequest(req: AuditableRequest): boolean {
  const path = req.path;
  const method = req.method;

  // Exclude specific endpoints
  if (AUDIT_CONFIG.excludeEndpoints.some(endpoint => path.startsWith(endpoint))) {
    return false;
  }

  // Always audit critical endpoints
  if (AUDIT_CONFIG.criticalEndpoints.some(endpoint => path.startsWith(endpoint))) {
    return true;
  }

  // Audit specific HTTP methods
  if (AUDIT_CONFIG.auditMethods.includes(method)) {
    return true;
  }

  // Audit GET requests for sensitive resources
  if (method === 'GET' && isSensitiveResource(path)) {
    return true;
  }

  return false;
}

/**
 * Check if path represents a sensitive resource
 */
function isSensitiveResource(path: string): boolean {
  const sensitivePatterns = [
    /\/api\/users\/\d+/,
    /\/api\/dockets\/\d+/,
    /\/api\/storage\/\d+/,
    /\/api\/reports/,
    /\/api\/analytics/
  ];

  return sensitivePatterns.some(pattern => pattern.test(path));
}

/**
 * Log the audit event
 */
async function logAuditEvent(
  req: AuditableRequest, 
  res: Response, 
  responseData: any, 
  statusCode: number
): Promise<void> {
  try {
    const endTime = Date.now();
    const duration = req.startTime ? endTime - req.startTime : 0;
    
    // Extract resource information
    const resourceInfo = extractResourceInfo(req);
    
    // Determine action type
    const actionType = determineActionType(req.method, req.path);
    
    // Mask sensitive data
    const sanitizedBody = maskSensitiveData(req.body);
    const sanitizedResponse = maskSensitiveData(responseData);
    
    // Create audit log entry
    const auditEntry = {
      userId: req.user?.id,
      username: req.user?.username,
      userEmail: req.user?.email,
      sessionId: extractSessionId(req),
      
      actionType,
      resourceType: resourceInfo.type,
      resourceId: resourceInfo.id,
      
      endpoint: req.path,
      httpMethod: req.method,
      requestIp: getClientIP(req),
      userAgent: req.headers['user-agent'],
      
      beforeData: req.method === 'PUT' ? sanitizedBody.before : null,
      afterData: ['POST', 'PUT'].includes(req.method) ? sanitizedBody : null,
      
      description: generateDescription(req, actionType, resourceInfo),
      category: determineCategory(req.path, actionType),
      severity: determineSeverity(statusCode, req.path),
      
      complianceLevel: determineComplianceLevel(resourceInfo.type),
      isSensitive: isSensitiveResource(req.path),
      
      correlationId: req.correlationId,
      durationMs: duration,
      
      status: statusCode < 400 ? 'SUCCESS' : 'FAILURE',
      errorMessage: statusCode >= 400 ? sanitizedResponse?.error || sanitizedResponse?.message : null
    };

    // Log the main audit event
    const auditId = await AuditService.logEvent(auditEntry);

    // Log specific audit trails based on resource type
    await logSpecificAuditTrail(auditId, req, resourceInfo, sanitizedBody);

  } catch (error) {
    logger.error('Failed to log audit event:', error);
  }
}

/**
 * Extract resource information from request
 */
function extractResourceInfo(req: AuditableRequest): { type: string; id?: string } {
  const path = req.path;
  
  // Find matching resource type
  let resourceType = 'unknown';
  for (const [endpoint, type] of Object.entries(AUDIT_CONFIG.resourceTypeMap)) {
    if (path.startsWith(endpoint)) {
      resourceType = type;
      break;
    }
  }
  
  // Extract resource ID from path
  const idMatch = path.match(/\/(\d+)(?:\/|$)/);
  const resourceId = idMatch ? idMatch[1] : undefined;
  
  return { type: resourceType, id: resourceId };
}

/**
 * Determine action type from HTTP method and path
 */
function determineActionType(method: string, path: string): string {
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/search')) return 'SEARCH';
  if (path.includes('/export')) return 'EXPORT';
  if (path.includes('/import')) return 'IMPORT';
  
  switch (method) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT': 
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

/**
 * Generate human-readable description
 */
function generateDescription(req: AuditableRequest, actionType: string, resourceInfo: any): string {
  const user = req.user?.username || 'Anonymous';
  const resource = resourceInfo.type;
  const resourceId = resourceInfo.id ? ` ${resourceInfo.id}` : '';
  
  switch (actionType) {
    case 'LOGIN':
      return `User ${user} attempted to log in`;
    case 'LOGOUT':
      return `User ${user} logged out`;
    case 'CREATE':
      return `User ${user} created ${resource}${resourceId}`;
    case 'UPDATE':
      return `User ${user} modified ${resource}${resourceId}`;
    case 'DELETE':
      return `User ${user} deleted ${resource}${resourceId}`;
    case 'READ':
      return `User ${user} accessed ${resource}${resourceId}`;
    case 'SEARCH':
      return `User ${user} searched ${resource} records`;
    case 'EXPORT':
      return `User ${user} exported ${resource} data`;
    default:
      return `User ${user} performed ${actionType} on ${resource}${resourceId}`;
  }
}

/**
 * Determine audit category
 */
function determineCategory(path: string, actionType: string): string {
  if (path.includes('/auth') || ['LOGIN', 'LOGOUT'].includes(actionType)) {
    return 'AUTHENTICATION';
  }
  if (path.includes('/rfid')) {
    return 'RFID_EVENT';
  }
  if (path.includes('/storage')) {
    return 'STORAGE_EVENT';
  }
  if (path.includes('/users')) {
    return 'USER_MANAGEMENT';
  }
  if (['CREATE', 'UPDATE', 'DELETE'].includes(actionType)) {
    return 'DATA_CHANGE';
  }
  return 'SYSTEM_EVENT';
}

/**
 * Determine severity level
 */
function determineSeverity(statusCode: number, path: string): string {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARN';
  if (path.includes('/auth') || path.includes('/users')) return 'INFO';
  return 'DEBUG';
}

/**
 * Determine compliance level
 */
function determineComplianceLevel(resourceType: string): string {
  const secretResources = ['user', 'docket', 'client'];
  const confidentialResources = ['rfid_tag', 'storage_box', 'retrieval_request'];
  
  if (secretResources.includes(resourceType)) return 'SECRET';
  if (confidentialResources.includes(resourceType)) return 'CONFIDENTIAL';
  return 'STANDARD';
}

/**
 * Mask sensitive data in objects
 */
function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  for (const field of AUDIT_CONFIG.sensitiveFields) {
    if (field in masked) {
      masked[field] = '***MASKED***';
    }
  }
  
  return masked;
}

/**
 * Extract session ID from request
 */
function extractSessionId(req: AuditableRequest): string | undefined {
  // Try to extract from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7, 20) + '...'; // First 13 chars for identification
  }
  
  // Try session cookie
  return req.headers.cookie?.substring(0, 20) + '...';
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log specific audit trails based on resource type
 */
async function logSpecificAuditTrail(
  auditId: number, 
  req: AuditableRequest, 
  resourceInfo: any, 
  sanitizedBody: any
): Promise<void> {
  try {
    const path = req.path;
    const method = req.method;
    
    // Log user-specific audit trail for authentication events
    if (path.includes('/auth') && req.user) {
      await AuditService.logUserEvent(auditId, {
        userId: req.user.id,
        loginMethod: 'password',
        loginSuccess: method === 'POST' && req.path.includes('/login'),
        deviceFingerprint: generateDeviceFingerprint(req)
      });
    }
    
    // Log docket audit trail for RFID events
    if (path.includes('/rfid') && resourceInfo.type === 'docket' && sanitizedBody?.docket_id) {
      await AuditService.logDocketEvent(auditId, {
        docketId: sanitizedBody.docket_id,
        movementType: sanitizedBody.movement_type || 'unknown',
        fromLocation: sanitizedBody.from_location,
        toLocation: sanitizedBody.to_location,
        rfidReaderId: sanitizedBody.rfid_reader_id,
        rfidTag: sanitizedBody.rfid_tag,
        authorizedBy: req.user?.id
      });
    }
    
  } catch (error) {
    logger.error('Failed to log specific audit trail:', error);
  }
}

/**
 * Generate device fingerprint from request
 */
function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  return Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`).toString('base64').substring(0, 32);
}

/**
 * Middleware for logging user login events
 */
export const auditLogin = async (req: AuditableRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (data.success && data.data?.token) {
      // Successful login
      setImmediate(async () => {
        try {
          const user = data.data.user;
          await AuditService.logUserLogin(
            user.id, 
            user.username || user.email, 
            user.email,
            true, 
            req
          );
        } catch (error) {
          logger.error('Failed to log successful login audit:', error);
        }
      });
    } else {
      // Failed login
      setImmediate(async () => {
        try {
          await AuditService.logUserLogin(
            0, 
            req.body?.email || 'unknown', 
            req.body?.email || 'unknown',
            false, 
            req,
            1
          );
        } catch (error) {
          logger.error('Failed to log failed login audit:', error);
        }
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware for logging data changes with before/after comparison
 */
export const auditDataChange = (resourceType: string) => {
  return async (req: AuditableRequest, res: Response, next: NextFunction) => {
    let beforeData: any = null;
    
    // For UPDATE operations, fetch the current data first
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // This would need to be implemented based on your data access patterns
        // beforeData = await fetchResourceData(resourceType, req.params.id);
      } catch (error) {
        logger.warn('Could not fetch before data for audit:', error);
      }
    }
    
    const originalJson = res.json;
    res.json = function(data: any) {
      if (data.success && req.user) {
        setImmediate(async () => {
          try {
            await AuditService.logDataChange(
              resourceType,
              req.params.id || 'unknown',
              req.method === 'POST' ? 'CREATE' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE',
              beforeData,
              data.data,
              req.user!.id,
              req.user!.username,
              req
            );
          } catch (error) {
            logger.error('Failed to log data change audit:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export default {
  auditMiddleware,
  auditLogin,
  auditDataChange
};