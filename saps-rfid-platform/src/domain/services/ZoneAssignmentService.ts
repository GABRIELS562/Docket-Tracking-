import { ok, err } from 'neverthrow';

import { LocationConfidenceCalculator } from './LocationConfidenceCalculator';

import type { Reader } from '../entities/Reader';
import type { Zone } from '../entities/Zone';
import type { TagRead } from '../value-objects/TagRead';
import type { Result } from 'neverthrow';

/**
 * Zone assignment decision result
 */
export interface ZoneAssignmentDecision {
  /** The assigned zone ID */
  readonly zoneId: string;

  /** Confidence level of this assignment (0.0 to 1.0) */
  readonly confidence: number;

  /** The reader that provided this assignment */
  readonly readerId: string;

  /** Whether this represents a zone change */
  readonly isZoneChange: boolean;

  /** Previous zone ID (if applicable) */
  readonly previousZoneId: string | null;
}

/**
 * Domain Service for determining zone assignment from tag reads
 *
 * @description
 * Business logic for determining which zone an item is located in
 * based on RFID tag reads from multiple readers.
 *
 * This service handles complex scenarios:
 * - Multiple readers detecting the same tag
 * - Tags detected at zone boundaries
 * - Conflicting reads from different zones
 * - Determining zone transitions
 */
export class ZoneAssignmentService {
  private readonly confidenceCalculator: LocationConfidenceCalculator;

  constructor() {
    this.confidenceCalculator = new LocationConfidenceCalculator();
  }

  /**
   * Determines zone assignment from a single tag read
   *
   * @param tagRead - The RFID tag read
   * @param reader - The reader that detected the tag
   * @param currentZoneId - Current zone assignment (if any)
   * @returns Result containing zone assignment decision
   *
   * @example
   * ```typescript
   * const service = new ZoneAssignmentService();
   * const result = await service.determineZoneFromSingleRead(
   *   tagRead,
   *   reader,
   *   currentZoneId
   * );
   *
   * if (result.isOk()) {
   *   const decision = result.value;
   *   if (decision.isZoneChange) {
   *     console.log(`Item moved from ${decision.previousZoneId} to ${decision.zoneId}`);
   *   }
   * }
   * ```
   */
  determineZoneFromSingleRead(
    tagRead: TagRead,
    reader: Reader,
    currentZoneId: string | null
  ): Result<ZoneAssignmentDecision, Error> {
    // Calculate confidence from the tag read
    const confidence = this.confidenceCalculator.calculateFromSingleRead(tagRead);

    // Get the reader's zone
    const readerZoneId = reader.getZoneId();

    // Determine if this is a zone change
    const isZoneChange = currentZoneId !== null && currentZoneId !== readerZoneId;

    const decision: ZoneAssignmentDecision = {
      zoneId: readerZoneId,
      confidence,
      readerId: reader.getId(),
      isZoneChange,
      previousZoneId: currentZoneId,
    };

    return ok(decision);
  }

  /**
   * Determines zone assignment from multiple recent reads
   *
   * This is more complex - handles cases where multiple readers in different
   * zones detect the same tag (e.g., at zone boundaries).
   *
   * Strategy:
   * 1. Group reads by reader/zone
   * 2. Calculate confidence for each zone
   * 3. Select zone with highest confidence
   * 4. Apply minimum confidence threshold
   *
   * @param tagReads - Recent tag reads
   * @param readers - Map of reader ID to Reader entity
   * @param currentZoneId - Current zone assignment (if any)
   * @param minimumConfidence - Minimum confidence to accept assignment (default: 0.5)
   * @returns Result containing zone assignment decision
   */
  determineZoneFromMultipleReads(
    tagReads: TagRead[],
    readers: Map<string, Reader>,
    currentZoneId: string | null,
    minimumConfidence: number = 0.5
  ): Result<ZoneAssignmentDecision, Error> {
    if (tagReads.length === 0) {
      return err(new Error('No tag reads provided'));
    }

    // Group reads by zone
    const readsByZone = this.groupReadsByZone(tagReads, readers);

    if (readsByZone.size === 0) {
      return err(new Error('No valid zones found for tag reads'));
    }

    // Calculate confidence for each zone
    const zoneConfidences = new Map<string, number>();
    const zoneReaders = new Map<string, string>();

    for (const [zoneId, reads] of readsByZone.entries()) {
      const confidence = this.confidenceCalculator.calculateFromMultipleReads(reads);
      zoneConfidences.set(zoneId, confidence);

      // Store the reader with the strongest signal in this zone
      const strongestRead = reads.reduce((strongest, current) =>
        current.getRssi() > strongest.getRssi() ? current : strongest
      );
      zoneReaders.set(zoneId, strongestRead.getReaderId());
    }

    // Find zone with highest confidence
    let bestZoneId: string | null = null;
    let bestConfidence = 0;

    for (const [zoneId, confidence] of zoneConfidences.entries()) {
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestZoneId = zoneId;
      }
    }

