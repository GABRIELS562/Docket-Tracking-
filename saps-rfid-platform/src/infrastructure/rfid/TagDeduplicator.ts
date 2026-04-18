import type { ParsedTagRead } from './TagProcessor';
import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Tag Deduplicator Statistics
 */
export interface DeduplicatorStats {
  totalTagsProcessed: number;
  duplicatesFiltered: number;
  uniqueTagsPassed: number;
  cacheSize: number;
  cacheHitRate: number;
  lastProcessedAt: Date | null;
}

/**
 * Cache Entry
 */
interface CacheEntry {
  epc: string;
  lastSeenAt: number;
  hitCount: number;
}

/**
 * TagDeduplicator - Filters duplicate tag reads using LRU cache
 *
 * @description
 * **Problem:** RFID readers report the same tag multiple times per second.
 * If we process every read, we'd update the database 10+ times/second
 * for the same tag, causing performance issues and unnecessary writes.
 *
 * **Solution:** Track recently seen tags in an in-memory LRU cache.
 * Tag is considered duplicate if seen within X seconds (configurable).
 *
 * **Strategy:**
 * - Keep in-memory cache of seen tags with timestamps
 * - Tag is duplicate if seen within deduplication window
 * - Use LRU (Least Recently Used) eviction to limit memory
 * - Periodic cleanup removes stale entries
 *
 * **Performance:**
 * - Cache lookup: O(1) using Map
 * - Memory usage: ~100 bytes per cached tag
 * - 10,000 tags = ~1 MB memory
 * - Cleanup runs every 10 seconds
 *
 * **Configuration:**
 * - Deduplication window: 2 seconds (default)
 * - Max cache size: 10,000 entries (default)
 * - Cleanup interval: 10 seconds
 *
 * @example
 * ```typescript
 * const deduplicator = new TagDeduplicator(logger, 2, 10000);
 *
 * const tagReads = await processor.process(llrpMessage);
 * const uniqueReads = deduplicator.filter(tagReads);
 *
 * console.log(`Filtered ${tagReads.length - uniqueReads.length} duplicates`);
 * ```
 */
export class TagDeduplicator {
  private cache: Map<string, CacheEntry>;
  private deduplicationWindowMs: number;
  private maxCacheSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private stats: Omit<DeduplicatorStats, 'cacheSize' | 'cacheHitRate'> = {
    totalTagsProcessed: 0,
    duplicatesFiltered: 0,
    uniqueTagsPassed: 0,
    lastProcessedAt: null,
  };

  constructor(
    private readonly logger: ILogger,
    deduplicationWindowSeconds: number = 2,
    maxCacheSize: number = 10000
  ) {
    this.cache = new Map();
    this.deduplicationWindowMs = deduplicationWindowSeconds * 1000;
    this.maxCacheSize = maxCacheSize;

    // Start cleanup task
    this.startCleanupTask();

    this.logger.info('TagDeduplicator initialized', {
      deduplicationWindowMs: this.deduplicationWindowMs,
      maxCacheSize: this.maxCacheSize,
    });
  }

  /**
   * Filter duplicate tag reads
   *
   * @param tagReads - Array of tag reads from processor
   * @returns Filtered array with duplicates removed
   *
   * @description
   * Processes tag reads in order, filtering out any tag that was
   * seen within the deduplication window. Updates cache for each
   * unique tag.
   *
   * **Algorithm:**
   * 1. For each tag read:
   *    a. Check if tag is in cache
   *    b. If in cache and within window → duplicate (filter out)
   *    c. If not in cache or outside window → unique (keep)
   *    d. Update cache with current timestamp
   * 2. Enforce cache size limit (LRU eviction)
   *
   * @example
   * ```typescript
   * const tagReads = [
   *   { epc: 'ABC123...', rssi: -50, ... },
   *   { epc: 'ABC123...', rssi: -52, ... }, // Duplicate within 2s
   *   { epc: 'DEF456...', rssi: -55, ... },
   * ];
   *
   * const uniqueReads = deduplicator.filter(tagReads);
   * // Returns: 2 reads (ABC123 once, DEF456 once)
   * ```
   */
  filter(tagReads: ParsedTagRead[]): ParsedTagRead[] {
    const now = Date.now();
    const uniqueReads: ParsedTagRead[] = [];
    const startTime = now;

    for (const tagRead of tagReads) {
      this.stats.totalTagsProcessed++;

      const cacheEntry = this.cache.get(tagRead.epc);

      if (cacheEntry) {
        const timeSinceLastSeen = now - cacheEntry.lastSeenAt;

        if (timeSinceLastSeen < this.deduplicationWindowMs) {
          // Duplicate - filter out
          this.stats.duplicatesFiltered++;
          cacheEntry.hitCount++;

          this.logger.debug('Duplicate tag filtered', {
            epc: tagRead.epc,
            timeSinceLastSeenMs: timeSinceLastSeen,
            rssi: tagRead.rssi,
            antennaPort: tagRead.antennaPort,
          });

          continue; // Skip this read
        }
      }

      // Not a duplicate - keep it
      uniqueReads.push(tagRead);
      this.stats.uniqueTagsPassed++;

      // Update cache
      this.cache.set(tagRead.epc, {
        epc: tagRead.epc,
        lastSeenAt: now,
        hitCount: cacheEntry ? cacheEntry.hitCount + 1 : 1,
      });

      // Enforce cache size limit (LRU eviction)
      if (this.cache.size > this.maxCacheSize) {
        this.evictOldest();
      }
    }

    this.stats.lastProcessedAt = new Date();

    const processingTime = Date.now() - startTime;
    if (processingTime > 5) {
      this.logger.warn('Slow deduplication processing', {
        processingTimeMs: processingTime,
        tagCount: tagReads.length,
        uniqueCount: uniqueReads.length,
      });
    }

    if (uniqueReads.length !== tagReads.length) {
      this.logger.debug('Tags deduplicated', {
        totalTags: tagReads.length,
        uniqueTags: uniqueReads.length,
        filtered: tagReads.length - uniqueReads.length,
      });
    }

    return uniqueReads;
  }

