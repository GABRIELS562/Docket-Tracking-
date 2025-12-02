import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILocationHistoryRepository } from '../../../domain/repositories/ILocationHistoryRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type { ItemDetailsDTO, ItemLocationHistoryDTO } from '../../dto/ItemDTO';
import { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';

/**
 * Input for getting item details
 */
export interface GetItemDetailsInput {
  /**
   * Item number to look up
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;
}

/**
 * Use Case: Get Item Details
 *
 * @description
 * Retrieves detailed information about a specific item including
 * current location, zone information, and recent location history.
 *
 * Business Flow:
 * 1. Validate item number format
 * 2. Find item by item number
 * 3. Enrich with zone information
 * 4. Fetch recent location history
 * 5. Calculate derived fields (daysSinceLastSeen, etc.)
 * 6. Return enriched DTO
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(GetItemDetailsUseCase);
 *
 * const result = await useCase.execute({
 *   itemNumber: 'INV-2025-000123'
 * });
 *
 * if (result.isOk()) {
 *   const item = result.value;
 *   console.log(`Item: ${item.itemNumber}`);
 *   console.log(`Status: ${item.status}`);
 *   console.log(`Zone: ${item.currentZone?.name}`);
 *   console.log(`Missing: ${item.isMissing}`);
 *   console.log(`Recent movements: ${item.recentHistory.length}`);
 * }
 * ```
 */
@injectable()
export class GetItemDetailsUseCase {
  private static readonly HISTORY_LIMIT = 10;

  constructor(
    @inject('IItemRepository') private readonly itemRepo: IItemRepository,
    @inject('IZoneRepository') private readonly zoneRepo: IZoneRepository,
    @inject('ILocationHistoryRepository') private readonly historyRepo: ILocationHistoryRepository,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: GetItemDetailsInput): Promise<Result<ItemDetailsDTO, Error>> {
    try {
      // Step 1: Validate item number format
      const itemNumberResult = ItemNumber.create(input.itemNumber);
      if (itemNumberResult.isErr()) {
        this.logger.warn('Invalid item number format', { itemNumber: input.itemNumber });
        return err(itemNumberResult.error);
      }
      const itemNumber = itemNumberResult.value;

      // Step 2: Find item by item number
      const itemResult = await this.itemRepo.findByItemNumber(itemNumber);
      if (itemResult.isErr()) {
        this.logger.warn('Item not found', { itemNumber: input.itemNumber });
        return err(new ItemNotFoundError(input.itemNumber, 'itemNumber'));
      }
      const item = itemResult.value;

      // Step 3: Enrich with zone information
      let zoneInfo: { id: string; name: string; code: string } | null = null;
      const currentZoneId = item.getCurrentZoneId();

      if (currentZoneId) {
        const zoneResult = await this.zoneRepo.findById(currentZoneId);
        if (zoneResult.isOk() && zoneResult.value) {
          const zone = zoneResult.value;
          zoneInfo = {
            id: zone.getId(),
            name: zone.getName(),
            code: zone.getCode(),
          };
        }
      }

      // Step 4: Fetch recent location history
      const historyResult = await this.historyRepo.getHistoryForItem(
        item.getId(),
        undefined, // startTime
        undefined, // endTime
        GetItemDetailsUseCase.HISTORY_LIMIT
      );

      const recentHistory: ItemLocationHistoryDTO[] = [];
      if (historyResult.isOk()) {
        for (const entry of historyResult.value) {
          recentHistory.push({
            timestamp: entry.time.toISOString(),
            zoneName: entry.zoneName ?? 'Unknown',
            rssi: entry.rssi,
            confidence: entry.locationConfidence ?? 0,
          });
        }
      }

      // Step 5: Calculate derived fields
      const daysSinceLastSeen = item.getDaysSinceLastSeen();
      const isMissing = item.isMissing();
      const hasReliableLocation = item.hasReliableLocation();

      // Step 6: Build response DTO
      const dto: ItemDetailsDTO = {
        id: item.getId(),
        itemNumber: item.getItemNumber().getValue(),
        referenceId: item.getReferenceId().getValue(),
        serialNumber: item.getSerialNumber() ?? null,
        description: item.getDescription(),
        category: item.getCategory(),
        rfidEpc: item.getRfidEpc().getValue(),
        currentZone: zoneInfo,
        status: item.getStatus(),
        lastSeenReaderId: item.getLastSeenReaderId(),
        lastSeenAt: item.getLastSeenAt()?.toISOString() ?? null,
        locationConfidence: item.getLocationConfidence(),
        receivedBy: item.getReceivedBy() ?? null,
        receivedAt: item.getReceivedAt()?.toISOString() ?? null,
        createdAt: item.getCreatedAt().toISOString(),
        updatedAt: item.getUpdatedAt().toISOString(),
        metadata: item.getMetadata(),
        // Extended fields
        recentHistory,
        daysSinceLastSeen,
        isMissing,
        hasReliableLocation,
      };

      this.logger.info('Item details retrieved', {
        itemNumber: input.itemNumber,
        status: item.getStatus(),
        hasLocation: currentZoneId !== null,
      });

      return ok(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in GetItemDetailsUseCase', { error: message });
      return err(new Error(`Failed to get item details: ${message}`));
    }
  }
}
