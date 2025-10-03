import { Result, ok, err } from 'neverthrow';
import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Parsed tag read from LLRP message
 *
 * @description
 * Structured representation of an RFID tag detection after parsing
 * the raw LLRP (Low Level Reader Protocol) binary message.
 */
export interface ParsedTagRead {
  /**
   * Electronic Product Code (EPC) - unique tag identifier
   * @example "E28011606000204DECA48DA"
   */
  epc: string;

  /**
   * Received Signal Strength Indicator (RSSI) in dBm
   * Typical range: -30 (very strong) to -90 (very weak)
   * @example -58
   */
  rssi: number;

  /**
   * Antenna port that detected the tag (1-4 for most readers)
   * @example 2
   */
  antennaPort: number;

  /**
   * Timestamp of detection (derived from reader or current time)
   */
  timestamp: Date;

  /**
   * How many times reader saw this tag in this read cycle
   * @example 15
   */
  readCount: number;

  /**
   * Unix timestamp when tag was first seen (from reader hardware)
   * @example 1704197531234
   */
  firstSeenTimestamp?: number;

  /**
   * Unix timestamp when tag was last seen (from reader hardware)
   * @example 1704197535789
   */
  lastSeenTimestamp?: number;

  /**
   * Reader-specific metadata (optional)
   */
  metadata?: Record<string, unknown>;
}

/**
 * LLRP Tag Report Data
 *
 * @description
 * Structure of tag data in LLRP RO_ACCESS_REPORT messages.
 * Fields vary by reader manufacturer (Impinj, Alien, Zebra, etc.)
 */
interface LLRPTagReport {
  // EPC Data (multiple possible field names)
  epcData?: Buffer | string | { epc: Buffer | string };
  EPCData?: Buffer | string | { epc: Buffer | string };
  epc?: Buffer | string;
  EPC?: Buffer | string;

  // RSSI (signal strength)
  peakRSSI?: number;
  PeakRSSI?: number;
  rssi?: number;
  RSSI?: number;

  // Antenna
  antennaID?: number;
  AntennaID?: number;
  antenna?: number;
  Antenna?: number;

  // Timestamps
  firstSeenTimestampUTC?: number;
  FirstSeenTimestampUTC?: number;
  firstSeenTimestamp?: number;
  lastSeenTimestampUTC?: number;
  LastSeenTimestampUTC?: number;
  lastSeenTimestamp?: number;

  // Read count
  tagSeenCount?: number;
  TagSeenCount?: number;
  readCount?: number;

  // Additional fields
  [key: string]: unknown;
}

/**
 * LLRP RO_ACCESS_REPORT Message
 *
 * @description
 * Structure of LLRP RO_ACCESS_REPORT messages sent by readers.
 * Contains one or more tag reports.
 */
interface LLRPMessage {
  type: string;
  tagReportData?: LLRPTagReport | LLRPTagReport[];
  TagReportData?: LLRPTagReport | LLRPTagReport[];
  [key: string]: unknown;
}

/**
 * Tag Processor Statistics
 */
export interface TagProcessorStats {
  totalMessagesProcessed: number;
  totalTagsProcessed: number;
  totalParseErrors: number;
  invalidMessages: number;
  emptyReports: number;
  lastProcessedAt: Date | null;
}

/**
 * TagProcessor - Parses LLRP messages into structured tag reads
 *
 * @description
 * LLRP (Low Level Reader Protocol) messages are binary and complex.
 * This class extracts the useful information and handles variations
 * across different reader manufacturers (Impinj, Alien, Zebra, etc.).
 *
 * **Performance Requirements:**
 * - Must process 100+ messages per second
 * - Each message may contain 1-50 tag reports
 * - Total throughput: ~1000 tag reads per second
 * - Processing time: <5ms per message
 *
 * **Manufacturer Variations:**
 * - Field names differ (epcData vs EPCData vs epc)
 * - Data types differ (Buffer vs string vs object)
 * - Some readers include timestamps, others don't
 * - RSSI calculation methods vary
 *
 * @example
 * ```typescript
 * const processor = new TagProcessor(logger);
 *
 * const message = {
 *   type: 'RO_ACCESS_REPORT',
 *   tagReportData: [{
 *     epcData: Buffer.from('E28011606000204DECA48DA', 'hex'),
 *     peakRSSI: -58,
 *     antennaID: 2,
 *     tagSeenCount: 15
 *   }]
 * };
 *
 * const result = await processor.process(message);
 * if (result.isOk()) {
 *   console.log(`Processed ${result.value.length} tags`);
 * }
 * ```
 */
export class TagProcessor {
  private stats: TagProcessorStats = {
    totalMessagesProcessed: 0,
    totalTagsProcessed: 0,
    totalParseErrors: 0,
    invalidMessages: 0,
    emptyReports: 0,
    lastProcessedAt: null,
  };

  constructor(private readonly logger: ILogger) {}

