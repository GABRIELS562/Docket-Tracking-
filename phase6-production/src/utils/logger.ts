import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    audit: 3,
    performance: 4,
    debug: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    audit: 'magenta',
    performance: 'cyan',
    debug: 'blue'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS Z'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]`;
    
    // Add process info for production debugging
    if (process.env.NODE_ENV === 'production') {
      log += ` [PID:${process.pid}]`;
      if (process.env.PM2_INSTANCE_ID) {
        log += ` [WORKER:${process.env.PM2_INSTANCE_ID}]`;
      }
    }
    
    log += `: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIR || './logs';

// Transport configurations
const transports: winston.transport[] = [];

// Console transport (development only or debug mode)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_ENABLED === 'true') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'debug',
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// File transport - Application logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true,
    auditFile: path.join(logsDir, 'audit.json')
  })
);

// File transport - Error logs only
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    level: 'error',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transport - Audit logs (security and compliance)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.AUDIT_RETENTION_YEARS ? `${parseInt(process.env.AUDIT_RETENTION_YEARS) * 365}d` : '7y',
    level: 'audit',
    format: logFormat
  })
);

// File transport - Performance logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    level: 'performance',
    format: logFormat
  })
);

// Create the logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  // Log the request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip,
    userAgent,
    userId,
    sessionId,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log the response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - start;
    const contentLength = res.get('Content-Length') || 0;

    // Log the response
    logger.info('HTTP Response', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      contentLength,
      duration: `${duration}ms`,
      ip,
      userId,
      sessionId
    });

    // Log slow requests as performance issues
    if (duration > 5000) {
      logger.performance('Slow HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        userId,
        ip
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Audit logging for security events
export const auditLog = {
  login: (userId: number, ip: string, success: boolean, details?: any) => {
    logger.audit('User Login Attempt', {
      event: 'user_login',
      userId,
      ip,
      success,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  logout: (userId: number, ip: string, sessionDuration?: number) => {
    logger.audit('User Logout', {
      event: 'user_logout',
      userId,
      ip,
      sessionDuration: sessionDuration ? `${sessionDuration}ms` : undefined,
      timestamp: new Date().toISOString()
    });
  },

  objectAccess: (userId: number, objectId: number, action: string, ip: string) => {
    logger.audit('Object Access', {
      event: 'object_access',
      userId,
      objectId,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  objectModification: (userId: number, objectId: number, action: string, changes: any, ip: string) => {
    logger.audit('Object Modification', {
      event: 'object_modification',
      userId,
      objectId,
      action,
      changes,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  adminAction: (userId: number, action: string, target: any, ip: string) => {
    logger.audit('Admin Action', {
      event: 'admin_action',
      userId,
      action,
      target,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  securityViolation: (ip: string, violation: string, details: any) => {
    logger.audit('Security Violation', {
      event: 'security_violation',
      ip,
      violation,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logging
export const performanceLog = {
  databaseQuery: (query: string, duration: number, rowCount?: number) => {
    if (duration > 1000) { // Log slow queries
      logger.performance('Slow Database Query', {
        type: 'database_query',
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rowCount,
        timestamp: new Date().toISOString()
      });
    }
  },

  cacheOperation: (operation: string, key: string, duration: number, hit?: boolean) => {
    logger.performance('Cache Operation', {
      type: 'cache_operation',
      operation,
      key,
      duration: `${duration}ms`,
      hit,
      timestamp: new Date().toISOString()
    });
  },

  apiResponse: (endpoint: string, method: string, duration: number, statusCode: number) => {
    if (duration > 2000) { // Log slow API responses
      logger.performance('Slow API Response', {
        type: 'api_response',
        endpoint,
        method,
        duration: `${duration}ms`,
        statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Error logging with context
export const errorLog = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString()
  });
};

// Graceful shutdown logging
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
});

export default logger;