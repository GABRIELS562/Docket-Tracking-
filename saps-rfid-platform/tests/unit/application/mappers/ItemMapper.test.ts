import { ItemMapper } from '@application/mappers/ItemMapper';
import { Item, ItemStatus, ItemCategory } from '@domain/entities/Item';
import { ItemNumber } from '@domain/value-objects/ItemNumber';
import { RfidEpc } from '@domain/value-objects/RfidEpc';
import { ReferenceId } from '@domain/value-objects/ReferenceId';

import type { CreateItemDTO } from '@application/dto/ItemDTO';

describe('ItemMapper', () => {
  let itemNumber: ItemNumber;
  let rfidEpc: RfidEpc;
  let referenceId: ReferenceId;

  beforeEach(() => {
    itemNumber = ItemNumber.create('INV-2025-000123')._unsafeUnwrap();
    rfidEpc = RfidEpc.create('E280116060002004DECA48DA')._unsafeUnwrap();
    referenceId = ReferenceId.create('PO-2025-12345')._unsafeUnwrap();
  });

  describe('toDTO', () => {
    it('should convert Item entity to DTO with all required fields', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      expect(dto.id).toBe('item-001');
      expect(dto.itemNumber).toBe('INV-2025-000123');
      expect(dto.referenceId).toBe('PO-2025-12345');
      expect(dto.rfidEpc).toBe('E280116060002004DECA48DA');
      expect(dto.description).toBe('Dell Laptop Computer');
      expect(dto.category).toBe(ItemCategory.ELECTRONIC);
      expect(dto.status).toBe('registered');
      expect(dto.currentZone).toBeNull();
      expect(dto.lastSeenReaderId).toBeNull();
      expect(dto.lastSeenAt).toBeNull();
      expect(dto.locationConfidence).toBeNull();
      expect(dto.receivedBy).toBeNull();
      expect(dto.receivedAt).toBeNull();
      expect(dto.metadata).toEqual({});
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });

    it('should convert Item entity to DTO with optional serialNumber', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
        serialNumber: 'SN-123456789',
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      expect(dto.serialNumber).toBe('SN-123456789');
    });

    it('should convert Item entity to DTO with null serialNumber when not provided', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      expect(dto.serialNumber).toBeNull();
    });

    it('should convert Item entity to DTO with receivedBy and receivedAt', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
        receivedBy: 'John Smith',
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      expect(dto.receivedBy).toBe('John Smith');
      expect(dto.receivedAt).not.toBeNull();
      expect(typeof dto.receivedAt).toBe('string');
    });

    it('should convert Item entity to DTO with zone information', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const zoneInfo = {
        id: 'zone-001',
        name: 'Storage Area A',
        code: 'STOR-A',
      };

      const dto = ItemMapper.toDTO(item, zoneInfo);

      expect(dto.currentZone).toEqual(zoneInfo);
    });

    it('should convert Item entity to DTO with null zone when zoneInfo is null', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item, null);

      expect(dto.currentZone).toBeNull();
    });

    it('should convert Item entity with location data to DTO', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const timestamp = new Date('2025-10-02T14:32:11.000Z');
      item.updateLocation('zone-001', 'reader-001', 0.85, timestamp);

      const dto = ItemMapper.toDTO(item);

      expect(dto.lastSeenReaderId).toBe('reader-001');
      expect(dto.lastSeenAt).toBe('2025-10-02T14:32:11.000Z');
      expect(dto.locationConfidence).toBe(0.85);
    });

    it('should convert dates to ISO 8601 strings', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      // Validate ISO 8601 format
      expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(dto.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should convert Item entity with metadata to DTO', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Dell Laptop Computer',
        category: ItemCategory.ELECTRONIC,
        metadata: { customField: 'customValue', nested: { key: 'value' } },
      })._unsafeUnwrap();

      const dto = ItemMapper.toDTO(item);

      expect(dto.metadata).toEqual({ customField: 'customValue', nested: { key: 'value' } });
    });

    it('should handle all item statuses correctly', () => {
      const statuses = [
        ItemStatus.REGISTERED,
        ItemStatus.IN_TRANSIT,
        ItemStatus.IN_PROCESSING,
        ItemStatus.ARCHIVED,
        ItemStatus.DISPOSED,
        ItemStatus.MISSING,
      ];

      for (const status of statuses) {
        const item = Item.create({
          id: `item-${status}`,
          itemNumber,
          rfidEpc,
          referenceId,
          description: 'Test Item',
          category: ItemCategory.ELECTRONIC,
        })._unsafeUnwrap();

        // Update status based on type
        switch (status) {
          case ItemStatus.IN_TRANSIT:
            item.markInTransit();
            break;
          case ItemStatus.IN_PROCESSING:
            item.markInProcessing();
            break;
          case ItemStatus.ARCHIVED:
            item.archive();
            break;
          case ItemStatus.DISPOSED:
            item.dispose();
            break;
          case ItemStatus.MISSING:
            item.updateLocation('zone-001', 'reader-001', 0.85);
            item.markAsMissing();
            break;
        }

        const dto = ItemMapper.toDTO(item);
        expect(dto.status).toBe(status);
      }
    });

    it('should handle all item categories correctly', () => {
      const categories = Object.values(ItemCategory);

      for (const category of categories) {
        const item = Item.create({
          id: `item-${category}`,
          itemNumber,
          rfidEpc,
          referenceId,
          description: 'Test Item',
          category,
        })._unsafeUnwrap();

        const dto = ItemMapper.toDTO(item);
        expect(dto.category).toBe(category);
      }
    });
  });

  describe('toDTOArray', () => {
    it('should convert array of Item entities to DTOs', () => {
      const items = [
        Item.create({
          id: 'item-001',
          itemNumber: ItemNumber.create('INV-2025-000001')._unsafeUnwrap(),
          rfidEpc: RfidEpc.create('E280116060002004DECA48D1')._unsafeUnwrap(),
          referenceId: ReferenceId.create('PO-2025-00001')._unsafeUnwrap(),
          description: 'Item 1',
          category: ItemCategory.ELECTRONIC,
        })._unsafeUnwrap(),
        Item.create({
          id: 'item-002',
          itemNumber: ItemNumber.create('INV-2025-000002')._unsafeUnwrap(),
          rfidEpc: RfidEpc.create('E280116060002004DECA48D2')._unsafeUnwrap(),
          referenceId: ReferenceId.create('PO-2025-00002')._unsafeUnwrap(),
          description: 'Item 2',
          category: ItemCategory.EQUIPMENT,
        })._unsafeUnwrap(),
      ];

      const dtos = ItemMapper.toDTOArray(items);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('item-001');
      expect(dtos[1].id).toBe('item-002');
    });

    it('should return empty array for empty input', () => {
      const dtos = ItemMapper.toDTOArray([]);

      expect(dtos).toEqual([]);
    });

    it('should use zone map when provided', () => {
      const item1 = Item.create({
        id: 'item-001',
        itemNumber: ItemNumber.create('INV-2025-000001')._unsafeUnwrap(),
        rfidEpc: RfidEpc.create('E280116060002004DECA48D1')._unsafeUnwrap(),
        referenceId: ReferenceId.create('PO-2025-00001')._unsafeUnwrap(),
        description: 'Item 1',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();
      item1.updateLocation('zone-001', 'reader-001', 0.85);

      const item2 = Item.create({
        id: 'item-002',
        itemNumber: ItemNumber.create('INV-2025-000002')._unsafeUnwrap(),
        rfidEpc: RfidEpc.create('E280116060002004DECA48D2')._unsafeUnwrap(),
        referenceId: ReferenceId.create('PO-2025-00002')._unsafeUnwrap(),
        description: 'Item 2',
        category: ItemCategory.EQUIPMENT,
      })._unsafeUnwrap();
      item2.updateLocation('zone-002', 'reader-002', 0.9);

      const zoneMap = new Map([
        ['zone-001', { id: 'zone-001', name: 'Storage A', code: 'STOR-A' }],
        ['zone-002', { id: 'zone-002', name: 'Storage B', code: 'STOR-B' }],
      ]);

      const dtos = ItemMapper.toDTOArray([item1, item2], zoneMap);

      expect(dtos[0].currentZone).toEqual({ id: 'zone-001', name: 'Storage A', code: 'STOR-A' });
      expect(dtos[1].currentZone).toEqual({ id: 'zone-002', name: 'Storage B', code: 'STOR-B' });
    });

    it('should handle items without zones in zone map', () => {
      const item = Item.create({
        id: 'item-001',
        itemNumber,
        rfidEpc,
        referenceId,
        description: 'Item without zone',
        category: ItemCategory.ELECTRONIC,
      })._unsafeUnwrap();

      const zoneMap = new Map([
        ['zone-001', { id: 'zone-001', name: 'Storage A', code: 'STOR-A' }],
      ]);

      const dtos = ItemMapper.toDTOArray([item], zoneMap);

      expect(dtos[0].currentZone).toBeNull();
    });
  });

  describe('fromCreateDTO', () => {
    it('should convert CreateItemDTO to Item entity', () => {
      const dto: CreateItemDTO = {
        itemNumber: 'INV-2025-000456',
        referenceId: 'PO-2025-56789',
        description: 'New Laptop',
        category: 'electronic',
        rfidEpc: 'E280116060002004DECA48DB',
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-001');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getId()).toBe('item-new-001');
        expect(item.getItemNumber().getValue()).toBe('INV-2025-000456');
        expect(item.getReferenceId().getValue()).toBe('PO-2025-56789');
        expect(item.getDescription()).toBe('New Laptop');
        expect(item.getCategory()).toBe(ItemCategory.ELECTRONIC);
        expect(item.getRfidEpc().getValue()).toBe('E280116060002004DECA48DB');
        expect(item.getStatus()).toBe(ItemStatus.REGISTERED);
      }
    });

    it('should convert CreateItemDTO with optional fields to Item entity', () => {
      const dto: CreateItemDTO = {
        itemNumber: 'INV-2025-000456',
        referenceId: 'PO-2025-56789',
        description: 'New Laptop',
        category: 'electronic',
        rfidEpc: 'E280116060002004DECA48DB',
        serialNumber: 'SN-ABC123',
        receivedBy: 'Jane Doe',
        metadata: { vendor: 'Dell', warranty: '3 years' },
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-002');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const item = result.value;
        expect(item.getSerialNumber()).toBe('SN-ABC123');
        expect(item.getReceivedBy()).toBe('Jane Doe');
        expect(item.getMetadata()).toEqual({ vendor: 'Dell', warranty: '3 years' });
      }
    });

    it('should handle all category types in CreateItemDTO', () => {
      const categories: CreateItemDTO['category'][] = [
        'equipment',
        'consumable',
        'electronic',
        'document',
        'material',
        'tool',
        'apparel',
        'container',
        'sample',
        'other',
      ];

      for (const category of categories) {
        const dto: CreateItemDTO = {
          itemNumber: `INV-2025-${category}`,
          referenceId: `PO-2025-${category}`,
          description: `Test ${category} item`,
          category,
          rfidEpc: 'E280116060002004DECA48DB',
        };

        const result = ItemMapper.fromCreateDTO(dto, `item-${category}`);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getCategory()).toBe(category);
        }
      }
    });

    it('should return error for invalid item number', () => {
      const dto: CreateItemDTO = {
        itemNumber: '', // Invalid: empty
        referenceId: 'PO-2025-56789',
        description: 'New Laptop',
        category: 'electronic',
        rfidEpc: 'E280116060002004DECA48DB',
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for invalid reference ID', () => {
      const dto: CreateItemDTO = {
        itemNumber: 'INV-2025-000456',
        referenceId: '', // Invalid: empty
        description: 'New Laptop',
        category: 'electronic',
        rfidEpc: 'E280116060002004DECA48DB',
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for invalid RFID EPC', () => {
      const dto: CreateItemDTO = {
        itemNumber: 'INV-2025-000456',
        referenceId: 'PO-2025-56789',
        description: 'New Laptop',
        category: 'electronic',
        rfidEpc: 'invalid-epc', // Invalid: not 24 hex chars
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-001');

      expect(result.isErr()).toBe(true);
    });

    it('should return error for empty description', () => {
      const dto: CreateItemDTO = {
        itemNumber: 'INV-2025-000456',
        referenceId: 'PO-2025-56789',
        description: '', // Invalid: empty
        category: 'electronic',
        rfidEpc: 'E280116060002004DECA48DB',
      };

      const result = ItemMapper.fromCreateDTO(dto, 'item-new-001');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('mapStatusToDTO', () => {
    it('should map all valid statuses correctly', () => {
      expect(ItemMapper.mapStatusToDTO('registered')).toBe('registered');
      expect(ItemMapper.mapStatusToDTO('in_transit')).toBe('in_transit');
      expect(ItemMapper.mapStatusToDTO('in_processing')).toBe('in_processing');
      expect(ItemMapper.mapStatusToDTO('archived')).toBe('archived');
      expect(ItemMapper.mapStatusToDTO('disposed')).toBe('disposed');
      expect(ItemMapper.mapStatusToDTO('missing')).toBe('missing');
    });

    it('should default to registered for unknown status', () => {
      expect(ItemMapper.mapStatusToDTO('unknown_status')).toBe('registered');
    });
  });

  describe('mapCategoryToDomain', () => {
    it('should map all valid categories correctly', () => {
      expect(ItemMapper.mapCategoryToDomain('equipment')).toBe(ItemCategory.EQUIPMENT);
      expect(ItemMapper.mapCategoryToDomain('consumable')).toBe(ItemCategory.CONSUMABLE);
      expect(ItemMapper.mapCategoryToDomain('electronic')).toBe(ItemCategory.ELECTRONIC);
      expect(ItemMapper.mapCategoryToDomain('document')).toBe(ItemCategory.DOCUMENT);
      expect(ItemMapper.mapCategoryToDomain('material')).toBe(ItemCategory.MATERIAL);
      expect(ItemMapper.mapCategoryToDomain('tool')).toBe(ItemCategory.TOOL);
      expect(ItemMapper.mapCategoryToDomain('apparel')).toBe(ItemCategory.APPAREL);
      expect(ItemMapper.mapCategoryToDomain('container')).toBe(ItemCategory.CONTAINER);
      expect(ItemMapper.mapCategoryToDomain('sample')).toBe(ItemCategory.SAMPLE);
      expect(ItemMapper.mapCategoryToDomain('other')).toBe(ItemCategory.OTHER);
    });
  });
});