  /**
   * Process LLRP RO_ACCESS_REPORT message
   *
   * @param message - Raw LLRP message from reader
   * @returns Array of parsed tag reads or error
   *
   * @description
   * Validates message type, extracts tag reports, and parses each report.
   * Returns empty array (not error) if message contains no tags.
   *
   * @example
   * ```typescript
   * const result = await processor.process(llrpMessage);
   *
   * if (result.isErr()) {
   *   logger.error('Failed to process message', { error: result.error });
   *   return;
   * }
   *
   * const tagReads = result.value;
   * for (const tag of tagReads) {
   *   console.log(`Tag: ${tag.epc}, RSSI: ${tag.rssi} dBm`);
   * }
   * ```
   */
  async process(message: unknown): Promise<Result<ParsedTagRead[], Error>> {
    const startTime = Date.now();

    try {
      // Validate message
      const validationResult = this.validateMessage(message);
      if (validationResult.isErr()) {
        this.stats.invalidMessages++;
        return validationResult;
      }

      const llrpMessage = message as LLRPMessage;

      // Extract tag report data
      const tagReportData = this.getTagReportData(llrpMessage);

      if (!tagReportData || tagReportData.length === 0) {
        // Empty report - not an error, just no tags detected
        this.stats.emptyReports++;
        this.stats.totalMessagesProcessed++;
        this.stats.lastProcessedAt = new Date();
        return ok([]);
      }

      // Parse each tag report
      const parsedReads: ParsedTagRead[] = [];

      for (const tagReport of tagReportData) {
        const parsed = this.parseTagReport(tagReport);
        if (parsed) {
          parsedReads.push(parsed);
          this.stats.totalTagsProcessed++;
        } else {
          this.stats.totalParseErrors++;
        }
      }

      this.stats.totalMessagesProcessed++;
      this.stats.lastProcessedAt = new Date();

      const processingTime = Date.now() - startTime;
      if (processingTime > 5) {
        this.logger.warn('Slow message processing', {
          processingTimeMs: processingTime,
          tagCount: parsedReads.length,
        });
      }

      this.logger.debug('LLRP message processed', {
        tagCount: parsedReads.length,
        processingTimeMs: processingTime,
      });

      return ok(parsedReads);
    } catch (error) {
      this.stats.totalParseErrors++;
      this.logger.error('Error processing LLRP message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return err(error as Error);
    }
  }

  /**
   * Validate LLRP message structure
   */
  private validateMessage(message: unknown): Result<void, Error> {
    if (!message || typeof message !== 'object') {
      return err(new Error('Invalid message: not an object'));
    }

    const msg = message as Record<string, unknown>;

    if (!msg.type) {
      return err(new Error('Invalid message: missing type field'));
    }

    if (msg.type !== 'RO_ACCESS_REPORT') {
      return err(new Error(`Invalid message type: ${msg.type}`));
    }

    return ok(undefined);
  }

  /**
   * Extract tag report data from LLRP message
   *
   * @description
   * Handles different possible field names and structures:
   * - tagReportData vs TagReportData
   * - Single object vs array of objects
   */
  private getTagReportData(message: LLRPMessage): LLRPTagReport[] {
    // Try lowercase field name
    if (message.tagReportData) {
      return Array.isArray(message.tagReportData)
        ? message.tagReportData
        : [message.tagReportData];
    }

    // Try uppercase field name
    if (message.TagReportData) {
      return Array.isArray(message.TagReportData)
        ? message.TagReportData
        : [message.TagReportData];
    }

    return [];
  }

  /**
   * Parse individual tag report
   *
   * @description
   * Extracts all relevant fields from a tag report, handling
   * manufacturer variations and missing fields gracefully.
   */
  private parseTagReport(tagReport: LLRPTagReport): ParsedTagRead | null {
    try {
      // Extract EPC (required field)
      const epc = this.extractEPC(tagReport);
      if (!epc) {
        this.logger.warn('Tag report missing EPC', {
          tagReport: JSON.stringify(tagReport),
        });
        return null;
      }

      // Validate EPC format (24 hex characters)
      if (!/^[0-9A-Fa-f]{24}$/.test(epc)) {
        this.logger.warn('Invalid EPC format', { epc });
        return null;
      }

      // Extract other fields (with defaults)
      const rssi = this.extractRSSI(tagReport);
      const antennaPort = this.extractAntennaPort(tagReport);
      const firstSeenTimestamp = this.extractFirstSeenTimestamp(tagReport);
      const lastSeenTimestamp = this.extractLastSeenTimestamp(tagReport);
      const readCount = this.extractReadCount(tagReport);

      // Determine timestamp (prefer reader timestamp, fallback to current time)
      const timestamp = lastSeenTimestamp
        ? new Date(lastSeenTimestamp)
        : new Date();

      return {
        epc,
        rssi,
        antennaPort,
        timestamp,
        readCount,
        firstSeenTimestamp,
        lastSeenTimestamp,
      };
    } catch (error) {
      this.logger.warn('Failed to parse tag report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tagReport: JSON.stringify(tagReport),
      });
      return null;
    }
  }

