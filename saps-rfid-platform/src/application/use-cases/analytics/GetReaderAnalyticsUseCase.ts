import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import type {
  ILocationHistoryRepository,
  LocationHistoryEntry,
} from '../../../domain/repositories/ILocationHistoryRepository';
import type { IReaderRepository } from '../../../domain/repositories/IReaderRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type {
  GetReaderAnalyticsInput,
  ReaderAnalyticsDTO,
  AntennaStatsDTO,
  ReaderTimeSeriesDTO,
} from '../../dto/AnalyticsDTO';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Get Reader Analytics Use Case
 *
 * Retrieves detailed performance analytics for RFID readers:
 * - Read statistics and performance metrics
 * - Antenna-level breakdown
 * - Time-series performance data
 * - Health status and issues
 */
@injectable()
export class GetReaderAnalyticsUseCase {
  constructor(
    @inject('ILocationHistoryRepository')
    private locationHistoryRepo: ILocationHistoryRepository,
    @inject('IReaderRepository')
    private readerRepo: IReaderRepository,
    @inject('IZoneRepository')
    private zoneRepo: IZoneRepository,
    @inject('ILogger')
    private logger: ILogger
  ) {}

  async execute(input: GetReaderAnalyticsInput): Promise<Result<ReaderAnalyticsDTO[], Error>> {
    const { tenantId, readerId, startDate, endDate, granularity } = input;

    this.logger.info('Getting reader analytics', {
      tenantId,
      readerId: readerId || 'all',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    });

    try {
      // Get readers to analyze
      let readers: Array<{ id: string; name: string; zoneId: string; zoneName: string }>;

      if (readerId) {
        const readerResult = await this.readerRepo.findById(readerId, tenantId);
        if (readerResult.isErr()) {
          return err(readerResult.error);
        }
        if (!readerResult.value) {
          return err(new Error(`Reader not found: ${readerId}`));
        }
        const reader = readerResult.value;
        const zoneName = await this.getZoneName(reader.getZoneId(), tenantId);
        readers = [
          {
            id: reader.getId(),
            name: reader.getName(),
            zoneId: reader.getZoneId() || '',
            zoneName,
          },
        ];
      } else {
        const readersResult = await this.readerRepo.findAll(tenantId);
        if (readersResult.isErr()) {
          return err(readersResult.error);
        }
        readers = await Promise.all(
          readersResult.value.map(async (r) => {
            const zoneName = await this.getZoneName(r.getZoneId(), tenantId);
            return {
              id: r.getId(),
              name: r.getName(),
              zoneId: r.getZoneId() || '',
              zoneName,
            };
          })
        );
      }

      // Get analytics for each reader in parallel
      const analyticsPromises = readers.map((reader) =>
        this.getReaderAnalytics(
          tenantId,
          reader.id,
          reader.name,
          reader.zoneId,
          reader.zoneName,
          startDate,
          endDate,
          granularity
        )
      );

      const results = await Promise.all(analyticsPromises);

      // Collect successful results
      const analytics: ReaderAnalyticsDTO[] = [];
      for (const result of results) {
        if (result.isOk()) {
          analytics.push(result.value);
        }
      }

      this.logger.info('Reader analytics retrieved', {
        tenantId,
        readersAnalyzed: analytics.length,
      });

      return ok(analytics);
    } catch (error) {
      this.logger.error('Failed to get reader analytics', {
        tenantId,
        readerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(error instanceof Error ? error : new Error('Failed to get reader analytics'));
    }
  }

  private async getZoneName(zoneId: string, tenantId: string): Promise<string> {
    if (!zoneId) return 'Unknown';
    const zoneResult = await this.zoneRepo.findById(zoneId, tenantId);
    if (zoneResult.isOk() && zoneResult.value) {
      return zoneResult.value.getName();
    }
    return 'Unknown';
  }

  private async getReaderAnalytics(
    tenantId: string,
    readerId: string,
    readerName: string,
    zoneId: string,
    zoneName: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day'
  ): Promise<Result<ReaderAnalyticsDTO, Error>> {
    // Query location history for this reader using zone history
    // We'll filter by reader from the results
    const historyResult = await this.locationHistoryRepo.getHistoryForZone(
      zoneId,
      tenantId,
      startDate,
      endDate,
      10000
    );

    // Filter by readerId if we got results
    let history: LocationHistoryEntry[] = [];
    if (historyResult.isOk()) {
      history = historyResult.value.filter((h) => h.readerId === readerId);
    }

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(history);

    // Calculate antenna stats
    const antennaStats = this.calculateAntennaStats(history);

    // Calculate time series
    const timeSeries = this.calculateTimeSeries(history, granularity);

    // Determine health status
    const health = this.determineHealthStatus(history, performance, startDate, endDate);

    return ok({
      readerId,
      readerName,
      zoneId,
      zoneName,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      performance,
      antennaStats,
      timeSeries,
      health,
    });
  }

  private calculatePerformanceMetrics(
    history: LocationHistoryEntry[]
  ): ReaderAnalyticsDTO['performance'] {
    const uniqueTags = new Set(history.map((h) => h.rfidEpc));
    const rssiValues = history.filter((h) => h.rssi != null).map((h) => h.rssi);
    const lowConfidenceReads = history.filter(
      (h) => h.locationConfidence != null && h.locationConfidence < 0.7
    ).length;

    return {
      totalReads: history.length,
      uniqueTags: uniqueTags.size,
      avgRssi:
        rssiValues.length > 0
          ? Math.round(rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length)
          : 0,
      minRssi: rssiValues.length > 0 ? Math.min(...rssiValues) : 0,
      maxRssi: rssiValues.length > 0 ? Math.max(...rssiValues) : 0,
      lowConfidenceReads,
      errorRate: history.length > 0 ? Math.round((lowConfidenceReads / history.length) * 100) : 0,
    };
  }

  private calculateAntennaStats(history: LocationHistoryEntry[]): AntennaStatsDTO[] {
    const antennaMap = new Map<
      number,
      { readCount: number; tags: Set<string>; rssiSum: number; rssiCount: number }
    >();

    for (const entry of history) {
      const port = entry.antennaPort || 1;

      if (!antennaMap.has(port)) {
        antennaMap.set(port, {
          readCount: 0,
          tags: new Set(),
          rssiSum: 0,
          rssiCount: 0,
        });
      }

      const stats = antennaMap.get(port)!;
      stats.readCount++;
      stats.tags.add(entry.rfidEpc);
      if (entry.rssi != null) {
        stats.rssiSum += entry.rssi;
        stats.rssiCount++;
      }
    }

    const result: AntennaStatsDTO[] = [];
    for (const [port, stats] of antennaMap) {
      result.push({
        antennaPort: port,
        readCount: stats.readCount,
        uniqueTags: stats.tags.size,
        avgRssi: stats.rssiCount > 0 ? Math.round(stats.rssiSum / stats.rssiCount) : 0,
      });
    }

    return result.sort((a, b) => a.antennaPort - b.antennaPort);
  }

  private calculateTimeSeries(
    history: LocationHistoryEntry[],
    granularity: 'hour' | 'day'
  ): ReaderTimeSeriesDTO[] {
    const buckets = new Map<
      string,
      {
        readCount: number;
        tags: Set<string>;
        rssiSum: number;
        rssiCount: number;
        errorCount: number;
      }
    >();

    for (const entry of history) {
      const bucketKey = this.getBucketKey(entry.time, granularity);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          readCount: 0,
          tags: new Set(),
          rssiSum: 0,
          rssiCount: 0,
          errorCount: 0,
        });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.readCount++;
      bucket.tags.add(entry.rfidEpc);
      if (entry.rssi != null) {
        bucket.rssiSum += entry.rssi;
        bucket.rssiCount++;
      }
      if (entry.locationConfidence != null && entry.locationConfidence < 0.7) {
        bucket.errorCount++;
      }
    }

    const timeSeries: ReaderTimeSeriesDTO[] = [];
    for (const [timestamp, data] of buckets) {
      timeSeries.push({
        timestamp,
        readCount: data.readCount,
        uniqueTags: data.tags.size,
        avgRssi: data.rssiCount > 0 ? Math.round(data.rssiSum / data.rssiCount) : 0,
        errorCount: data.errorCount,
      });
    }

    return timeSeries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private getBucketKey(date: Date, granularity: 'hour' | 'day'): string {
    const d = new Date(date);

    switch (granularity) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
    }

    return d.toISOString();
  }

