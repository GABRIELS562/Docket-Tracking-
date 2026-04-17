import { Router } from 'express';
import { container } from 'tsyringe';

import { FlowAnalyticsController } from '../controllers/FlowAnalyticsController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

/**
 * Flow Analytics Routes
 *
 * Phase 2.2: Item Flow & Path Analysis
 *
 * All routes require authentication and tenant context.
 *
 * Endpoints:
 * - GET /flow/journey/:itemNumber  - Get complete item journey
 * - GET /flow/zones                - Get zone-to-zone flow analytics
 * - GET /flow/bottlenecks          - Get bottleneck analysis
 * - GET /flow/patterns             - Get path patterns
 * - GET /flow/anomalies            - Get flow anomalies
 */

/**
 * Create flow routes with lazy dependency resolution
 * This ensures container is initialized before resolving dependencies
 */
export function createFlowRoutes(): Router {
  const router = Router();

  // Get controller and middleware from DI container (lazy resolution)
  const controller = container.resolve(FlowAnalyticsController);
  const authMiddleware = container.resolve(AuthMiddlewareFactory);

  // Apply authentication middleware to all routes
  const authenticate = authMiddleware.requireAuth();

  /**
   * GET /flow/journey/:itemNumber
   *
   * Get complete journey/path of an item through zones
   *
   * @param itemNumber - Item number to analyze
   * @query startDate - Start of time range (ISO 8601, optional)
   * @query endDate - End of time range (ISO 8601, optional)
   *
   * @returns {ItemJourneyDTO} Journey details including:
   *   - path: Ordered list of zone visits
   *   - transitions: Zone-to-zone transitions with timing
   *   - anomalies: Detected journey anomalies
   *   - currentStatus: Current item status
   *   - summary: Journey statistics
   */
  router.get('/journey/:itemNumber', authenticate, (req, res, next) =>
    controller.getJourney(req as any, res, next)
  );

  /**
   * GET /flow/zones
   *
   * Get zone-to-zone flow analytics
   *
   * @query startDate - Start of time range (ISO 8601)
   * @query endDate - End of time range (ISO 8601)
   * @query zoneId - Filter by specific zone (optional)
   * @query minTransitions - Minimum transition count (optional)
   *
   * @returns {ZoneFlowAnalyticsDTO} Flow analytics including:
   *   - flowMatrix: Zone-to-zone transition counts
   *   - topFlows: Most traveled corridors
   *   - zoneStats: Entry/exit statistics per zone
   *   - hourlyPatterns: Flow patterns by hour
   */
  router.get('/zones', authenticate, (req, res, next) =>
    controller.getZoneFlowAnalytics(req as any, res, next)
  );

  /**
   * GET /flow/bottlenecks
   *
   * Get bottleneck analysis showing congestion/delays
   *
   * @query startDate - Start of time range (ISO 8601)
   * @query endDate - End of time range (ISO 8601)
   * @query dwellThresholdMinutes - Custom dwell threshold (optional)
   * @query congestionThreshold - Custom congestion threshold 0-1 (optional)
   *
   * @returns {BottleneckAnalysisDTO} Bottleneck analysis including:
   *   - bottlenecks: Identified bottleneck zones with severity
   *   - congestionTimeline: Congestion over time
   *   - recommendations: Improvement suggestions
   */
  router.get('/bottlenecks', authenticate, (req, res, next) =>
    controller.getBottleneckAnalysis(req as any, res, next)
  );

  /**
   * GET /flow/patterns
   *
   * Get discovered path patterns
   *
   * @query startDate - Start of time range (ISO 8601)
   * @query endDate - End of time range (ISO 8601)
   * @query minOccurrences - Minimum pattern occurrences (optional)
   * @query maxPathLength - Maximum path length (optional)
   *
   * @returns {PathPatternsDTO} Pattern analysis including:
   *   - patterns: Common paths with statistics
   *   - commonSubsequences: Frequently occurring path segments
   *   - summary: Pattern summary statistics
   */
  router.get('/patterns', authenticate, (req, res, next) =>
    controller.getPatterns(req as any, res, next)
  );

  /**
   * GET /flow/anomalies
   *
   * Get detected flow anomalies
   *
   * @query startDate - Start of time range (ISO 8601)
   * @query endDate - End of time range (ISO 8601)
   * @query severity - Filter by severity: low,medium,high,critical (optional)
   * @query type - Filter by anomaly type (optional)
   * @query limit - Maximum anomalies to return (optional)
   *
   * @returns {FlowAnomaliesDTO} Anomaly analysis including:
   *   - anomalies: Detected anomalies with details
   *   - byType: Breakdown by anomaly type
   *   - trends: Anomaly trends over time
   */
  router.get('/anomalies', authenticate, (req, res, next) =>
    controller.getAnomalies(req as any, res, next)
  );

  return router;
}

// Default export for backwards compatibility
export default createFlowRoutes;
