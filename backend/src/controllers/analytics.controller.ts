import { Request, Response, NextFunction } from 'express';
import { ObjectModel } from '../models/Object';
import { PersonnelModel } from '../models/Personnel';
import { LocationModel } from '../models/Location';
import { RfidReaderModel } from '../models/RfidReader';
import { RfidEventModel } from '../models/RfidEvent';
import { AuditLogModel } from '../models/AuditLog';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

export class AnalyticsController {
  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const totalObjects = await ObjectModel.count();
      const activeObjects = await ObjectModel.count({ status: 'active' });
      const totalPersonnel = await PersonnelModel.count({ active: true });
      const totalLocations = await LocationModel.count({ active: true });
      
      const objectsByType = await query(`
        SELECT object_type, COUNT(*) as count 
        FROM objects 
        WHERE status = 'active'
        GROUP BY object_type 
        ORDER BY count DESC
      `);

      const objectsByPriority = await query(`
        SELECT priority_level, COUNT(*) as count 
        FROM objects 
        WHERE status = 'active'
        GROUP BY priority_level 
        ORDER BY 
          CASE priority_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
          END
      `);

      const recentEvents = await RfidEventModel.findRecent(60);
      const eventStats = await RfidEventModel.getEventStats(24);
      const offlineReaders = await RfidReaderModel.getOfflineReaders(5);

      const locationUtilization = await query(`
        SELECT 
          l.location_name,
          l.location_code,
          COUNT(o.id) as object_count,
          l.building,
          l.zone
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id AND o.status = 'active'
        WHERE l.active = true
        GROUP BY l.id, l.location_name, l.location_code, l.building, l.zone
        ORDER BY object_count DESC
        LIMIT 10
      `);

      const personnelWorkload = await query(`
        SELECT 
          p.first_name || ' ' || p.last_name as personnel_name,
          p.employee_id,
          COUNT(o.id) as assigned_objects,
          p.department
        FROM personnel p
        LEFT JOIN objects o ON p.id = o.assigned_to_id AND o.status = 'active'
        WHERE p.active = true
        GROUP BY p.id, p.first_name, p.last_name, p.employee_id, p.department
        ORDER BY assigned_objects DESC
        LIMIT 10
      `);

      const recentActivity = await AuditLogModel.searchAuditLogs({
        limit: 10,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      });

      res.json({
        success: true,
        data: {
          summary: {
            total_objects: totalObjects,
            active_objects: activeObjects,
            total_personnel: totalPersonnel,
            total_locations: totalLocations,
            recent_events_count: recentEvents.length,
            offline_readers_count: offlineReaders.length
          },
          objects: {
            by_type: objectsByType.rows,
            by_priority: objectsByPriority.rows
          },
          locations: {
            utilization: locationUtilization.rows
          },
          personnel: {
            workload: personnelWorkload.rows
          },
          rfid: {
            event_stats: eventStats,
            offline_readers: offlineReaders
          },
          recent_activity: recentActivity
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      next(error);
    }
  }

  static async getObjectAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        days = 30,
        object_type,
        priority_level 
      } = req.query;

      const daysFilter = parseInt(days as string);
      let whereClause = '';
      const values: any[] = [daysFilter];
      let paramIndex = 2;

      if (object_type) {
        whereClause += ` AND o.object_type = $${paramIndex++}`;
        values.push(object_type);
      }

      if (priority_level) {
        whereClause += ` AND o.priority_level = $${paramIndex++}`;
        values.push(priority_level);
      }

      const objectMovements = await query(`
        SELECT 
          DATE(al.timestamp) as date,
          COUNT(*) as movements
        FROM audit_logs al
        JOIN objects o ON al.object_id = o.id
        WHERE al.action = 'MOVED' 
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
          ${whereClause}
        GROUP BY DATE(al.timestamp)
        ORDER BY date DESC
      `, values.slice(1));

      const topMovedObjects = await query(`
        SELECT 
          o.name,
          o.object_code,
          o.object_type,
          COUNT(al.id) as movement_count
        FROM objects o
        JOIN audit_logs al ON o.id = al.object_id
        WHERE al.action = 'MOVED' 
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
          ${whereClause}
        GROUP BY o.id, o.name, o.object_code, o.object_type
        ORDER BY movement_count DESC
        LIMIT 10
      `, values.slice(1));

