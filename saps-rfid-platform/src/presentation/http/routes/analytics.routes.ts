import { Router } from 'express';
import { container } from 'tsyringe';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

/**
 * Analytics Routes
 *
 * All routes require authentication and tenant context.
 *
 * Endpoints:
 * - GET /analytics/dashboard           - Dashboard overview metrics
 * - GET /analytics/zones               - All zones analytics
 * - GET /analytics/zones/:zoneId       - Single zone analytics
 * - GET /analytics/readers             - All readers analytics
 * - GET /analytics/readers/:readerId   - Single reader analytics
 * - GET /analytics/system              - System-wide metrics
 * - GET /analytics/export              - Export analytics data
 */

/**
 * Create analytics routes with lazy dependency resolution
 * This ensures container is initialized before resolving dependencies
 */
export function createAnalyticsRoutes(): Router {
  const router = Router();

  // Get controller and middleware from DI container (lazy resolution)
  const controller = container.resolve(AnalyticsController);
  const authMiddleware = container.resolve(AuthMiddlewareFactory);

  // Apply authentication middleware to all routes
  const authenticate = authMiddleware.requireAuth();

/**
 * GET /analytics/dashboard
 *
 * Get dashboard overview with key metrics
 *
 * @query hours - Time period to analyze (default: 24)
 *
 * @returns {DashboardMetricsDTO} Dashboard metrics including:
 *   - summary: Overall statistics
 *   - comparison: Change vs previous period
 *   - zoneOccupancy: Current zone occupancy levels
 *   - readerHealth: Reader status summary
 *   - recentActivity: Recent activity timeline
 */
router.get('/dashboard', authenticate, (req, res) => controller.dashboard(req as any, res));

/**
 * GET /analytics/zones
 *
 * Get analytics for all zones
 *
 * @query startDate - Start of analysis period (ISO string)
 * @query endDate - End of analysis period (ISO string)
 * @query granularity - Time bucket size: 'hour' | 'day' | 'week'
 *
 * @returns {ZoneAnalyticsDTO[]} Analytics for all zones
 */
router.get('/zones', authenticate, (req, res) => controller.zones(req as any, res));

/**
 * GET /analytics/zones/:zoneId
 *
 * Get analytics for a specific zone
 *
 * @param zoneId - Zone identifier
 * @query startDate - Start of analysis period (ISO string)
 * @query endDate - End of analysis period (ISO string)
 * @query granularity - Time bucket size: 'hour' | 'day' | 'week'
 *
 * @returns {ZoneAnalyticsDTO} Zone analytics including:
 *   - statistics: Aggregate stats
 *   - timeSeries: Time-series data for charts
 *   - topItems: Most active items in zone
 *   - heatMap: Activity heat map by day/hour
 */
router.get('/zones/:zoneId', authenticate, (req, res) => controller.zones(req as any, res));

/**
 * GET /analytics/readers
 *
 * Get performance analytics for all readers
 *
 * @query startDate - Start of analysis period (ISO string)
 * @query endDate - End of analysis period (ISO string)
 * @query granularity - Time bucket size: 'hour' | 'day'
 *
 * @returns {ReaderAnalyticsDTO[]} Analytics for all readers
 */
router.get('/readers', authenticate, (req, res) => controller.readers(req as any, res));

/**
 * GET /analytics/readers/:readerId
 *
 * Get performance analytics for a specific reader
 *
 * @param readerId - Reader identifier
 * @query startDate - Start of analysis period (ISO string)
 * @query endDate - End of analysis period (ISO string)
 * @query granularity - Time bucket size: 'hour' | 'day'
 *
 * @returns {ReaderAnalyticsDTO} Reader analytics including:
 *   - performance: Read statistics and error rates
 *   - antennaStats: Per-antenna breakdown
 *   - timeSeries: Performance over time
 *   - health: Status and issues
 */
router.get('/readers/:readerId', authenticate, (req, res) => controller.readers(req as any, res));

/**
 * GET /analytics/system
 *
 * Get system-wide performance metrics
 *
 * @query hours - Time period to analyze (default: 24)
 * @query granularity - Time bucket size: 'minute' | 'hour'
 *
 * @returns {SystemMetricsDTO} System metrics including:
 *   - current: Real-time status
 *   - history: Historical time series
 *   - resources: Database and cache stats
 */
router.get('/system', authenticate, (req, res) => controller.system(req as any, res));

/**
 * GET /analytics/export
 *
 * Export analytics data in JSON or CSV format
 *
 * @query type - Export type: 'dashboard' | 'zones' | 'readers' | 'system'
 * @query format - Output format: 'json' | 'csv' (default: 'json')
 * @query startDate - Start of analysis period (ISO string)
 * @query endDate - End of analysis period (ISO string)
 *
 * @returns Analytics data in requested format
 */
router.get('/export', authenticate, (req, res) => controller.export(req as any, res));

  return router;
}

// Default export for backwards compatibility
export default createAnalyticsRoutes;