  /**
   * Evict oldest entry from cache (LRU)
   *
   * @description
   * Map maintains insertion order in JavaScript.
   * First key is the oldest entry.
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.logger.debug('Evicted oldest cache entry', {
        epc: firstKey,
        cacheSize: this.cache.size,
      });
    }
  }

  /**
   * Start periodic cleanup task
   *
   * @description
   * Removes entries older than deduplication window.
   * Runs every 10 seconds to prevent memory leaks.
   */
  private startCleanupTask(): void {
    if (this.cleanupInterval) {
      this.logger.warn('Cleanup task already running');
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10000); // Every 10 seconds

    // Allow Node.js to exit even if interval is running
    this.cleanupInterval.unref();

    this.logger.debug('Cleanup task started');
  }

  /**
   * Stop periodic cleanup task
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.debug('Cleanup task stopped');
    }
  }

  /**
   * Perform cache cleanup
   *
   * @description
   * Removes entries older than deduplication window.
   * This prevents memory leaks from tags that are no longer being read.
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    const entriesToRemove: string[] = [];

    // Identify stale entries
    for (const [epc, entry] of this.cache.entries()) {
      const age = now - entry.lastSeenAt;
      if (age > this.deduplicationWindowMs * 2) {
        // Remove if older than 2x deduplication window
        entriesToRemove.push(epc);
      }
    }

    // Remove stale entries
    for (const epc of entriesToRemove) {
      this.cache.delete(epc);
      removedCount++;
    }

    if (removedCount > 0) {
      this.logger.debug('Cache cleanup completed', {
        removed: removedCount,
        remaining: this.cache.size,
        maxSize: this.maxCacheSize,
      });
    }
  }

  /**
   * Get deduplicator statistics
   */
  getStats(): DeduplicatorStats {
    const cacheHitRate =
      this.stats.totalTagsProcessed > 0
        ? (this.stats.duplicatesFiltered / this.stats.totalTagsProcessed) * 100
        : 0;

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100, // Round to 2 decimals
    };
  }

  /**
   * Get detailed cache information (for debugging)
   */
  getCacheInfo(): {
    size: number;
    maxSize: number;
    oldestEntry: { epc: string; ageMs: number } | null;
    newestEntry: { epc: string; ageMs: number } | null;
  } {
    const now = Date.now();
    let oldestEntry: CacheEntry | null = null;
    let newestEntry: CacheEntry | null = null;

    for (const entry of this.cache.values()) {
      if (!oldestEntry || entry.lastSeenAt < oldestEntry.lastSeenAt) {
        oldestEntry = entry;
      }
      if (!newestEntry || entry.lastSeenAt > newestEntry.lastSeenAt) {
        newestEntry = entry;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      oldestEntry: oldestEntry
        ? { epc: oldestEntry.epc, ageMs: now - oldestEntry.lastSeenAt }
        : null,
      newestEntry: newestEntry
        ? { epc: newestEntry.epc, ageMs: now - newestEntry.lastSeenAt }
        : null,
    };
  }

  /**
   * Check if tag is in cache
   *
   * @param epc - Tag EPC to check
   * @returns True if tag is in cache and within deduplication window
   */
  isInCache(epc: string): boolean {
    const entry = this.cache.get(epc);
    if (!entry) {
      return false;
    }

    const age = Date.now() - entry.lastSeenAt;
    return age < this.deduplicationWindowMs;
  }

  /**
   * Get cache entry for tag
   *
   * @param epc - Tag EPC to lookup
   * @returns Cache entry or undefined
   */
  getCacheEntry(epc: string): CacheEntry | undefined {
    return this.cache.get(epc);
  }

  /**
   * Clear entire cache
   *
   * @description
   * Use for testing or manual cache reset.
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info('Cache cleared', { previousSize: size });
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      totalTagsProcessed: 0,
      duplicatesFiltered: 0,
      uniqueTagsPassed: 0,
      lastProcessedAt: null,
    };
    this.logger.debug('Statistics reset');
  }

  /**
   * Cleanup resources (call on shutdown)
   */
  dispose(): void {
    this.stopCleanupTask();
    this.clear();
    this.logger.info('TagDeduplicator disposed');
  }
}
