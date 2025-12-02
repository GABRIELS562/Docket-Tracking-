import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { ILocationHistoryRepository, LocationHistoryEntry } from '../../../domain/repositories/ILocationHistoryRepository';
import type { ILogger } from '../../interfaces/ILogger';
import { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';

/**
 * Input for getting item history
 */
export interface GetItemHistoryInput {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Item number to look up
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;

  /**
   * Number of hours of history to retrieve (default: 24)
   */
  readonly hours?: number;

  /**
   * Maximum number of records (default: 100)
   */
  readonly limit?: number;

  /**
   * Start time for custom range (ISO 8601)
   */
  readonly startTime?: string;

  /**
   * End time for custom range (ISO 8601)
   */
  readonly endTime?: string;
}

/**
 * Output item in history response
 */
export interface ItemHistoryEntryDTO {
  readonly timestamp: string;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
  readonly readerId: string;
  readonly readerName: string;
  readonly rssi: number;
  readonly antennaPort: number;
  readonly readCount: number;
  readonly locationConfidence: number | null;
  readonly eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
}

/**
 * Output for item history
 */
export interface GetItemHistoryOutput {
  readonly itemNumber: string;
  readonly itemId: string;
  readonly history: ItemHistoryEntryDTO[];
  readonly startTime: string;
  readonly endTime: string;
  readonly totalEntries: number;
}

/**
 * Use Case: Get Item History
 *
 * @description
 * Retrieves the location history for a specific item over a time period.
 * Returns chronological list of tag reads, zone entries/exits, and movements.
 *
 * Business Flow:
 * 1. Validate item number format
 * 2. Verify item exists
 * 3. Calculate time range
 * 4. Fetch history from time-series database
 * 5. Map to DTOs and return
 *
 * Performance Notes:
 * - Uses TimescaleDB hypertables for efficient time-range queries
 * - Limit enforced to prevent memory issues
 * - Results ordered by timestamp descending (most recent first)
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(GetItemHistoryUseCase);
 *
 * // Get last 24 hours
 * const result = await useCase.execute({
 *   itemNumber: 'INV-2025-000123',
 *   hours: 24
 * });
 *
 * // Or use custom date range
 * const result = await useCase.execute({
 *   itemNumber: 'INV-2025-000123',
 *   startTime: '2025-01-01T00:00:00Z',
 *   endTime: '2025-01-31T23:59:59Z'
 * });
 *
 * if (result.isOk()) {
 *   for (const entry of result.value.history) {
 *     console.log(`${entry.timestamp}: ${entry.zoneName} (RSSI: ${entry.rssi})`);
 *   }
 * }
 * ```
 */
@injectable()
export class GetItemHistoryUseCase {
  private static readonly DEFAULT_HOURS = 24;
  private static readonly DEFAULT_LIMIT = 100;
  private static readonly MAX_LIMIT = 1000;

  constructor(
    @inject('IItemRepository') private readonly itemRepo: IItemRepository,
    @inject('ILocationHistoryRepository') private readonly historyRepo: ILocationHistoryRepository,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: GetItemHistoryInput): Promise<Result<GetItemHistoryOutput, Error>> {
    try {
      // Step 1: Validate item number format
      const itemNumberResult = ItemNumber.create(input.itemNumber);
      if (itemNumberResult.isErr()) {
        this.logger.warn('Invalid item number format', { itemNumber: input.itemNumber });
        return err(itemNumberResult.error);
      }
      const itemNumber = itemNumberResult.value;

      // Step 2: Verify item exists
      const itemResult = await this.itemRepo.findByItemNumber(itemNumber, input.tenantId);
      if (itemResult.isErr()) {
        this.logger.warn('Item not found', { itemNumber: input.itemNumber, tenantId: input.tenantId });
        return err(new ItemNotFoundError(input.itemNumber, 'itemNumber'));
      }
      const item = itemResult.value;

      // Step 3: Calculate time range
      let startTime: Date;
      let endTime: Date;

      if (input.startTime && input.endTime) {
        // Use custom range
        startTime = new Date(input.startTime);
        endTime = new Date(input.endTime);
      } else {
        // Use hours-based range
        const hours = input.hours ?? GetItemHistoryUseCase.DEFAULT_HOURS;
        endTime = new Date();
        startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      }

      // Validate time range
      if (startTime >= endTime) {
        return err(new Error('Start time must be before end time'));
      }

      // Step 4: Fetch history
      const limit = Math.min(
        input.limit ?? GetItemHistoryUseCase.DEFAULT_LIMIT,
        GetItemHistoryUseCase.MAX_LIMIT
      );

      const historyResult = await this.historyRepo.getHistoryForItem(
        item.getId(),
        input.tenantId,
        startTime,
        endTime,
        limit
      );

      if (historyResult.isErr()) {
        this.logger.error('Failed to fetch item history', {
          itemNumber: input.itemNumber,
          error: historyResult.error.message,
        });
        return err(historyResult.error);
      }

      // Step 5: Map to DTOs
      const history: ItemHistoryEntryDTO[] = historyResult.value.map(
        (entry: LocationHistoryEntry) => ({
          timestamp: entry.time.toISOString(),
          zoneId: entry.zoneId,
          zoneName: entry.zoneName,
          readerId: entry.readerId,
          readerName: entry.readerName,
          rssi: entry.rssi,
          antennaPort: entry.antennaPort,
          readCount: entry.readCount,
          locationConfidence: entry.locationConfidence,
          eventType: entry.eventType,
        })
      );

      this.logger.info('Item history retrieved', {
        itemNumber: input.itemNumber,
        entriesCount: history.length,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return ok({
        itemNumber: itemNumber.getValue(),
        itemId: item.getId(),
        history,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalEntries: history.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in GetItemHistoryUseCase', { error: message });
      return err(new Error(`Failed to get item history: ${message}`));
    }
  }
}
