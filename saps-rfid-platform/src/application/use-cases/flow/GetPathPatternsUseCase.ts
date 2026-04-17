import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import {
  GetPathPatternsInput,
  PathPatternsDTO,
  PathPatternDTO,
  PathNodeDTO,
  PathSubsequenceDTO,
} from '../../dto/AnalyticsDTO';

import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Get Path Patterns Use Case
 *
 * Discovers common movement patterns across items:
 * - Most frequently followed paths
 * - Common subsequences in journeys
 * - Path timing statistics
 * - Optimal vs actual path comparison
 *
 * @example
 * ```typescript
 * const result = await getPathPatterns.execute({
 *   tenantId: 'tenant-uuid',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   minOccurrences: 10,
 *   maxPathLength: 10,
 * });
 * ```
 */
@injectable()
export class GetPathPatternsUseCase {
  private readonly DEFAULT_MIN_OCCURRENCES = 5;
  private readonly DEFAULT_MAX_PATH_LENGTH = 15;

  constructor(
    @inject('ILocationHistoryRepository') private locationRepo: ILocationHistoryRepository,
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetPathPatternsInput): Promise<Result<PathPatternsDTO, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting path patterns', {
        tenantId: input.tenantId,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
      });

      const minOccurrences = input.minOccurrences || this.DEFAULT_MIN_OCCURRENCES;
      const maxPathLength = input.maxPathLength || this.DEFAULT_MAX_PATH_LENGTH;

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

      // Get item paths (sequence of zones visited per item)
      const pathsResult = await this.locationRepo.getItemPaths(
        input.tenantId,
        input.startDate,
        input.endDate,
        maxPathLength
      );
      if (pathsResult.isErr()) {
        return err(pathsResult.error);
      }
      const itemPaths = pathsResult.value;

      // Discover path patterns
      const patterns = this.discoverPatterns(itemPaths, zonesMap, minOccurrences);

      // Find common subsequences
      const subsequences = this.findCommonSubsequences(itemPaths, zonesMap, minOccurrences);

      // Calculate summary
      const summary = this.calculateSummary(patterns, itemPaths, zonesMap);

      const analytics: PathPatternsDTO = {
        period: {
          start: input.startDate.toISOString(),
          end: input.endDate.toISOString(),
        },
        summary,
        patterns,
        commonSubsequences: subsequences,
      };

      this.logger.info('Path patterns retrieved', {
        tenantId: input.tenantId,
        patternsFound: patterns.length,
        subsequencesFound: subsequences.length,
        durationMs: Date.now() - startTime,
      });

      return ok(analytics);
    } catch (error) {
      this.logger.error('Failed to get path patterns', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Discover common path patterns from item journeys
   */
  private discoverPatterns(
    itemPaths: Array<{
      itemId: string;
      path: Array<{
        zoneId: string;
        entryTime: Date;
        exitTime: Date | null;
        dwellMinutes: number;
      }>;
    }>,
    zonesMap: Map<string, { name: string; type: string }>,
    minOccurrences: number
  ): PathPatternDTO[] {
    // Count occurrences of each unique path
    const pathCounts = new Map<
      string,
      {
        path: Array<{
          zoneId: string;
          avgDwell: number;
          dwellSum: number;
          transitionSum: number;
          count: number;
        }>;
        items: Set<string>;
        durations: number[];
        lastOccurrence: Date;
      }
    >();

    for (const itemPath of itemPaths) {
      if (itemPath.path.length < 2) continue;

      // Create path key (sequence of zone IDs)
      const pathKey = itemPath.path.map((p) => p.zoneId).join('->');

      const existing = pathCounts.get(pathKey);
      if (existing) {
        existing.items.add(itemPath.itemId);

        // Calculate duration
        const firstEntry = itemPath.path[0]!.entryTime;
        const lastNode = itemPath.path[itemPath.path.length - 1]!;
        const lastExit = lastNode.exitTime || lastNode.entryTime;
        const duration = (lastExit.getTime() - firstEntry.getTime()) / (1000 * 60);
        existing.durations.push(duration);

        // Update dwell times
        for (let i = 0; i < itemPath.path.length; i++) {
          const node = itemPath.path[i]!;
          existing.path[i]!.dwellSum += node.dwellMinutes;
          existing.path[i]!.count++;

          // Calculate transition time to next zone
          if (i < itemPath.path.length - 1) {
            const nextNode = itemPath.path[i + 1]!;
            const transitionTime =
              (nextNode.entryTime.getTime() - (node.exitTime || node.entryTime).getTime()) / 1000;
            existing.path[i]!.transitionSum += transitionTime;
          }
        }

        // Track last occurrence
        if (firstEntry > existing.lastOccurrence) {
          existing.lastOccurrence = firstEntry;
        }
      } else {
        const firstEntry = itemPath.path[0]!.entryTime;
        const lastNode = itemPath.path[itemPath.path.length - 1]!;
        const lastExit = lastNode.exitTime || lastNode.entryTime;
        const duration = (lastExit.getTime() - firstEntry.getTime()) / (1000 * 60);

        const pathData = itemPath.path.map((node, i) => {
          let transitionTime = 0;
          if (i < itemPath.path.length - 1) {
            const nextNode = itemPath.path[i + 1]!;
            transitionTime =
              (nextNode.entryTime.getTime() - (node.exitTime || node.entryTime).getTime()) / 1000;
          }
          return {
            zoneId: node.zoneId,
            avgDwell: node.dwellMinutes,
            dwellSum: node.dwellMinutes,
            transitionSum: transitionTime,
            count: 1,
          };
        });

        pathCounts.set(pathKey, {
          path: pathData,
          items: new Set([itemPath.itemId]),
          durations: [duration],
          lastOccurrence: firstEntry,
        });
      }
    }

    // Convert to patterns and filter by min occurrences
    const totalPaths = itemPaths.length;
    const patterns: PathPatternDTO[] = [];
    let rank = 0;

    const sortedPaths = Array.from(pathCounts.entries())
      .filter(([, data]) => data.items.size >= minOccurrences)
      .sort((a, b) => b[1].items.size - a[1].items.size);

    for (const [_pathKey, data] of sortedPaths) {
      rank++;

      // Build path nodes
      const pathNodes: PathNodeDTO[] = data.path.map((node, i) => {
        const zoneInfo = zonesMap.get(node.zoneId);
        return {
          sequence: i + 1,
          zoneId: node.zoneId,
          zoneName: zoneInfo?.name || 'Unknown Zone',
          zoneType: zoneInfo?.type || 'unknown',
          avgDwellTimeMinutes: Math.round((node.dwellSum / node.count) * 100) / 100,
          transitionToNextSeconds:
            i < data.path.length - 1 ? Math.round(node.transitionSum / node.count) : null,
        };
      });

      // Calculate duration statistics
      const durations = data.durations.sort((a, b) => a - b);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      patterns.push({
        patternId: `pattern-${rank}`,
        rank,
        path: pathNodes,
        occurrences: data.items.size,
        percentage: Math.round((data.items.size / totalPaths) * 10000) / 100,
        avgDurationMinutes: Math.round(avgDuration * 100) / 100,
        minDurationMinutes: Math.round(durations[0]! * 100) / 100,
        maxDurationMinutes: Math.round(durations[durations.length - 1]! * 100) / 100,
        itemsFollowing: data.items.size,
        lastOccurrence: data.lastOccurrence.toISOString(),
        isOptimalPath: rank === 1, // Assume most common is optimal
        deviationFromOptimal: rank === 1 ? 0 : null,
      });

      if (patterns.length >= 20) break; // Limit to top 20 patterns
    }

    return patterns;
  }

  /**
   * Find common subsequences in paths (partial patterns)
   */
  private findCommonSubsequences(
    itemPaths: Array<{
      itemId: string;
      path: Array<{ zoneId: string; dwellMinutes: number }>;
    }>,
    zonesMap: Map<string, { name: string; type: string }>,
    minOccurrences: number
  ): PathSubsequenceDTO[] {
    // Extract all 2-3 zone subsequences
    const subsequenceCounts = new Map<
      string,
      {
        zones: string[];
        occurrences: number;
        totalDuration: number;
        foundInPatterns: Set<string>;
      }
    >();

    for (const itemPath of itemPaths) {
      const pathKey = itemPath.path.map((p) => p.zoneId).join('->');

      // Extract subsequences of length 2 and 3
      for (let len = 2; len <= 3 && len <= itemPath.path.length; len++) {
        for (let i = 0; i <= itemPath.path.length - len; i++) {
          const subseq = itemPath.path.slice(i, i + len);
          const key = subseq.map((s) => s.zoneId).join('->');
          const duration = subseq.reduce((sum, s) => sum + s.dwellMinutes, 0);

          const existing = subsequenceCounts.get(key);
          if (existing) {
            existing.occurrences++;
            existing.totalDuration += duration;
            existing.foundInPatterns.add(pathKey);
          } else {
            subsequenceCounts.set(key, {
              zones: subseq.map((s) => s.zoneId),
              occurrences: 1,
              totalDuration: duration,
              foundInPatterns: new Set([pathKey]),
            });
          }
        }
      }
    }

    // Convert to DTOs and filter
    const subsequences: PathSubsequenceDTO[] = [];
    let id = 0;

    const sorted = Array.from(subsequenceCounts.entries())
      .filter(([, data]) => data.occurrences >= minOccurrences)
      .sort((a, b) => b[1].occurrences - a[1].occurrences);

    for (const [, data] of sorted) {
      if (subsequences.length >= 15) break;

      subsequences.push({
        subsequenceId: `subseq-${++id}`,
        zones: data.zones,
        zoneNames: data.zones.map((z) => zonesMap.get(z)?.name || 'Unknown Zone'),
        occurrences: data.occurrences,
        avgDurationMinutes: Math.round((data.totalDuration / data.occurrences) * 100) / 100,
        foundInPatterns: Array.from(data.foundInPatterns).slice(0, 5), // Limit
      });
    }

    return subsequences;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    patterns: PathPatternDTO[],
    itemPaths: Array<{
      path: Array<{ zoneId: string }>;
    }>,
    zonesMap: Map<string, { name: string; type: string }>
  ): PathPatternsDTO['summary'] {
    // Calculate average path length
    const avgPathLength =
      itemPaths.length > 0
        ? itemPaths.reduce((sum, p) => sum + p.path.length, 0) / itemPaths.length
        : 0;

    // Find most common start and end zones
    const startCounts = new Map<string, number>();
    const endCounts = new Map<string, number>();

    for (const itemPath of itemPaths) {
      if (itemPath.path.length === 0) continue;

      const startZone = itemPath.path[0]!.zoneId;
      const endZone = itemPath.path[itemPath.path.length - 1]!.zoneId;

      startCounts.set(startZone, (startCounts.get(startZone) || 0) + 1);
      endCounts.set(endZone, (endCounts.get(endZone) || 0) + 1);
    }

    let mostCommonStart = '';
    let mostCommonStartCount = 0;
    for (const [zoneId, count] of startCounts) {
      if (count > mostCommonStartCount) {
        mostCommonStart = zoneId;
        mostCommonStartCount = count;
      }
    }

    let mostCommonEnd = '';
    let mostCommonEndCount = 0;
    for (const [zoneId, count] of endCounts) {
      if (count > mostCommonEndCount) {
        mostCommonEnd = zoneId;
        mostCommonEndCount = count;
      }
    }

    return {
      totalPatternsFound: patterns.length,
      uniquePathsAnalyzed: itemPaths.length,
      avgPathLength: Math.round(avgPathLength * 100) / 100,
      mostCommonStartZone: zonesMap.get(mostCommonStart)?.name || 'Unknown Zone',
      mostCommonEndZone: zonesMap.get(mostCommonEnd)?.name || 'Unknown Zone',
    };
  }
}