      const assignmentChanges = await query(`
        SELECT 
          DATE(al.timestamp) as date,
          COUNT(*) as assignments
        FROM audit_logs al
        JOIN objects o ON al.object_id = o.id
        WHERE al.action IN ('ASSIGNED', 'UNASSIGNED')
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
          ${whereClause}
        GROUP BY DATE(al.timestamp)
        ORDER BY date DESC
      `, values.slice(1));

      const objectsByLocation = await query(`
        SELECT 
          l.location_name,
          l.building,
          l.zone,
          COUNT(o.id) as object_count,
          AVG(CASE 
            WHEN o.priority_level = 'critical' THEN 4
            WHEN o.priority_level = 'high' THEN 3
            WHEN o.priority_level = 'normal' THEN 2
            WHEN o.priority_level = 'low' THEN 1
          END) as avg_priority_score
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id 
          AND o.status = 'active'
          ${whereClause.replace('o.', 'o.')}
        WHERE l.active = true
        GROUP BY l.id, l.location_name, l.building, l.zone
        HAVING COUNT(o.id) > 0
        ORDER BY object_count DESC
      `, values.slice(1));

      res.json({
        success: true,
        data: {
          movements: {
            daily: objectMovements.rows,
            top_objects: topMovedObjects.rows
          },
          assignments: {
            daily: assignmentChanges.rows
          },
          distribution: {
            by_location: objectsByLocation.rows
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching object analytics:', error);
      next(error);
    }
  }

  static async getPersonnelAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { days = 30 } = req.query;
      const daysFilter = parseInt(days as string);

      const personnelActivity = await query(`
        SELECT 
          p.first_name || ' ' || p.last_name as personnel_name,
          p.employee_id,
          p.department,
          COUNT(al.id) as activity_count,
          COUNT(DISTINCT al.object_id) as unique_objects_handled,
          COUNT(DISTINCT DATE(al.timestamp)) as active_days
        FROM personnel p
        LEFT JOIN audit_logs al ON p.id = al.personnel_id 
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
        WHERE p.active = true
        GROUP BY p.id, p.first_name, p.last_name, p.employee_id, p.department
        ORDER BY activity_count DESC
      `);

      const activityByDepartment = await query(`
        SELECT 
          p.department,
          COUNT(al.id) as activity_count,
          COUNT(DISTINCT p.id) as personnel_count,
          ROUND(COUNT(al.id)::numeric / COUNT(DISTINCT p.id), 2) as avg_activity_per_person
        FROM personnel p
        LEFT JOIN audit_logs al ON p.id = al.personnel_id 
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
        WHERE p.active = true AND p.department IS NOT NULL
        GROUP BY p.department
        ORDER BY activity_count DESC
      `);

      const activityByRole = await query(`
        SELECT 
          p.role,
          COUNT(al.id) as activity_count,
          COUNT(DISTINCT p.id) as personnel_count,
          COUNT(DISTINCT al.action) as unique_actions
        FROM personnel p
        LEFT JOIN audit_logs al ON p.id = al.personnel_id 
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
        WHERE p.active = true
        GROUP BY p.role
        ORDER BY activity_count DESC
      `);

      const dailyActivity = await query(`
        SELECT 
          DATE(al.timestamp) as date,
          COUNT(al.id) as total_actions,
          COUNT(DISTINCT al.personnel_id) as active_personnel
        FROM audit_logs al
        WHERE al.timestamp > NOW() - INTERVAL '${daysFilter} days'
          AND al.personnel_id IS NOT NULL
        GROUP BY DATE(al.timestamp)
        ORDER BY date DESC
      `);

      const topActions = await query(`
        SELECT 
          al.action,
          COUNT(*) as count,
          COUNT(DISTINCT al.personnel_id) as personnel_involved
        FROM audit_logs al
        WHERE al.timestamp > NOW() - INTERVAL '${daysFilter} days'
          AND al.personnel_id IS NOT NULL
        GROUP BY al.action
        ORDER BY count DESC
      `);

      res.json({
        success: true,
        data: {
          personnel_activity: personnelActivity.rows,
          department_analysis: activityByDepartment.rows,
          role_analysis: activityByRole.rows,
          daily_activity: dailyActivity.rows,
          top_actions: topActions.rows
        }
      });
    } catch (error) {
      logger.error('Error fetching personnel analytics:', error);
      next(error);
    }
  }

