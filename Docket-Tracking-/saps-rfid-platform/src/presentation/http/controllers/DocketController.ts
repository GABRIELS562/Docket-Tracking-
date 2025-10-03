import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { RegisterDocketUseCase } from '../../../application/use-cases/dockets/RegisterDocketUseCase';
import { SearchDocketsUseCase } from '../../../application/use-cases/dockets/SearchDocketsUseCase';
import { GetDocketDetailsUseCase } from '../../../application/use-cases/dockets/GetDocketDetailsUseCase';
import { GetDocketHistoryUseCase } from '../../../application/use-cases/dockets/GetDocketHistoryUseCase';
import { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Docket Controller
 *
 * Handles all docket-related HTTP requests
 *
 * Endpoints:
 * - POST   /api/dockets          - Register new docket
 * - GET    /api/dockets          - Search dockets
 * - GET    /api/dockets/:id      - Get docket details
 * - GET    /api/dockets/:id/history - Get location history
 */
@injectable()
export class DocketController {
  constructor(
    @inject(RegisterDocketUseCase) private registerDocket: RegisterDocketUseCase,
    @inject(SearchDocketsUseCase) private searchDockets: SearchDocketsUseCase,
    @inject(GetDocketDetailsUseCase) private getDocketDetails: GetDocketDetailsUseCase,
    @inject(GetDocketHistoryUseCase) private getDocketHistory: GetDocketHistoryUseCase,
    @inject('ILogger') private logger: ILogger
  ) {}

  /**
   * POST /api/dockets
   * Register a new docket
   *
   * Request body:
   * ```json
   * {
   *   "labNumber": "FSL-2024-000001",
   *   "caseReference": "Armed Robbery - Main Street",
   *   "rfidEpc": "E28011606000204DECA48DA",
   *   "evidenceType": "firearm",
   *   "metadata": { "officer": "Smith" }
   * }
   * ```
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.registerDocket.execute(req.body);

      if (result.isErr()) {
        return next(result.error);
      }

      res.status(201).json({
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
   * GET /api/dockets
   * Search dockets with filters and pagination
   *
   * Query parameters:
   * - q: Search query (case reference, lab number)
   * - status: Filter by status (active, archived, missing)
   * - zoneId: Filter by current zone
   * - limit: Results per page (1-100, default 10)
   * - offset: Pagination offset (default 0)
   * - sortBy: Sort field (labNumber, caseReference, createdAt, lastSeenAt)
   * - sortOrder: Sort direction (asc, desc)
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.searchDockets.execute({
        query: req.query.q as string,
        status: req.query.status as string,
        zoneId: req.query.zoneId ? parseInt(req.query.zoneId as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      });

      if (result.isErr()) {
        return next(result.error);
      }

      res.json({
        success: true,
        data: result.value.dockets,
        pagination: {
          total: result.value.total,
          limit: result.value.limit,
          offset: result.value.offset,
          hasMore: result.value.hasMore,
        },
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
   * GET /api/dockets/:labNumber
   * Get detailed information about a specific docket
   *
   * Returns:
   * - Docket details
   * - Current location
   * - Last seen timestamp
   * - Metadata
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getDocketDetails.execute({
        labNumber: req.params.labNumber,
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

  /**
   * GET /api/dockets/:labNumber/history
   * Get location history for a docket
   *
   * Query parameters:
   * - hours: Number of hours to look back (1-168, default 24)
   *
   * Returns:
   * - Array of location history records
   * - Timestamps
   * - Zones visited
   * - RSSI values
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getDocketHistory.execute({
        labNumber: req.params.labNumber,
        hours: req.query.hours ? parseInt(req.query.hours as string) : 24,
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
