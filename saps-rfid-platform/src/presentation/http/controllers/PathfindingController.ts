import { Response, NextFunction } from 'express';
import { injectable } from 'tsyringe';

import { FindPathUseCase } from '../../../application/use-cases/pathfinding';

import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Pathfinding Controller
 *
 * Handles HTTP requests for A* pathfinding operations:
 * - Point-to-point pathfinding
 * - Zone-to-zone pathfinding
 * - Multi-zone route planning
 * - Zone connectivity graph
 */
@injectable()
export class PathfindingController {
  constructor(private readonly findPathUseCase: FindPathUseCase) {}

  /**
   * Find path between two points or zones
   *
   * POST /api/v1/pathfinding/find
   * Body: {
   *   from: { x: number, y: number } | { zoneId: string },
   *   to: { x: number, y: number } | { zoneId: string },
   *   avoidZones?: string[]
   * }
   */
  async findPath(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { from, to, avoidZones } = req.body;

      if (!from || !to) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: from and to',
        });
        return;
      }

      const result = await this.findPathUseCase.execute({
        tenantId,
        from,
        to,
        avoidZones,
      });

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find path through multiple zones
   *
   * POST /api/v1/pathfinding/route
   * Body: { zoneIds: string[] }
   */
  async findRoute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { zoneIds } = req.body;

      if (!zoneIds || !Array.isArray(zoneIds) || zoneIds.length < 2) {
        res.status(400).json({
          success: false,
          error: 'zoneIds must be an array with at least 2 zones',
        });
        return;
      }

      const result = await this.findPathUseCase.executeMultiZone({
        tenantId,
        zoneIds,
      });

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get zone connectivity graph
   *
   * GET /api/v1/pathfinding/graph
   */
  async getGraph(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const result = await this.findPathUseCase.getZoneGraph(tenantId);

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find optimal path between two zones (convenience endpoint)
   *
   * GET /api/v1/pathfinding/zones/:fromZoneId/:toZoneId
   */
  async findZonePath(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { fromZoneId, toZoneId } = req.params;

      if (!fromZoneId || !toZoneId) {
        res.status(400).json({
          success: false,
          error: 'Missing zone IDs',
        });
        return;
      }

      const result = await this.findPathUseCase.execute({
        tenantId,
        from: { zoneId: fromZoneId },
        to: { zoneId: toZoneId },
      });

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }
}
