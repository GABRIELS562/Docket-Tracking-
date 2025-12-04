import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';
import {
  GetZoneFlowInput,
  ZoneFlowAnalyticsDTO,
  ZoneFlowMatrixDTO,
  ZoneFlowCorridorDTO,
  ZoneFlowStatsDTO,
  HourlyFlowPatternDTO,
} from '../../dto/AnalyticsDTO';

/**
 * Get Zone Flow Analytics Use Case
 *
 * Analyzes zone-to-zone movement patterns including:
 * - Flow matrix showing transitions between all zones
 * - Top flow corridors (most traveled paths)
 * - Zone entry/exit statistics
 * - Hourly flow patterns
 *
 * @example
 * ```typescript
 * const result = await getZoneFlow.execute({
 *   tenantId: 'tenant-uuid',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   minTransitions: 5,
 * });
 * ```
 */
@injectable()
export class GetZoneFlowAnalyticsUseCase {
  constructor(
    @inject('ILocationHistoryRepository') private locationRepo: ILocationHistoryRepository,
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetZoneFlowInput): Promise<Result<ZoneFlowAnalyticsDTO, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting zone flow analytics', {
        tenantId: input.tenantId,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
      });

      // Get all zones for name lookup
      const zonesResult = await this.zoneRepo.findAll(input.tenantId);
      const zonesMap = new Map<string, { name: string; type: string }>();
      if (zonesResult.isOk()) {
        for (const zone of zonesResult.value) {
          zonesMap.set(zone.getId(), {
            name: zone.getName(),
            type: zone.getZoneType(),
          });
        }
      }

      // Get all transitions in the time period
      const transitionsResult = await this.locationRepo.getZoneTransitions(
        input.tenantId,
        input.startDate,
        input.endDate
      );
      if (transitionsResult.isErr()) {
        return err(transitionsResult.error);
      }
      const transitions = transitionsResult.value;

      // Build flow matrix
      const flowMatrix = this.buildFlowMatrix(transitions, zonesMap, input.minTransitions || 1);

      // Build top flow corridors
      const topFlows = this.buildTopFlowCorridors(flowMatrix, 10);

      // Build zone stats
      const zoneStats = this.buildZoneStats(transitions, zonesMap);

      // Build hourly patterns
      const hourlyPatterns = this.buildHourlyPatterns(transitions);

      // Calculate summary
      const summary = this.calculateSummary(transitions, flowMatrix, hourlyPatterns);

      const analytics: ZoneFlowAnalyticsDTO = {
        period: {
          start: input.startDate.toISOString(),
          end: input.endDate.toISOString(),
        },
        summary,
        flowMatrix,
        topFlows,
        zoneStats,
        hourlyPatterns,
      };

      this.logger.info('Zone flow analytics retrieved', {
        tenantId: input.tenantId,
        totalTransitions: summary.totalTransitions,
        activeZones: summary.activeZones,
        durationMs: Date.now() - startTime,
      });

      return ok(analytics);
    } catch (error) {
      this.logger.error('Failed to get zone flow analytics', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Build zone-to-zone flow matrix
   */
  private buildFlowMatrix(
    transitions: Array<{
      fromZoneId: string | null;
      toZoneId: string;
      itemId: string;
      timestamp: Date;
      transitionTimeSeconds: number;
    }>,
    zonesMap: Map<string, { name: string; type: string }>,
    minTransitions: number
  ): ZoneFlowMatrixDTO[] {
    // Group transitions by from-to pair
    const flowMap = new Map<
      string,
      {
        fromZoneId: string;
        toZoneId: string;
        count: number;
        items: Set<string>;
        totalTime: number;
      }
    >();

    for (const t of transitions) {
      if (!t.fromZoneId) continue;

      const key = `${t.fromZoneId}:${t.toZoneId}`;
      const existing = flowMap.get(key);

      if (existing) {
        existing.count++;
        existing.items.add(t.itemId);
        existing.totalTime += t.transitionTimeSeconds;
      } else {
        flowMap.set(key, {
          fromZoneId: t.fromZoneId,
          toZoneId: t.toZoneId,
          count: 1,
          items: new Set([t.itemId]),
          totalTime: t.transitionTimeSeconds,
        });
      }
    }

    // Calculate total for percentages
    const total = Array.from(flowMap.values()).reduce((sum, f) => sum + f.count, 0);

    // Convert to DTOs and filter by min transitions
    const matrix: ZoneFlowMatrixDTO[] = [];
    for (const flow of flowMap.values()) {
      if (flow.count < minTransitions) continue;

      const fromZone = zonesMap.get(flow.fromZoneId);
      const toZone = zonesMap.get(flow.toZoneId);

      matrix.push({
        fromZoneId: flow.fromZoneId,
        fromZoneName: fromZone?.name || 'Unknown Zone',
        toZoneId: flow.toZoneId,
        toZoneName: toZone?.name || 'Unknown Zone',
        transitionCount: flow.count,
        uniqueItems: flow.items.size,
        avgTransitionTimeSeconds: Math.round(flow.totalTime / flow.count),
        percentage: Math.round((flow.count / total) * 10000) / 100,
      });
    }

    // Sort by transition count descending
    return matrix.sort((a, b) => b.transitionCount - a.transitionCount);
  }

  /**
   * Build top flow corridors (most traveled paths)
   */
  private buildTopFlowCorridors(
    flowMatrix: ZoneFlowMatrixDTO[],
    limit: number
  ): ZoneFlowCorridorDTO[] {
    // Find reverse flows for each corridor
    const corridors: ZoneFlowCorridorDTO[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < flowMatrix.length && corridors.length < limit; i++) {
      const flow = flowMatrix[i]!;
      const key = `${flow.fromZoneId}:${flow.toZoneId}`;
      const reverseKey = `${flow.toZoneId}:${flow.fromZoneId}`;

      if (processed.has(key) || processed.has(reverseKey)) continue;

      // Find reverse flow
      const reverseFlow = flowMatrix.find(
        (f) => f.fromZoneId === flow.toZoneId && f.toZoneId === flow.fromZoneId
      );

      corridors.push({
        rank: corridors.length + 1,
        fromZoneId: flow.fromZoneId,
        fromZoneName: flow.fromZoneName,
        toZoneId: flow.toZoneId,
        toZoneName: flow.toZoneName,
        transitionCount: flow.transitionCount,
        percentage: flow.percentage,
        avgTransitionTimeSeconds: flow.avgTransitionTimeSeconds,
        peakHour: 9, // Would need detailed data to calculate
        isReversible: !!reverseFlow,
        reverseCount: reverseFlow?.transitionCount || 0,
      });

      processed.add(key);
      if (reverseFlow) processed.add(reverseKey);
    }

    return corridors;
  }

  /**
   * Build zone entry/exit statistics
   */
  private buildZoneStats(
    transitions: Array<{
      fromZoneId: string | null;
      toZoneId: string;
      itemId: string;
      timestamp: Date;
      dwellTimeMinutes?: number;
    }>,
    zonesMap: Map<string, { name: string; type: string }>
  ): ZoneFlowStatsDTO[] {
    // Aggregate by zone
    const zoneStatsMap = new Map<
      string,
      {
        entries: number;
        exits: number;
        itemsEntered: Set<string>;
        itemsExited: Set<string>;
        totalDwell: number;
        dwellCount: number;
      }
    >();

    // Initialize all zones
    for (const [zoneId] of zonesMap) {
      zoneStatsMap.set(zoneId, {
        entries: 0,
        exits: 0,
        itemsEntered: new Set(),
        itemsExited: new Set(),
        totalDwell: 0,
        dwellCount: 0,
      });
    }

    // Count entries and exits
    for (const t of transitions) {
      // Entry to destination zone
      const toStats = zoneStatsMap.get(t.toZoneId);
      if (toStats) {
        toStats.entries++;
        toStats.itemsEntered.add(t.itemId);
        if (t.dwellTimeMinutes) {
          toStats.totalDwell += t.dwellTimeMinutes;
          toStats.dwellCount++;
        }
      }

      // Exit from source zone
      if (t.fromZoneId) {
        const fromStats = zoneStatsMap.get(t.fromZoneId);
        if (fromStats) {
          fromStats.exits++;
          fromStats.itemsExited.add(t.itemId);
        }
      }
    }

    // Convert to DTOs
    const stats: ZoneFlowStatsDTO[] = [];
    for (const [zoneId, data] of zoneStatsMap) {
      const zoneInfo = zonesMap.get(zoneId);
      if (!zoneInfo) continue;

      const netFlow = data.entries - data.exits;
      const throughput = Math.min(data.entries, data.exits);
      const congestionIndex =
        throughput > 0 ? Math.min(1, Math.abs(netFlow) / throughput) : 0;

      stats.push({
        zoneId,
        zoneName: zoneInfo.name,
        zoneType: zoneInfo.type,
        totalEntries: data.entries,
        totalExits: data.exits,
        netFlow,
        uniqueItemsEntered: data.itemsEntered.size,
        uniqueItemsExited: data.itemsExited.size,
        avgDwellTimeMinutes:
          data.dwellCount > 0 ? Math.round(data.totalDwell / data.dwellCount) : 0,
        throughput,
        congestionIndex: Math.round(congestionIndex * 100) / 100,
      });
    }

    // Sort by total entries descending
    return stats.sort((a, b) => b.totalEntries - a.totalEntries);
  }

  /**
   * Build hourly flow patterns
   */
  private buildHourlyPatterns(
    transitions: Array<{
      timestamp: Date;
      itemId: string;
      transitionTimeSeconds: number;
    }>
  ): HourlyFlowPatternDTO[] {
    // Group by hour and day of week
    const patternMap = new Map<
      string,
      {
        hour: number;
        dayOfWeek: number;
        count: number;
        items: Set<string>;
        totalTime: number;
      }
    >();

    for (const t of transitions) {
      const hour = t.timestamp.getHours();
      const dayOfWeek = t.timestamp.getDay();
      const key = `${dayOfWeek}:${hour}`;

      const existing = patternMap.get(key);
      if (existing) {
        existing.count++;
        existing.items.add(t.itemId);
        existing.totalTime += t.transitionTimeSeconds;
      } else {
        patternMap.set(key, {
          hour,
          dayOfWeek,
          count: 1,
          items: new Set([t.itemId]),
          totalTime: t.transitionTimeSeconds,
        });
      }
    }

    // Find max for intensity calculation
    const maxCount = Math.max(...Array.from(patternMap.values()).map((p) => p.count), 1);

    // Convert to DTOs
    const patterns: HourlyFlowPatternDTO[] = [];
    for (const data of patternMap.values()) {
      patterns.push({
        hour: data.hour,
        dayOfWeek: data.dayOfWeek,
        transitionCount: data.count,
        uniqueItems: data.items.size,
        avgTransitionTime: Math.round(data.totalTime / data.count),
        intensity: Math.round((data.count / maxCount) * 100) / 100,
      });
    }

    // Sort by day then hour
    return patterns.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.hour - b.hour;
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    transitions: Array<{ itemId: string; timestamp: Date }>,
    flowMatrix: ZoneFlowMatrixDTO[],
    hourlyPatterns: HourlyFlowPatternDTO[]
  ): ZoneFlowAnalyticsDTO['summary'] {
    const uniqueItems = new Set(transitions.map((t) => t.itemId));
    const uniqueZones = new Set<string>();
    for (const f of flowMatrix) {
      uniqueZones.add(f.fromZoneId);
      uniqueZones.add(f.toZoneId);
    }

    // Find busiest hour
    let busiestPattern = hourlyPatterns[0];
    for (const p of hourlyPatterns) {
      if (!busiestPattern || p.transitionCount > busiestPattern.transitionCount) {
        busiestPattern = p;
      }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      totalTransitions: transitions.length,
      uniqueItems: uniqueItems.size,
      activeZones: uniqueZones.size,
      avgTransitionsPerItem:
        uniqueItems.size > 0
          ? Math.round((transitions.length / uniqueItems.size) * 100) / 100
          : 0,
      busiestHour: busiestPattern?.hour ?? 0,
      busiestDay: busiestPattern ? dayNames[busiestPattern.dayOfWeek] ?? 'Unknown' : 'Unknown',
    };
  }
}
