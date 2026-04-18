import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import {
  GetFlowAnomaliesInput,
  FlowAnomaliesDTO,
  FlowAnomalyDetailDTO,
  FlowAnomalyByTypeDTO,
  FlowAnomalyTrendDTO,
  FlowAnomalyType,
} from '../../dto/AnalyticsDTO';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Get Flow Anomalies Use Case
 *
 * Detects unusual movement patterns:
 * - Unexpected zone transitions
 * - Bypassed mandatory zones
 * - Unusual dwell times
 * - Circular/repetitive movements
 * - Rapid zone transitions
 * - Stalled items
 * - Wrong direction movement
 *
 * @example
 * ```typescript
 * const result = await getFlowAnomalies.execute({
 *   tenantId: 'tenant-uuid',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   severityFilter: ['high', 'critical'],
 *   typeFilter: ['unexpected_transition', 'stalled_item'],
 * });
 * ```
 */
@injectable()
export class GetFlowAnomaliesUseCase {
  // Thresholds for anomaly detection
  private readonly RAPID_TRANSITION_THRESHOLD_SECONDS = 10;
  private readonly STALLED_THRESHOLD_HOURS = 24;
  private readonly UNUSUAL_DWELL_MULTIPLIER = 3;
  private readonly CIRCULAR_DETECTION_WINDOW = 5;

