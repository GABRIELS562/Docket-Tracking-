import { Response } from 'express';
import { injectable, inject } from 'tsyringe';

import { GetDashboardAnalyticsUseCase } from '../../../application/use-cases/analytics/GetDashboardAnalyticsUseCase';
import { GetReaderAnalyticsUseCase } from '../../../application/use-cases/analytics/GetReaderAnalyticsUseCase';
import { GetSystemMetricsUseCase } from '../../../application/use-cases/analytics/GetSystemMetricsUseCase';
import { GetZoneAnalyticsUseCase } from '../../../application/use-cases/analytics/GetZoneAnalyticsUseCase';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Analytics Controller
 *
 * Handles all analytics-related HTTP requests:
 * - GET /api/analytics/dashboard    - Dashboard overview metrics
 * - GET /api/analytics/zones        - Zone activity analytics
 * - GET /api/analytics/zones/:id    - Single zone analytics
 * - GET /api/analytics/readers      - Reader performance analytics
 * - GET /api/analytics/readers/:id  - Single reader analytics
 * - GET /api/analytics/system       - System-wide metrics
 * - GET /api/analytics/export       - Export analytics data
 */
@injectable()
export class AnalyticsController {
  constructor(
    @inject(GetDashboardAnalyticsUseCase)
    private getDashboard: GetDashboardAnalyticsUseCase,
    @inject(GetZoneAnalyticsUseCase)
    private getZoneAnalytics: GetZoneAnalyticsUseCase,
    @inject(GetReaderAnalyticsUseCase)
    private getReaderAnalytics: GetReaderAnalyticsUseCase,
    @inject(GetSystemMetricsUseCase)
    private getSystemMetrics: GetSystemMetricsUseCase,
    @inject('ILogger')
    private logger: ILogger
  ) {}

