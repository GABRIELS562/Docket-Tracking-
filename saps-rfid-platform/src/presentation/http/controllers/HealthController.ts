import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';

import { PostgresConnection } from '../../../infrastructure/database/PostgresConnection';
import { LLRPGateway } from '../../../infrastructure/rfid/LLRPGateway';

/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring and load balancers
 *
 * Endpoints:
 * - GET /health          - Simple health check
 * - GET /health/detailed - Detailed health with dependencies
 */
@injectable()
export class HealthController {
  constructor(
    @inject(PostgresConnection) private db: PostgresConnection,
    @inject(LLRPGateway) private rfidGateway: LLRPGateway
  ) {}

  /**
   * GET /health
   * Simple health check - always returns 200 if server is running
   *
   * Use for: Load balancer health checks
   *
   * Returns:
   * - status: "healthy"
   * - timestamp: Current ISO timestamp
   * - uptime: Process uptime in seconds
   */
  async check(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * GET /health/detailed
   * Detailed health check with all dependencies
   *
   * Checks:
   * - Database connectivity and performance
   * - RFID gateway status
   * - Memory usage
   *
   * Returns HTTP 503 if any critical service is unhealthy
   *
   * Use for: Monitoring dashboards, alerting
   */
  async detailed(_req: Request, res: Response): Promise<void> {
    // Check database
    const dbHealthResult = await this.db.healthCheck();
    const dbHealth = dbHealthResult.isOk() ? 'healthy' : 'unhealthy';

    // Check RFID gateway
    const rfidStatus = this.rfidGateway.getStats();

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryHealthy = memoryPercentage < 90; // Warning at 90% usage

    // Overall status - all critical services must be healthy
    const isHealthy = dbHealth === 'healthy' && memoryHealthy;

    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: dbHealth,
          stats: this.db.getStats(),
        },
        rfid: {
          status: rfidStatus.isRunning ? 'healthy' : 'stopped',
          readers: {
            total: rfidStatus.totalReaders,
            connected: rfidStatus.connectedReaders,
            disconnected: rfidStatus.disconnectedReaders,
            errors: rfidStatus.readersWithErrors,
          },
          metrics: {
            tagsProcessed: rfidStatus.tagsProcessed,
            errors: rfidStatus.errors,
            uptime: rfidStatus.uptime,
          },
        },
        memory: {
          status: memoryHealthy ? 'healthy' : 'warning',
          usage: {
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            percentage: `${Math.round(memoryPercentage)}%`,
          },
        },
      },
    });
  }
}
