import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';
import {
  GetBottleneckAnalysisInput,
  BottleneckAnalysisDTO,
  BottleneckZoneDTO,
  CongestionTimelineDTO,
  BottleneckRecommendationDTO,
} from '../../dto/AnalyticsDTO';

/**
 * Get Bottleneck Analysis Use Case
 *
 * Identifies zones where items accumulate or experience delays:
 * - Zones with high dwell times
 * - Zones with low throughput
 * - Congestion patterns over time
 * - Recommendations for improvement
 *
 * @example
 * ```typescript
 * const result = await getBottlenecks.execute({
 *   tenantId: 'tenant-uuid',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   dwellThresholdMinutes: 60,
 *   congestionThreshold: 0.8,
 * });
 * ```
 */
@injectable()
export class GetBottleneckAnalysisUseCase {
  // Default thresholds
  private readonly DEFAULT_DWELL_THRESHOLD = 60; // minutes
  private readonly DEFAULT_CONGESTION_THRESHOLD = 0.7;
  private readonly CRITICAL_DWELL_MULTIPLIER = 3;
  private readonly HIGH_DWELL_MULTIPLIER = 2;

  constructor(
    @inject('ILocationHistoryRepository') private locationRepo: ILocationHistoryRepository,
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetBottleneckAnalysisInput): Promise<Result<BottleneckAnalysisDTO, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting bottleneck analysis', {
        tenantId: input.tenantId,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
      });

      const dwellThreshold = input.dwellThresholdMinutes || this.DEFAULT_DWELL_THRESHOLD;
      const congestionThreshold = input.congestionThreshold || this.DEFAULT_CONGESTION_THRESHOLD;

      // Get all zones with capacity info
      const zonesResult = await this.zoneRepo.findAll(input.tenantId);
      if (zonesResult.isErr()) {
        return err(zonesResult.error);
      }
      const zones = zonesResult.value;
      const zonesMap = new Map<string, { name: string; type: string; capacity: number }>();
      for (const zone of zones) {
        zonesMap.set(zone.getId(), {
          name: zone.getName(),
          type: zone.getZoneType(),
          capacity: zone.getCapacity(),
        });
      }

      // Get zone dwell time statistics
      const dwellStatsResult = await this.locationRepo.getZoneDwellStatistics(
        input.tenantId,
        input.startDate,
        input.endDate
      );
      if (dwellStatsResult.isErr()) {
        return err(dwellStatsResult.error);
      }
      const dwellStats = dwellStatsResult.value;

      // Get zone occupancy over time for congestion timeline
      const occupancyResult = await this.locationRepo.getZoneOccupancyTimeline(
        input.tenantId,
        input.startDate,
        input.endDate
      );
      const occupancyTimeline = occupancyResult.isOk() ? occupancyResult.value : [];

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(
        dwellStats,
        zonesMap,
        dwellThreshold,
        congestionThreshold
      );

      // Build congestion timeline
      const congestionTimeline = this.buildCongestionTimeline(occupancyTimeline, zonesMap);

      // Generate recommendations
      const recommendations = this.generateRecommendations(bottlenecks, zonesMap);

      // Calculate summary
      const summary = this.calculateSummary(bottlenecks, dwellStats);

      const analysis: BottleneckAnalysisDTO = {
        period: {
          start: input.startDate.toISOString(),
          end: input.endDate.toISOString(),
        },
        summary,
        bottlenecks,
        congestionTimeline,
        recommendations,
      };

      this.logger.info('Bottleneck analysis completed', {
        tenantId: input.tenantId,
        totalBottlenecks: bottlenecks.length,
        criticalCount: summary.criticalBottlenecks,
        durationMs: Date.now() - startTime,
      });

      return ok(analysis);
    } catch (error) {
      this.logger.error('Failed to get bottleneck analysis', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Identify bottleneck zones based on dwell time and congestion metrics
   */
  private identifyBottlenecks(
    dwellStats: Array<{
      zoneId: string;
      avgDwellMinutes: number;
      maxDwellMinutes: number;
      itemCount: number;
      totalDwellMinutes: number;
      entryCount: number;
      exitCount: number;
    }>,
    zonesMap: Map<string, { name: string; type: string; capacity: number }>,
    dwellThreshold: number,
    congestionThreshold: number
  ): BottleneckZoneDTO[] {
    const bottlenecks: BottleneckZoneDTO[] = [];

    for (const stats of dwellStats) {
      const zoneInfo = zonesMap.get(stats.zoneId);
      if (!zoneInfo) continue;

      // Calculate congestion index
      const throughput = Math.min(stats.entryCount, stats.exitCount);
      const netFlow = stats.entryCount - stats.exitCount;
      const congestionIndex = throughput > 0 ? Math.abs(netFlow) / throughput : 0;

      // Calculate throughput reduction (compared to ideal)
      const idealThroughput = stats.entryCount;
      const throughputReduction =
        idealThroughput > 0 ? 1 - stats.exitCount / idealThroughput : 0;

      // Determine if this is a bottleneck
      const isHighDwell = stats.avgDwellMinutes > dwellThreshold;
      const isHighCongestion = congestionIndex > congestionThreshold;
      const isLowThroughput = throughputReduction > 0.2;

      if (!isHighDwell && !isHighCongestion && !isLowThroughput) continue;

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (
        stats.avgDwellMinutes > dwellThreshold * this.CRITICAL_DWELL_MULTIPLIER ||
        congestionIndex > 0.9
      ) {
        severity = 'critical';
      } else if (
        stats.avgDwellMinutes > dwellThreshold * this.HIGH_DWELL_MULTIPLIER ||
        congestionIndex > 0.8
      ) {
        severity = 'high';
      } else if (isHighDwell || isHighCongestion) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      bottlenecks.push({
        rank: 0, // Temporary - will be set after sorting
        zoneId: stats.zoneId,
        zoneName: zoneInfo.name,
        zoneType: zoneInfo.type,
        severity,
        metrics: {
          avgDwellTimeMinutes: Math.round(stats.avgDwellMinutes * 100) / 100,
          maxDwellTimeMinutes: Math.round(stats.maxDwellMinutes),
          congestionIndex: Math.round(congestionIndex * 100) / 100,
          itemsAffected: stats.itemCount,
          totalDelayMinutes: Math.round(stats.totalDwellMinutes - stats.itemCount * dwellThreshold),
          throughputReduction: Math.round(throughputReduction * 100) / 100,
        },
        peakTimes: [], // Would need more granular data
        impact: {
          upstreamZones: [],
          downstreamZones: [],
          cascadeRisk: congestionIndex > 0.8 ? 0.8 : congestionIndex > 0.5 ? 0.5 : 0.2,
        },
      });
    }

    // Sort by severity then congestion index
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    bottlenecks.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.metrics.congestionIndex - a.metrics.congestionIndex;
    });

    // Return with correct ranks
    return bottlenecks.map((b, i) => ({ ...b, rank: i + 1 }));
  }

  /**
   * Build congestion timeline from occupancy data
   */
  private buildCongestionTimeline(
    occupancyTimeline: Array<{
      timestamp: Date;
      zoneId: string;
      itemCount: number;
      capacity: number;
    }>,
    zonesMap: Map<string, { name: string; type: string; capacity: number }>
  ): CongestionTimelineDTO[] {
    return occupancyTimeline
      .filter((o) => {
        const zoneInfo = zonesMap.get(o.zoneId);
        return zoneInfo && o.itemCount / (o.capacity || 1) > 0.7;
      })
      .map((o) => {
        const zoneInfo = zonesMap.get(o.zoneId);
        const capacity = o.capacity || zoneInfo?.capacity || 100;
        return {
          timestamp: o.timestamp.toISOString(),
          zoneId: o.zoneId,
          zoneName: zoneInfo?.name || 'Unknown Zone',
          congestionLevel: Math.round((o.itemCount / capacity) * 100) / 100,
          itemCount: o.itemCount,
          avgWaitTimeMinutes: 0, // Would need additional data
        };
      })
      .slice(0, 100); // Limit to prevent huge responses
  }

  /**
   * Generate recommendations based on bottleneck analysis
   */
  private generateRecommendations(
    bottlenecks: BottleneckZoneDTO[],
    _zonesMap: Map<string, { name: string; type: string; capacity: number }>
  ): BottleneckRecommendationDTO[] {
    const recommendations: BottleneckRecommendationDTO[] = [];

    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        // High dwell time recommendation
        if (bottleneck.metrics.avgDwellTimeMinutes > 120) {
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
            type: 'capacity',
            zoneId: bottleneck.zoneId,
            zoneName: bottleneck.zoneName,
            description: `Increase capacity or add parallel processing in ${bottleneck.zoneName} to reduce ${Math.round(bottleneck.metrics.avgDwellTimeMinutes)} minute average dwell time`,
            expectedImprovement: '30-50% reduction in dwell time',
            implementationEffort: 'high',
          });
        }

        // Routing recommendation
        if (bottleneck.metrics.throughputReduction > 0.3) {
          recommendations.push({
            priority: 'medium',
            type: 'routing',
            zoneId: bottleneck.zoneId,
            zoneName: bottleneck.zoneName,
            description: `Consider alternative routing paths to bypass ${bottleneck.zoneName} during peak times`,
            expectedImprovement: '20-40% improvement in throughput',
            implementationEffort: 'medium',
          });
        }

        // Scheduling recommendation
        if (bottleneck.metrics.congestionIndex > 0.7) {
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
            type: 'scheduling',
            zoneId: bottleneck.zoneId,
            zoneName: bottleneck.zoneName,
            description: `Implement time-based scheduling to distribute load in ${bottleneck.zoneName}`,
            expectedImprovement: '25-35% reduction in peak congestion',
            implementationEffort: 'low',
          });
        }
      }

      // Staffing recommendation for zones with consistently high load
      if (bottleneck.metrics.itemsAffected > 50 && bottleneck.metrics.totalDelayMinutes > 500) {
        recommendations.push({
          priority: 'medium',
          type: 'staffing',
          zoneId: bottleneck.zoneId,
          zoneName: bottleneck.zoneName,
          description: `Add additional resources to ${bottleneck.zoneName} during peak hours to handle ${bottleneck.metrics.itemsAffected} affected items`,
          expectedImprovement: '40-60% reduction in processing delay',
          implementationEffort: 'medium',
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    bottlenecks: BottleneckZoneDTO[],
    _dwellStats: Array<{
      avgDwellMinutes: number;
      itemCount: number;
      totalDwellMinutes: number;
    }>
  ): BottleneckAnalysisDTO['summary'] {
    const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical').length;
    const totalDelayMinutes = bottlenecks.reduce(
      (sum, b) => sum + Math.max(0, b.metrics.totalDelayMinutes),
      0
    );
    const affectedItems = new Set(bottlenecks.map((b) => b.metrics.itemsAffected)).size;

    // Calculate average congestion index
    const avgCongestion =
      bottlenecks.length > 0
        ? bottlenecks.reduce((sum, b) => sum + b.metrics.congestionIndex, 0) / bottlenecks.length
        : 0;

    return {
      totalBottlenecks: bottlenecks.length,
      criticalBottlenecks,
      avgCongestionIndex: Math.round(avgCongestion * 100) / 100,
      totalDelayMinutes: Math.round(totalDelayMinutes),
      affectedItems,
    };
  }
}
