import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllZonesUseCase } from '../../../application/use-cases/zones/GetAllZonesUseCase';
import { GetZoneItemsUseCase } from '../../../application/use-cases/items/GetZoneItemsUseCase';
import { ILogger } from '../../../application/interfaces/ILogger';

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
    @inject(GetZoneItemsUseCase) private getZoneItems: GetZoneItemsUseCase,
    @inject('ILogger') private logger: ILogger
  ) {}

  /**
   * GET /api/zones
   * Get all zones with current occupancy information
   *
   * Returns:
   * - Zone ID and name
   * - Zone type (storage, lab, office, corridor, entrance)
   * - Capacity and current occupancy
   * - Occupancy percentage
   * - Status (normal, warning, critical, full)
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getAllZones.execute();

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
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
  async getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getZoneItems.execute({
        zoneId: req.params.id,
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
          requestId: req.headers['x-request-id'],
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
