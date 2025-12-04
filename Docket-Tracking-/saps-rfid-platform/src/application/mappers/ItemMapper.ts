import { Result, err } from 'neverthrow';
import { Item, type ItemCategory } from '../../domain/entities/Item';
import { ItemNumber } from '../../domain/value-objects/ItemNumber';
import { RfidEpc } from '../../domain/value-objects/RfidEpc';
import { ReferenceId } from '../../domain/value-objects/ReferenceId';
import type { ItemDTO, CreateItemDTO } from '../dto/ItemDTO';

/**
 * Item Mapper
 *
 * @description
 * Bidirectional mapper between Item domain entities and DTOs.
 * Mappers are stateless utility classes with static methods only.
 *
 * Mapping Strategy:
 * - Entity → DTO: Extract all primitive values from value objects, convert dates to ISO 8601 strings
 * - DTO → Entity: Validate and reconstruct value objects, parse ISO 8601 strings to Date objects
 * - Never expose domain objects directly in DTOs
 * - Handle null/undefined gracefully
 * - Return Result<T, Error> for DTO → Entity conversion (may fail validation)
 */
export class ItemMapper {
  /**
   * Converts an Item entity to a DTO
   *
   * @param item - The item domain entity
   * @param zoneInfo - Optional zone information to include
   * @returns Item DTO for API response
   *
   * @example
   * ```typescript
   * const item = Item.create({ ... }).unwrap();
   * const dto = ItemMapper.toDTO(item);
   * // dto can be safely serialized to JSON
   * ```
   */
  static toDTO(
    item: Item,
    zoneInfo?: { id: string; name: string; code: string } | null
  ): ItemDTO {
    return {
      id: item.getId(),
      itemNumber: item.getItemNumber().getValue(),
      referenceId: item.getReferenceId().getValue(),
      serialNumber: item.getSerialNumber() ?? null,
      description: item.getDescription(),
      category: item.getCategory(),
      rfidEpc: item.getRfidEpc().getValue(),
      currentZone: zoneInfo ?? null,
      status: item.getStatus(),
      lastSeenReaderId: item.getLastSeenReaderId(),
      lastSeenAt: item.getLastSeenAt()?.toISOString() ?? null,
      locationConfidence: item.getLocationConfidence(),
      receivedBy: item.getReceivedBy() ?? null,
      receivedAt: item.getReceivedAt()?.toISOString() ?? null,
      createdAt: item.getCreatedAt().toISOString(),
      updatedAt: item.getUpdatedAt().toISOString(),
      metadata: item.getMetadata(),
    };
  }

  /**
   * Converts an array of Item entities to DTOs
   *
   * @param items - Array of item domain entities
   * @param zoneMap - Optional map of zone IDs to zone info
   * @returns Array of Item DTOs
   */
  static toDTOArray(
    items: Item[],
    zoneMap?: Map<string, { id: string; name: string; code: string }>
  ): ItemDTO[] {
    return items.map((item) => {
      const zoneId = item.getCurrentZoneId();
      const zoneInfo = zoneId && zoneMap ? zoneMap.get(zoneId) : null;
      return ItemMapper.toDTO(item, zoneInfo);
    });
  }

  /**
   * Converts a CreateItemDTO to an Item entity
   *
   * @param dto - The create item DTO from API request
   * @param generatedId - Generated unique ID for the item
   * @returns Result with Item entity or validation error
   *
   * @example
   * ```typescript
   * const result = ItemMapper.fromCreateDTO(dto, 'item-123-abc');
   * if (result.isOk()) {
   *   const item = result.value;
   *   // Save item to repository
   * }
   * ```
   */
  static fromCreateDTO(
    dto: CreateItemDTO,
    generatedId: string
  ): Result<Item, Error> {
    // Create value objects (validates format)
    const itemNumberResult = ItemNumber.create(dto.itemNumber);
    if (itemNumberResult.isErr()) {
      return err(itemNumberResult.error);
    }

    const referenceIdResult = ReferenceId.create(dto.referenceId);
    if (referenceIdResult.isErr()) {
      return err(referenceIdResult.error);
    }

    const epcResult = RfidEpc.create(dto.rfidEpc);
    if (epcResult.isErr()) {
      return err(epcResult.error);
    }

    // Create item entity
    return Item.create({
      id: generatedId,
      itemNumber: itemNumberResult.value,
      referenceId: referenceIdResult.value,
      serialNumber: dto.serialNumber,
      description: dto.description,
      category: dto.category as ItemCategory,
      rfidEpc: epcResult.value,
      receivedBy: dto.receivedBy,
      metadata: dto.metadata,
    });
  }

  /**
   * Maps item status from domain to DTO format
   *
   * @param status - Domain item status
   * @returns DTO-compatible status string
   */
  static mapStatusToDTO(status: string): ItemDTO['status'] {
    const statusMap: Record<string, ItemDTO['status']> = {
      registered: 'registered',
      in_transit: 'in_transit',
      in_processing: 'in_processing',
      archived: 'archived',
      disposed: 'disposed',
      missing: 'missing',
    };
    return statusMap[status] ?? 'registered';
  }

  /**
   * Maps category from DTO to domain format
   *
   * @param category - DTO category string
   * @returns Domain ItemCategory
   */
  static mapCategoryToDomain(category: CreateItemDTO['category']): ItemCategory {
    const categoryMap: Record<CreateItemDTO['category'], ItemCategory> = {
      equipment: 'equipment' as ItemCategory,
      consumable: 'consumable' as ItemCategory,
      electronic: 'electronic' as ItemCategory,
      document: 'document' as ItemCategory,
      material: 'material' as ItemCategory,
      tool: 'tool' as ItemCategory,
      apparel: 'apparel' as ItemCategory,
      container: 'container' as ItemCategory,
      sample: 'sample' as ItemCategory,
      other: 'other' as ItemCategory,
    };
    return categoryMap[category];
  }
}
