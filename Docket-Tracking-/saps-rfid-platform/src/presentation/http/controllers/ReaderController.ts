import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllReadersUseCase } from '../../../application/use-cases/readers/GetAllReadersUseCase';
import { ILogger } from '../../../application/interfaces/ILogger';

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
  constructor(
    @inject(GetAllReadersUseCase) private getAllReaders: GetAllReadersUseCase,
    @inject('ILogger') private logger: ILogger
  ) {}

  /**
   * GET /api/readers
   * Get all RFID readers with current status
   *
   * Returns:
   * - Reader ID and name
   * - IP address and zone assignment
   * - Status (online, offline, error, connecting)
   * - Last seen timestamp
   * - Configuration
   * - Error message (if applicable)
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getAllReaders.execute();

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