  static async getLocationAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { days = 30 } = req.query;
      const daysFilter = parseInt(days as string);

      const locationTraffic = await query(`
        SELECT 
          l.location_name,
          l.building,
          l.zone,
          COUNT(CASE WHEN al.new_location_id = l.id THEN 1 END) as incoming,
          COUNT(CASE WHEN al.old_location_id = l.id THEN 1 END) as outgoing,
          COUNT(CASE WHEN al.new_location_id = l.id THEN 1 END) - 
          COUNT(CASE WHEN al.old_location_id = l.id THEN 1 END) as net_flow
        FROM locations l
        LEFT JOIN audit_logs al ON (l.id = al.new_location_id OR l.id = al.old_location_id)
          AND al.action = 'MOVED'
          AND al.timestamp > NOW() - INTERVAL '${daysFilter} days'
        WHERE l.active = true
        GROUP BY l.id, l.location_name, l.building, l.zone
        ORDER BY incoming DESC
      `);

      const locationUtilization = await query(`
        SELECT 
          l.location_name,
          l.building,
          l.zone,
          l.security_level,
          COUNT(o.id) as current_objects,
          COUNT(DISTINCT o.object_type) as object_types,
          AVG(CASE 
            WHEN o.priority_level = 'critical' THEN 4
            WHEN o.priority_level = 'high' THEN 3
            WHEN o.priority_level = 'normal' THEN 2
            WHEN o.priority_level = 'low' THEN 1
          END) as avg_priority_score
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id AND o.status = 'active'
        WHERE l.active = true
        GROUP BY l.id, l.location_name, l.building, l.zone, l.security_level
        ORDER BY current_objects DESC
      `);

      const buildingStats = await query(`
        SELECT 
          l.building,
          COUNT(DISTINCT l.id) as location_count,
          COUNT(o.id) as total_objects,
          COUNT(DISTINCT l.zone) as zone_count
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id AND o.status = 'active'
        WHERE l.active = true AND l.building IS NOT NULL
        GROUP BY l.building
        ORDER BY total_objects DESC
      `);

      const securityLevelStats = await query(`
        SELECT 
          l.security_level,
          COUNT(DISTINCT l.id) as location_count,
          COUNT(o.id) as total_objects,
          COUNT(CASE WHEN o.priority_level = 'critical' THEN 1 END) as critical_objects
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id AND o.status = 'active'
        WHERE l.active = true
        GROUP BY l.security_level
        ORDER BY total_objects DESC
      `);

