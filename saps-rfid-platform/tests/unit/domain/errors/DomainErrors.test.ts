import { DomainError } from '@domain/errors/DomainError';
import { DuplicateEpcError } from '@domain/errors/DuplicateEpcError';
import { DuplicateItemNumberError } from '@domain/errors/DuplicateItemNumberError';
import { InvalidEpcError } from '@domain/errors/InvalidEpcError';
import { InvalidIpAddressError } from '@domain/errors/InvalidIpAddressError';
import { InvalidItemNumberError } from '@domain/errors/InvalidItemNumberError';
import { InvalidReaderError } from '@domain/errors/InvalidReaderError';
import { InvalidReferenceIdError } from '@domain/errors/InvalidReferenceIdError';
import { InvalidZoneError } from '@domain/errors/InvalidZoneError';
import { ItemNotFoundError } from '@domain/errors/ItemNotFoundError';
import { ReaderNotFoundError } from '@domain/errors/ReaderNotFoundError';
import { TenantLimitExceededError } from '@domain/errors/TenantLimitExceededError';
import { TenantNotFoundError } from '@domain/errors/TenantNotFoundError';
import { TenantSuspendedError } from '@domain/errors/TenantSuspendedError';
import { UserNotFoundError } from '@domain/errors/UserNotFoundError';
import { ZoneCapacityExceededError } from '@domain/errors/ZoneCapacityExceededError';
import { ZoneNotFoundError } from '@domain/errors/ZoneNotFoundError';

describe('Domain Errors', () => {
  describe('ItemNotFoundError', () => {
    it('should create error with itemNumber identifier', () => {
      const error = new ItemNotFoundError('INV-2025-000001', 'itemNumber');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ItemNotFoundError');
      expect(error.code).toBe('ITEM_NOT_FOUND');
      expect(error.message).toContain('Item not found');
      expect(error.message).toContain('itemNumber');
      expect(error.message).toContain('INV-2025-000001');
      expect(error.metadata).toEqual({
        identifier: 'INV-2025-000001',
        identifierType: 'itemNumber',
      });
    });

    it('should create error with epc identifier', () => {
      const error = new ItemNotFoundError('E280116060002004DECA48DA', 'epc');

      expect(error.message).toContain('epc');
      expect(error.metadata?.identifierType).toBe('epc');
    });

    it('should create error with id identifier', () => {
      const error = new ItemNotFoundError('item-123', 'id');

      expect(error.message).toContain('id');
      expect(error.metadata?.identifierType).toBe('id');
    });

    it('should serialize to JSON correctly', () => {
      const error = new ItemNotFoundError('INV-2025-000001', 'itemNumber');
      const json = error.toJSON();

      expect(json.name).toBe('ItemNotFoundError');
      expect(json.code).toBe('ITEM_NOT_FOUND');
      expect(json.message).toContain('Item not found');
      expect(json.metadata).toBeDefined();
    });
  });

  describe('DuplicateEpcError', () => {
    it('should create error with EPC', () => {
      const error = new DuplicateEpcError('E280116060002004DECA48DA');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('DUPLICATE_EPC');
      expect(error.message).toContain('E280116060002004DECA48DA');
    });
  });

  describe('DuplicateItemNumberError', () => {
    it('should create error with item number', () => {
      const error = new DuplicateItemNumberError('INV-2025-000001');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('DUPLICATE_ITEM_NUMBER');
      expect(error.message).toContain('INV-2025-000001');
    });
  });

  describe('InvalidEpcError', () => {
    it('should create error with reason', () => {
      const error = new InvalidEpcError('EPC must be exactly 24 characters');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_EPC');
      expect(error.message).toContain('24 characters');
    });
  });

  describe('InvalidIpAddressError', () => {
    it('should create error with invalid IP', () => {
      const error = new InvalidIpAddressError('not-an-ip');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_IP_ADDRESS');
      expect(error.message).toContain('not-an-ip');
    });
  });

  describe('InvalidItemNumberError', () => {
    it('should create error with reason', () => {
      const error = new InvalidItemNumberError('Item number must follow format INV-YYYY-NNNNNN');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_ITEM_NUMBER');
      expect(error.message).toContain('INV-YYYY-NNNNNN');
    });
  });

  describe('InvalidReaderError', () => {
    it('should create error with reason', () => {
      const error = new InvalidReaderError('Reader name cannot be empty');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_READER');
      expect(error.message).toContain('cannot be empty');
    });
  });

  describe('InvalidReferenceIdError', () => {
    it('should create error with reason', () => {
      const error = new InvalidReferenceIdError('Reference ID cannot be empty');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_REFERENCE_ID');
      expect(error.message).toContain('cannot be empty');
    });
  });

  describe('InvalidZoneError', () => {
    it('should create error with reason', () => {
      const error = new InvalidZoneError('Zone name cannot be empty');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('INVALID_ZONE');
      expect(error.message).toContain('cannot be empty');
    });
  });

  describe('ReaderNotFoundError', () => {
    it('should create error with reader ID', () => {
      const error = new ReaderNotFoundError('reader-123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('READER_NOT_FOUND');
      expect(error.message).toContain('reader-123');
    });
  });

  describe('ZoneNotFoundError', () => {
    it('should create error with zone ID', () => {
      const error = new ZoneNotFoundError('zone-123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('ZONE_NOT_FOUND');
      expect(error.message).toContain('zone-123');
    });
  });

  describe('ZoneCapacityExceededError', () => {
    it('should create error with zone details', () => {
      const error = new ZoneCapacityExceededError('zone-123', 150, 100);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('ZONE_CAPACITY_EXCEEDED');
      expect(error.message).toContain('zone-123');
      expect(error.message).toContain('150/100');
      expect(error.metadata?.capacity).toBe(100);
      expect(error.metadata?.currentOccupancy).toBe(150);
    });
  });

  describe('TenantNotFoundError', () => {
    it('should create error with tenant ID', () => {
      const error = new TenantNotFoundError('tenant-123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('TENANT_NOT_FOUND');
      expect(error.message).toContain('tenant-123');
    });
  });

  describe('TenantSuspendedError', () => {
    it('should create error with tenant ID', () => {
      const error = new TenantSuspendedError('tenant-123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('TENANT_SUSPENDED');
      expect(error.message).toContain('tenant-123');
    });
  });

  describe('TenantLimitExceededError', () => {
    it('should create error with limit details', () => {
      const error = new TenantLimitExceededError('tenant-123', 'items', 1000, 1500);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('TENANT_LIMIT_EXCEEDED');
      expect(error.message).toContain('items');
      expect(error.message).toContain('1500/1000');
      expect(error.metadata?.limit).toBe(1000);
      expect(error.metadata?.current).toBe(1500);
      expect(error.metadata?.tenantId).toBe('tenant-123');
    });
  });

  describe('UserNotFoundError', () => {
    it('should create error with user ID', () => {
      const error = new UserNotFoundError('user-123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.message).toContain('user-123');
    });
  });

  describe('DomainError inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const error = new ItemNotFoundError('item-123', 'id');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof DomainError).toBe(true);
      expect(error instanceof ItemNotFoundError).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new ItemNotFoundError('item-123', 'id');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ItemNotFoundError');
    });
  });
});
