/**
 * Advanced Analytics API Routes
 * Endpoints for metrics, KPIs, and custom reporting
 */

import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { logger } from '../utils/logger';

const router = Router();
const analyticsService = AnalyticsService.getInstance();

/**
 * GET /api/analytics/metrics/current
 * Get current real-time metrics
 */
router.get('/metrics/current', async (req: Request, res: Response) => {
  try {
    const metrics = await analyticsService.getCurrentMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching current metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current metrics'
    });
  }
});

/**
 * GET /api/analytics/kpi/dashboard
 * Get KPI dashboard data
 */
router.get('/kpi/dashboard', async (req: Request, res: Response) => {
  try {
    const kpis = await analyticsService.getKPIDashboard();
    
    res.json({
      success: true,
      data: kpis,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching KPI dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPI dashboard'
    });
  }
});

/**
 * GET /api/analytics/departments
 * Get department-wise analytics
 */
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const dateRange = {
      start: start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end_date ? new Date(end_date as string) : new Date()
    };
    
    const departments = await analyticsService.getDepartmentAnalytics(dateRange);
    
    res.json({
      success: true,
      data: departments,
      dateRange,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching department analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department analytics'
    });
  }
});

/**
 * GET /api/analytics/timeseries/:metric
 * Get time series data for a specific metric
 */
router.get('/timeseries/:metric', async (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { period = 'day', duration = 7 } = req.query;
    
    const data = await analyticsService.getTimeSeriesData(
      metric,
      period as 'hour' | 'day' | 'week' | 'month',
      parseInt(duration as string)
    );
    
    res.json({
      success: true,
      data,
      metric,
      period,
      duration,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching time series data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time series data'
    });
  }
});

/**
 * POST /api/analytics/report/custom
 * Generate custom report
 */
router.post('/report/custom', async (req: Request, res: Response) => {
  try {
    const { metrics, date_range, group_by, departments, format = 'json' } = req.body;
    
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Metrics array is required'
      });
    }
    
    const config = {
      metrics,
      dateRange: {
        start: new Date(date_range?.start || Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(date_range?.end || Date.now())
      },
      groupBy: group_by as 'day' | 'week' | 'month',
      departments
    };
    
    const report = await analyticsService.generateCustomReport(config);
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(report.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics_report_${Date.now()}.csv`);
      return res.send(csv);
    } else {
      return res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    logger.error('Error generating custom report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate custom report'
    });
  }
});

/**
 * GET /api/analytics/alerts
 * Get active analytics alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await analyticsService.checkAlerts();
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

/**
 * POST /api/analytics/metrics/calculate
 * Trigger manual metrics calculation
 */
router.post('/metrics/calculate', async (req: Request, res: Response) => {
  try {
    await analyticsService.calculateHourlyMetrics();
    await analyticsService.updateKPITracking();
    
    res.json({
      success: true,
      message: 'Metrics calculation triggered successfully',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error calculating metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics'
    });
  }
});

/**
 * GET /api/analytics/summary
 * Get comprehensive analytics summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const [metrics, kpis, departments, alerts] = await Promise.all([
      analyticsService.getCurrentMetrics(),
      analyticsService.getKPIDashboard(),
      analyticsService.getDepartmentAnalytics({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }),
      analyticsService.checkAlerts()
    ]);
    
    // Get trend data for key metrics
    const [docketTrend, userTrend, rfidTrend] = await Promise.all([
      analyticsService.getTimeSeriesData('docket_activity', 'day', 7),
      analyticsService.getTimeSeriesData('user_activity', 'day', 7),
      analyticsService.getTimeSeriesData('rfid_scans', 'day', 7)
    ]);
    
    res.json({
      success: true,
      data: {
        current: metrics,
        kpis,
        departments,
        alerts,
        trends: {
          dockets: docketTrend,
          users: userTrend,
          rfid: rfidTrend
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary'
    });
  }
});

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

export default router;