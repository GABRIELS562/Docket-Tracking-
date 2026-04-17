import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type {
  ILocationHistoryRepository,
  LocationHistoryEntry,
} from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type {
  GetZoneAnalyticsInput,
  ZoneAnalyticsDTO,
  ZoneTimeSeriesDTO,
  ZoneTopItemDTO,
  ZoneHeatMapDTO,
} from '../../dto/AnalyticsDTO';

/**
 * Get Zone Analytics Use Case
 *
 * Retrieves detailed analytics for a specific zone or all zones:
 * - Zone activity statistics
 * - Time-series data for charts
 * - Top items in the zone
 * - Heat map data (hourly activity patterns)
 */
@injectable()
export class GetZoneAnalyticsUseCase {
  constructor(
    @inject('ILocationHistoryRepository')
    private locationHistoryRepo: ILocationHistoryRepository,
    @inject('IZoneRepository')
    private zoneRepo: IZoneRepository,
    @inject('ILogger')
    private logger: ILogger
  ) {}

  async execute(
    input: GetZoneAnalyticsInput
  ): Promise<Result<ZoneAnalyticsDTO[], Error>> {
    const { tenantId, zoneId, startDate, endDate, granularity } = input;

    this.logger.info('Getting zone analytics', {
      tenantId,
      zoneId: zoneId || 'all',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    });

    try {
      // Get zones to analyze
      let zones: Array<{ id: string; name: string }>;

      if (zoneId) {
        const zoneResult = await this.zoneRepo.findById(zoneId, tenantId);
        if (zoneResult.isErr()) {
          return err(zoneResult.error);
        }
        if (!zoneResult.value) {
          return err(new Error(`Zone not found: ${zoneId}`));
        }
        zones = [{ id: zoneResult.value.getId(), name: zoneResult.value.getName() }];
      } else {
        const zonesResult = await this.zoneRepo.findAllActive(tenantId);
        if (zonesResult.isErr()) {
          return err(zonesResult.error);
        }
        zones = zonesResult.value.map((z) => ({ id: z.getId(), name: z.getName() }));
      }

      // Get analytics for each zone in parallel
      const analyticsPromises = zones.map((zone) =>
        this.getZoneAnalytics(tenantId, zone.id, zone.name, startDate, endDate, granularity)
      );

      const results = await Promise.all(analyticsPromises);

      // Collect successful results
      const analytics: ZoneAnalyticsDTO[] = [];
      for (const result of results) {
        if (result.isOk()) {
          analytics.push(result.value);
        }
      }

      this.logger.info('Zone analytics retrieved', {
        tenantId,
        zonesAnalyzed: analytics.length,
      });

      return ok(analytics);
    } catch (error) {
      this.logger.error('Failed to get zone analytics', {
        tenantId,
        zoneId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        error instanceof Error ? error : new Error('Failed to get zone analytics')
      );
    }
  }

  private async getZoneAnalytics(
    tenantId: string,
    zoneId: string,
    zoneName: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week'
  ): Promise<Result<ZoneAnalyticsDTO, Error>> {
    // Get zone history
    const historyResult = await this.locationHistoryRepo.getHistoryForZone(
      zoneId,
      tenantId,
      startDate,
      endDate,
      1000 // Limit for analysis
    );

    if (historyResult.isErr()) {
      return err(historyResult.error);
    }

    const history = historyResult.value;

    // Calculate statistics
    const uniqueItems = new Set(history.map((h) => h.itemId));
    const totalReads = history.length;

    // Calculate time series
    const timeSeries = this.calculateTimeSeries(history, granularity);

    // Calculate top items
    const topItems = this.calculateTopItems(history);

    // Calculate heat map
    const heatMap = this.calculateHeatMap(history);

    // Calculate average dwell time (simplified)
    const avgDwellTimeMinutes = this.calculateAvgDwellTime(history);

    // Calculate peak and average occupancy
    const { peakOccupancy, avgOccupancy } = this.calculateOccupancyStats(timeSeries);

    return ok({
      zoneId,
      zoneName,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      statistics: {
        totalReads,
        uniqueItems: uniqueItems.size,
        avgDwellTimeMinutes,
        peakOccupancy,
        avgOccupancy,
      },
      timeSeries,
      topItems,
      heatMap,
    });
  }

  private calculateTimeSeries(
    history: LocationHistoryEntry[],
    granularity: 'hour' | 'day' | 'week'
  ): ZoneTimeSeriesDTO[] {
    const buckets = new Map<
      string,
      { readCount: number; items: Set<string>; rssiSum: number; rssiCount: number }
    >();

    for (const entry of history) {
      const bucketKey = this.getBucketKey(entry.time, granularity);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          readCount: 0,
          items: new Set(),
          rssiSum: 0,
          rssiCount: 0,
        });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.readCount++;
      bucket.items.add(entry.itemId);
      if (entry.rssi) {
        bucket.rssiSum += entry.rssi;
        bucket.rssiCount++;
      }
    }