      res.json({
        success: true,
        data: {
          traffic: locationTraffic.rows,
          utilization: locationUtilization.rows,
          building_stats: buildingStats.rows,
          security_level_stats: securityLevelStats.rows
        }
      });
    } catch (error) {
      logger.error('Error fetching location analytics:', error);
      next(error);
    }
  }

  static async getRfidAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { hours = 24 } = req.query;
      const hoursFilter = parseInt(hours as string);

      const readerPerformance = await query(`
        SELECT 
          rr.reader_id,
          rr.reader_type,
          l.location_name,
          COUNT(re.id) as event_count,
          AVG(re.signal_strength) as avg_signal_strength,
          MAX(re.timestamp) as last_event,
          rr.status,
          rr.last_ping
        FROM rfid_readers rr
        LEFT JOIN rfid_events re ON rr.reader_id = re.reader_id 
          AND re.timestamp > NOW() - INTERVAL '${hoursFilter} hours'
        LEFT JOIN locations l ON rr.location_id = l.id
        GROUP BY rr.id, rr.reader_id, rr.reader_type, l.location_name, rr.status, rr.last_ping
        ORDER BY event_count DESC
      `);

      const eventDistribution = await query(`
        SELECT 
          re.event_type,
          COUNT(*) as count,
          COUNT(DISTINCT re.tag_id) as unique_tags,
          COUNT(DISTINCT re.reader_id) as unique_readers
        FROM rfid_events re
        WHERE re.timestamp > NOW() - INTERVAL '${hoursFilter} hours'
        GROUP BY re.event_type
        ORDER BY count DESC
      `);

      const hourlyEvents = await query(`
        SELECT 
          EXTRACT(HOUR FROM re.timestamp) as hour,
          COUNT(*) as event_count,
          COUNT(DISTINCT re.tag_id) as unique_tags
        FROM rfid_events re
        WHERE re.timestamp > NOW() - INTERVAL '${hoursFilter} hours'
        GROUP BY EXTRACT(HOUR FROM re.timestamp)
        ORDER BY hour
      `);

      const topTags = await query(`
        SELECT 
          re.tag_id,
          o.name as object_name,
          o.object_type,
          COUNT(re.id) as detection_count,
          MAX(re.timestamp) as last_seen,
          COUNT(DISTINCT re.reader_id) as readers_detected_by
        FROM rfid_events re
        LEFT JOIN objects o ON re.tag_id = o.rfid_tag_id
        WHERE re.timestamp > NOW() - INTERVAL '${hoursFilter} hours'
        GROUP BY re.tag_id, o.name, o.object_type
        ORDER BY detection_count DESC
        LIMIT 20
      `);

      const readerUptime = await query(`
        SELECT 
          rr.reader_id,
          rr.status,
          l.location_name,
          CASE 
            WHEN rr.last_ping > NOW() - INTERVAL '5 minutes' THEN 'online'
            ELSE 'offline'
          END as connectivity_status,
          rr.last_ping
        FROM rfid_readers rr
        LEFT JOIN locations l ON rr.location_id = l.id
        ORDER BY rr.last_ping DESC
      `);

      res.json({
        success: true,
        data: {
          reader_performance: readerPerformance.rows,
          event_distribution: eventDistribution.rows,
          hourly_events: hourlyEvents.rows,
          top_tags: topTags.rows,
          reader_uptime: readerUptime.rows
        }
      });
    } catch (error) {
      logger.error('Error fetching RFID analytics:', error);
      next(error);
    }
  }

  static async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        type,
        start_date,
        end_date,
        format = 'json'
      } = req.query;

      if (!type || !start_date || !end_date) {
        return res.status(400).json({
          error: 'type, start_date, and end_date are required'
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      let reportData: any = {};

      switch (type) {
        case 'audit':
          reportData = await AuditLogModel.findByDateRange(startDate, endDate);
          break;

        case 'object_movements':
          reportData = await query(`
            SELECT 
              o.object_code,
              o.name,
              o.object_type,
              al.action,
              al.timestamp,
              p.first_name || ' ' || p.last_name as personnel_name,
              l1.location_name as old_location,
              l2.location_name as new_location,
              al.notes
            FROM audit_logs al
            JOIN objects o ON al.object_id = o.id
            LEFT JOIN personnel p ON al.personnel_id = p.id
            LEFT JOIN locations l1 ON al.old_location_id = l1.id
            LEFT JOIN locations l2 ON al.new_location_id = l2.id
            WHERE al.action = 'MOVED' 
              AND al.timestamp BETWEEN $1 AND $2
            ORDER BY al.timestamp DESC
          `, [startDate, endDate]);
          reportData = reportData.rows;
          break;

        case 'personnel_activity':
          reportData = await query(`
            SELECT 
              p.employee_id,
              p.first_name || ' ' || p.last_name as personnel_name,
              p.department,
              al.action,
              al.timestamp,
              o.object_code,
              o.name as object_name,
              al.notes
            FROM audit_logs al
            JOIN personnel p ON al.personnel_id = p.id
            LEFT JOIN objects o ON al.object_id = o.id
            WHERE al.timestamp BETWEEN $1 AND $2
            ORDER BY al.timestamp DESC
          `, [startDate, endDate]);
          reportData = reportData.rows;
          break;

        default:
          return res.status(400).json({
            error: 'Invalid report type. Options: audit, object_movements, personnel_activity'
          });
      }

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'REPORT_GENERATED',
        notes: `Generated ${type} report for ${start_date} to ${end_date}`,
        session_id: (req as any).sessionId
      });

      res.json({
        success: true,
        data: {
          report_type: type,
          date_range: {
            start: startDate,
            end: endDate
          },
          record_count: Array.isArray(reportData) ? reportData.length : Object.keys(reportData).length,
          data: reportData
        }
      });
    } catch (error) {
      logger.error('Error generating report:', error);
      next(error);
    }
  }
}