import { Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';

import { GetAllReadersUseCase } from '../../../application/use-cases/readers/GetAllReadersUseCase';

import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Reader Controller
 *
 * Handles RFID reader-related HTTP requests
 *
 * Endpoints:
 * - GET /api/readers - Get all readers with status
 */
@injectable()
export class ReaderController {
  constructor(@inject(GetAllReadersUseCase) private getAllReaders: GetAllReadersUseCase) {}

  /**
   * GET /api/readers
   * Get all RFID readers with current status
   *
   * Query parameters:
   * - activeOnly: Only return active readers (default false)
   * - onlineOnly: Only return online readers (default false)
   *
   * Returns:
   * - Reader ID and name
   * - IP address and zone assignment
   * - Status (online, offline, error, connecting)
   * - Last seen timestamp
   * - Configuration
   * - Error message (if applicable)
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

      const result = await this.getAllReaders.execute({
        tenantId: req.tenantId,
        activeOnly: req.query.activeOnly === 'true',
        onlineOnly: req.query.onlineOnly === 'true',
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
