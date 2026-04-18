import { Item, ItemStatus, ItemCategory, ItemProps } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { ReferenceId } from '@domain/value-objects/ReferenceId';

describe('Item', () => {
  let itemNumber: ItemNumber;
  let rfidEpc: RfidEpc;
  let referenceId: ReferenceId;

  beforeEach(() => {
    itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
    rfidEpc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
    referenceId = ReferenceId.create('PO-2025-12345')._unsafeUnwrap();
  });

  describe('create', () => {
    it('should create valid item with required fields', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getId()).toBe('item-001');
        expect(item.getItemNumber()).toBe(itemNumber);
        expect(item.getRfidEpc()).toBe(rfidEpc);
        expect(item.getReferenceId()).toBe(referenceId);
        expect(item.getDescription()).toBe('Dell Laptop Computer');
        expect(item.getCategory()).toBe(ItemCategory.ELECTRONIC);
        expect(item.getStatus()).toBe(ItemStatus.REGISTERED);
        expect(item.isActive()).toBe(true);
        expect(item.getCurrentZoneId()).toBeNull();
        expect(item.getLastSeenAt()).toBeNull();
        expect(item.getLastSeenReaderId()).toBeNull();
        expect(item.getLocationConfidence()).toBeNull();
        expect(item.getSerialNumber()).toBeUndefined();
        expect(item.getReceivedBy()).toBeUndefined();
        expect(item.getReceivedAt()).toBeUndefined();
        expect(item.getHandledBy()).toBeUndefined();
      }
    });

    it('should create item with all optional fields', () => {
      const beforeCreation = new Date();

      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
        serialNumber: 'SN-123456789',
        receivedBy: 'John Smith',
        metadata: { department: 'IT', purchaseOrder: 'PO-001' },
      });

      const afterCreation = new Date();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getSerialNumber()).toBe('SN-123456789');
        expect(item.getReceivedBy()).toBe('John Smith');
        expect(item.getReceivedAt()).toBeDefined();
        expect(item.getReceivedAt()!.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
        expect(item.getReceivedAt()!.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
        expect(item.getMetadata()).toEqual({ department: 'IT', purchaseOrder: 'PO-001' });
      }
    });

    it('should set createdAt and updatedAt to current time', () => {
      const before = new Date();

      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      });

      const after = new Date();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(item.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
        expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(item.getUpdatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });

    it('should reject empty description', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: '',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Description cannot be empty');
      }
    });

    it('should reject whitespace-only description', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: '   ',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Description cannot be empty');
      }
    });

    it('should reject empty ID', () => {
      const result = Item.create({
        id: '',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ID cannot be empty');
      }
    });

    it('should reject whitespace-only ID', () => {
      const result = Item.create({
        id: '   ',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ID cannot be empty');
      }
    });

    it('should trim description', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: '  Dell Laptop  ',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDescription()).toBe('Dell Laptop');
      }
    });

    it('should trim serial number', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        serialNumber: '  SN-123456789  ',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSerialNumber()).toBe('SN-123456789');
      }
    });

    it('should default metadata to empty object when not provided', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMetadata()).toEqual({});
      }
    });

    it('should not set receivedAt when receivedBy is not provided', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReceivedBy()).toBeUndefined();
        expect(result.value.getReceivedAt()).toBeUndefined();
      }
    });

    it('should accept all category types', () => {
      const categories = Object.values(ItemCategory);

      for (const category of categories) {
        const result = Item.create({
          id: `item-${category}`,
          itemNumber,
          rfidEpc,
          referenceId,
          description: 'Test Item',
          category,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCategory()).toBe(category);
        }
      }
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute item from persistence data', () => {
      const createdAt = new Date('2025-01-01T10:00:00Z');
      const updatedAt = new Date('2025-01-02T15:30:00Z');
      const lastSeenAt = new Date('2025-01-02T14:00:00Z');
      const receivedAt = new Date('2025-01-01T10:00:00Z');

      const props: ItemProps = {
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        serialNumber: 'SN-12345',
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        currentZoneId: 'zone-001',
        lastSeenAt,
        lastSeenReaderId: 'reader-001',
        locationConfidence: 0.95,
        status: ItemStatus.IN_PROCESSING,
        isActive: true,
        receivedBy: 'John Smith',
        receivedAt,
        handledBy: 'Jane Doe',
        createdAt,
        updatedAt,
        metadata: { department: 'IT' },
      };

      const item = Item.fromPersistence(props);

      expect(item.getId()).toBe('item-001');
      expect(item.getItemNumber()).toBe(itemNumber);
      expect(item.getRfidEpc()).toBe(rfidEpc);
      expect(item.getReferenceId()).toBe(referenceId);
      expect(item.getSerialNumber()).toBe('SN-12345');
      expect(item.getDescription()).toBe('Dell Laptop');
      expect(item.getCategory()).toBe(ItemCategory.ELECTRONIC);
      expect(item.getCurrentZoneId()).toBe('zone-001');
      expect(item.getLastSeenAt()?.getTime()).toBe(lastSeenAt.getTime());
      expect(item.getLastSeenReaderId()).toBe('reader-001');
      expect(item.getLocationConfidence()).toBe(0.95);
      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      expect(item.isActive()).toBe(true);
      expect(item.getReceivedBy()).toBe('John Smith');
      expect(item.getReceivedAt()?.getTime()).toBe(receivedAt.getTime());
      expect(item.getHandledBy()).toBe('Jane Doe');
      expect(item.getCreatedAt().getTime()).toBe(createdAt.getTime());
      expect(item.getUpdatedAt().getTime()).toBe(updatedAt.getTime());
      expect(item.getMetadata()).toEqual({ department: 'IT' });
    });

    it('should reconstitute item with null optional fields', () => {
      const props: ItemProps = {
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        currentZoneId: null,
        lastSeenAt: null,
        lastSeenReaderId: null,
        locationConfidence: null,
        status: ItemStatus.REGISTERED,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      const item = Item.fromPersistence(props);

      expect(item.getCurrentZoneId()).toBeNull();
      expect(item.getLastSeenAt()).toBeNull();
      expect(item.getLastSeenReaderId()).toBeNull();
      expect(item.getLocationConfidence()).toBeNull();
    });
  });

  describe('reconstitute', () => {
    it('should be an alias for fromPersistence', () => {
      const props: ItemProps = {
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        currentZoneId: 'zone-001',
        lastSeenAt: new Date(),
        lastSeenReaderId: 'reader-001',
        locationConfidence: 0.85,
        status: ItemStatus.REGISTERED,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      const item = Item.reconstitute(props);

      expect(item.getId()).toBe('item-001');
      expect(item.getCurrentZoneId()).toBe('zone-001');
    });
  });

  describe('updateLocation', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should update location successfully with explicit timestamp', () => {
      const timestamp = new Date('2025-01-15T10:30:00Z');
      const result = item.updateLocation('zone-001', 'reader-001', 0.85, timestamp);

      expect(result.isOk()).toBe(true);
      expect(item.getCurrentZoneId()).toBe('zone-001');
      expect(item.getLastSeenReaderId()).toBe('reader-001');
      expect(item.getLocationConfidence()).toBe(0.85);
      expect(item.getLastSeenAt()?.getTime()).toBe(timestamp.getTime());
    });

    it('should update location with default timestamp', () => {
      const before = new Date();
      const result = item.updateLocation('zone-001', 'reader-001', 0.85);
      const after = new Date();

      expect(result.isOk()).toBe(true);
      expect(item.getLastSeenAt()).not.toBeNull();
      expect(item.getLastSeenAt()!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(item.getLastSeenAt()!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt when location changes', () => {
      const before = item.getUpdatedAt();

      // Small delay to ensure time difference
      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should accept confidence at lower boundary (0.0)', () => {
      const result = item.updateLocation('zone-001', 'reader-001', 0.0);

      expect(result.isOk()).toBe(true);
      expect(item.getLocationConfidence()).toBe(0.0);
    });

    it('should accept confidence at upper boundary (1.0)', () => {
      const result = item.updateLocation('zone-001', 'reader-001', 1.0);

      expect(result.isOk()).toBe(true);
      expect(item.getLocationConfidence()).toBe(1.0);
    });

    it('should reject confidence below 0', () => {
      const result = item.updateLocation('zone-001', 'reader-001', -0.1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('confidence must be between 0.0 and 1.0');
      }
    });

    it('should reject confidence above 1', () => {
      const result = item.updateLocation('zone-001', 'reader-001', 1.1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('confidence must be between 0.0 and 1.0');
      }
    });

    it('should reject empty zone ID', () => {
      const result = item.updateLocation('', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    it('should reject whitespace-only zone ID', () => {
      const result = item.updateLocation('   ', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    it('should reject empty reader ID', () => {
      const result = item.updateLocation('zone-001', '', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader ID cannot be empty');
      }
    });

    it('should reject whitespace-only reader ID', () => {
      const result = item.updateLocation('zone-001', '   ', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader ID cannot be empty');
      }
    });

    it('should not update location of archived item', () => {
      item.archive();
      const result = item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update location of archived item');
      }
    });

    it('should not update location of disposed item', () => {
      item.dispose();
      const result = item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update location of disposed item');
      }
    });

    it('should restore missing item to registered when location updates', () => {
      item.markAsMissing();
      expect(item.getStatus()).toBe(ItemStatus.MISSING);

      const result = item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.REGISTERED);
    });

    it('should not change status if item is registered', () => {
      expect(item.getStatus()).toBe(ItemStatus.REGISTERED);

      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getStatus()).toBe(ItemStatus.REGISTERED);
    });

    it('should not change status if item is in transit', () => {
      item.markInTransit();
      expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);

      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
    });

    it('should not change status if item is in processing', () => {
      item.markInProcessing();
      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);

      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
    });
  });

  describe('markInTransit', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should mark item as in transit', () => {
      const result = item.markInTransit();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
    });

    it('should update updatedAt when marking in transit', () => {
      const before = item.getUpdatedAt();

      item.markInTransit();

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject marking archived item as in transit', () => {
      item.archive();
      const result = item.markInTransit();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot move archived item');
      }
    });

    it('should reject marking disposed item as in transit', () => {
      item.dispose();
      const result = item.markInTransit();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot move disposed item');
      }
    });

    it('should allow marking in-processing item as in transit', () => {
      item.markInProcessing();
      const result = item.markInTransit();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
    });
  });

  describe('markInProcessing', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should mark item as in processing with handler', () => {
      const result = item.markInProcessing('John Smith');

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      expect(item.getHandledBy()).toBe('John Smith');
      expect(item.isInProcessing()).toBe(true);
    });

    it('should mark item as in processing without handler', () => {
      const result = item.markInProcessing();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      expect(item.getHandledBy()).toBeUndefined();
    });

    it('should update updatedAt when marking in processing', () => {
      const before = item.getUpdatedAt();

      item.markInProcessing();

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject marking archived item as in processing', () => {
      item.archive();
      const result = item.markInProcessing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot process archived item');
      }
    });

    it('should reject marking disposed item as in processing', () => {
      item.dispose();
      const result = item.markInProcessing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot process disposed item');
      }
    });
  });

  describe('archive', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should archive item successfully', () => {
      const result = item.archive();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.ARCHIVED);
      expect(item.isArchived()).toBe(true);
    });

    it('should update updatedAt when archiving', () => {
      const before = item.getUpdatedAt();

      item.archive();

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject archiving already archived item', () => {
      item.archive();
      const result = item.archive();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already archived');
      }
    });

    it('should reject archiving disposed item', () => {
      item.dispose();
      const result = item.archive();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot archive disposed item');
      }
    });

    it('should archive item from any valid state', () => {
      item.markInTransit();
      const result = item.archive();

      expect(result.isOk()).toBe(true);
      expect(item.isArchived()).toBe(true);
    });
  });

  describe('dispose', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should dispose item successfully', () => {
      const result = item.dispose();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      expect(item.isActive()).toBe(false);
      expect(item.isDisposed()).toBe(true);
    });

    it('should update updatedAt when disposing', () => {
      const before = item.getUpdatedAt();

      item.dispose();

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject disposing already disposed item', () => {
      item.dispose();
      const result = item.dispose();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already disposed');
      }
    });

    it('should dispose archived item', () => {
      item.archive();
      const result = item.dispose();

      expect(result.isOk()).toBe(true);
      expect(item.isDisposed()).toBe(true);
    });
  });

  describe('markAsMissing', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should mark item as missing', () => {
      const result = item.markAsMissing();

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.MISSING);
      expect(item.isMissing()).toBe(true);
    });

    it('should update updatedAt when marking as missing', () => {
      const before = item.getUpdatedAt();

      item.markAsMissing();

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should reject marking archived item as missing', () => {
      item.archive();
      const result = item.markAsMissing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Archived items cannot be marked as missing');
      }
    });

    it('should reject marking disposed item as missing', () => {
      item.dispose();
      const result = item.markAsMissing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Disposed items cannot be marked as missing');
      }
    });

    it('should allow marking in-transit item as missing', () => {
      item.markInTransit();
      const result = item.markAsMissing();

      expect(result.isOk()).toBe(true);
      expect(item.isMissing()).toBe(true);
    });
  });

  describe('updateMetadata', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        metadata: { initialKey: 'initialValue' },
      })._unsafeUnwrap();
    });

    it('should update metadata successfully', () => {
      const result = item.updateMetadata({ newKey: 'newValue' });

      expect(result.isOk()).toBe(true);
      const metadata = item.getMetadata();
      expect(metadata.initialKey).toBe('initialValue');
      expect(metadata.newKey).toBe('newValue');
    });

    it('should merge metadata with existing values', () => {
      item.updateMetadata({ secondKey: 'secondValue' });
      item.updateMetadata({ thirdKey: 'thirdValue' });

      const metadata = item.getMetadata();
      expect(metadata.initialKey).toBe('initialValue');
      expect(metadata.secondKey).toBe('secondValue');
      expect(metadata.thirdKey).toBe('thirdValue');
    });

    it('should overwrite existing metadata keys', () => {
      const result = item.updateMetadata({ initialKey: 'updatedValue' });

      expect(result.isOk()).toBe(true);
      expect(item.getMetadata().initialKey).toBe('updatedValue');
    });

    it('should update updatedAt when updating metadata', () => {
      const before = item.getUpdatedAt();

      item.updateMetadata({ newKey: 'newValue' });

      expect(item.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should not update metadata of archived item', () => {
      item.archive();
      const result = item.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update metadata of archived item');
      }
    });

    it('should not update metadata of disposed item', () => {
      item.dispose();
      const result = item.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update metadata of disposed item');
      }
    });
  });

  describe('shouldBeMarkedMissing', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should return false for never-seen item', () => {
      expect(item.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return false for recently seen item', () => {
      const recentTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      item.updateLocation('zone-001', 'reader-001', 0.85, recentTime);

      expect(item.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return true for item not seen beyond threshold', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72); // 72 hours ago
      item.updateLocation('zone-001', 'reader-001', 0.85, oldTime);

      expect(item.shouldBeMarkedMissing(48)).toBe(true);
    });

    it('should return false for archived item', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      item.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      item.archive();

      expect(item.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return false for disposed item', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      item.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      item.dispose();

      expect(item.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return false for already missing item', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      item.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      item.markAsMissing();

      expect(item.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should use default threshold of 48 hours', () => {
      const justUnderThreshold = new Date(Date.now() - 1000 * 60 * 60 * 47); // 47 hours ago
      item.updateLocation('zone-001', 'reader-001', 0.85, justUnderThreshold);

      expect(item.shouldBeMarkedMissing()).toBe(false);

      const item2 = Item.create({
        id: 'item-002',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Another Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const justOverThreshold = new Date(Date.now() - 1000 * 60 * 60 * 49); // 49 hours ago
      item2.updateLocation('zone-001', 'reader-001', 0.85, justOverThreshold);

      expect(item2.shouldBeMarkedMissing()).toBe(true);
    });

    it('should respect custom threshold', () => {
      const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2);
      item.updateLocation('zone-001', 'reader-001', 0.85, twoHoursAgo);

      expect(item.shouldBeMarkedMissing(1)).toBe(true);
      expect(item.shouldBeMarkedMissing(3)).toBe(false);
    });
  });

  describe('getDaysSinceLastSeen', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should return null for never-seen item', () => {
      expect(item.getDaysSinceLastSeen()).toBeNull();
    });

    it('should return 0 for recently seen item', () => {
      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getDaysSinceLastSeen()).toBe(0);
    });

    it('should calculate days correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
      item.updateLocation('zone-001', 'reader-001', 0.85, threeDaysAgo);

      const days = item.getDaysSinceLastSeen();
      expect(days).toBeGreaterThanOrEqual(2);
      expect(days).toBeLessThanOrEqual(3);
    });
  });

  describe('getHoursSinceLastSeen', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should return null for never-seen item', () => {
      expect(item.getHoursSinceLastSeen()).toBeNull();
    });

    it('should return 0 for just-seen item', () => {
      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.getHoursSinceLastSeen()).toBe(0);
    });

    it('should calculate hours correctly', () => {
      const fiveHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 5);
      item.updateLocation('zone-001', 'reader-001', 0.85, fiveHoursAgo);

      const hours = item.getHoursSinceLastSeen();
      expect(hours).toBeGreaterThanOrEqual(4);
      expect(hours).toBeLessThanOrEqual(5);
    });
  });

  describe('hasReliableLocation', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('should return false for item with no location', () => {
      expect(item.hasReliableLocation()).toBe(false);
    });

    it('should return true for high confidence location (above default 0.7)', () => {
      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.hasReliableLocation()).toBe(true);
    });

    it('should return true for location at default threshold (0.7)', () => {
      item.updateLocation('zone-001', 'reader-001', 0.7);

      expect(item.hasReliableLocation()).toBe(true);
    });

    it('should return false for low confidence location', () => {
      item.updateLocation('zone-001', 'reader-001', 0.5);

      expect(item.hasReliableLocation()).toBe(false);
    });

    it('should respect custom minimum confidence', () => {
      item.updateLocation('zone-001', 'reader-001', 0.6);

      expect(item.hasReliableLocation(0.7)).toBe(false);
      expect(item.hasReliableLocation(0.6)).toBe(true);
      expect(item.hasReliableLocation(0.5)).toBe(true);
    });
  });

  describe('status query methods', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    it('isMissing should return correct value', () => {
      expect(item.isMissing()).toBe(false);
      item.markAsMissing();
      expect(item.isMissing()).toBe(true);
    });

    it('isArchived should return correct value', () => {
      expect(item.isArchived()).toBe(false);
      item.archive();
      expect(item.isArchived()).toBe(true);
    });

    it('isDisposed should return correct value', () => {
      expect(item.isDisposed()).toBe(false);
      item.dispose();
      expect(item.isDisposed()).toBe(true);
    });

    it('isInProcessing should return correct value', () => {
      expect(item.isInProcessing()).toBe(false);
      item.markInProcessing();
      expect(item.isInProcessing()).toBe(true);
    });

    it('isActive should return correct value', () => {
      expect(item.isActive()).toBe(true);
      item.dispose();
      expect(item.isActive()).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should return all properties for persistence', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        serialNumber: 'SN-12345',
        receivedBy: 'John Smith',
        metadata: { key: 'value' },
      })._unsafeUnwrap();

      item.updateLocation('zone-001', 'reader-001', 0.95);
      item.markInProcessing('Jane Doe');

      const props = item.toPersistence();

      expect(props.id).toBe('item-001');
      expect(props.itemNumber).toBe(itemNumber);
      expect(props.rfidEpc).toBe(rfidEpc);
      expect(props.referenceId).toBe(referenceId);
      expect(props.description).toBe('Dell Laptop');
      expect(props.category).toBe(ItemCategory.ELECTRONIC);
      expect(props.serialNumber).toBe('SN-12345');
      expect(props.currentZoneId).toBe('zone-001');
      expect(props.lastSeenAt).not.toBeNull();
      expect(props.lastSeenReaderId).toBe('reader-001');
      expect(props.locationConfidence).toBe(0.95);
      expect(props.status).toBe(ItemStatus.IN_PROCESSING);
      expect(props.isActive).toBe(true);
      expect(props.receivedBy).toBe('John Smith');
      expect(props.receivedAt).toBeDefined();
      expect(props.handledBy).toBe('Jane Doe');
      expect(props.metadata).toEqual({ key: 'value' });
      expect(props.createdAt).toBeInstanceOf(Date);
      expect(props.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null values for unset optional fields', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const props = item.toPersistence();

      expect(props.currentZoneId).toBeNull();
      expect(props.lastSeenAt).toBeNull();
      expect(props.lastSeenReaderId).toBeNull();
      expect(props.locationConfidence).toBeNull();
    });
  });

  describe('toObject', () => {
    it('should return plain object representation with value object values', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        serialNumber: 'SN-12345',
        metadata: { key: 'value' },
      })._unsafeUnwrap();

      item.updateLocation('zone-001', 'reader-001', 0.85);

      const obj = item.toObject();

      expect(obj.id).toBe('item-001');
      expect(obj.itemNumber).toBe('INV-2025-000123');
      expect(obj.rfidEpc).toBe('E280116060002004DECA48DA');
      expect(obj.referenceId).toBe('PO-2025-12345');
      expect(obj.serialNumber).toBe('SN-12345');
      expect(obj.description).toBe('Dell Laptop');
      expect(obj.category).toBe(ItemCategory.ELECTRONIC);
      expect(obj.currentZoneId).toBe('zone-001');
      expect(obj.lastSeenAt).not.toBeNull();
      expect(obj.lastSeenReaderId).toBe('reader-001');
      expect(obj.locationConfidence).toBe(0.85);
      expect(obj.status).toBe(ItemStatus.REGISTERED);
      expect(obj.isActive).toBe(true);
      expect(obj.metadata).toEqual({ key: 'value' });
      expect(obj.createdAt).toBeInstanceOf(Date);
      expect(obj.updatedAt).toBeInstanceOf(Date);
    });

    it('should include all optional fields when set', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        receivedBy: 'John Smith',
      })._unsafeUnwrap();

      item.markInProcessing('Jane Doe');

      const obj = item.toObject();

      expect(obj.receivedBy).toBe('John Smith');
      expect(obj.receivedAt).toBeDefined();
      expect(obj.handledBy).toBe('Jane Doe');
    });
  });

  describe('getters return copies (immutability)', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        metadata: { key: 'value' },
      })._unsafeUnwrap();
      item.updateLocation('zone-001', 'reader-001', 0.85);
    });

    it('should return a copy of createdAt', () => {
      const original = item.getCreatedAt();
      const copy = item.getCreatedAt();

      copy.setFullYear(1999);

      expect(item.getCreatedAt().getFullYear()).not.toBe(1999);
      expect(item.getCreatedAt().getTime()).toBe(original.getTime());
    });

    it('should return a copy of updatedAt', () => {
      const original = item.getUpdatedAt();
      const copy = item.getUpdatedAt();

      copy.setFullYear(1999);

      expect(item.getUpdatedAt().getFullYear()).not.toBe(1999);
      expect(item.getUpdatedAt().getTime()).toBe(original.getTime());
    });

    it('should return a copy of lastSeenAt', () => {
      const original = item.getLastSeenAt();
      const copy = item.getLastSeenAt();

      copy!.setFullYear(1999);

      expect(item.getLastSeenAt()!.getFullYear()).not.toBe(1999);
      expect(item.getLastSeenAt()!.getTime()).toBe(original!.getTime());
    });

    it('should return a copy of receivedAt', () => {
      const itemWithReceiver = Item.create({
        id: 'item-002',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        receivedBy: 'John Smith',
      })._unsafeUnwrap();

      const original = itemWithReceiver.getReceivedAt();
      const copy = itemWithReceiver.getReceivedAt();

      copy!.setFullYear(1999);

      expect(itemWithReceiver.getReceivedAt()!.getFullYear()).not.toBe(1999);
      expect(itemWithReceiver.getReceivedAt()!.getTime()).toBe(original!.getTime());
    });

    it('should return a copy of metadata', () => {
      const metadata = item.getMetadata();
      metadata.key = 'modified';
      metadata.newKey = 'newValue';

      expect(item.getMetadata().key).toBe('value');
      expect(item.getMetadata().newKey).toBeUndefined();
    });
  });

  describe('ItemStatus enum', () => {
    it('should have all expected status values', () => {
      expect(ItemStatus.REGISTERED).toBe('registered');
      expect(ItemStatus.IN_TRANSIT).toBe('in_transit');
      expect(ItemStatus.IN_PROCESSING).toBe('in_processing');
      expect(ItemStatus.ARCHIVED).toBe('archived');
      expect(ItemStatus.DISPOSED).toBe('disposed');
      expect(ItemStatus.MISSING).toBe('missing');
    });

    it('should have exactly 6 status values', () => {
      const statuses = Object.values(ItemStatus);
      expect(statuses).toHaveLength(6);
    });
  });

  describe('ItemCategory enum', () => {
    it('should have all expected category values', () => {
      expect(ItemCategory.EQUIPMENT).toBe('equipment');
      expect(ItemCategory.CONSUMABLE).toBe('consumable');
      expect(ItemCategory.ELECTRONIC).toBe('electronic');
      expect(ItemCategory.DOCUMENT).toBe('document');
      expect(ItemCategory.MATERIAL).toBe('material');
      expect(ItemCategory.TOOL).toBe('tool');
      expect(ItemCategory.APPAREL).toBe('apparel');
      expect(ItemCategory.CONTAINER).toBe('container');
      expect(ItemCategory.SAMPLE).toBe('sample');
      expect(ItemCategory.OTHER).toBe('other');
    });

    it('should have exactly 10 category values', () => {
      const categories = Object.values(ItemCategory);
      expect(categories).toHaveLength(10);
    });
  });

  describe('state transitions', () => {
    let item: Item;

    beforeEach(() => {
      item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
    });

    describe('from REGISTERED', () => {
      it('can transition to IN_TRANSIT', () => {
        const result = item.markInTransit();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
      });

      it('can transition to IN_PROCESSING', () => {
        const result = item.markInProcessing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      });

      it('can transition to ARCHIVED', () => {
        const result = item.archive();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.ARCHIVED);
      });

      it('can transition to DISPOSED', () => {
        const result = item.dispose();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      });

      it('can transition to MISSING', () => {
        const result = item.markAsMissing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.MISSING);
      });
    });

    describe('from IN_TRANSIT', () => {
      beforeEach(() => {
        item.markInTransit();
      });

      it('can transition to IN_PROCESSING', () => {
        const result = item.markInProcessing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      });

      it('can transition to ARCHIVED', () => {
        const result = item.archive();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.ARCHIVED);
      });

      it('can transition to DISPOSED', () => {
        const result = item.dispose();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      });

      it('can transition to MISSING', () => {
        const result = item.markAsMissing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.MISSING);
      });
    });

    describe('from IN_PROCESSING', () => {
      beforeEach(() => {
        item.markInProcessing();
      });

      it('can transition to IN_TRANSIT', () => {
        const result = item.markInTransit();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
      });

      it('can transition to ARCHIVED', () => {
        const result = item.archive();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.ARCHIVED);
      });

      it('can transition to DISPOSED', () => {
        const result = item.dispose();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      });

      it('can transition to MISSING', () => {
        const result = item.markAsMissing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.MISSING);
      });
    });

    describe('from MISSING', () => {
      beforeEach(() => {
        item.markAsMissing();
      });

      it('can transition to REGISTERED via location update', () => {
        const result = item.updateLocation('zone-001', 'reader-001', 0.85);
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.REGISTERED);
      });

      it('can transition to IN_TRANSIT', () => {
        const result = item.markInTransit();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_TRANSIT);
      });

      it('can transition to IN_PROCESSING', () => {
        const result = item.markInProcessing();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      });

      it('can transition to ARCHIVED', () => {
        const result = item.archive();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.ARCHIVED);
      });

      it('can transition to DISPOSED', () => {
        const result = item.dispose();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      });
    });

    describe('from ARCHIVED (terminal state)', () => {
      beforeEach(() => {
        item.archive();
      });

      it('cannot transition to IN_TRANSIT', () => {
        const result = item.markInTransit();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to IN_PROCESSING', () => {
        const result = item.markInProcessing();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to MISSING', () => {
        const result = item.markAsMissing();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to ARCHIVED again', () => {
        const result = item.archive();
        expect(result.isErr()).toBe(true);
      });

      it('cannot update location', () => {
        const result = item.updateLocation('zone-001', 'reader-001', 0.85);
        expect(result.isErr()).toBe(true);
      });

      it('cannot update metadata', () => {
        const result = item.updateMetadata({ newKey: 'newValue' });
        expect(result.isErr()).toBe(true);
      });

      it('CAN transition to DISPOSED', () => {
        const result = item.dispose();
        expect(result.isOk()).toBe(true);
        expect(item.getStatus()).toBe(ItemStatus.DISPOSED);
      });
    });

    describe('from DISPOSED (terminal state)', () => {
      beforeEach(() => {
        item.dispose();
      });

      it('cannot transition to IN_TRANSIT', () => {
        const result = item.markInTransit();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to IN_PROCESSING', () => {
        const result = item.markInProcessing();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to ARCHIVED', () => {
        const result = item.archive();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to MISSING', () => {
        const result = item.markAsMissing();
        expect(result.isErr()).toBe(true);
      });

      it('cannot transition to DISPOSED again', () => {
        const result = item.dispose();
        expect(result.isErr()).toBe(true);
      });

      it('cannot update location', () => {
        const result = item.updateLocation('zone-001', 'reader-001', 0.85);
        expect(result.isErr()).toBe(true);
      });

      it('cannot update metadata', () => {
        const result = item.updateMetadata({ newKey: 'newValue' });
        expect(result.isErr()).toBe(true);
      });
    });
  });
});
