/**
 * Spatial Analytics Controller
 *
 * REST API endpoints for Open3D-based spatial analysis.
 * Proxies requests to the Python analytics engine.
 *
 * Phase 5: Open3D Integration
 */

import { Request, Response, NextFunction, Router } from 'express';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';

import { AnalyticsClient } from '../../../infrastructure/analytics';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type { Item } from '../../../domain/entities/Item';
import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Request validation schemas
 */
const AnalyzeRequestSchema = z.object({
  itemIds: z.array(z.string()).optional(),
  zoneIds: z.array(z.string()).optional(),
  options: z
    .object({
      clusteringEps: z.number().min(0.1).max(100).optional(),
      clusteringMinSamples: z.number().min(1).max(50).optional(),
      overcrowdingThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const HeatmapRequestSchema = z.object({
  gridSize: z.number().min(1).max(50).optional().default(5.0),
  zoneIds: z.array(z.string()).optional(),
});

@injectable()
export class SpatialAnalyticsController {
  private router: Router;

  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject(AnalyticsClient) private analyticsClient: AnalyticsClient,
    @inject('IItemRepository') private itemRepository: IItemRepository
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check for analytics engine
    this.router.get('/health', this.getHealth.bind(this));

    // Full spatial analysis
    this.router.post('/analyze', this.analyze.bind(this));

    // Three.js-compatible export
    this.router.post('/analyze/threejs', this.analyzeForThreeJS.bind(this));

    // Cluster detection
    this.router.post('/clusters', this.findClusters.bind(this));

    // Zone density analysis
    this.router.post('/density', this.analyzeDensity.bind(this));

    // Heatmap generation
    this.router.post('/heatmap', this.generateHeatmap.bind(this));

    // Zone configurations
    this.router.get('/zones', this.getZones.bind(this));

    // Async analysis
    this.router.post('/analyze/async', this.analyzeAsync.bind(this));
    this.router.get('/analyze/status/:taskId', this.getAnalysisStatus.bind(this));
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * GET /api/spatial/health
   * Check analytics engine health
   */
  private async getHealth(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const health = await this.analyticsClient.healthCheck();
      res.json(health);
    } catch (error) {
      this.logger.error('Analytics health check failed', { error });
      res.status(503).json({
        status: 'unavailable',
        message: 'Analytics engine is not reachable',
      });
    }
  }

  /**
   * POST /api/spatial/analyze
   * Perform full spatial analysis
   */
  private async analyze(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AnalyzeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { itemIds, zoneIds, options } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      // Get items from repository
      const items = await this.getItemPositions(tenantId, itemIds, zoneIds);

      if (items.length === 0) {
        res.json({
          timestamp: new Date().toISOString(),
          totalItems: 0,
          clusters: [],
          zoneDensities: [],
          hotspots: [],
          overcrowdedZones: [],
          optimizationSuggestions: [],
          processingTimeMs: 0,
        });
        return;
      }

      const result = await this.analyticsClient.analyze(items, options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/spatial/analyze/threejs
   * Get analysis in Three.js-compatible format
   */
  private async analyzeForThreeJS(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AnalyzeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { itemIds, zoneIds, options } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      const items = await this.getItemPositions(tenantId, itemIds, zoneIds);

      if (items.length === 0) {
        res.json({
          timestamp: new Date().toISOString(),
          summary: {
            totalItems: 0,
            totalClusters: 0,
            hotspotCount: 0,
            overcrowdedZones: [],
            processingTimeMs: 0,
          },
          clusters: [],
          hotspots: [],
          zoneDensities: [],
          suggestions: [],
          visualization: { colorSchemes: {} },
        });
        return;
      }

      const result = await this.analyticsClient.analyzeForThreeJS(items, options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/spatial/clusters
   * Find item clusters using DBSCAN
   */
  private async findClusters(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AnalyzeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { itemIds, zoneIds, options } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      const items = await this.getItemPositions(tenantId, itemIds, zoneIds);

      const result = await this.analyticsClient.findClusters(
        items,
        options?.clusteringEps,
        options?.clusteringMinSamples
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/spatial/density
   * Analyze zone density and utilization
   */
  private async analyzeDensity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AnalyzeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { itemIds, zoneIds, options } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      const items = await this.getItemPositions(tenantId, itemIds, zoneIds);

      const result = await this.analyticsClient.analyzeDensity(
        items,
        options?.overcrowdingThreshold
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/spatial/heatmap
   * Generate 3D density heatmap
   */
  private async generateHeatmap(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = HeatmapRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { gridSize, zoneIds } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      const items = await this.getItemPositions(tenantId, undefined, zoneIds);

      const result = await this.analyticsClient.generateHeatmap(items, gridSize);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/spatial/zones
   * Get zone configurations
   */
  private async getZones(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.analyticsClient.getZones();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/spatial/analyze/async
   * Start async analysis
   */
  private async analyzeAsync(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = AnalyzeRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { itemIds, zoneIds, options } = validation.data;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant ID required' });
        return;
      }

      const taskId = `${tenantId}-${Date.now()}`;
      const items = await this.getItemPositions(tenantId, itemIds, zoneIds);

      const result = await this.analyticsClient.analyzeAsync(items, taskId, options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/spatial/analyze/status/:taskId
   * Get async analysis status
   */
  private async getAnalysisStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.taskId;
      if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
      }
      const result = await this.analyticsClient.getAnalysisStatus(taskId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get item positions for analysis
   */
  private async getItemPositions(
    tenantId: string,
    itemIds?: string[],
    zoneIds?: string[]
  ): Promise<
    Array<{
      itemId: string;
      epc: string;
      x: number;
      y: number;
      z: number;
      zoneId: string;
      lastSeen: Date;
      rssi: number;
    }>
  > {
    // Get items from repository
    const result = await this.itemRepository.findAllActive(tenantId);

    if (result.isErr()) {
      this.logger.error('Failed to fetch items', { error: result.error });
      return [];
    }

    let items: Item[] = result.value;

    // Filter by itemIds if provided
    if (itemIds && itemIds.length > 0) {
      const itemIdSet = new Set(itemIds);
      items = items.filter((item) => itemIdSet.has(item.getId()));
    }

    // Filter by zoneIds if provided
    if (zoneIds && zoneIds.length > 0) {
      const zoneIdSet = new Set(zoneIds);
      items = items.filter((item) => {
        const currentZone = item.getCurrentZoneId();
        return currentZone && zoneIdSet.has(currentZone);
      });
    }

    // Map to analytics format with positions
    // Use zone-based position estimation
    return items.map((item) => {
      const currentZoneId = item.getCurrentZoneId() || 'unknown';
      const position = this.estimatePosition(currentZoneId);
      const lastSeenAt = item.getLastSeenAt();
      return {
        itemId: item.getId(),
        epc: item.getRfidEpc().getValue(),
        x: position.x + (Math.random() - 0.5) * 10, // Add some variance
        y: position.y + Math.random() * 2,
        z: position.z + (Math.random() - 0.5) * 10,
        zoneId: currentZoneId,
        lastSeen: lastSeenAt || new Date(),
        rssi: -50, // Default RSSI since not tracked on Item entity
      };
    });
  }

  /**
   * Estimate position based on zone (matches frontend warehouse layout)
   */
  private estimatePosition(zoneId: string): { x: number; y: number; z: number } {
    const zonePositions: Record<string, { x: number; y: number; z: number }> = {
      receiving: { x: -33, y: 1, z: -33 },
      'storage-a': { x: -33, y: 1, z: 0 },
      'storage-b': { x: -33, y: 1, z: 33 },
      'storage-c': { x: 0, y: 1, z: -33 },
      'secure-storage': { x: 0, y: 1, z: 0 },
      'storage-d': { x: 0, y: 1, z: 33 },
      processing: { x: 33, y: 1, z: -33 },
      shipping: { x: 33, y: 1, z: 0 },
      returns: { x: 33, y: 1, z: 33 },
    };

    return zonePositions[zoneId] || { x: 0, y: 1, z: 0 };
  }
}
