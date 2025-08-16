/**
 * Audit Reports and Management Routes
 * Government compliance and audit trail endpoints
 */

import { Router } from 'express';
import { query } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import AuditService from '../services/AuditService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// AUDIT LOGS
// =====================================================

// Get audit logs with filtering and pagination
router.get('/logs', async (req, res) => {
  try {
    const {
      user_id,
      action_type,
      resource_type,
      category,
      severity,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      search
    } = req.query;

    const filters: any = {};
    
    if (user_id) filters.userId = parseInt(user_id as string);
    if (action_type) filters.actionType = action_type as string;
    if (resource_type) filters.resourceType = resource_type as string;
    if (category) filters.category = category as string;
    if (start_date) filters.startDate = new Date(start_date as string);
    if (end_date) filters.endDate = new Date(end_date as string);
    
    filters.limit = parseInt(limit as string);
    filters.offset = (parseInt(page as string) - 1) * filters.limit;

    // Add search functionality
    if (search) {
      const searchTerm = `%${search}%`;
      const searchResult = await query(`
        SELECT * FROM v_audit_summary 
        WHERE (description ILIKE $1 OR username ILIKE $1 OR resource_id ILIKE $1)
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `, [searchTerm, filters.limit, filters.offset]);
      
      const countResult = await query(`
        SELECT COUNT(*) as total FROM v_audit_summary 
        WHERE (description ILIKE $1 OR username ILIKE $1 OR resource_id ILIKE $1)
      `, [searchTerm]);

      res.json({
        success: true,
        data: {
          logs: searchResult.rows,
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page as string),
          limit: filters.limit
        }
      });
    } else {
      const result = await AuditService.getAuditLogs(filters);
      
      res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          page: parseInt(page as string),
          limit: filters.limit
        }
      });
    }
  } catch (error: any) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch audit logs',
      message: error.message 
    });
  }
});

// Get specific audit log details
router.get('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        al.*,
        dat.movement_type,
        dat.from_location,
        dat.to_location,
        dat.rfid_tag,
        uat.login_success,
        uat.failed_attempts,
        sat.component,
        sat.event_type as system_event_type
      FROM audit_logs al
      LEFT JOIN docket_audit_trail dat ON al.id = dat.audit_log_id
      LEFT JOIN user_audit_trail uat ON al.id = uat.audit_log_id
      LEFT JOIN system_audit_trail sat ON al.id = sat.audit_log_id
      WHERE al.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Audit log not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Error fetching audit log details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch audit log details',
      message: error.message 
    });
  }
});

// =====================================================
// AUDIT STATISTICS
// =====================================================

// Get audit statistics and dashboard data
router.get('/statistics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    
    const stats = await AuditService.getAuditStatistics(startDate, endDate);
    
    // Get additional breakdown statistics
    const breakdownResult = await query(`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'FAILURE') as failures
      FROM audit_logs 
      WHERE timestamp >= COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
        AND timestamp <= COALESCE($2, CURRENT_DATE + INTERVAL '1 day')
      GROUP BY category
      ORDER BY count DESC
    `, [startDate, endDate]);

    // Get top active users
    const topUsersResult = await query(`
      SELECT 
        username,
        user_full_name,
        COUNT(*) as action_count,
        COUNT(DISTINCT DATE(timestamp)) as active_days
      FROM v_audit_summary 
      WHERE timestamp >= COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
        AND timestamp <= COALESCE($2, CURRENT_DATE + INTERVAL '1 day')
        AND username IS NOT NULL
      GROUP BY username, user_full_name
      ORDER BY action_count DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Get activity timeline (last 7 days)
    const timelineResult = await query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE category = 'AUTHENTICATION') as auth_events,
        COUNT(*) FILTER (WHERE category = 'DATA_CHANGE') as data_events,
        COUNT(*) FILTER (WHERE category = 'SECURITY_EVENT') as security_events,
        COUNT(*) FILTER (WHERE status = 'FAILURE') as failed_events
      FROM audit_logs 
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        summary: stats,
        categoryBreakdown: breakdownResult.rows,
        topUsers: topUsersResult.rows,
        timeline: timelineResult.rows
      }
    });
  } catch (error: any) {
    logger.error('Error fetching audit statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch audit statistics',
      message: error.message 
    });
  }
});

// =====================================================
// SECURITY EVENTS
// =====================================================

// Get security events and alerts
router.get('/security-events', async (req, res) => {
  try {
    const { severity, limit = 100 } = req.query;
    
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }

    const result = await query(`
      SELECT * FROM v_security_events 
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `, [...params, parseInt(limit as string)]);

    // Get security summary
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE login_success = false) as failed_logins,
        COUNT(*) FILTER (WHERE suspicious_activity = true) as suspicious_events,
        COUNT(DISTINCT user_id) as affected_users
      FROM v_security_events 
      WHERE timestamp >= CURRENT_DATE - INTERVAL '24 hours'
    `);

    res.json({
      success: true,
      data: {
        events: result.rows,
        summary: summaryResult.rows[0]
      }
    });
  } catch (error: any) {
    logger.error('Error fetching security events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch security events',
      message: error.message 
    });
  }
});

// =====================================================
// DOCKET MOVEMENT HISTORY
// =====================================================

