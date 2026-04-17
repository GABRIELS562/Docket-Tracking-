import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { IReaderRepository } from '../../../domain/repositories/IReaderRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type {
  GetSystemMetricsInput,
  SystemMetricsDTO,
  SystemMetricsTimeSeriesDTO,
} from '../../dto/AnalyticsDTO';

/**
 * Get System Metrics Use Case
 *
 * Retrieves system-wide performance metrics:
 * - Current system status
 * - Historical metrics time series
 * - Resource usage statistics
 */
@injectable()
export class GetSystemMetricsUseCase {
  constructor(
    @inject('ILocationHistoryRepository')
    private locationHistoryRepo: ILocationHistoryRepository,
    @inject('IItemRepository')
    private itemRepo: IItemRepository,
    @inject('IZoneRepository')
    private zoneRepo: IZoneRepository,
    @inject('IReaderRepository')
    private readerRepo: IReaderRepository,
    @inject('ILogger')
    private logger: ILogger
  ) {}

  async execute(
    input: GetSystemMetricsInput
  ): Promise<Result<SystemMetricsDTO, Error>> {
    const { tenantId, hours, granularity } = input;

    this.logger.info('Getting system metrics', {
      tenantId,
      hours,
      granularity,
    });

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

      // Execute queries in parallel
      const [
        currentStatusResult,
        historyResult,
        storageStatsResult,
      ] = await Promise.all([
        this.getCurrentStatus(tenantId),
        this.getHistoricalMetrics(tenantId, startDate, endDate, granularity),
        this.locationHistoryRepo.getStorageStats(tenantId),
      ]);

      if (currentStatusResult.isErr()) {
        return err(currentStatusResult.error);
      }

      const current = currentStatusResult.value;
      const history = historyResult.isOk() ? historyResult.value : [];
      const storageStats = storageStatsResult.isOk() ? storageStatsResult.value : null;

      // Convert table size from bytes to MB
      const tableSizeMb = storageStats
        ? Math.round(storageStats.tableSizeBytes / (1024 * 1024) * 100) / 100
        : 0;

      const metrics: SystemMetricsDTO = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        current: {
          totalItems: current.totalItems,
          activeReaders: current.activeReaders,
          activeZones: current.activeZones,
          readsPerMinute: current.readsPerMinute,
          avgLatencyMs: current.avgLatencyMs,
        },
        history,
        resources: {
          databaseSizeMb: tableSizeMb,
          compressionRatio: storageStats?.compressionRatio || 0,
          queryAvgMs: current.avgLatencyMs,
          cacheHitRate: 0.85, // Placeholder - would need actual cache metrics
        },
      };

      this.logger.info('System metrics retrieved', {
        tenantId,
        totalItems: current.totalItems,
        readsPerMinute: current.readsPerMinute,
      });

      return ok(metrics);
    } catch (error) {
      this.logger.error('Failed to get system metrics', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        error instanceof Error ? error : new Error('Failed to get system metrics')
      );
    }
  }

  private async getCurrentStatus(
    tenantId: string
  ): Promise<Result<CurrentStatus, Error>> {
    // Get counts in parallel
    const [itemsResult, zonesResult, readersResult, recentReadsResult] =
      await Promise.all([
        this.itemRepo.countActive(tenantId),
        this.zoneRepo.findAllActive(tenantId),
        this.readerRepo.findAllActive(tenantId),
        this.getRecentReadsPerMinute(tenantId),
      ]);

    const totalItems = itemsResult.isOk() ? itemsResult.value : 0;
    const activeZones = zonesResult.isOk() ? zonesResult.value.length : 0;
    const activeReaders = readersResult.isOk() ? readersResult.value.length : 0;
    const readsPerMinute = recentReadsResult.isOk() ? recentReadsResult.value : 0;

    return ok({
      totalItems,
      activeZones,
      activeReaders,
      readsPerMinute,
      avgLatencyMs: 15, // Placeholder - would need actual latency tracking
    });
  }

  private async getRecentReadsPerMinute(
    tenantId: string
  ): Promise<Result<number, Error>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 5 * 60 * 1000); // Last 5 minutes

    // Get analytics for recent period
    const analyticsResult = await this.locationHistoryRepo.getAnalytics({
      tenantId,
      startTime: startDate,
      endTime: endDate,
      bucketSize: '1 minute',
    });

    if (analyticsResult.isErr()) {
      return ok(0);
    }

    // Sum up all reads
    const totalReads = analyticsResult.value.reduce(
      (sum, bucket) => sum + bucket.totalReads,
      0
    );
    const minutes = 5;
    return ok(Math.round(totalReads / minutes));
  }

  private async getHistoricalMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'minute' | 'hour'
  ): Promise<Result<SystemMetricsTimeSeriesDTO[], Error>> {
    const bucketSize = granularity === 'minute' ? '1 minute' : '1 hour';

    const analyticsResult = await this.locationHistoryRepo.getAnalytics({
      tenantId,
      startTime: startDate,
      endTime: endDate,
      bucketSize,
    });

    if (analyticsResult.isErr()) {
      return err(analyticsResult.error);
    }

    const analytics = analyticsResult.value;

    const timeSeries: SystemMetricsTimeSeriesDTO[] = analytics.map((bucket) => ({
      timestamp: bucket.timeBucket.toISOString(),
      totalReads: bucket.totalReads,
      activeItems: bucket.uniqueItems,
      activeZones: bucket.activeZones,
      activeReaders: 0, // ReadStatistics doesn't include activeReaders
      avgConfidence: Math.max(0, Math.min(1, (bucket.averageRssi + 100) / 100)),
    }));

    return ok(timeSeries);
  }
}

interface CurrentStatus {
  totalItems: number;
  activeZones: number;
  activeReaders: number;
  readsPerMinute: number;
  avgLatencyMs: number;
}