  private determineHealthStatus(
    history: LocationHistoryEntry[],
    performance: ReaderAnalyticsDTO['performance'],
    startDate: Date,
    endDate: Date
  ): ReaderAnalyticsDTO['health'] {
    const issues: string[] = [];

    // Check for high error rate
    if (performance.errorRate > 20) {
      issues.push(`High error rate: ${performance.errorRate}%`);
    }

    // Check for weak signal
    if (performance.avgRssi < -70) {
      issues.push(`Weak average signal: ${performance.avgRssi} dBm`);
    }

    // Check for no recent reads
    const lastRead =
      history.length > 0
        ? history.reduce((latest, h) => (h.time > latest.time ? h : latest)).time
        : null;

    const timeSinceLastRead = lastRead ? Date.now() - lastRead.getTime() : Infinity;

    if (timeSinceLastRead > 30 * 60 * 1000) {
      issues.push('No reads in the last 30 minutes');
    }

    // Calculate uptime (simplified: percentage of time buckets with activity)
    const totalHours = (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000);
    const activeHours = new Set(
      history.map((h) => {
        const d = new Date(h.time);
        d.setMinutes(0, 0, 0);
        return d.toISOString();
      })
    ).size;
    const uptime = totalHours > 0 ? Math.round((activeHours / totalHours) * 100) : 0;

    // Determine status
    let status: 'healthy' | 'degraded' | 'offline';
    if (timeSinceLastRead > 60 * 60 * 1000) {
      status = 'offline';
    } else if (issues.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      uptime,
      lastSeen: lastRead?.toISOString() || 'Never',
      issues,
    };
  }
}
