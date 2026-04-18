import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import {
  GetItemJourneyInput,
  ItemJourneyDTO,
  JourneyStopDTO,
  JourneyTransitionDTO,
  JourneyAnomalyDTO,
} from '../../dto/AnalyticsDTO';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Get Item Journey Use Case
 *
 * Retrieves the complete journey/path of an item through zones with:
 * - Ordered zone visits (the path)
 * - Zone transitions with timing
 * - Dwell time analysis
 * - Anomaly detection (unexpected zones, long dwell times, etc.)
 *
 * @example
 * ```typescript
 * const result = await getItemJourney.execute({
 *   tenantId: 'tenant-uuid',
 *   itemNumber: 'INV-2025-000001',
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 * });
 * ```
 */
@injectable()
export class GetItemJourneyUseCase {
  // Configuration for anomaly detection
  private readonly LONG_DWELL_THRESHOLD_MINUTES = 120; // 2 hours
  private readonly RAPID_MOVEMENT_THRESHOLD_SECONDS = 30; // 30 seconds between zones
  private readonly SIGNAL_LOSS_THRESHOLD_MINUTES = 60; // 1 hour without reads

  constructor(
    @inject('IItemRepository') private itemRepo: IItemRepository,
    @inject('ILocationHistoryRepository') private locationRepo: ILocationHistoryRepository,
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetItemJourneyInput): Promise<Result<ItemJourneyDTO, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting item journey', {
        tenantId: input.tenantId,
        itemNumber: input.itemNumber,
      });

      // Validate item number
      const itemNumberResult = ItemNumber.create(input.itemNumber);
      if (itemNumberResult.isErr()) {
        return err(new Error(`Invalid item number: ${itemNumberResult.error.message}`));
      }

      // Get item details
      const itemResult = await this.itemRepo.findByItemNumber(
        itemNumberResult.value,
        input.tenantId
      );
      if (itemResult.isErr()) {
        return err(new Error(`Item not found: ${input.itemNumber}`));
      }
      const item = itemResult.value;

      // Determine time range
      const endDate = input.endDate || new Date();
      const startDate = input.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default

      // Get location history for the item
      const historyResult = await this.locationRepo.getHistoryForItem(
        input.tenantId,
        item.getId(),
        startDate,
        endDate,
        10000 // High limit to get complete history
      );
      if (historyResult.isErr()) {
        return err(historyResult.error);
      }
      const history = historyResult.value;

      // Get zone visits (aggregated)
      const zoneVisitsResult = await this.locationRepo.getZoneVisits(
        input.tenantId,
        item.getId(),
        startDate,
        endDate
      );
      const rawZoneVisits = zoneVisitsResult.isOk() ? zoneVisitsResult.value : [];

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

      // Map zone visits to expected format
      const zoneVisits = rawZoneVisits.map((v) => ({
        zoneId: v.zoneId,
        zoneName: v.zoneName,
        entryTime: v.enteredAt,
        exitTime: v.exitedAt,
        durationMinutes: v.durationSeconds ? v.durationSeconds / 60 : 0,
        readCount: v.readCount,
        avgRssi: v.averageRssi,
      }));

      // Build path (ordered zone visits)
      const path = this.buildPath(zoneVisits, zonesMap);

      // Build transitions
      const transitions = this.buildTransitions(history, zonesMap);

      // Detect anomalies
      const anomalies = this.detectAnomalies(path, transitions, zonesMap);

      // Calculate summary statistics
      const summary = this.calculateSummary(path, transitions);

      // Determine current status
      const currentStatus = this.determineCurrentStatus(
        {
          getCurrentZoneId: () => item.getCurrentZoneId(),
          getLastSeenAt: () => item.getLastSeenAt(),
          getLocationConfidence: () => item.getLocationConfidence() ?? 0,
        },
        path,
        zonesMap
      );

      // Calculate duration
      const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

      const journey: ItemJourneyDTO = {
        itemId: item.getId(),
        itemNumber: item.getItemNumber().getValue(),
        rfidEpc: item.getRfidEpc().getValue(),
        description: item.getDescription(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationHours: Math.round(durationHours * 100) / 100,
        },
        summary,
        path,
        transitions,
        currentStatus,
        anomalies,
      };

      this.logger.info('Item journey retrieved', {
        tenantId: input.tenantId,
        itemNumber: input.itemNumber,
        zonesVisited: path.length,
        transitions: transitions.length,
        anomalies: anomalies.length,
        durationMs: Date.now() - startTime,
      });

      return ok(journey);
    } catch (error) {
      this.logger.error('Failed to get item journey', {
        tenantId: input.tenantId,
        itemNumber: input.itemNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Build ordered path from zone visits
   */
  private buildPath(
    zoneVisits: Array<{
      zoneId: string;
      zoneName: string;
      entryTime: Date;
      exitTime: Date | null;
      durationMinutes: number;
      readCount: number;
      avgRssi: number;
    }>,
    zonesMap: Map<string, { name: string; type: string }>
  ): JourneyStopDTO[] {
    // Sort by entry time
    const sorted = [...zoneVisits].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

    return sorted.map((visit, index) => {
      const zoneInfo = zonesMap.get(visit.zoneId);
      const isCurrentStop = visit.exitTime === null;

      return {
        sequence: index + 1,
        zoneId: visit.zoneId,
        zoneName: visit.zoneName || zoneInfo?.name || 'Unknown Zone',
        zoneType: zoneInfo?.type || 'unknown',
        entryTime: visit.entryTime.toISOString(),
        exitTime: visit.exitTime?.toISOString() || null,
        dwellTimeMinutes: Math.round(visit.durationMinutes),
        readCount: visit.readCount,
        avgConfidence: this.rssiToConfidence(visit.avgRssi),
        avgRssi: Math.round(visit.avgRssi * 100) / 100,
        status: isCurrentStop ? 'current' : 'completed',
      };
    });
  }

  /**
   * Build zone transitions from history
   */
  private buildTransitions(
    history: Array<{
      time: Date;
      zoneId: string | null;
      zoneName: string | null;
      readerId: string;
      readerName: string;
      locationConfidence: number | null;
      eventType: string;
    }>,
    zonesMap: Map<string, { name: string; type: string }>
  ): JourneyTransitionDTO[] {
    const transitions: JourneyTransitionDTO[] = [];
    let previousZone: { id: string | null; name: string | null; time: Date } | null = null;
    let sequence = 0;

    // Sort by time
    const sorted = [...history]
      .filter((h) => h.eventType === 'zone_entry' || h.eventType === 'movement')
      .sort((a, b) => a.time.getTime() - b.time.getTime());

    for (const entry of sorted) {
      if (!entry.zoneId) continue;

      // Check if zone changed
      if (previousZone && previousZone.id !== entry.zoneId) {
        sequence++;
        const transitionTimeSeconds = previousZone
          ? Math.round((entry.time.getTime() - previousZone.time.getTime()) / 1000)
          : 0;

        const zoneInfo = zonesMap.get(entry.zoneId);

        transitions.push({
          sequence,
          timestamp: entry.time.toISOString(),
          fromZoneId: previousZone.id,
          fromZoneName: previousZone.name,
          toZoneId: entry.zoneId,
          toZoneName: entry.zoneName || zoneInfo?.name || 'Unknown Zone',
          transitionTimeSeconds,
          confidence: entry.locationConfidence || 0,
          readerId: entry.readerId,
          readerName: entry.readerName,
          isExpectedTransition: true, // Would need zone adjacency data to determine
        });
      }

      previousZone = {
        id: entry.zoneId,
        name: entry.zoneName,
        time: entry.time,
      };
    }

    return transitions;
  }

  /**
   * Detect anomalies in the journey
   */
  private detectAnomalies(
    path: JourneyStopDTO[],
    transitions: JourneyTransitionDTO[],
    _zonesMap: Map<string, { name: string; type: string }>
  ): JourneyAnomalyDTO[] {
    const anomalies: JourneyAnomalyDTO[] = [];

    // Check for long dwell times
    for (const stop of path) {
      if (stop.dwellTimeMinutes > this.LONG_DWELL_THRESHOLD_MINUTES) {
        anomalies.push({
          type: 'long_dwell',
          severity:
            stop.dwellTimeMinutes > this.LONG_DWELL_THRESHOLD_MINUTES * 2 ? 'high' : 'medium',
          timestamp: stop.entryTime,
          description: `Item stayed in ${stop.zoneName} for ${stop.dwellTimeMinutes} minutes (threshold: ${this.LONG_DWELL_THRESHOLD_MINUTES} min)`,
          zoneId: stop.zoneId,
          zoneName: stop.zoneName,
          details: {
            dwellTimeMinutes: stop.dwellTimeMinutes,
            threshold: this.LONG_DWELL_THRESHOLD_MINUTES,
          },
        });
      }
    }

    // Check for rapid movements
    for (const transition of transitions) {
      if (transition.transitionTimeSeconds < this.RAPID_MOVEMENT_THRESHOLD_SECONDS) {
        anomalies.push({
          type: 'rapid_movement',
          severity: 'low',
          timestamp: transition.timestamp,
          description: `Rapid transition from ${transition.fromZoneName} to ${transition.toZoneName} in ${transition.transitionTimeSeconds} seconds`,
          zoneId: transition.toZoneId,
          zoneName: transition.toZoneName,
          details: {
            transitionTimeSeconds: transition.transitionTimeSeconds,
            fromZone: transition.fromZoneName,
            toZone: transition.toZoneName,
          },
        });
      }
    }

    // Check for backtracking (returning to a previous zone)
    const visitedZones: string[] = [];
    for (const stop of path) {
      if (visitedZones.includes(stop.zoneId)) {
        const previousVisitIndex = visitedZones.indexOf(stop.zoneId);
        const zonesSinceLastVisit = visitedZones.length - previousVisitIndex - 1;

        if (zonesSinceLastVisit > 0) {
          anomalies.push({
            type: 'backtrack',
            severity: 'low',
            timestamp: stop.entryTime,
            description: `Item returned to ${stop.zoneName} after visiting ${zonesSinceLastVisit} other zone(s)`,
            zoneId: stop.zoneId,
            zoneName: stop.zoneName,
            details: {
              zonesSinceLastVisit,
              previousVisitSequence: previousVisitIndex + 1,
              currentSequence: stop.sequence,
            },
          });
        }
      }
      visitedZones.push(stop.zoneId);
    }

    // Check for signal loss (gaps in readings)
    for (let i = 1; i < path.length; i++) {
      const prevStop = path[i - 1]!;
      const currStop = path[i]!;

      if (prevStop.exitTime && currStop.entryTime) {
        const gapMs =
          new Date(currStop.entryTime).getTime() - new Date(prevStop.exitTime).getTime();
        const gapMinutes = gapMs / (1000 * 60);

        if (gapMinutes > this.SIGNAL_LOSS_THRESHOLD_MINUTES) {
          anomalies.push({
            type: 'signal_loss',
            severity: gapMinutes > this.SIGNAL_LOSS_THRESHOLD_MINUTES * 4 ? 'high' : 'medium',
            timestamp: prevStop.exitTime,
            description: `Signal lost for ${Math.round(gapMinutes)} minutes between ${prevStop.zoneName} and ${currStop.zoneName}`,
            zoneId: null,
            zoneName: null,
            details: {
              gapMinutes: Math.round(gapMinutes),
              fromZone: prevStop.zoneName,
              toZone: currStop.zoneName,
            },
          });
        }
      }
    }

    // Sort by severity (high first) then timestamp
    return anomalies.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    path: JourneyStopDTO[],
    transitions: JourneyTransitionDTO[]
  ): ItemJourneyDTO['summary'] {
    const totalDwellTime = path.reduce((sum, stop) => sum + stop.dwellTimeMinutes, 0);
    const avgDwellTime = path.length > 0 ? totalDwellTime / path.length : 0;

    // Find longest dwell
    let longestDwellZone: string | null = null;
    let longestDwellMinutes = 0;
    for (const stop of path) {
      if (stop.dwellTimeMinutes > longestDwellMinutes) {
        longestDwellMinutes = stop.dwellTimeMinutes;
        longestDwellZone = stop.zoneName;
      }
    }

    return {
      totalZonesVisited: path.length,
      totalTransitions: transitions.length,
      totalDistanceMeters: null, // Would need zone coordinates to calculate
      totalDwellTimeMinutes: Math.round(totalDwellTime),
      avgDwellTimeMinutes: Math.round(avgDwellTime * 100) / 100,
      longestDwellZone,
      longestDwellMinutes: Math.round(longestDwellMinutes),
    };
  }

  /**
   * Determine current item status
   */
  private determineCurrentStatus(
    item: {
      getCurrentZoneId: () => string | null;
      getLastSeenAt: () => Date | null;
      getLocationConfidence: () => number;
    },
    path: JourneyStopDTO[],
    zonesMap: Map<string, { name: string; type: string }>
  ): ItemJourneyDTO['currentStatus'] {
    const currentZoneId = item.getCurrentZoneId();
    const lastSeen = item.getLastSeenAt();
    const confidence = item.getLocationConfidence();

    // Find current stop in path
    const currentStop = path.find((stop) => stop.status === 'current');

    // Determine status
    let status: 'active' | 'idle' | 'missing' = 'active';
    if (!lastSeen) {
      status = 'missing';
    } else {
      const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen > 24) {
        status = 'missing';
      } else if (hoursSinceLastSeen > 4) {
        status = 'idle';
      }
    }

    const zoneInfo = currentZoneId ? zonesMap.get(currentZoneId) : null;

    return {
      zoneId: currentZoneId,
      zoneName: zoneInfo?.name || currentStop?.zoneName || null,
      since: currentStop?.entryTime || lastSeen?.toISOString() || null,
      dwellTimeMinutes: currentStop?.dwellTimeMinutes || 0,
      confidence,
      status,
    };
  }

  /**
   * Convert RSSI to confidence score (0-1)
   */
  private rssiToConfidence(rssi: number): number {
    // RSSI typically ranges from -30 (excellent) to -90 (poor)
    // Map to 0-1 confidence
    const normalized = Math.max(0, Math.min(1, (rssi + 90) / 60));
    return Math.round(normalized * 100) / 100;
  }
}
