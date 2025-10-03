import type { TagRead } from '../value-objects/TagRead';

/**
 * Domain Service for calculating location confidence
 *
 * @description
 * Determines the confidence level (0.0 to 1.0) that a docket is actually
 * in a particular zone based on tag read characteristics.
 *
 * Factors considered:
 * - Signal strength (RSSI)
 * - Number of recent reads
 * - Read consistency across antennas
 * - Time since last read
 */
export class LocationConfidenceCalculator {
  private static readonly EXCELLENT_RSSI_THRESHOLD = -40; // dBm
  private static readonly GOOD_RSSI_THRESHOLD = -55; // dBm
  private static readonly FAIR_RSSI_THRESHOLD = -70; // dBm
  private static readonly MIN_READS_FOR_HIGH_CONFIDENCE = 3;
  private static readonly MAX_AGE_FOR_HIGH_CONFIDENCE_MS = 5000; // 5 seconds

  /**
   * Calculates confidence based on a single tag read
   *
   * @param tagRead - The tag read to evaluate
   * @returns Confidence value between 0.0 and 1.0
   *
   * @example
   * ```typescript
   * const calculator = new LocationConfidenceCalculator();
   * const confidence = calculator.calculateFromSingleRead(tagRead);
   * // confidence might be 0.85 for a strong, recent read
   * ```
   */
  calculateFromSingleRead(tagRead: TagRead): number {
    let confidence = 0.5; // Base confidence

    // Factor 1: RSSI (signal strength) - 40% weight
    const rssiScore = this.calculateRssiScore(tagRead.getRssi());
    confidence += rssiScore * 0.4;

    // Factor 2: Read recency - 30% weight
    const recencyScore = this.calculateRecencyScore(tagRead.getAgeMs());
    confidence += recencyScore * 0.3;

    // Factor 3: Read count - 20% weight
    const countScore = this.calculateCountScore(tagRead.getReadCount());
    confidence += countScore * 0.2;

    // Factor 4: Signal reliability - 10% weight
    if (tagRead.isSignalReliable()) {
      confidence += 0.1;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculates confidence based on multiple recent reads
   *
   * @param tagReads - Array of recent tag reads
   * @returns Confidence value between 0.0 and 1.0
   *
   * @example
   * ```typescript
   * const calculator = new LocationConfidenceCalculator();
   * const confidence = calculator.calculateFromMultipleReads(recentReads);
   * // confidence might be 0.95 for consistent, strong reads
   * ```
   */
  calculateFromMultipleReads(tagReads: TagRead[]): number {
    if (tagReads.length === 0) {
      return 0;
    }

    if (tagReads.length === 1) {
      return this.calculateFromSingleRead(tagReads[0]!);
    }

    let confidence = 0.5; // Base confidence

    // Factor 1: Average RSSI - 30% weight
    const avgRssi = this.calculateAverageRssi(tagReads);
    const rssiScore = this.calculateRssiScore(avgRssi);
    confidence += rssiScore * 0.3;

    // Factor 2: Read consistency (low variance in RSSI) - 20% weight
    const consistencyScore = this.calculateConsistencyScore(tagReads);
    confidence += consistencyScore * 0.2;

    // Factor 3: Number of reads - 20% weight
    const readCountScore = this.calculateMultiReadCountScore(tagReads.length);
    confidence += readCountScore * 0.2;

    // Factor 4: Antenna diversity - 15% weight
    const diversityScore = this.calculateAntennaDiversityScore(tagReads);
    confidence += diversityScore * 0.15;

    // Factor 5: Recency - 15% weight
    const mostRecentRead = tagReads.reduce((latest, current) =>
      current.getTimestamp() > latest.getTimestamp() ? current : latest
    );
    const recencyScore = this.calculateRecencyScore(mostRecentRead.getAgeMs());
    confidence += recencyScore * 0.15;

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculates an RSSI score (0 to 1)
   */
  private calculateRssiScore(rssi: number): number {
    if (rssi > LocationConfidenceCalculator.EXCELLENT_RSSI_THRESHOLD) {
      return 1.0;
    }
    if (rssi > LocationConfidenceCalculator.GOOD_RSSI_THRESHOLD) {
      return 0.8;
    }
    if (rssi > LocationConfidenceCalculator.FAIR_RSSI_THRESHOLD) {
      return 0.5;
    }
    // Linear scale for poor signals
    return Math.max(0, (rssi + 100) / 30);
  }

  /**
   * Calculates a recency score (0 to 1)
   */
  private calculateRecencyScore(ageMs: number): number {
    if (ageMs <= LocationConfidenceCalculator.MAX_AGE_FOR_HIGH_CONFIDENCE_MS) {
      return 1.0;
    }

    // Exponential decay: confidence halves every 10 seconds
    const decayFactor = 10000; // 10 seconds
    return Math.exp(-ageMs / decayFactor);
  }

  /**
   * Calculates a read count score (0 to 1)
   */
  private calculateCountScore(readCount: number): number {
    if (readCount >= LocationConfidenceCalculator.MIN_READS_FOR_HIGH_CONFIDENCE) {
      return 1.0;
    }

    return readCount / LocationConfidenceCalculator.MIN_READS_FOR_HIGH_CONFIDENCE;
  }

  /**
   * Calculates a multi-read count score (0 to 1)
   */
  private calculateMultiReadCountScore(readCount: number): number {
    // Diminishing returns after 5 reads
    const normalizedCount = Math.min(readCount, 10) / 10;
    return normalizedCount;
  }

  /**
   * Calculates average RSSI from multiple reads
   */
  private calculateAverageRssi(tagReads: TagRead[]): number {
    const sum = tagReads.reduce((acc, read) => acc + read.getRssi(), 0);
    return sum / tagReads.length;
  }

  /**
   * Calculates read consistency score based on RSSI variance
   *
   * Low variance = high consistency = higher score
   */
  private calculateConsistencyScore(tagReads: TagRead[]): number {
    if (tagReads.length < 2) {
      return 0.5;
    }

    const rssiValues = tagReads.map((r) => r.getRssi());
    const mean = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
    const variance =
      rssiValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / rssiValues.length;
    const stdDev = Math.sqrt(variance);

    // Low standard deviation (< 5 dBm) = high consistency
    if (stdDev < 5) {
      return 1.0;
    }

    // Normalize: std dev of 20 = score of 0
    return Math.max(0, 1 - stdDev / 20);
  }

  /**
   * Calculates antenna diversity score
   *
   * Reads from multiple antennas increase confidence
   */
  private calculateAntennaDiversityScore(tagReads: TagRead[]): number {
    const uniqueAntennas = new Set(tagReads.map((r) => r.getAntennaPort()));
    const diversity = uniqueAntennas.size;

    // 4 or more antennas = maximum score
    return Math.min(diversity / 4, 1.0);
  }

  /**
   * Determines if the confidence level is high enough for reliable tracking
   *
   * @param confidence - The calculated confidence value
   * @returns true if confidence is above reliability threshold
   */
  isReliable(confidence: number): boolean {
    return confidence >= 0.7;
  }

  /**
   * Returns a human-readable confidence classification
   *
   * @param confidence - The confidence value
   * @returns Classification: 'very_high', 'high', 'medium', 'low', 'very_low'
   */
  classify(confidence: number): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }
}
