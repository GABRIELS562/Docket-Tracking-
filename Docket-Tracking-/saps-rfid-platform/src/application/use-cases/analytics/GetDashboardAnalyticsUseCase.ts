import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { IReaderRepository } from '../../../domain/repositories/IReaderRepository';
import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type {
  DashboardMetricsDTO,
  ZoneOccupancyDTO,
  ReaderHealthSummaryDTO,
  ActivityTimelineDTO,
} from '../../dto/AnalyticsDTO';
import { ReaderStatus } from '../../../domain/entities/Reader';

/**
 * Input for dashboard analytics
 */
export interface GetDashboardInput {
  readonly tenantId: string;
  readonly hours?: number;
}

/**
 * Get Dashboard Analytics Use Case
 *
 * Retrieves comprehensive dashboard metrics including:
 * - Overall system statistics
 * - Zone occupancy overview
 * - Reader health summary
 * - Recent activity timeline
 * - Comparison with previous period
 */
@injectable()
export class GetDashboardAnalyticsUseCase {
  constructor(
    @inject('ILocationHistoryRepository')
    private locationHistoryRepo: ILocationHistoryRepository,
    @inject('IZoneRepository')
    private zoneRepo: IZoneRepository,
    @inject('IReaderRepository')
    private readerRepo: IReaderRepository,
    @inject('IItemRepository')
    private itemRepo: IItemRepository,
    @inject('ILogger')
    private logger: ILogger
  ) {}