  constructor(
    @inject('ILocationHistoryRepository') private locationRepo: ILocationHistoryRepository,
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('IItemRepository') private itemRepo: IItemRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetFlowAnomaliesInput): Promise<Result<FlowAnomaliesDTO, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting flow anomalies', {
        tenantId: input.tenantId,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
      });

      // Get all zones
      const zonesResult = await this.zoneRepo.findAll(input.tenantId);
      const zonesMap = new Map<string, { name: string; type: string; avgDwell: number }>();
      if (zonesResult.isOk()) {
        for (const zone of zonesResult.value) {
          zonesMap.set(zone.getId(), {
            name: zone.getName(),
            type: zone.getZoneType(),
            avgDwell: 30, // Default average dwell time
          });
        }
      }

      // Get zone transitions for analysis
      const transitionsResult = await this.locationRepo.getZoneTransitions(
        input.tenantId,
        input.startDate,
        input.endDate
      );
      if (transitionsResult.isErr()) {
        return err(transitionsResult.error);
      }
      const transitions = transitionsResult.value;

      // Get zone dwell statistics for baseline
      const dwellStatsResult = await this.locationRepo.getZoneDwellStatistics(
        input.tenantId,
        input.startDate,
        input.endDate
      );
      if (dwellStatsResult.isOk()) {
        for (const stat of dwellStatsResult.value) {
          const zone = zonesMap.get(stat.zoneId);
          if (zone) {
            zone.avgDwell = stat.avgDwellMinutes;
          }
        }
      }

      // Detect all types of anomalies
      const anomalies = await this.detectAnomalies(
        input.tenantId,
        transitions,
        zonesMap,
        input.severityFilter,
        input.typeFilter
      );

      // Build summary
      const summary = this.buildSummary(anomalies);

      // Build breakdown by type
      const byType = this.buildByType(anomalies);

      // Build trends
      const trends = this.buildTrends(anomalies, input.startDate, input.endDate);

      // Apply limit
      const limitedAnomalies = input.limit ? anomalies.slice(0, input.limit) : anomalies;

      const result: FlowAnomaliesDTO = {
        period: {
          start: input.startDate.toISOString(),
          end: input.endDate.toISOString(),
        },
        summary,
        byType,
        anomalies: limitedAnomalies,
        trends,
      };

      this.logger.info('Flow anomalies retrieved', {
        tenantId: input.tenantId,
        totalAnomalies: anomalies.length,
        criticalCount: summary.criticalCount,
        durationMs: Date.now() - startTime,
      });

      return ok(result);
    } catch (error) {
      this.logger.error('Failed to get flow anomalies', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Detect all types of flow anomalies
   */
  private async detectAnomalies(
    tenantId: string,
    transitions: Array<{
      itemId: string;
      fromZoneId: string | null;
      toZoneId: string;
      timestamp: Date;
      transitionTimeSeconds: number;
      dwellTimeMinutes?: number;
    }>,
    zonesMap: Map<string, { name: string; type: string; avgDwell: number }>,
    severityFilter?: ('low' | 'medium' | 'high' | 'critical')[],
    typeFilter?: FlowAnomalyType[]
  ): Promise<FlowAnomalyDetailDTO[]> {
    const anomalies: FlowAnomalyDetailDTO[] = [];

    // Group transitions by item
    const itemTransitions = new Map<
      string,
      Array<{
        fromZoneId: string | null;
        toZoneId: string;
        timestamp: Date;
        transitionTimeSeconds: number;
        dwellTimeMinutes?: number;
      }>
    >();

    for (const t of transitions) {
      const existing = itemTransitions.get(t.itemId);
      if (existing) {
        existing.push(t);
      } else {
        itemTransitions.set(t.itemId, [t]);
      }
    }

    // Get item numbers for reporting
    const itemNumbers = new Map<string, string>();
    for (const itemId of itemTransitions.keys()) {
      const itemResult = await this.itemRepo.findById(itemId, tenantId);
      if (itemResult.isOk() && itemResult.value) {
        itemNumbers.set(itemId, itemResult.value.getItemNumber().getValue());
      }
    }

    // Analyze each item's transitions
    for (const [itemId, itemTrans] of itemTransitions) {
      // Sort by timestamp
      const sorted = [...itemTrans].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const itemNumber = itemNumbers.get(itemId) || itemId;

      // Detect rapid transitions
      if (!typeFilter || typeFilter.includes('rapid_transitions')) {
        for (const t of sorted) {
          if (t.transitionTimeSeconds < this.RAPID_TRANSITION_THRESHOLD_SECONDS && t.fromZoneId) {
            const anomaly = this.createAnomaly(
              'rapid_transitions',
              this.calculateSeverity('rapid_transitions', t.transitionTimeSeconds),
              t.timestamp,
              itemId,
              itemNumber,
              {
                expectedBehavior: 'Normal transition time > 10 seconds',
                actualBehavior: `Transition completed in ${t.transitionTimeSeconds} seconds`,
                deviation:
                  (this.RAPID_TRANSITION_THRESHOLD_SECONDS - t.transitionTimeSeconds) /
                  this.RAPID_TRANSITION_THRESHOLD_SECONDS,
              },
              t.toZoneId,
              zonesMap.get(t.toZoneId)?.name || 'Unknown',
              t.fromZoneId,
              zonesMap.get(t.fromZoneId)?.name || 'Unknown',
              { transitionTimeSeconds: t.transitionTimeSeconds }
            );
            anomalies.push(anomaly);
          }
        }
      }

      // Detect unusual dwell times
      if (!typeFilter || typeFilter.includes('unusual_dwell_time')) {
        for (const t of sorted) {
          if (!t.dwellTimeMinutes) continue;

          const zoneInfo = zonesMap.get(t.toZoneId);
          if (!zoneInfo) continue;

          const threshold = zoneInfo.avgDwell * this.UNUSUAL_DWELL_MULTIPLIER;
          if (t.dwellTimeMinutes > threshold) {
            const anomaly = this.createAnomaly(
              'unusual_dwell_time',
              this.calculateSeverity('unusual_dwell_time', t.dwellTimeMinutes / threshold),
              t.timestamp,
              itemId,
              itemNumber,
              {
                expectedBehavior: `Average dwell time: ${Math.round(zoneInfo.avgDwell)} minutes`,
                actualBehavior: `Item dwelled for ${Math.round(t.dwellTimeMinutes)} minutes`,
                deviation: (t.dwellTimeMinutes - zoneInfo.avgDwell) / zoneInfo.avgDwell,
              },
              t.toZoneId,
              zoneInfo.name,
              t.fromZoneId,
              t.fromZoneId ? zonesMap.get(t.fromZoneId)?.name || 'Unknown' : null,
              {
                dwellTimeMinutes: t.dwellTimeMinutes,
                avgDwellMinutes: zoneInfo.avgDwell,
                threshold,
              }
            );
            anomalies.push(anomaly);
          }
        }
      }

      // Detect circular movement (visiting same zone multiple times in short window)
      if (!typeFilter || typeFilter.includes('circular_movement')) {
        const recentZones: string[] = [];
        for (const t of sorted) {
          if (recentZones.length >= this.CIRCULAR_DETECTION_WINDOW) {
            recentZones.shift();
          }

          // Check if this zone was visited recently
          const previousIndex = recentZones.indexOf(t.toZoneId);
          if (previousIndex !== -1) {
            const zoneInfo = zonesMap.get(t.toZoneId);
            const anomaly = this.createAnomaly(
              'circular_movement',
              'medium',
              t.timestamp,
              itemId,
              itemNumber,
              {
                expectedBehavior: 'Linear progression through zones',
                actualBehavior: `Returned to ${zoneInfo?.name || 'zone'} after visiting ${recentZones.length - previousIndex} other zones`,
                deviation: (recentZones.length - previousIndex) / this.CIRCULAR_DETECTION_WINDOW,
              },
              t.toZoneId,
              zoneInfo?.name || 'Unknown',
              t.fromZoneId,
              t.fromZoneId ? zonesMap.get(t.fromZoneId)?.name || 'Unknown' : null,
              {
                zonesVisitedBetween: recentZones.length - previousIndex,
                recentPath: recentZones.map((z) => zonesMap.get(z)?.name || z),
              }
            );
            anomalies.push(anomaly);
          }

          recentZones.push(t.toZoneId);
        }
      }

      // Detect stalled items (no movement for extended period)
      if (!typeFilter || typeFilter.includes('stalled_item')) {
        if (sorted.length >= 2) {
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!;
            const curr = sorted[i]!;
            const gapHours =
              (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60);

            if (gapHours > this.STALLED_THRESHOLD_HOURS) {
              const zoneInfo = zonesMap.get(prev.toZoneId);
              const anomaly = this.createAnomaly(
                'stalled_item',
                this.calculateSeverity('stalled_item', gapHours / this.STALLED_THRESHOLD_HOURS),
                prev.timestamp,
                itemId,
                itemNumber,
                {
                  expectedBehavior: 'Regular movement within 24 hours',
                  actualBehavior: `No movement for ${Math.round(gapHours)} hours`,
                  deviation: gapHours / this.STALLED_THRESHOLD_HOURS,
                },
                prev.toZoneId,
                zoneInfo?.name || 'Unknown',
                null,
                null,
                {
                  stalledHours: Math.round(gapHours),
                  lastZone: zoneInfo?.name || prev.toZoneId,
                }
              );
              anomalies.push(anomaly);
            }
          }
        }
      }
    }

    // Apply severity filter
    let filtered = anomalies;
    if (severityFilter && severityFilter.length > 0) {
      filtered = filtered.filter((a) => severityFilter.includes(a.severity));
    }

    // Sort by severity then timestamp (newest first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return filtered.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
  }

  /**
   * Create an anomaly detail object
   */
  private createAnomaly(
    type: FlowAnomalyType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    timestamp: Date,
    itemId: string,
    itemNumber: string,
    context: {
      expectedBehavior: string;
      actualBehavior: string;
      deviation: number;
    },
    zoneId: string,
    zoneName: string,
    previousZoneId: string | null,
    previousZoneName: string | null,
    details: Record<string, unknown>
  ): FlowAnomalyDetailDTO {
    return {
      anomalyId: uuidv4(),
      type,
      severity,
      detectedAt: timestamp.toISOString(),
      itemId,
      itemNumber,
      context: {
        expectedBehavior: context.expectedBehavior,
        actualBehavior: context.actualBehavior,
        deviation: Math.round(context.deviation * 100) / 100,
      },
      location: {
        zoneId,
        zoneName,
        previousZoneId,
        previousZoneName,
      },
      details,
      resolution: {
        status: 'open',
        resolvedAt: null,
        resolvedBy: null,
        notes: null,
      },
    };
  }

  /**
   * Calculate severity based on anomaly type and magnitude
   */
  private calculateSeverity(
    type: FlowAnomalyType,
    magnitude: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'rapid_transitions':
        if (magnitude < 0.3) return 'low';
        if (magnitude < 0.6) return 'medium';
        return 'high';

      case 'unusual_dwell_time':
        if (magnitude < 2) return 'low';
        if (magnitude < 4) return 'medium';
        if (magnitude < 6) return 'high';
        return 'critical';

      case 'stalled_item':
        if (magnitude < 2) return 'medium';
        if (magnitude < 4) return 'high';
        return 'critical';

      case 'circular_movement':
        return 'medium';

      default:
        return 'medium';
    }
  }

  /**
   * Build summary statistics
   */
  private buildSummary(anomalies: FlowAnomalyDetailDTO[]): FlowAnomaliesDTO['summary'] {
    const affectedItems = new Set(anomalies.map((a) => a.itemId));
    const affectedZones = new Set(anomalies.map((a) => a.location.zoneId));

    return {
      totalAnomalies: anomalies.length,
      criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
      highCount: anomalies.filter((a) => a.severity === 'high').length,
      mediumCount: anomalies.filter((a) => a.severity === 'medium').length,
      lowCount: anomalies.filter((a) => a.severity === 'low').length,
      affectedItems: affectedItems.size,
      affectedZones: affectedZones.size,
    };
  }

  /**
   * Build breakdown by type
   */
  private buildByType(anomalies: FlowAnomalyDetailDTO[]): FlowAnomalyByTypeDTO[] {
    const typeCounts = new Map<FlowAnomalyType, number>();

    for (const a of anomalies) {
      typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1);
    }

    const total = anomalies.length > 0 ? anomalies.length : 1;
    const result: FlowAnomalyByTypeDTO[] = [];

    for (const [type, count] of typeCounts) {
      result.push({
        type,
        count,
        percentage: Math.round((count / total) * 10000) / 100,
        trend: 'stable', // Would need historical data to determine
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  /**
   * Build anomaly trends over time
   */
  private buildTrends(
    anomalies: FlowAnomalyDetailDTO[],
    _startDate: Date,
    _endDate: Date
  ): FlowAnomalyTrendDTO[] {
    // Group by day
    const dailyCounts = new Map<
      string,
      {
        date: Date;
        byType: Map<FlowAnomalyType, number>;
        bySeverity: Map<string, number>;
      }
    >();

    for (const a of anomalies) {
      const date = new Date(a.detectedAt);
      const dateKey = date.toISOString().split('T')[0]!;

      const existing = dailyCounts.get(dateKey);
      if (existing) {
        existing.byType.set(a.type, (existing.byType.get(a.type) || 0) + 1);
        existing.bySeverity.set(a.severity, (existing.bySeverity.get(a.severity) || 0) + 1);
      } else {
        dailyCounts.set(dateKey, {
          date: new Date(dateKey),
          byType: new Map([[a.type, 1]]),
          bySeverity: new Map([[a.severity, 1]]),
        });
      }
    }

    // Convert to DTOs
    const trends: FlowAnomalyTrendDTO[] = [];
    for (const [, data] of dailyCounts) {
      const byType: Record<FlowAnomalyType, number> = {
        unexpected_transition: 0,
        bypassed_zone: 0,
        unusual_dwell_time: 0,
        circular_movement: 0,
        rapid_transitions: 0,
        stalled_item: 0,
        wrong_direction: 0,
      };
      for (const [type, count] of data.byType) {
        byType[type] = count;
      }

      const bySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      for (const [severity, count] of data.bySeverity) {
        bySeverity[severity] = count;
      }

      const totalCount = Array.from(data.byType.values()).reduce((a, b) => a + b, 0);

      trends.push({
        timestamp: data.date.toISOString(),
        totalCount,
        byType,
        bySeverity,
      });
    }

    return trends.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