  /**
   * GET /api/analytics/dashboard
   *
   * Get dashboard overview with key metrics
   *
   * Query params:
   * - hours: number (default: 24) - Time period to analyze
   */
  async dashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
      return;
    }

    const hours = parseInt(req.query.hours as string) || 24;

    this.logger.debug('Dashboard analytics request', {
      tenantId: req.tenantId,
      hours,
    });

    const result = await this.getDashboard.execute({
      tenantId: req.tenantId,
      hours,
    });

    if (result.isErr()) {
      this.logger.error('Failed to get dashboard analytics', {
        error: result.error.message,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result.value,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      },
    });
  }

  /**
   * GET /api/analytics/zones
   * GET /api/analytics/zones/:zoneId
   *
   * Get zone activity analytics
   *
   * Query params:
   * - startDate: ISO date string (required)
   * - endDate: ISO date string (required)
   * - granularity: 'hour' | 'day' | 'week' (default: 'hour')
   */
  async zones(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
      return;
    }

    const zoneId = req.params.zoneId;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const granularity = (req.query.granularity as 'hour' | 'day' | 'week') || 'hour';

    this.logger.debug('Zone analytics request', {
      tenantId: req.tenantId,
      zoneId: zoneId || 'all',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    });

    const result = await this.getZoneAnalytics.execute({
      tenantId: req.tenantId,
      zoneId,
      startDate,
      endDate,
      granularity,
    });

    if (result.isErr()) {
      this.logger.error('Failed to get zone analytics', {
        error: result.error.message,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: zoneId ? result.value[0] : result.value,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        query: { zoneId, startDate, endDate, granularity },
      },
    });
  }

  /**
   * GET /api/analytics/readers
   * GET /api/analytics/readers/:readerId
   *
   * Get reader performance analytics
   *
   * Query params:
   * - startDate: ISO date string (required)
   * - endDate: ISO date string (required)
   * - granularity: 'hour' | 'day' (default: 'hour')
   */
  async readers(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
      return;
    }

    const readerId = req.params.readerId;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const granularity = (req.query.granularity as 'hour' | 'day') || 'hour';

    this.logger.debug('Reader analytics request', {
      tenantId: req.tenantId,
      readerId: readerId || 'all',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    });

    const result = await this.getReaderAnalytics.execute({
      tenantId: req.tenantId,
      readerId,
      startDate,
      endDate,
      granularity,
    });

    if (result.isErr()) {
      this.logger.error('Failed to get reader analytics', {
        error: result.error.message,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: readerId ? result.value[0] : result.value,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        query: { readerId, startDate, endDate, granularity },
      },
    });
  }

  /**
   * GET /api/analytics/system
   *
   * Get system-wide performance metrics
   *
   * Query params:
   * - hours: number (default: 24) - Time period to analyze
   * - granularity: 'minute' | 'hour' (default: 'hour')
   */
  async system(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
      return;
    }

    const hours = parseInt(req.query.hours as string) || 24;
    const granularity = (req.query.granularity as 'minute' | 'hour') || 'hour';

    this.logger.debug('System metrics request', {
      tenantId: req.tenantId,
      hours,
      granularity,
    });

    const result = await this.getSystemMetrics.execute({
      tenantId: req.tenantId,
      hours,
      granularity,
    });

    if (result.isErr()) {
      this.logger.error('Failed to get system metrics', {
        error: result.error.message,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result.value,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        query: { hours, granularity },
      },
    });
  }

  /**
   * GET /api/analytics/export
   *
   * Export analytics data in various formats
   *
   * Query params:
   * - type: 'dashboard' | 'zones' | 'readers' | 'system' (required)
   * - format: 'json' | 'csv' (default: 'json')
   * - startDate: ISO date string
   * - endDate: ISO date string
   */
  async export(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
      return;
    }

    const type = req.query.type as string;
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    if (!type || !['dashboard', 'zones', 'readers', 'system'].includes(type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid export type. Must be: dashboard, zones, readers, or system',
        },
      });
      return;
    }

    this.logger.debug('Analytics export request', {
      tenantId: req.tenantId,
      type,
      format,
    });

    try {
      let data: unknown;

      // Get the appropriate data based on type
      switch (type) {
        case 'dashboard':
          const dashResult = await this.getDashboard.execute({
            tenantId: req.tenantId,
            hours: Math.ceil((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000)),
          });
          if (dashResult.isErr()) throw dashResult.error;
          data = dashResult.value;
          break;

        case 'zones':
          const zonesResult = await this.getZoneAnalytics.execute({
            tenantId: req.tenantId,
            startDate,
            endDate,
            granularity: 'hour',
          });
          if (zonesResult.isErr()) throw zonesResult.error;
          data = zonesResult.value;
          break;

        case 'readers':
          const readersResult = await this.getReaderAnalytics.execute({
            tenantId: req.tenantId,
            startDate,
            endDate,
            granularity: 'hour',
          });
          if (readersResult.isErr()) throw readersResult.error;
          data = readersResult.value;
          break;

        case 'system':
          const systemResult = await this.getSystemMetrics.execute({
            tenantId: req.tenantId,
            hours: Math.ceil((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000)),
            granularity: 'hour',
          });
          if (systemResult.isErr()) throw systemResult.error;
          data = systemResult.value;
          break;
      }

      // Format response based on requested format
      if (format === 'csv') {
        const csv = this.convertToCSV(data, type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`
        );
        res.send(csv);
      } else {
        res.json({
          success: true,
          data,
          meta: {
            exportType: type,
            format,
            generatedAt: new Date().toISOString(),
            period: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to export analytics', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Export failed',
        },
      });
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: unknown, _type: string): string {
    if (!data) return '';

    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map((item) => headers.map((h) => this.escapeCSV(item[h])).join(','));
      return [headers.join(','), ...rows].join('\n');
    }

    // Handle objects - flatten for CSV
    const flattened = this.flattenObject(data as Record<string, unknown>);
    const headers = Object.keys(flattened);
    const values = headers.map((h) => this.escapeCSV(flattened[h]));
    return [headers.join(','), values.join(',')].join('\n');
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
