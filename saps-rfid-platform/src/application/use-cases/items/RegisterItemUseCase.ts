import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import { Item, type ItemCategory } from '../../../domain/entities/Item';
import { ItemRegisteredEvent } from '../../../domain/events/ItemRegisteredEvent';
import { ItemNumber } from '../../../domain/value-objects/ItemNumber';
import { ReferenceId } from '../../../domain/value-objects/ReferenceId';
import { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import { ItemMapper } from '../../mappers/ItemMapper';

import type { IItemRepository } from '../../../domain/repositories/IItemRepository';
import type { ItemDTO } from '../../dto/ItemDTO';
import type { IEventBus } from '../../interfaces/IEventBus';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Input for registering a new item
 */
export interface RegisterItemInput {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Item number (flexible format)
   * @example "INV-2025-000123"
   */
  readonly itemNumber: string;

  /**
   * Reference identifier (order number, project code, etc.)
   * @example "ORD-2025-0456"
   */
  readonly referenceId?: string;

  /**
   * Optional serial number
   * @example "SN-123456789"
   */
  readonly serialNumber?: string;

  /**
   * Description of the item
   * @example "Laptop Computer - Dell XPS 15"
   */
  readonly description: string;

  /**
   * Item category
   */
  readonly category: ItemCategory;

  /**
   * RFID EPC tag value (24 hex characters)
   */
  readonly rfidEpc: string;

  /**
   * Who received this item
   */
  readonly receivedBy?: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Use Case: Register Item
 *
 * @description
 * Registers a new item in the RFID tracking system.
 *
 * Business Flow:
 * 1. Validate input (item number format, EPC format)
 * 2. Check if item number already exists (prevent duplicates)
 * 3. Check if EPC already assigned (prevent duplicates)
 * 4. Create Item entity with business rules
 * 5. Save to repository
 * 6. Emit ItemRegisteredEvent
 * 7. Return DTO
 *
 * Used when: Operator scans a new item's barcode/QR code
 * and assigns an RFID tag to it.
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(RegisterItemUseCase);
 *
 * const result = await useCase.execute({
 *   itemNumber: 'INV-2025-000123',
 *   referenceId: 'ORD-2025-0456',
 *   description: 'Laptop Computer',
 *   category: ItemCategory.ELECTRONIC,
 *   rfidEpc: 'E280116060002004DECA48DA',
 *   receivedBy: 'John Smith'
 * });
 *
 * if (result.isOk()) {
 *   const item = result.value;
 *   console.log(`Item registered: ${item.itemNumber}`);
 * }
 * ```
 */
@injectable()
export class RegisterItemUseCase {
  constructor(
    @inject('IItemRepository') private readonly itemRepo: IItemRepository,
    @inject('IEventBus') private readonly eventBus: IEventBus,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: RegisterItemInput): Promise<Result<ItemDTO, Error>> {
    // Step 1: Create value objects (validates format)
    const itemNumberResult = ItemNumber.create(input.itemNumber);
    if (itemNumberResult.isErr()) {
      this.logger.warn('Invalid item number format', { itemNumber: input.itemNumber });
      return err(itemNumberResult.error);
    }
    const itemNumber = itemNumberResult.value;

    // Use provided referenceId or default to "N/A"
    let referenceId: ReferenceId;
    if (input.referenceId) {
      const referenceIdResult = ReferenceId.create(input.referenceId);
      if (referenceIdResult.isErr()) {
        this.logger.warn('Invalid reference ID format', { referenceId: input.referenceId });
        return err(referenceIdResult.error);
      }
      referenceId = referenceIdResult.value;
    } else {
      referenceId = ReferenceId.none();
    }

    const epcResult = RfidEpc.create(input.rfidEpc);
    if (epcResult.isErr()) {
      this.logger.warn('Invalid EPC format', { epc: input.rfidEpc });
      return err(epcResult.error);
    }
    const epc = epcResult.value;

    // Step 2: Check if item number already exists within tenant
    const itemNumberExistsResult = await this.itemRepo.existsByItemNumber(
      itemNumber,
      input.tenantId
    );
    if (itemNumberExistsResult.isErr()) {
      return err(itemNumberExistsResult.error);
    }
    if (itemNumberExistsResult.value) {
      const error = new Error(`Item number ${itemNumber.getValue()} already exists`);
      this.logger.warn('Duplicate item number attempted', {
        itemNumber: itemNumber.getValue(),
        tenantId: input.tenantId,
      });
      return err(error);
    }

    // Step 3: Check if EPC already exists within tenant
    const epcExistsResult = await this.itemRepo.existsByEpc(epc, input.tenantId);
    if (epcExistsResult.isErr()) {
      return err(epcExistsResult.error);
    }
    if (epcExistsResult.value) {
      const error = new Error(`EPC ${epc.getValue()} is already assigned`);
      this.logger.warn('Duplicate EPC attempted', {
        epc: epc.getValue(),
        tenantId: input.tenantId,
      });
      return err(error);
    }

    // Step 4: Create Item entity
    const itemResult = Item.create({
      id: this.generateItemId(),
      itemNumber,
      referenceId,
      serialNumber: input.serialNumber,
      description: input.description,
      category: input.category,
      rfidEpc: epc,
      receivedBy: input.receivedBy,
      metadata: input.metadata,
    });

    if (itemResult.isErr()) {
      this.logger.error('Failed to create item entity', {
        error: itemResult.error.message,
      });
      return err(itemResult.error);
    }
    const item = itemResult.value;

    // Step 5: Save to repository (with tenant isolation)
    const saveResult = await this.itemRepo.save(item, input.tenantId);
    if (saveResult.isErr()) {
      this.logger.error('Failed to save item', {
        itemNumber: itemNumber.getValue(),
        tenantId: input.tenantId,
        error: saveResult.error.message,
      });
      return err(saveResult.error);
    }

    // Step 6: Emit domain event
    const event = new ItemRegisteredEvent(
      item.getId(),
      itemNumber.getValue(),
      epc.getValue(),
      referenceId.getValue(),
      input.category,
      input.receivedBy
    );
    await this.eventBus.publish(event);

    this.logger.info('Item registered successfully', {
      itemId: item.getId(),
      itemNumber: itemNumber.getValue(),
      epc: epc.getValue(),
      tenantId: input.tenantId,
    });

    // Step 7: Return DTO
    const dto = ItemMapper.toDTO(item);
    return ok(dto);
  }

  /**
   * Generates a unique item ID
   * Format: item-{timestamp}-{random}
   */
  private generateItemId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `item-${timestamp}-${random}`;
  }
}
