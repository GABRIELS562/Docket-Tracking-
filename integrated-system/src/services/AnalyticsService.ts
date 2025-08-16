/**
 * Advanced Analytics Service
 * Handles metrics aggregation, KPI tracking, and reporting
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

interface MetricData {
  totalDockets: number;
  activeDockets: number;
  activeUsers: number;
  rfidScans: number;
  storageUtilization: number;
  complianceScore: number;
  apiRequests: number;
  avgResponseTime: number;
}

interface KPIData {
  kpiCode: string;
  kpiName: string;
  actualValue: number;
  targetValue: number;
  variance: number;
  status: 'on_target' | 'above_target' | 'below_target' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
}

interface DepartmentMetrics {
  departmentId: number;
  departmentName: string;
  totalDockets: number;
  efficiencyScore: number;
  complianceRate: number;
  avgProcessingTime: number;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private cache: CacheService;
  private readonly CACHE_TTL = 300; // 5 minutes

  private constructor() {
    this.cache = CacheService.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get current real-time metrics
   */
  async getCurrentMetrics(): Promise<MetricData> {
    const cacheKey = 'analytics:current_metrics';
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      // Get docket metrics
      const docketStats = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'archived') as archived,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_today
        FROM dockets
      `);

      // Get user activity
      const userActivity = await query(`
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_actions
        FROM audit_logs
        WHERE timestamp >= CURRENT_DATE
      `);

      // Get RFID metrics
      const rfidMetrics = await query(`
        SELECT 
          COUNT(*) as total_scans,
          COUNT(*) FILTER (WHERE status = 'located') as successful
        FROM rfid_events
        WHERE timestamp >= CURRENT_DATE
      `);

      // Get storage metrics
      const storageMetrics = await query(`
        SELECT 
          COUNT(*) as total_boxes,
          COUNT(*) FILTER (WHERE status = 'occupied') as occupied
        FROM storage_boxes
      `);

      // Calculate metrics
      const metrics: MetricData = {
        totalDockets: parseInt(docketStats.rows[0].total),
        activeDockets: parseInt(docketStats.rows[0].active),
        activeUsers: parseInt(userActivity.rows[0].active_users),
        rfidScans: parseInt(rfidMetrics.rows[0].total_scans),
        storageUtilization: 
          (parseInt(storageMetrics.rows[0].occupied) / parseInt(storageMetrics.rows[0].total_boxes)) * 100,
        complianceScore: 95 + Math.random() * 5, // Simulated for now
        apiRequests: parseInt(userActivity.rows[0].total_actions),
        avgResponseTime: 150 + Math.random() * 100 // Simulated for now
      };

      await this.cache.set(cacheKey, JSON.stringify(metrics), this.CACHE_TTL);
      return metrics;

    } catch (error) {
      logger.error('Error fetching current metrics:', error);
      throw error;
    }
  }

  /**
   * Get KPI dashboard data
   */
  async getKPIDashboard(): Promise<KPIData[]> {
    try {
      const result = await query(`
        SELECT 
          kd.kpi_code,
          kd.kpi_name,
          kd.category,
          kd.target_value,
          kt.actual_value,
          kt.variance,
          kt.variance_percentage,
          kt.status,
          kt.trend
        FROM kpi_definitions kd
        LEFT JOIN LATERAL (
          SELECT * FROM kpi_tracking 
          WHERE kpi_id = kd.id 
          ORDER BY tracking_date DESC, tracking_hour DESC NULLS LAST
          LIMIT 1
        ) kt ON true
        WHERE kd.is_active = TRUE
      `);

      return result.rows.map(row => ({
        kpiCode: row.kpi_code,
        kpiName: row.kpi_name,
        actualValue: parseFloat(row.actual_value || 0),
        targetValue: parseFloat(row.target_value),
        variance: parseFloat(row.variance || 0),
        status: row.status || 'on_target',
        trend: row.trend || 'stable'
      }));

    } catch (error) {
      logger.error('Error fetching KPI dashboard:', error);
      throw error;
    }
  }

  /**
   * Get department-wise analytics
   */
  async getDepartmentAnalytics(dateRange: { start: Date; end: Date }): Promise<DepartmentMetrics[]> {
    try {
      const result = await query(`
        SELECT 
          d.id as department_id,
          d.name as department_name,
          COALESCE(SUM(da.total_dockets), 0) as total_dockets,
          COALESCE(AVG(da.efficiency_score), 0) as efficiency_score,
          COALESCE(AVG(da.compliance_rate), 100) as compliance_rate,
          COALESCE(AVG(da.avg_processing_time), 0) as avg_processing_time
        FROM departments d
        LEFT JOIN department_analytics da ON d.id = da.department_id
          AND da.metric_date BETWEEN $1 AND $2
        GROUP BY d.id, d.name
        ORDER BY efficiency_score DESC
      `, [dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        departmentId: row.department_id,
        departmentName: row.department_name,
        totalDockets: parseInt(row.total_dockets),
        efficiencyScore: parseFloat(row.efficiency_score),
        complianceRate: parseFloat(row.compliance_rate),
        avgProcessingTime: parseInt(row.avg_processing_time)
      }));

    } catch (error) {
      logger.error('Error fetching department analytics:', error);
      throw error;
    }
  }

  /**
   * Get time series data for a specific metric
   */
  async getTimeSeriesData(
    metric: string, 
    period: 'hour' | 'day' | 'week' | 'month', 
    duration: number
  ): Promise<TimeSeriesData[]> {
    const cacheKey = `analytics:timeseries:${metric}:${period}:${duration}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      let interval: string;
      let groupBy: string;

      switch (period) {
        case 'hour':
          interval = `${duration} hours`;
          groupBy = "DATE_TRUNC('hour', timestamp)";
          break;
        case 'day':
          interval = `${duration} days`;
          groupBy = "DATE_TRUNC('day', timestamp)";
          break;
        case 'week':
          interval = `${duration} weeks`;
          groupBy = "DATE_TRUNC('week', timestamp)";
          break;
        case 'month':
          interval = `${duration} months`;
          groupBy = "DATE_TRUNC('month', timestamp)";
          break;
      }

      // Dynamic query based on metric type
      let query_str: string;
      switch (metric) {
        case 'docket_activity':
          query_str = `
            SELECT 
              ${groupBy} as timestamp,
              COUNT(*) as value
            FROM dockets
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
            GROUP BY timestamp
            ORDER BY timestamp
          `;
          break;

        case 'user_activity':
          query_str = `
            SELECT 
              ${groupBy} as timestamp,
              COUNT(DISTINCT user_id) as value
            FROM audit_logs
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
            GROUP BY timestamp
            ORDER BY timestamp
          `;
          break;

        case 'rfid_scans':
          query_str = `
            SELECT 
              ${groupBy} as timestamp,
              COUNT(*) as value
            FROM rfid_events
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
            GROUP BY timestamp
            ORDER BY timestamp
          `;
          break;

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      const result = await query(query_str);
      const data = result.rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseInt(row.value)
      }));

      await this.cache.set(cacheKey, JSON.stringify(data), this.CACHE_TTL);
      return data;

    } catch (error) {
      logger.error('Error fetching time series data:', error);
      throw error;
    }
  }

  /**
   * Calculate and store hourly metrics
   */
  async calculateHourlyMetrics(): Promise<void> {
    try {
      const currentHour = new Date().getHours();
      
      // Get current metrics
      const metrics = await this.getCurrentMetrics();

      // Store in database
      await query(`
        INSERT INTO analytics_metrics (
          metric_date, metric_hour, total_dockets, active_dockets,
          active_users, rfid_scans, storage_utilization, compliance_score,
          api_requests, avg_response_time
        ) VALUES (
          CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (metric_date, metric_hour) 
        DO UPDATE SET
          total_dockets = EXCLUDED.total_dockets,
          active_dockets = EXCLUDED.active_dockets,
          active_users = EXCLUDED.active_users,
          rfid_scans = EXCLUDED.rfid_scans,
          storage_utilization = EXCLUDED.storage_utilization,
          compliance_score = EXCLUDED.compliance_score,
          api_requests = EXCLUDED.api_requests,
          avg_response_time = EXCLUDED.avg_response_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        currentHour,
        metrics.totalDockets,
        metrics.activeDockets,
        metrics.activeUsers,
        metrics.rfidScans,
        metrics.storageUtilization,
        metrics.complianceScore,
        metrics.apiRequests,
        metrics.avgResponseTime
      ]);

      logger.info('Hourly metrics calculated and stored');

    } catch (error) {
      logger.error('Error calculating hourly metrics:', error);
      throw error;
    }
  }

  /**
   * Update KPI tracking
   */
  async updateKPITracking(): Promise<void> {
    try {
      // Get all active KPIs
      const kpis = await query(`
        SELECT id, kpi_code, target_value, min_threshold, max_threshold
        FROM kpi_definitions
        WHERE is_active = TRUE
      `);

      for (const kpi of kpis.rows) {
        let actualValue: number;

        // Calculate actual value based on KPI code
        switch (kpi.kpi_code) {
          case 'STORAGE_UTILIZATION':
            const storage = await query(`
              SELECT 
                COUNT(*) FILTER (WHERE status = 'occupied')::DECIMAL / 
                COUNT(*)::DECIMAL * 100 as utilization
              FROM storage_boxes
            `);
            actualValue = parseFloat(storage.rows[0].utilization || 0);
            break;

          case 'SYSTEM_UPTIME':
            actualValue = 99.5 + Math.random() * 0.5; // Simulated
            break;

          case 'RFID_ACCURACY':
            const rfid = await query(`
              SELECT 
                COUNT(*) FILTER (WHERE status = 'located')::DECIMAL / 
                NULLIF(COUNT(*)::DECIMAL, 0) * 100 as accuracy
              FROM rfid_events
              WHERE timestamp >= CURRENT_DATE
            `);
            actualValue = parseFloat(rfid.rows[0].accuracy || 95);
            break;

          default:
            actualValue = kpi.target_value * (0.9 + Math.random() * 0.2); // Simulated
        }

        // Calculate variance and status
        const variance = actualValue - kpi.target_value;
        const variancePercentage = (variance / kpi.target_value) * 100;
        
        let status: string;
        if (actualValue < kpi.min_threshold) {
          status = 'critical';
        } else if (actualValue < kpi.target_value) {
          status = 'below_target';
        } else if (actualValue > kpi.max_threshold) {
          status = 'above_target';
        } else {
          status = 'on_target';
        }

        // Determine trend (simplified)
        const trend = variance > 0 ? 'improving' : variance < 0 ? 'declining' : 'stable';

        // Store KPI tracking
        await query(`
          INSERT INTO kpi_tracking (
            kpi_id, tracking_date, actual_value, target_value,
            variance, variance_percentage, status, trend
          ) VALUES (
            $1, CURRENT_DATE, $2, $3, $4, $5, $6, $7
          )
          ON CONFLICT (kpi_id, tracking_date, tracking_hour) 
          DO UPDATE SET
            actual_value = EXCLUDED.actual_value,
            variance = EXCLUDED.variance,
            variance_percentage = EXCLUDED.variance_percentage,
            status = EXCLUDED.status,
            trend = EXCLUDED.trend
        `, [
          kpi.id,
          actualValue,
          kpi.target_value,
          variance,
          variancePercentage,
          status,
          trend
        ]);
      }

      logger.info('KPI tracking updated successfully');

    } catch (error) {
      logger.error('Error updating KPI tracking:', error);
      throw error;
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(config: {
    metrics: string[];
    dateRange: { start: Date; end: Date };
    groupBy?: 'day' | 'week' | 'month';
    departments?: number[];
  }): Promise<any> {
    try {
      const { metrics, dateRange, groupBy = 'day', departments } = config;

      let groupByClause: string;
      switch (groupBy) {
        case 'week':
          groupByClause = "DATE_TRUNC('week', metric_date)";
          break;
        case 'month':
          groupByClause = "DATE_TRUNC('month', metric_date)";
          break;
        default:
          groupByClause = 'metric_date';
      }

      // Build dynamic query based on requested metrics
      const metricColumns = metrics.map(m => {
        switch (m) {
          case 'total_dockets':
            return 'SUM(total_dockets) as total_dockets';
          case 'active_users':
            return 'AVG(active_users) as active_users';
          case 'rfid_scans':
            return 'SUM(rfid_scans) as rfid_scans';
          case 'storage_utilization':
            return 'AVG(storage_utilization) as storage_utilization';
          case 'compliance_score':
            return 'AVG(compliance_score) as compliance_score';
          default:
            return null;
        }
      }).filter(Boolean).join(', ');

      const result = await query(`
        SELECT 
          ${groupByClause} as period,
          ${metricColumns}
        FROM analytics_metrics
        WHERE metric_date BETWEEN $1 AND $2
        GROUP BY period
        ORDER BY period
      `, [dateRange.start, dateRange.end]);

      return {
        config,
        data: result.rows,
        generated_at: new Date()
      };

    } catch (error) {
      logger.error('Error generating custom report:', error);
      throw error;
    }
  }

  /**
   * Check for analytics alerts
   */
  async checkAlerts(): Promise<any[]> {
    try {
      // Simplified alert checking - in production, this would be more dynamic
      const alerts = await query(`
        SELECT 
          rule_name,
          severity,
          metric_name,
          threshold_value
        FROM analytics_alert_rules
        WHERE is_active = TRUE
          AND (last_triggered IS NULL OR 
               last_triggered < CURRENT_TIMESTAMP - INTERVAL '60 minutes')
      `);

      // Update last triggered time
      for (const alert of alerts.rows) {
        await query(`
          UPDATE analytics_alert_rules 
          SET last_triggered = CURRENT_TIMESTAMP 
          WHERE rule_name = $1
        `, [alert.rule_name]);
      }

      return alerts.rows;

    } catch (error) {
      logger.error('Error checking alerts:', error);
      return [];
    }
  }
}

export default AnalyticsService;