    const timeSeries: ZoneTimeSeriesDTO[] = [];
    for (const [timestamp, data] of buckets) {
      timeSeries.push({
        timestamp,
        readCount: data.readCount,
        uniqueItems: data.items.size,
        avgRssi: data.rssiCount > 0 ? Math.round(data.rssiSum / data.rssiCount) : 0,
        occupancy: data.items.size,
      });
    }

    return timeSeries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private getBucketKey(date: Date, granularity: 'hour' | 'day' | 'week'): string {
    const d = new Date(date);

    switch (granularity) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        d.setHours(0, 0, 0, 0);
        break;
    }

    return d.toISOString();
  }

  private calculateTopItems(history: LocationHistoryEntry[]): ZoneTopItemDTO[] {
    const itemStats = new Map<
      string,
      { itemNumber: string; readCount: number; firstSeen: Date; lastSeen: Date }
    >();

    for (const entry of history) {
      if (!itemStats.has(entry.itemId)) {
        itemStats.set(entry.itemId, {
          itemNumber: entry.itemNumber,
          readCount: 0,
          firstSeen: entry.time,
          lastSeen: entry.time,
        });
      }

      const stats = itemStats.get(entry.itemId)!;
      stats.readCount++;
      if (entry.time < stats.firstSeen) stats.firstSeen = entry.time;
      if (entry.time > stats.lastSeen) stats.lastSeen = entry.time;
    }

    const topItems: ZoneTopItemDTO[] = [];
    for (const [itemId, stats] of itemStats) {
      const dwellTime = Math.round(
        (stats.lastSeen.getTime() - stats.firstSeen.getTime()) / 60000
      );
      topItems.push({
        itemId,
        itemNumber: stats.itemNumber,
        readCount: stats.readCount,
        totalDwellTimeMinutes: dwellTime,
        lastSeen: stats.lastSeen.toISOString(),
      });
    }

    // Sort by read count descending and take top 10
    return topItems.sort((a, b) => b.readCount - a.readCount).slice(0, 10);
  }

  private calculateHeatMap(history: LocationHistoryEntry[]): ZoneHeatMapDTO[] {
    const heatMap = new Map<string, { readCount: number }>();

    // Initialize all day/hour combinations
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatMap.set(`${day}-${hour}`, { readCount: 0 });
      }
    }

    // Count reads per day/hour
    for (const entry of history) {
      const dayOfWeek = entry.time.getDay();
      const hour = entry.time.getHours();
      const key = `${dayOfWeek}-${hour}`;
      const data = heatMap.get(key)!;
      data.readCount++;
    }

    // Calculate max for intensity normalization
    const maxReads = Math.max(...Array.from(heatMap.values()).map((v) => v.readCount));

    const result: ZoneHeatMapDTO[] = [];
    for (const [key, data] of heatMap) {
      const parts = key.split('-').map(Number);
      const day = parts[0] ?? 0;
      const hour = parts[1] ?? 0;
      result.push({
        dayOfWeek: day,
        hour: hour,
        readCount: data.readCount,
        intensity: maxReads > 0 ? data.readCount / maxReads : 0,
      });
    }

    return result;
  }

  private calculateAvgDwellTime(history: LocationHistoryEntry[]): number {
    const itemVisits = new Map<string, { firstSeen: Date; lastSeen: Date }>();

    for (const entry of history) {
      if (!itemVisits.has(entry.itemId)) {
        itemVisits.set(entry.itemId, {
          firstSeen: entry.time,
          lastSeen: entry.time,
        });
      }

      const visit = itemVisits.get(entry.itemId)!;
      if (entry.time < visit.firstSeen) visit.firstSeen = entry.time;
      if (entry.time > visit.lastSeen) visit.lastSeen = entry.time;
    }

    if (itemVisits.size === 0) return 0;

    let totalDwellTime = 0;
    for (const visit of itemVisits.values()) {
      totalDwellTime += visit.lastSeen.getTime() - visit.firstSeen.getTime();
    }

    return Math.round(totalDwellTime / itemVisits.size / 60000); // Convert to minutes
  }

  private calculateOccupancyStats(
    timeSeries: ZoneTimeSeriesDTO[]
  ): { peakOccupancy: number; avgOccupancy: number } {
    if (timeSeries.length === 0) {
      return { peakOccupancy: 0, avgOccupancy: 0 };
    }

    const occupancies = timeSeries.map((t) => t.occupancy);
    const peakOccupancy = Math.max(...occupancies);
    const avgOccupancy = Math.round(
      occupancies.reduce((sum, o) => sum + o, 0) / occupancies.length
    );

    return { peakOccupancy, avgOccupancy };
  }
}
