/**
 * Audit Service
 * Comprehensive audit logging for government compliance
 */

import { query, withTransaction } from '../database/connection';
import { logger } from '../utils/logger';
import { Request } from 'express';

export interface AuditLogEntry {
  // User Information
  userId?: number;
  username?: string;
  userEmail?: string;
  sessionId?: string;
  
  // Action Details
  actionType: string;
  resourceType: string;
  resourceId?: string;
  
  // Request Information
  endpoint?: string;
  httpMethod?: string;
  requestIp?: string;
  userAgent?: string;
  
  // Change Details
  beforeData?: any;
  afterData?: any;
  changes?: any;
  
  // Context and Metadata
  description: string;
  category?: string;
  severity?: string;
  
  // Government Compliance Fields
  complianceLevel?: string;
  retentionPeriod?: number;
  isSensitive?: boolean;
  
  // Technical Details
  transactionId?: string;
  correlationId?: string;
  durationMs?: number;
  
  // Status and Flags
  status?: string;
  errorMessage?: string;
  isAutomated?: boolean;
}

export interface DocketAuditEntry {
  docketId: number;
  movementType: string;
  fromLocation?: string;
  toLocation?: string;
  fromStorageBox?: number;
  toStorageBox?: number;
  rfidReaderId?: string;
  rfidTag?: string;
  signalStrength?: number;
  coordinates?: any;
  retrievalRequestId?: number;
  reason?: string;
  authorizedBy?: number;
  scheduledTime?: Date;
  witnessRequired?: boolean;
  witnessSignature?: string;
  chainOfCustody?: any[];
}

export interface UserAuditEntry {
  userId: number;
  loginMethod?: string;
  loginSuccess?: boolean;
  failedAttempts?: number;
  lockoutReason?: string;
  oldRoles?: any;
  newRoles?: any;
  permissionChanges?: any;
  profileChanges?: any;
  passwordChanged?: boolean;
  sessionDuration?: number;
  concurrentSessions?: number;
  deviceFingerprint?: string;
  suspiciousActivity?: boolean;
  securityNotes?: string;
}

export interface SystemAuditEntry {
  component: string;
  subsystem?: string;
  eventType: string;
  serviceVersion?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  responseTimeMs?: number;
  configChanges?: any;
  environmentVariables?: any;
  errorCode?: string;
  stackTrace?: string;
  maintenanceWindow?: boolean;
  backupStatus?: string;
  databaseConnections?: number;
  activeSessions?: number;
  queueLength?: number;
}

class AuditService {
  private static instance: AuditService;
  