  async execute(
    input: GetDashboardInput
  ): Promise<Result<DashboardMetricsDTO, Error>> {
    const { tenantId, hours = 24 } = input;

    this.logger.info('Getting dashboard analytics', { tenantId, hours });

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
      const previousStartDate = new Date(startDate.getTime() - hours * 60 * 60 * 1000);

      // Execute all queries in parallel for performance
      const [
        currentPeriodResult,
        previousPeriodResult,
        zoneOccupancyResult,
        readerHealthResult,
        recentActivityResult,
      ] = await Promise.all([
        this.getCurrentPeriodStats(tenantId, startDate, endDate),
        this.getPreviousPeriodStats(tenantId, previousStartDate, startDate),
        this.getZoneOccupancy(tenantId),
        this.getReaderHealth(tenantId),
        this.getRecentActivity(tenantId, 20),
      ]);

      if (currentPeriodResult.isErr()) {
        return err(currentPeriodResult.error);
      }

      const currentStats = currentPeriodResult.value;
      const previousStats = previousPeriodResult.isOk() ? previousPeriodResult.value : null;

      // Calculate comparison percentages
      const comparison = this.calculateComparison(currentStats, previousStats);

      const dashboard: DashboardMetricsDTO = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          hours,
        },
        summary: {
          totalReads: currentStats.totalReads,
          uniqueItems: currentStats.uniqueItems,
          activeZones: currentStats.activeZones,
          activeReaders: currentStats.activeReaders,
          avgConfidence: currentStats.avgConfidence,
        },
        comparison,
        zoneOccupancy: zoneOccupancyResult.isOk() ? zoneOccupancyResult.value : [],
        readerHealth: readerHealthResult.isOk()
          ? readerHealthResult.value
          : { total: 0, online: 0, offline: 0, degraded: 0, avgReadRate: 0 },
        recentActivity: recentActivityResult.isOk() ? recentActivityResult.value : [],
      };

      this.logger.info('Dashboard analytics retrieved', {
        tenantId,
        totalReads: dashboard.summary.totalReads,
        activeZones: dashboard.summary.activeZones,
      });

      return ok(dashboard);
    } catch (error) {
      this.logger.error('Failed to get dashboard analytics', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        error instanceof Error ? error : new Error('Failed to get dashboard analytics')
      );
    }
  }

  private async getCurrentPeriodStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<PeriodStats, Error>> {
    const analyticsResult = await this.locationHistoryRepo.getAnalytics({
      tenantId,
      startTime: startDate,
      endTime: endDate,
      bucketSize: '1 hour',
    });

    if (analyticsResult.isErr()) {
      return err(analyticsResult.error);
    }

    const analytics = analyticsResult.value;

    // Aggregate the hourly data
    let totalReads = 0;
    let totalRssi = 0;
    let rssiCount = 0;

    for (const bucket of analytics) {
      totalReads += bucket.totalReads;
      if (bucket.averageRssi) {
        totalRssi += bucket.averageRssi * bucket.totalReads;
        rssiCount += bucket.totalReads;
      }
    }

    // Get unique counts from repository
    const [zonesResult, readersResult, itemsResult] = await Promise.all([
      this.zoneRepo.findAllActive(tenantId),
      this.readerRepo.findAllActive(tenantId),
      this.itemRepo.countActive(tenantId),
    ]);

    // Calculate average confidence from RSSI (simple approximation)
    // RSSI typically ranges from -100 to 0, we map this to 0-1 confidence
    const avgRssi = rssiCount > 0 ? totalRssi / rssiCount : -60;
    const avgConfidence = Math.max(0, Math.min(1, (avgRssi + 100) / 100));

    return ok({
      totalReads,
      uniqueItems: itemsResult.isOk() ? itemsResult.value : 0,
      activeZones: zonesResult.isOk() ? zonesResult.value.length : 0,
      activeReaders: readersResult.isOk() ? readersResult.value.length : 0,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    });
  }

  private async getPreviousPeriodStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<PeriodStats, Error>> {
    return this.getCurrentPeriodStats(tenantId, startDate, endDate);
  }

  private calculateComparison(
    current: PeriodStats,
    previous: PeriodStats | null
  ): DashboardMetricsDTO['comparison'] {
    if (!previous) {
      return {
        readsChange: 0,
        itemsChange: 0,
        zonesChange: 0,
        readersChange: 0,
      };
    }

    const calcChange = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      readsChange: calcChange(current.totalReads, previous.totalReads),
      itemsChange: calcChange(current.uniqueItems, previous.uniqueItems),
      zonesChange: calcChange(current.activeZones, previous.activeZones),
      readersChange: calcChange(current.activeReaders, previous.activeReaders),
    };
  }

  private async getZoneOccupancy(
    tenantId: string
  ): Promise<Result<ZoneOccupancyDTO[], Error>> {
    const zonesResult = await this.zoneRepo.getAllOccupancyInfo(tenantId);

    if (zonesResult.isErr()) {
      return err(zonesResult.error);
    }

    const occupancy: ZoneOccupancyDTO[] = zonesResult.value.map((zone) => ({
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      currentItems: zone.currentOccupancy,
      capacity: zone.capacity,
      occupancyPercentage: zone.occupancyPercentage,
      status: zone.occupancyStatus,
      lastActivity: new Date().toISOString(),
    }));

    return ok(occupancy);
  }

  private async getReaderHealth(
    tenantId: string
  ): Promise<Result<ReaderHealthSummaryDTO, Error>> {
    const readersResult = await this.readerRepo.findAll(tenantId);

    if (readersResult.isErr()) {
      return err(readersResult.error);
    }

    const readers = readersResult.value;
    let online = 0;
    let offline = 0;
    let degraded = 0;

    for (const reader of readers) {
      const status = reader.getStatus();
      if (status === ReaderStatus.ONLINE) online++;
      else if (status === ReaderStatus.OFFLINE) offline++;
      else degraded++;
    }

    // Calculate average read rate from metrics
    const readCountResult = await this.locationHistoryRepo.getReadCountByReader(
      tenantId,
      new Date(Date.now() - 60 * 60 * 1000), // Last hour
      new Date()
    );

    let avgReadRate = 0;
    if (readCountResult.isOk()) {
      const readerCounts = readCountResult.value;
      let totalReads = 0;
      for (const count of readerCounts.values()) {
        totalReads += count;
      }
      avgReadRate = Math.round(totalReads / 60); // Reads per minute
    }

    return ok({
      total: readers.length,
      online,
      offline,
      degraded,
      avgReadRate,
    });
  }

  private async getRecentActivity(
    tenantId: string,
    limit: number
  ): Promise<Result<ActivityTimelineDTO[], Error>> {
    // Get recent reads from location history for a recent zone
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // Last hour

    // Get all zones and fetch history from the first few
    const zonesResult = await this.zoneRepo.findAllActive(tenantId);
    if (zonesResult.isErr()) {
      return ok([]);
    }

    const zones = zonesResult.value.slice(0, 5); // Get up to 5 zones
    const activities: ActivityTimelineDTO[] = [];

    for (const zone of zones) {
      const historyResult = await this.locationHistoryRepo.getHistoryForZone(
        zone.getId(),
        tenantId,
        startDate,
        endDate,
        Math.ceil(limit / zones.length)
      );

      if (historyResult.isOk()) {
        for (const entry of historyResult.value) {
          activities.push({
            timestamp: entry.time.toISOString(),
            eventType: entry.eventType as ActivityTimelineDTO['eventType'],
            itemNumber: entry.itemNumber,
            zoneName: entry.zoneName || 'Unknown',
            readerName: entry.readerName || 'Unknown',
          });
        }
      }
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return ok(activities.slice(0, limit));
  }
}

interface PeriodStats {
  totalReads: number;
  uniqueItems: number;
  activeZones: number;
  activeReaders: number;
  avgConfidence: number;
}