// Get docket movement history
router.get('/docket-movements', async (req, res) => {
  try {
    const { docket_id, docket_code, limit = 50 } = req.query;
    
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (docket_id) {
      conditions.push(`d.id = $${paramIndex++}`);
      params.push(docket_id);
    } else if (docket_code) {
      conditions.push(`d.docket_code = $${paramIndex++}`);
      params.push(docket_code);
    }

    const result = await query(`
      SELECT * FROM v_docket_movements 
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `, [...params, parseInt(limit as string)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching docket movements:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch docket movements',
      message: error.message 
    });
  }
});

// =====================================================
// COMPLIANCE REPORTS
// =====================================================

// Generate compliance report
router.post('/compliance-report', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      compliance_level = 'STANDARD',
      include_sensitive = false,
      format = 'json'
    } = req.body;

    if (!start_date || !end_date) {
      res.status(400).json({ 
        success: false, 
        error: 'Start date and end date are required' 
      });
      return;
    }

    const filters = {
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      limit: 10000 // Large limit for reports
    };

    // Add compliance level filter if specified
    let additionalConditions = '';
    let additionalParams: any[] = [];
    
    if (compliance_level !== 'ALL') {
      additionalConditions = 'AND compliance_level = $3';
      additionalParams.push(compliance_level);
    }
    
    if (!include_sensitive) {
      additionalConditions += ' AND is_sensitive = FALSE';
    }

    const result = await query(`
      SELECT 
        event_id,
        timestamp,
        username,
        user_full_name,
        user_department,
        action_type,
        resource_type,
        resource_id,
        description,
        category,
        severity,
        compliance_level,
        is_sensitive,
        request_ip,
        status
      FROM v_audit_summary 
      WHERE timestamp BETWEEN $1 AND $2 ${additionalConditions}
      ORDER BY timestamp DESC
    `, [filters.startDate, filters.endDate, ...additionalParams]);

    // Generate report metadata
    const reportMetadata = {
      generated_at: new Date().toISOString(),
      period: {
        start: start_date,
        end: end_date
      },
      compliance_level,
      include_sensitive,
      total_events: result.rows.length,
      unique_users: [...new Set(result.rows.map(r => r.username))].length,
      event_categories: [...new Set(result.rows.map(r => r.category))],
      report_id: `AUDIT_${Date.now()}`
    };

    if (format === 'csv') {
      const csvData = await AuditService.exportAuditLogs(filters, 'csv');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_report_${reportMetadata.report_id}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: {
          metadata: reportMetadata,
          events: result.rows
        }
      });
    }
  } catch (error: any) {
    logger.error('Error generating compliance report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate compliance report',
      message: error.message 
    });
  }
});

// =====================================================
// DATA INTEGRITY
// =====================================================

// Get data integrity status
router.get('/data-integrity', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        dia.*,
        al.timestamp as last_check,
        al.description as check_description
      FROM data_integrity_audit dia
      LEFT JOIN audit_logs al ON dia.audit_log_id = al.id
      ORDER BY dia.last_verified DESC
    `);

    // Get overall integrity statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE compliance_check_passed = true) as passed_checks,
        COUNT(*) FILTER (WHERE backup_verified = true) as verified_backups,
        MAX(last_verified) as last_verification
      FROM data_integrity_audit
    `);

    res.json({
      success: true,
      data: {
        integrity_checks: result.rows,
        statistics: statsResult.rows[0]
      }
    });
  } catch (error: any) {
    logger.error('Error fetching data integrity status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data integrity status',
      message: error.message 
    });
  }
});

// =====================================================
// AUDIT MANAGEMENT
// =====================================================

// Cleanup old audit logs
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await AuditService.cleanupOldLogs();
    
    res.json({
      success: true,
      data: {
        deleted_records: deletedCount,
        cleanup_date: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Error cleaning up audit logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cleanup audit logs',
      message: error.message 
    });
  }
});

// Get audit configuration
router.get('/config', async (req, res) => {
  try {
    const config = {
      retention_periods: {
        standard: 2555, // 7 years
        confidential: 3650, // 10 years
        secret: 5475 // 15 years
      },
      audit_categories: [
        'AUTHENTICATION',
        'DATA_CHANGE', 
        'SYSTEM_EVENT',
        'SECURITY_EVENT',
        'RFID_EVENT',
        'STORAGE_EVENT',
        'USER_MANAGEMENT',
        'COMPLIANCE_EVENT'
      ],
      severity_levels: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'],
      compliance_levels: ['STANDARD', 'CONFIDENTIAL', 'SECRET'],
      supported_formats: ['json', 'csv'],
      auto_cleanup_enabled: true,
      encryption_enabled: false // Would be true in production
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Error fetching audit config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch audit configuration',
      message: error.message 
    });
  }
});

// =====================================================
// ADVANCED QUERIES
// =====================================================

// Get user activity summary
router.get('/user-activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const activityResult = await query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT action_type) as action_types,
        COUNT(*) FILTER (WHERE status = 'FAILURE') as failed_actions,
        MIN(timestamp) as first_action,
        MAX(timestamp) as last_action
      FROM audit_logs 
      WHERE user_id = $1 
        AND timestamp >= CURRENT_DATE - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `, [userId]);

    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT resource_type) as resources_accessed,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        MAX(timestamp) as last_activity
      FROM audit_logs 
      WHERE user_id = $1 
        AND timestamp >= CURRENT_DATE - INTERVAL '${parseInt(days as string)} days'
    `, [userId]);

    res.json({
      success: true,
      data: {
        daily_activity: activityResult.rows,
        summary: summaryResult.rows[0]
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user activity',
      message: error.message 
    });
  }
});

export default router;