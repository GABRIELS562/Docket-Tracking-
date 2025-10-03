import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllZonesUseCase } from '../../../application/use-cases/zones/GetAllZonesUseCase';
import { GetZoneDocketsUseCase } from '../../../application/use-cases/zones/GetZoneDocketsUseCase';
import { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Zone Controller
 *
 * Handles zone-related HTTP requests
 *
 * Endpoints:
 * - GET /api/zones           - Get all zones with occupancy
 * - GET /api/zones/:id/dockets - Get dockets in a zone
 */
@injectable()
export class ZoneController {
  constructor(
    @inject(GetAllZonesUseCase) private getAllZones: GetAllZonesUseCase,
    @inject(GetZoneDocketsUseCase) private getZoneDockets: GetZoneDocketsUseCase,
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
   * GET /api/zones/:id/dockets
   * Get dockets currently in a specific zone
   *
   * Query parameters:
   * - limit: Maximum number of dockets to return (default 5)
   *
   * Returns:
   * - Array of dockets in the zone
   * - Lab numbers
   * - Case references
   * - Last seen timestamps
   */
  async getDockets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getZoneDockets.execute({
        zoneId: parseInt(req.params.id),
        limit: req.query.limit ? parseInt(req.query.limit as string) : 5,
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