  private constructor() {}
  
  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log a general audit event
   */
  async logEvent(entry: AuditLogEntry): Promise<number> {
    try {
      const result = await query(`
        INSERT INTO audit_logs (
          user_id, username, user_email, session_id,
          action_type, resource_type, resource_id,
          endpoint, http_method, request_ip, user_agent,
          before_data, after_data, changes,
          description, category, severity,
          compliance_level, retention_period, is_sensitive,
          transaction_id, correlation_id, duration_ms,
          status, error_message, is_automated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26
        ) RETURNING id
      `, [
        entry.userId, entry.username, entry.userEmail, entry.sessionId,
        entry.actionType, entry.resourceType, entry.resourceId,
        entry.endpoint, entry.httpMethod, entry.requestIp, entry.userAgent,
        entry.beforeData ? JSON.stringify(entry.beforeData) : null,
        entry.afterData ? JSON.stringify(entry.afterData) : null,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.description, entry.category || 'DATA_CHANGE', entry.severity || 'INFO',
        entry.complianceLevel || 'STANDARD', entry.retentionPeriod || 2555, entry.isSensitive || false,
        entry.transactionId, entry.correlationId, entry.durationMs,
        entry.status || 'SUCCESS', entry.errorMessage, entry.isAutomated || false
      ]);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Log docket-specific audit event
   */
  async logDocketEvent(auditLogId: number, entry: DocketAuditEntry): Promise<void> {
    try {
      await query(`
        INSERT INTO docket_audit_trail (
          audit_log_id, docket_id, movement_type,
          from_location, to_location, from_storage_box, to_storage_box,
          rfid_reader_id, rfid_tag, signal_strength, coordinates,
          retrieval_request_id, reason, authorized_by,
          scheduled_time, witness_required, witness_signature, chain_of_custody
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `, [
        auditLogId, entry.docketId, entry.movementType,
        entry.fromLocation, entry.toLocation, entry.fromStorageBox, entry.toStorageBox,
        entry.rfidReaderId, entry.rfidTag, entry.signalStrength, 
        entry.coordinates ? JSON.stringify(entry.coordinates) : null,
        entry.retrievalRequestId, entry.reason, entry.authorizedBy,
        entry.scheduledTime, entry.witnessRequired, entry.witnessSignature,
        entry.chainOfCustody ? JSON.stringify(entry.chainOfCustody) : null
      ]);
    } catch (error) {
      logger.error('Failed to log docket audit event:', error);
      throw error;
    }
  }

  /**
   * Log user-specific audit event
   */
  async logUserEvent(auditLogId: number, entry: UserAuditEntry): Promise<void> {
    try {
      await query(`
        INSERT INTO user_audit_trail (
          audit_log_id, user_id, login_method, login_success, failed_attempts,
          lockout_reason, old_roles, new_roles, permission_changes,
          profile_changes, password_changed, session_duration,
          concurrent_sessions, device_fingerprint, suspicious_activity, security_notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `, [
        auditLogId, entry.userId, entry.loginMethod, entry.loginSuccess, entry.failedAttempts,
        entry.lockoutReason, 
        entry.oldRoles ? JSON.stringify(entry.oldRoles) : null,
        entry.newRoles ? JSON.stringify(entry.newRoles) : null,
        entry.permissionChanges ? JSON.stringify(entry.permissionChanges) : null,
        entry.profileChanges ? JSON.stringify(entry.profileChanges) : null,
        entry.passwordChanged, entry.sessionDuration, entry.concurrentSessions,
        entry.deviceFingerprint, entry.suspiciousActivity, entry.securityNotes
      ]);
    } catch (error) {
      logger.error('Failed to log user audit event:', error);
      throw error;
    }
  }

  /**
   * Log system-specific audit event
   */
  async logSystemEvent(auditLogId: number, entry: SystemAuditEntry): Promise<void> {
    try {
      await query(`
        INSERT INTO system_audit_trail (
          audit_log_id, component, subsystem, event_type, service_version,
          cpu_usage, memory_usage, disk_usage, response_time_ms,
          config_changes, environment_variables, error_code, stack_trace,
          maintenance_window, backup_status, database_connections,
          active_sessions, queue_length
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `, [
        auditLogId, entry.component, entry.subsystem, entry.eventType, entry.serviceVersion,
        entry.cpuUsage, entry.memoryUsage, entry.diskUsage, entry.responseTimeMs,
        entry.configChanges ? JSON.stringify(entry.configChanges) : null,
        entry.environmentVariables ? JSON.stringify(entry.environmentVariables) : null,
        entry.errorCode, entry.stackTrace, entry.maintenanceWindow, entry.backupStatus,
        entry.databaseConnections, entry.activeSessions, entry.queueLength
      ]);
    } catch (error) {
      logger.error('Failed to log system audit event:', error);
      throw error;
    }
  }

  /**
   * Helper method to log user login/logout
   */
  async logUserLogin(userId: number, username: string, email: string, success: boolean, req: Request, failedAttempts: number = 0): Promise<void> {
    try {
      const auditId = await this.logEvent({
        userId,
        username,
        userEmail: email,
        actionType: 'LOGIN',
        resourceType: 'user_session',
        resourceId: userId.toString(),
        endpoint: req.path,
        httpMethod: req.method,
        requestIp: req.ip,
        userAgent: req.headers['user-agent'],
        description: `User ${success ? 'successfully logged in' : 'failed to log in'}`,
        category: 'AUTHENTICATION',
        severity: success ? 'INFO' : 'WARN',
        status: success ? 'SUCCESS' : 'FAILURE',
        complianceLevel: 'STANDARD'
      });

      await this.logUserEvent(auditId, {
        userId,
        loginMethod: 'password',
        loginSuccess: success,
        failedAttempts,
        deviceFingerprint: this.generateDeviceFingerprint(req),
        suspiciousActivity: failedAttempts > 3
      });
    } catch (error) {
      logger.error('Failed to log user login audit:', error);
    }
  }

  /**
   * Helper method to log user logout
   */
  async logUserLogout(userId: number, username: string, sessionDuration: number, req: Request): Promise<void> {
    try {
      const auditId = await this.logEvent({
        userId,
        username,
        actionType: 'LOGOUT',
        resourceType: 'user_session',
        resourceId: userId.toString(),
        endpoint: req.path,
        httpMethod: req.method,
        requestIp: req.ip,
        userAgent: req.headers['user-agent'],
        description: `User logged out after ${Math.round(sessionDuration / 60)} minutes`,
        category: 'AUTHENTICATION',
        severity: 'INFO',
        complianceLevel: 'STANDARD'
      });

      await this.logUserEvent(auditId, {
        userId,
        loginSuccess: true,
        sessionDuration: Math.round(sessionDuration)
      });
    } catch (error) {
      logger.error('Failed to log user logout audit:', error);
    }
  }

  /**
   * Helper method to log docket movement
   */
  async logDocketMovement(
    docketId: number, 
    docketCode: string, 
    movementType: string, 
    fromLocation: string, 
    toLocation: string,
    userId: number,
    username: string,
    req: Request,
    additionalData: Partial<DocketAuditEntry> = {}
  ): Promise<void> {
    try {
      const auditId = await this.logEvent({
        userId,
        username,
        actionType: 'MOVE',
        resourceType: 'docket',
        resourceId: docketId.toString(),
        endpoint: req.path,
        httpMethod: req.method,
        requestIp: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Docket ${docketCode} moved from ${fromLocation} to ${toLocation}`,
        category: 'RFID_EVENT',
        severity: 'INFO',
        complianceLevel: 'CONFIDENTIAL',
        isSensitive: true
      });

      await this.logDocketEvent(auditId, {
        docketId,
        movementType,
        fromLocation,
        toLocation,
        authorizedBy: userId,
        ...additionalData
      });
    } catch (error) {
      logger.error('Failed to log docket movement audit:', error);
    }
  }

  /**
   * Helper method to log data changes
   */
  async logDataChange(
    resourceType: string,
    resourceId: string,
    actionType: string,
    beforeData: any,
    afterData: any,
    userId: number,
    username: string,
    req: Request,
    description?: string
  ): Promise<void> {
    try {
      const changes = this.calculateChanges(beforeData, afterData);
      
      await this.logEvent({
        userId,
        username,
        actionType,
        resourceType,
        resourceId,
        endpoint: req.path,
        httpMethod: req.method,
        requestIp: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData,
        afterData,
        changes,
        description: description || `${actionType} operation on ${resourceType} ${resourceId}`,
        category: 'DATA_CHANGE',
        severity: 'INFO',
        complianceLevel: this.determineComplianceLevel(resourceType)
      });
    } catch (error) {
      logger.error('Failed to log data change audit:', error);
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: {
    userId?: number;
    actionType?: string;
    resourceType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[], total: number }> {
    try {
      let conditions = ['1=1'];
      let params: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }
      if (filters.actionType) {
        conditions.push(`action_type = $${paramIndex++}`);
        params.push(filters.actionType);
      }
      if (filters.resourceType) {
        conditions.push(`resource_type = $${paramIndex++}`);
        params.push(filters.resourceType);
      }
      if (filters.category) {
        conditions.push(`category = $${paramIndex++}`);
        params.push(filters.category);
      }
      if (filters.startDate) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      // Get total count
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM audit_logs 
        WHERE ${conditions.join(' AND ')}
      `, params);

      // Get paginated results
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      const logsResult = await query(`
        SELECT * FROM v_audit_summary 
        WHERE ${conditions.join(' AND ')}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, [...params, limit, offset]);

      return {
        logs: logsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      const result = await query(`
        SELECT * FROM get_audit_statistics($1, $2)
      `, [start, end]);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(filters: any, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const { logs } = await this.getAuditLogs(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(logs);
      }
      
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    try {
      const result = await query('SELECT cleanup_audit_logs()');
      return result.rows[0].cleanup_audit_logs;
    } catch (error) {
      logger.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    return Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`).toString('base64');
  }

  private calculateChanges(beforeData: any, afterData: any): any {
    if (!beforeData || !afterData) return null;

    const changes: any = {};
    
    // Compare objects and track changes
    const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
    
    for (const key of allKeys) {
      if (beforeData[key] !== afterData[key]) {
        changes[key] = {
          from: beforeData[key],
          to: afterData[key]
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  private determineComplianceLevel(resourceType: string): string {
    const sensitiveResources = ['docket', 'user', 'client', 'financial'];
    const confidentialResources = ['rfid_tag', 'location', 'retrieval_request'];
    
    if (sensitiveResources.includes(resourceType)) return 'SECRET';
    if (confidentialResources.includes(resourceType)) return 'CONFIDENTIAL';
    return 'STANDARD';
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
}

export default AuditService.getInstance();