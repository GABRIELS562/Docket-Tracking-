import { Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';

import { GetZoneItemsUseCase } from '../../../application/use-cases/items/GetZoneItemsUseCase';
import { GetAllZonesUseCase } from '../../../application/use-cases/zones/GetAllZonesUseCase';

import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Zone Controller
 *
 * Handles zone-related HTTP requests
 *
 * Endpoints:
 * - GET /api/zones           - Get all zones with occupancy
 * - GET /api/zones/:id/items - Get items in a zone
 */
@injectable()
export class ZoneController {
  constructor(
    @inject(GetAllZonesUseCase) private getAllZones: GetAllZonesUseCase,
    @inject(GetZoneItemsUseCase) private getZoneItems: GetZoneItemsUseCase
  ) {}

  /**
   * GET /api/zones
   * Get all zones with current occupancy information
   *
   * Query parameters:
   * - activeOnly: Only return active zones (default false)
   *
   * Returns:
   * - Zone ID and name
   * - Zone type (storage, lab, office, corridor, entrance)
   * - Capacity and current occupancy
   * - Occupancy percentage
   * - Status (normal, warning, critical, full)
   */
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const result = await this.getAllZones.execute({
        tenantId: req.tenantId,
        activeOnly: req.query.activeOnly === 'true',
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
   * GET /api/zones/:id/items
   * Get items currently in a specific zone
   *
   * Query parameters:
   * - limit: Maximum number of items to return (default 50)
   * - recentOnly: Only return recently seen items (default false)
   *
   * Returns:
   * - Array of items in the zone
   * - Item numbers
   * - Reference IDs
   * - Last seen timestamps
   */
  async getItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
        return;
      }

      const result = await this.getZoneItems.execute({
        tenantId: req.tenantId,
        zoneId: req.params.id!,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        recentOnly: req.query.recentOnly === 'true',
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