    // If no zone meets minimum confidence, keep current zone
    if (bestZoneId === null || bestConfidence < minimumConfidence) {
      if (currentZoneId === null) {
        return err(new Error('Unable to determine zone with sufficient confidence'));
      }

      // Return current zone with lower confidence
      return ok({
        zoneId: currentZoneId,
        confidence: bestConfidence,
        readerId: tagReads[0]!.getReaderId(),
        isZoneChange: false,
        previousZoneId: currentZoneId,
      });
    }

    // Determine if this is a zone change
    const isZoneChange = currentZoneId !== null && currentZoneId !== bestZoneId;

    const decision: ZoneAssignmentDecision = {
      zoneId: bestZoneId,
      confidence: bestConfidence,
      readerId: zoneReaders.get(bestZoneId)!,
      isZoneChange,
      previousZoneId: currentZoneId,
    };

    return ok(decision);
  }

  /**
   * Checks if a zone transition should be considered valid
   *
   * Business rules for valid transitions:
   * - Confidence must be above threshold (default: 0.7)
   * - For adjacent zones, lower confidence acceptable (0.5)
   * - For non-adjacent zones, higher confidence required (0.8)
   *
   * @param decision - The zone assignment decision
   * @param zones - Map of zone IDs to Zone entities
   * @returns true if the transition should be accepted
   */
  isValidTransition(decision: ZoneAssignmentDecision, zones: Map<string, Zone>): boolean {
    if (!decision.isZoneChange) {
      return true; // Not a transition
    }

    // Basic confidence check
    if (decision.confidence < 0.5) {
      return false;
    }

    const fromZone = decision.previousZoneId ? zones.get(decision.previousZoneId) : null;
    const toZone = zones.get(decision.zoneId);

    if (!toZone) {
      return false; // Invalid destination zone
    }

    // If zones are adjacent (share parent or one is parent of other), accept lower confidence
    if (fromZone && this.areZonesAdjacent(fromZone, toZone)) {
      return decision.confidence >= 0.5;
    }

    // For non-adjacent zones, require higher confidence
    return decision.confidence >= 0.8;
  }

  /**
   * Groups tag reads by the zone of their readers
   */
  private groupReadsByZone(
    tagReads: TagRead[],
    readers: Map<string, Reader>
  ): Map<string, TagRead[]> {
    const readsByZone = new Map<string, TagRead[]>();

    for (const tagRead of tagReads) {
      const reader = readers.get(tagRead.getReaderId());
      if (!reader) {
        continue; // Skip if reader not found
      }

      const zoneId = reader.getZoneId();
      const existing = readsByZone.get(zoneId) ?? [];
      existing.push(tagRead);
      readsByZone.set(zoneId, existing);
    }

    return readsByZone;
  }

  /**
   * Determines if two zones are adjacent (simplified logic)
   *
   * In a real system, this might check:
   * - Physical proximity from coordinates
   * - Shared parent zones
   * - Explicit adjacency relationships
   */
  private areZonesAdjacent(zone1: Zone, zone2: Zone): boolean {
    // Check if they share a parent
    if (zone1.getParentZoneId() === zone2.getParentZoneId() && zone1.getParentZoneId() !== null) {
      return true;
    }

    // Check if one is the parent of the other
    if (zone1.getId() === zone2.getParentZoneId() || zone2.getId() === zone1.getParentZoneId()) {
      return true;
    }

    return false;
  }

  /**
   * Determines if an item should be marked as having left a zone
   *
   * Business rule: If no reads in a zone for X seconds, consider it left
   *
   * @param lastReadAgeMs - Milliseconds since last read in the zone
   * @param thresholdMs - Threshold in milliseconds (default: 10000ms = 10s)
   * @returns true if item should be considered as having left
   */
  shouldMarkAsLeft(lastReadAgeMs: number, thresholdMs: number = 10000): boolean {
    return lastReadAgeMs > thresholdMs;
  }
}