  /**
   * Extract EPC from tag report
   *
   * @description
   * Handles multiple possible field names and data types:
   * - epcData, EPCData, epc, EPC
   * - Buffer, string, or object with epc field
   * - Always returns uppercase hex string
   */
  private extractEPC(tagReport: LLRPTagReport): string | null {
    // Try different possible field names
    const epcData =
      tagReport.epcData ||
      tagReport.EPCData ||
      tagReport.epc ||
      tagReport.EPC;

    if (!epcData) {
      return null;
    }

    // Handle Buffer
    if (Buffer.isBuffer(epcData)) {
      return epcData.toString('hex').toUpperCase();
    }

    // Handle string
    if (typeof epcData === 'string') {
      return epcData.toUpperCase().replace(/\s/g, ''); // Remove whitespace
    }

    // Handle object with epc field
    if (typeof epcData === 'object' && epcData !== null) {
      const epcObj = epcData as { epc?: Buffer | string };
      if (epcObj.epc) {
        if (Buffer.isBuffer(epcObj.epc)) {
          return epcObj.epc.toString('hex').toUpperCase();
        }
        if (typeof epcObj.epc === 'string') {
          return epcObj.epc.toUpperCase().replace(/\s/g, '');
        }
      }
    }

    return null;
  }

  /**
   * Extract RSSI (signal strength) from tag report
   *
   * @description
   * RSSI is typically negative (-30 to -90 dBm).
   * Some readers report positive values that need conversion.
   * Default to -70 dBm (medium strength) if missing.
   */
  private extractRSSI(tagReport: LLRPTagReport): number {
    const rssi =
      tagReport.peakRSSI ??
      tagReport.PeakRSSI ??
      tagReport.rssi ??
      tagReport.RSSI;

    if (typeof rssi !== 'number') {
      return -70; // Default medium strength
    }

    // Some readers report positive RSSI values - convert to negative
    if (rssi > 0) {
      return -rssi;
    }

    // Validate reasonable range (-30 to -90 dBm)
    if (rssi < -90) {
      this.logger.debug('RSSI below normal range', { rssi });
      return -90;
    }
    if (rssi > -10) {
      this.logger.debug('RSSI above normal range', { rssi });
      return -30;
    }

    return rssi;
  }

  /**
   * Extract antenna port number from tag report
   *
   * @description
   * Default to port 1 if missing.
   * Validate range (1-4 for most readers, 1-8 for some).
   */
  private extractAntennaPort(tagReport: LLRPTagReport): number {
    const antennaId =
      tagReport.antennaID ??
      tagReport.AntennaID ??
      tagReport.antenna ??
      tagReport.Antenna;

    if (typeof antennaId !== 'number') {
      return 1; // Default to antenna 1
    }

    // Validate reasonable range
    if (antennaId < 1 || antennaId > 8) {
      this.logger.warn('Antenna port out of range', { antennaId });
      return 1;
    }

    return antennaId;
  }

  /**
   * Extract first seen timestamp from tag report
   */
  private extractFirstSeenTimestamp(tagReport: LLRPTagReport): number | undefined {
    const timestamp =
      tagReport.firstSeenTimestampUTC ??
      tagReport.FirstSeenTimestampUTC ??
      tagReport.firstSeenTimestamp;

    return typeof timestamp === 'number' ? timestamp : undefined;
  }

  /**
   * Extract last seen timestamp from tag report
   */
  private extractLastSeenTimestamp(tagReport: LLRPTagReport): number | undefined {
    const timestamp =
      tagReport.lastSeenTimestampUTC ??
      tagReport.LastSeenTimestampUTC ??
      tagReport.lastSeenTimestamp;

    return typeof timestamp === 'number' ? timestamp : undefined;
  }

  /**
   * Extract read count from tag report
   *
   * @description
   * Read count indicates how many times the reader detected this tag
   * in a single read cycle. Higher counts often indicate stronger signal.
   */
  private extractReadCount(tagReport: LLRPTagReport): number {
    const count =
      tagReport.tagSeenCount ??
      tagReport.TagSeenCount ??
      tagReport.readCount;

    if (typeof count !== 'number') {
      return 1; // Default to 1 read
    }

    // Validate reasonable range
    if (count < 1) {
      return 1;
    }
    if (count > 1000) {
      this.logger.warn('Read count unusually high', { count });
      return 1000;
    }

    return count;
  }

  /**
   * Get processing statistics
   */
  getStats(): TagProcessorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      totalMessagesProcessed: 0,
      totalTagsProcessed: 0,
      totalParseErrors: 0,
      invalidMessages: 0,
      emptyReports: 0,
      lastProcessedAt: null,
    };
  }
}
