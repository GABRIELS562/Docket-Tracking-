import { Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetItemJourneyUseCase } from '../../../application/use-cases/flow/GetItemJourneyUseCase';
import { GetZoneFlowAnalyticsUseCase } from '../../../application/use-cases/flow/GetZoneFlowAnalyticsUseCase';
import { GetBottleneckAnalysisUseCase } from '../../../application/use-cases/flow/GetBottleneckAnalysisUseCase';
import { GetPathPatternsUseCase } from '../../../application/use-cases/flow/GetPathPatternsUseCase';
import { GetFlowAnomaliesUseCase } from '../../../application/use-cases/flow/GetFlowAnomaliesUseCase';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Flow Analytics Controller
 *
 * Handles item flow and path analysis HTTP requests.
 * Phase 2.2 Feature: Item Flow & Path Analysis
 *
 * Endpoints:
 * - GET /api/flow/journey/:itemNumber  - Get complete item journey
 * - GET /api/flow/zones                - Get zone-to-zone flow analytics
 * - GET /api/flow/bottlenecks          - Get bottleneck analysis
 * - GET /api/flow/patterns             - Get path patterns
 * - GET /api/flow/anomalies            - Get flow anomalies
 */
@injectable()
export class FlowAnalyticsController {
  constructor(
    @inject(GetItemJourneyUseCase) private getItemJourney: GetItemJourneyUseCase,
    @inject(GetZoneFlowAnalyticsUseCase) private getZoneFlow: GetZoneFlowAnalyticsUseCase,
    @inject(GetBottleneckAnalysisUseCase) private getBottlenecks: GetBottleneckAnalysisUseCase,
    @inject(GetPathPatternsUseCase) private getPathPatterns: GetPathPatternsUseCase,
    @inject(GetFlowAnomaliesUseCase) private getFlowAnomalies: GetFlowAnomaliesUseCase
  ) {}

  /**
   * GET /api/flow/journey/:itemNumber
   * Get complete journey/path of an item through zones
   *
   * Path parameters:
   * - itemNumber: The item number to analyze
   *
   * Query parameters:
   * - startDate: Start of time range (ISO 8601, optional)
   * - endDate: End of time range (ISO 8601, optional)
   *
   * Returns:
   * - Ordered list of zone visits (the path)
   * - Zone transitions with timing
   * - Anomalies detected in the journey
   * - Current status
   */
  async getJourney(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const itemNumber = req.params.itemNumber;
      if (!itemNumber) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Item number is required' },
        });
        return;
      }

      const result = await this.getItemJourney.execute({
        tenantId: req.tenantId,
        itemNumber,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flow/zones
   * Get zone-to-zone flow analytics
   *
   * Query parameters:
   * - startDate: Start of time range (ISO 8601, required)
   * - endDate: End of time range (ISO 8601, required)
   * - zoneId: Filter by specific zone (optional)
   * - minTransitions: Minimum transition count to include (optional)
   *
   * Returns:
   * - Flow matrix showing transitions between zones
   * - Top flow corridors
   * - Zone entry/exit statistics
   * - Hourly flow patterns
   */
  async getZoneFlowAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const result = await this.getZoneFlow.execute({
        tenantId: req.tenantId,
        startDate,
        endDate,
        zoneId: req.query.zoneId as string,
        minTransitions: req.query.minTransitions
          ? parseInt(req.query.minTransitions as string)
          : undefined,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flow/bottlenecks
   * Get bottleneck analysis showing zones with congestion/delays
   *
   * Query parameters:
   * - startDate: Start of time range (ISO 8601, required)
   * - endDate: End of time range (ISO 8601, required)
   * - dwellThresholdMinutes: Custom dwell threshold (optional)
   * - congestionThreshold: Custom congestion threshold 0-1 (optional)
   *
   * Returns:
   * - Identified bottleneck zones with severity
   * - Congestion timeline
   * - Recommendations for improvement
   */
  async getBottleneckAnalysis(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const result = await this.getBottlenecks.execute({
        tenantId: req.tenantId,
        startDate,
        endDate,
        dwellThresholdMinutes: req.query.dwellThresholdMinutes
          ? parseInt(req.query.dwellThresholdMinutes as string)
          : undefined,
        congestionThreshold: req.query.congestionThreshold
          ? parseFloat(req.query.congestionThreshold as string)
          : undefined,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flow/patterns
   * Get discovered path patterns (common movement sequences)
   *
   * Query parameters:
   * - startDate: Start of time range (ISO 8601, required)
   * - endDate: End of time range (ISO 8601, required)
   * - minOccurrences: Minimum pattern occurrences (optional)
   * - maxPathLength: Maximum path length to analyze (optional)
   *
   * Returns:
   * - Common path patterns with statistics
   * - Common subsequences
   * - Pattern summary
   */
  async getPatterns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const result = await this.getPathPatterns.execute({
        tenantId: req.tenantId,
        startDate,
        endDate,
        minOccurrences: req.query.minOccurrences
          ? parseInt(req.query.minOccurrences as string)
          : undefined,
        maxPathLength: req.query.maxPathLength
          ? parseInt(req.query.maxPathLength as string)
          : undefined,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flow/anomalies
   * Get detected flow anomalies (unusual movements)
   *
   * Query parameters:
   * - startDate: Start of time range (ISO 8601, required)
   * - endDate: End of time range (ISO 8601, required)
   * - severity: Filter by severity (low,medium,high,critical) (optional)
   * - type: Filter by anomaly type (optional)
   * - limit: Maximum anomalies to return (optional)
   *
   * Returns:
   * - Detected anomalies with details
   * - Anomaly breakdown by type
   * - Trends over time
   */
  async getAnomalies(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      // Parse severity filter
      const severityFilter = req.query.severity
        ? (req.query.severity as string).split(',') as ('low' | 'medium' | 'high' | 'critical')[]
        : undefined;

      // Parse type filter
      const typeFilter = req.query.type ? (req.query.type as string).split(',') as any : undefined;

      const result = await this.getFlowAnomalies.execute({
        tenantId: req.tenantId,
        startDate,
        endDate,
        severityFilter,
        typeFilter,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
