import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { RegisterItemUseCase } from '../../../application/use-cases/items/RegisterItemUseCase';
import { SearchItemsUseCase } from '../../../application/use-cases/items/SearchItemsUseCase';
import { GetItemDetailsUseCase } from '../../../application/use-cases/items/GetItemDetailsUseCase';
import { GetItemHistoryUseCase } from '../../../application/use-cases/items/GetItemHistoryUseCase';
import { GetZoneItemsUseCase } from '../../../application/use-cases/items/GetZoneItemsUseCase';
import { ILogger } from '../../../application/interfaces/ILogger';

/**
 * Item Controller
 *
 * Handles all item-related HTTP requests.
 * This is the generic controller replacing DocketController.
 *
 * Endpoints:
 * - POST   /api/items              - Register new item
 * - GET    /api/items              - Search items
 * - GET    /api/items/:itemNumber  - Get item details
 * - GET    /api/items/:itemNumber/history - Get location history
 * - GET    /api/zones/:zoneId/items - Get items in zone
 */
@injectable()
export class ItemController {
  constructor(
    @inject(RegisterItemUseCase) private registerItem: RegisterItemUseCase,
    @inject(SearchItemsUseCase) private searchItems: SearchItemsUseCase,
    @inject(GetItemDetailsUseCase) private getItemDetails: GetItemDetailsUseCase,
    @inject(GetItemHistoryUseCase) private getItemHistory: GetItemHistoryUseCase,
    @inject(GetZoneItemsUseCase) private getZoneItems: GetZoneItemsUseCase,
    @inject('ILogger') private logger: ILogger
  ) {}

  /**
   * POST /api/items
   * Register a new item
   *
   * Request body:
   * ```json
   * {
   *   "itemNumber": "INV-2025-000001",
   *   "referenceId": "PO-2025-12345",
   *   "rfidEpc": "E280116060002004DECA48DA",
   *   "description": "Dell Laptop Computer",
   *   "category": "electronic",
   *   "serialNumber": "SN123456",
   *   "receivedBy": "John Smith",
   *   "metadata": { "department": "IT" }
   * }
   * ```
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.registerItem.execute(req.body);

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
   * GET /api/items
   * Search items with filters and pagination
   *
   * Query parameters:
   * - q: Search query (item number, reference ID, serial number, description)
   * - status: Filter by status (registered, in_transit, in_processing, archived, disposed, missing)
   * - zoneId: Filter by current zone
   * - category: Filter by category
   * - limit: Results per page (1-100, default 10)
   * - offset: Pagination offset (default 0)
   * - sortBy: Sort field (itemNumber, referenceId, createdAt, lastSeenAt)
   * - sortOrder: Sort direction (asc, desc)
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.searchItems.execute({
        query: req.query.q as string,
        status: req.query.status as any,
        zoneId: req.query.zoneId as string,
        category: req.query.category as string,
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
        data: result.value.items,
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
   * GET /api/items/:itemNumber
   * Get detailed information about a specific item
   *
   * Returns:
   * - Item details
   * - Current location
   * - Last seen timestamp
   * - Metadata
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getItemDetails.execute({
        itemNumber: req.params.itemNumber,
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
   * GET /api/items/:itemNumber/history
   * Get location history for an item
   *
   * Query parameters:
   * - hours: Number of hours to look back (1-168, default 24)
   * - limit: Maximum number of records (1-1000, default 100)
   * - startTime: Start of custom time range (ISO 8601)
   * - endTime: End of custom time range (ISO 8601)
   *
   * Returns:
   * - Array of location history records
   * - Timestamps
   * - Zones visited
   * - RSSI values
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getItemHistory.execute({
        itemNumber: req.params.itemNumber,
        hours: req.query.hours ? parseInt(req.query.hours as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
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
   * GET /api/zones/:zoneId/items
   * Get all items currently in a specific zone
   *
   * Query parameters:
   * - limit: Maximum number of items (1-200, default 50)
   * - recentOnly: Only return recently seen items (default false)
   *
   * Returns:
   * - Zone information
   * - Array of items in zone
   * - Occupancy metrics
   */
  async getZoneItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getZoneItems.execute({
        zoneId: req.params.zoneId,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
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
