import { Item, ItemStatus, ItemCategory } from '@domain/entities/Item';
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
    it('should create valid item', () => {
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

    it('should accept optional serial number', () => {
      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        serialNumber: 'SN-123456789',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSerialNumber()).toBe('SN-123456789');
      }
    });

    it('should set receivedBy and receivedAt when provided', () => {
      const beforeCreation = new Date();

      const result = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
        receivedBy: 'John Smith',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getReceivedBy()).toBe('John Smith');
        expect(item.getReceivedAt()).toBeDefined();
        expect(item.getReceivedAt()!.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
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

    it('should update location successfully', () => {
      const timestamp = new Date();
      const result = item.updateLocation('zone-001', 'reader-001', 0.85, timestamp);

      expect(result.isOk()).toBe(true);
      expect(item.getCurrentZoneId()).toBe('zone-001');
      expect(item.getLastSeenReaderId()).toBe('reader-001');
      expect(item.getLocationConfidence()).toBe(0.85);
      expect(item.getLastSeenAt()?.getTime()).toBe(timestamp.getTime());
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
    });

    it('should reject empty zone ID', () => {
      const result = item.updateLocation('', 'reader-001', 0.85);

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

    it('should reject marking archived item as in transit', () => {
      item.archive();
      const result = item.markInTransit();

      expect(result.isErr()).toBe(true);
    });

    it('should reject marking disposed item as in transit', () => {
      item.dispose();
      const result = item.markInTransit();

      expect(result.isErr()).toBe(true);
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

    it('should mark item as in processing', () => {
      const result = item.markInProcessing('John Smith');

      expect(result.isOk()).toBe(true);
      expect(item.getStatus()).toBe(ItemStatus.IN_PROCESSING);
      expect(item.getHandledBy()).toBe('John Smith');
      expect(item.isInProcessing()).toBe(true);
    });

    it('should reject marking archived item as in processing', () => {
      item.archive();
      const result = item.markInProcessing();

      expect(result.isErr()).toBe(true);
    });

    it('should reject marking disposed item as in processing', () => {
      item.dispose();
      const result = item.markInProcessing();

      expect(result.isErr()).toBe(true);
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

    it('should reject disposing already disposed item', () => {
      item.dispose();
      const result = item.dispose();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already disposed');
      }
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

    it('should return false for already missing item', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      item.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      item.markAsMissing();

      expect(item.shouldBeMarkedMissing(48)).toBe(false);
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

    it('should return true for high confidence location', () => {
      item.updateLocation('zone-001', 'reader-001', 0.85);

      expect(item.hasReliableLocation()).toBe(true);
    });

    it('should return false for low confidence location', () => {
      item.updateLocation('zone-001', 'reader-001', 0.5);

      expect(item.hasReliableLocation()).toBe(false);
    });

    it('should respect custom minimum confidence', () => {
      item.updateLocation('zone-001', 'reader-001', 0.6);

      expect(item.hasReliableLocation(0.7)).toBe(false);
      expect(item.hasReliableLocation(0.5)).toBe(true);
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

    it('should not update metadata of archived item', () => {
      item.archive();
      const result = item.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
    });

    it('should not update metadata of disposed item', () => {
      item.dispose();
      const result = item.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
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
        metadata: { key: 'value' },
      })._unsafeUnwrap();

      const props = item.toPersistence();

      expect(props.id).toBe('item-001');
      expect(props.itemNumber).toBe(itemNumber);
      expect(props.rfidEpc).toBe(rfidEpc);
      expect(props.referenceId).toBe(referenceId);
      expect(props.description).toBe('Dell Laptop');
      expect(props.category).toBe(ItemCategory.ELECTRONIC);
      expect(props.serialNumber).toBe('SN-12345');
      expect(props.status).toBe(ItemStatus.REGISTERED);
      expect(props.isActive).toBe(true);
      expect(props.metadata).toEqual({ key: 'value' });
    });
  });

  describe('toObject', () => {
    it('should return plain object representation', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const obj = item.toObject();

      expect(obj.id).toBe('item-001');
      expect(obj.itemNumber).toBe('INV-2025-000123');
      expect(obj.rfidEpc).toBe('E280116060002004DECA48DA');
      expect(obj.referenceId).toBe('PO-2025-12345');
      expect(obj.description).toBe('Dell Laptop');
      expect(obj.category).toBe(ItemCategory.ELECTRONIC);
      expect(obj.status).toBe(ItemStatus.REGISTERED);
    });
  });
});
