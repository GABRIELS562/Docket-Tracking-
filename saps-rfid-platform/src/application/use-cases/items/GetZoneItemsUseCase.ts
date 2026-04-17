import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import { ItemMapper } from '../../mappers/ItemMapper';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ItemDTO } from '../../dto/ItemDTO';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Input for getting zone items
 */
export interface GetZoneItemsInput {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Zone ID to look up
   * @example "zone-storage-001"
   */
  readonly zoneId: string;

  /**
   * Maximum number of items (default: 50)
   */
  readonly limit?: number;

  /**
   * Whether to return only recently seen items (default: false)
   */
  readonly recentOnly?: boolean;
}

/**
 * Output for zone items
 */
export interface GetZoneItemsOutput {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly zoneCode: string;
  readonly items: ItemDTO[];
  readonly totalItems: number;
  readonly capacity: number | null;
  readonly occupancyPercent: number | null;
}

/**
 * Use Case: Get Zone Items
 *
 * @description
 * Retrieves all items currently located in a specific zone.
 * Optionally filters to recently seen items only.
 *
 * Business Flow:
 * 1. Validate zone exists
 * 2. Fetch items in zone
 * 3. Optionally filter to recent items
 * 4. Calculate occupancy metrics
 * 5. Map to DTOs and return
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(GetZoneItemsUseCase);
 *
 * const result = await useCase.execute({
 *   zoneId: 'zone-storage-001',
 *   limit: 20,
 *   recentOnly: true
 * });
 *
 * if (result.isOk()) {
 *   const { zoneName, items, occupancyPercent } = result.value;
 *   console.log(`${zoneName}: ${items.length} items (${occupancyPercent}% capacity)`);
 * }
 * ```
 */
@injectable()
export class GetZoneItemsUseCase {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 200;

  constructor(
    @inject('IItemRepository') private readonly itemRepo: IItemRepository,
    @inject('IZoneRepository') private readonly zoneRepo: IZoneRepository,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: GetZoneItemsInput): Promise<Result<GetZoneItemsOutput, Error>> {
    try {
      // Step 1: Validate zone exists
      const zoneResult = await this.zoneRepo.findById(input.zoneId, input.tenantId);
      if (zoneResult.isErr()) {
        this.logger.error('Failed to fetch zone', {
          zoneId: input.zoneId,
          tenantId: input.tenantId,
          error: zoneResult.error.message,
        });
        return err(zoneResult.error);
      }

      const zone = zoneResult.value;
      if (!zone) {
        return err(new Error(`Zone not found: ${input.zoneId}`));
      }

      // Step 2 & 3: Fetch items in zone
      const limit = Math.min(
        input.limit ?? GetZoneItemsUseCase.DEFAULT_LIMIT,
        GetZoneItemsUseCase.MAX_LIMIT
      );

      let itemsResult;
      if (input.recentOnly) {
        // Get only recently seen items
        itemsResult = await this.itemRepo.findRecentByZone(input.zoneId, input.tenantId, limit);
      } else {
        // Get all items in zone
        itemsResult = await this.itemRepo.findByZone(input.zoneId, input.tenantId);
      }

      if (itemsResult.isErr()) {
        this.logger.error('Failed to fetch zone items', {
          zoneId: input.zoneId,
          error: itemsResult.error.message,
        });
        return err(itemsResult.error);
      }

      const items = itemsResult.value;

      // Apply limit if not already applied
      const limitedItems = input.recentOnly ? items : items.slice(0, limit);

      // Step 4: Calculate occupancy metrics
      const capacity = zone.getCapacity();
      const totalItems = items.length;
      const occupancyPercent = capacity ? Math.round((totalItems / capacity) * 100) : null;

      // Create zone info for mapping
      const zoneInfo = {
        id: zone.getId(),
        name: zone.getName(),
        code: zone.getCode(),
      };

      // Step 5: Map to DTOs
      const zoneMap = new Map<string, typeof zoneInfo>();
      zoneMap.set(zone.getId(), zoneInfo);

      const itemDTOs = ItemMapper.toDTOArray(limitedItems, zoneMap);

      this.logger.info('Zone items retrieved', {
        zoneId: input.zoneId,
        zoneName: zone.getName(),
        itemsCount: itemDTOs.length,
        totalItems,
        occupancyPercent,
      });

      return ok({
        zoneId: zone.getId(),
        zoneName: zone.getName(),
        zoneCode: zone.getCode(),
        items: itemDTOs,
        totalItems,
        capacity,
        occupancyPercent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in GetZoneItemsUseCase', { error: message });
      return err(new Error(`Failed to get zone items: ${message}`));
    }
  }
}
