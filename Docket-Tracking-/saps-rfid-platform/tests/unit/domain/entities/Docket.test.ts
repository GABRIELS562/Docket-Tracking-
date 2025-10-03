import { Docket, DocketStatus, DocketCategory } from '@domain/entities/Docket';
import { LabNumber } from '@domain/value-objects/LabNumber';
import { RfidEpc } from '@domain/value-objects/RfidEpc';

describe('Docket', () => {
  let labNumber: LabNumber;
  let rfidEpc: RfidEpc;

  beforeEach(() => {
    labNumber = LabNumber.create('FSL-2025-000123')._unsafeUnwrap();
    rfidEpc = RfidEpc.create('E28011606000204DECA48DA')._unsafeUnwrap();
  });

  describe('create', () => {
    it('should create valid docket', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const docket = result.value;
        expect(docket.getId()).toBe('docket-001');
        expect(docket.getLabNumber()).toBe(labNumber);
        expect(docket.getRfidEpc()).toBe(rfidEpc);
        expect(docket.getCaseNumber()).toBe('CAS-2025-0123');
        expect(docket.getDescription()).toBe('9mm Pistol');
        expect(docket.getCategory()).toBe(DocketCategory.FIREARM);
        expect(docket.getStatus()).toBe(DocketStatus.REGISTERED);
        expect(docket.isActive()).toBe(true);
        expect(docket.getCurrentZoneId()).toBeNull();
      }
    });

    it('should reject empty case number', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: '',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Case number cannot be empty');
      }
    });

    it('should reject whitespace-only case number', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: '   ',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      });

      expect(result.isErr()).toBe(true);
    });

    it('should reject empty description', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '',
        category: DocketCategory.FIREARM,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Description cannot be empty');
      }
    });

    it('should reject empty ID', () => {
      const result = Docket.create({
        id: '',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ID cannot be empty');
      }
    });

    it('should trim case number and description', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: '  CAS-2025-0123  ',
        description: '  9mm Pistol  ',
        category: DocketCategory.FIREARM,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getCaseNumber()).toBe('CAS-2025-0123');
        expect(result.value.getDescription()).toBe('9mm Pistol');
      }
    });

    it('should accept optional exhibit number', () => {
      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        exhibitNumber: 'EXH-001',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getExhibitNumber()).toBe('EXH-001');
      }
    });

    it('should set receivedBy and receivedAt when provided', () => {
      const beforeCreation = new Date();

      const result = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
        receivedBy: 'Officer Smith',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const docket = result.value;
        expect(docket.getReceivedBy()).toBe('Officer Smith');
        expect(docket.getReceivedAt()).toBeDefined();
        expect(docket.getReceivedAt()!.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      }
    });
  });

  describe('updateLocation', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should update location successfully', () => {
      const timestamp = new Date();
      const result = docket.updateLocation('zone-001', 'reader-001', 0.85, timestamp);

      expect(result.isOk()).toBe(true);
      expect(docket.getCurrentZoneId()).toBe('zone-001');
      expect(docket.getLastSeenReaderId()).toBe('reader-001');
      expect(docket.getLocationConfidence()).toBe(0.85);
      expect(docket.getLastSeenAt()?.getTime()).toBe(timestamp.getTime());
    });

    it('should reject confidence below 0', () => {
      const result = docket.updateLocation('zone-001', 'reader-001', -0.1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('confidence must be between 0.0 and 1.0');
      }
    });

    it('should reject confidence above 1', () => {
      const result = docket.updateLocation('zone-001', 'reader-001', 1.1);

      expect(result.isErr()).toBe(true);
    });

    it('should reject empty zone ID', () => {
      const result = docket.updateLocation('', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone ID cannot be empty');
      }
    });

    it('should reject empty reader ID', () => {
      const result = docket.updateLocation('zone-001', '', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Reader ID cannot be empty');
      }
    });

    it('should not update location of archived docket', () => {
      docket.archive();
      const result = docket.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update location of archived docket');
      }
    });

    it('should not update location of disposed docket', () => {
      docket.dispose();
      const result = docket.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot update location of disposed docket');
      }
    });

    it('should restore missing docket to registered when location updates', () => {
      docket.markAsMissing();
      expect(docket.getStatus()).toBe(DocketStatus.MISSING);

      const result = docket.updateLocation('zone-001', 'reader-001', 0.85);

      expect(result.isOk()).toBe(true);
      expect(docket.getStatus()).toBe(DocketStatus.REGISTERED);
    });
  });

  describe('archive', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should archive docket successfully', () => {
      const result = docket.archive();

      expect(result.isOk()).toBe(true);
      expect(docket.getStatus()).toBe(DocketStatus.ARCHIVED);
      expect(docket.isArchived()).toBe(true);
    });

    it('should reject archiving already archived docket', () => {
      docket.archive();
      const result = docket.archive();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already archived');
      }
    });

    it('should reject archiving disposed docket', () => {
      docket.dispose();
      const result = docket.archive();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot archive disposed docket');
      }
    });
  });

  describe('dispose', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should dispose docket successfully', () => {
      const result = docket.dispose();

      expect(result.isOk()).toBe(true);
      expect(docket.getStatus()).toBe(DocketStatus.DISPOSED);
      expect(docket.isActive()).toBe(false);
      expect(docket.isDisposed()).toBe(true);
    });

    it('should reject disposing already disposed docket', () => {
      docket.dispose();
      const result = docket.dispose();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already disposed');
      }
    });
  });

  describe('markAsMissing', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should mark docket as missing', () => {
      const result = docket.markAsMissing();

      expect(result.isOk()).toBe(true);
      expect(docket.getStatus()).toBe(DocketStatus.MISSING);
      expect(docket.isMissing()).toBe(true);
    });

    it('should reject marking archived docket as missing', () => {
      docket.archive();
      const result = docket.markAsMissing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Archived dockets cannot be marked as missing');
      }
    });

    it('should reject marking disposed docket as missing', () => {
      docket.dispose();
      const result = docket.markAsMissing();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Disposed dockets cannot be marked as missing');
      }
    });
  });

  describe('shouldBeMarkedMissing', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should return false for never-seen docket', () => {
      expect(docket.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return false for recently seen docket', () => {
      const recentTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      docket.updateLocation('zone-001', 'reader-001', 0.85, recentTime);

      expect(docket.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return true for docket not seen beyond threshold', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72); // 72 hours ago
      docket.updateLocation('zone-001', 'reader-001', 0.85, oldTime);

      expect(docket.shouldBeMarkedMissing(48)).toBe(true);
    });

    it('should return false for archived docket', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      docket.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      docket.archive();

      expect(docket.shouldBeMarkedMissing(48)).toBe(false);
    });

    it('should return false for already missing docket', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 72);
      docket.updateLocation('zone-001', 'reader-001', 0.85, oldTime);
      docket.markAsMissing();

      expect(docket.shouldBeMarkedMissing(48)).toBe(false);
    });
  });

  describe('getDaysSinceLastSeen', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should return null for never-seen docket', () => {
      expect(docket.getDaysSinceLastSeen()).toBeNull();
    });

    it('should calculate days correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
      docket.updateLocation('zone-001', 'reader-001', 0.85, threeDaysAgo);

      const days = docket.getDaysSinceLastSeen();
      expect(days).toBeGreaterThanOrEqual(2);
      expect(days).toBeLessThanOrEqual(3);
    });
  });

  describe('hasReliableLocation', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
      })._unsafeUnwrap();
    });

    it('should return false for docket with no location', () => {
      expect(docket.hasReliableLocation()).toBe(false);
    });

    it('should return true for high confidence location', () => {
      docket.updateLocation('zone-001', 'reader-001', 0.85);

      expect(docket.hasReliableLocation()).toBe(true);
    });

    it('should return false for low confidence location', () => {
      docket.updateLocation('zone-001', 'reader-001', 0.5);

      expect(docket.hasReliableLocation()).toBe(false);
    });

    it('should respect custom minimum confidence', () => {
      docket.updateLocation('zone-001', 'reader-001', 0.6);

      expect(docket.hasReliableLocation(0.7)).toBe(false);
      expect(docket.hasReliableLocation(0.5)).toBe(true);
    });
  });

  describe('updateMetadata', () => {
    let docket: Docket;

    beforeEach(() => {
      docket = Docket.create({
        id: 'docket-001',
        labNumber,
        rfidEpc,
        caseNumber: 'CAS-2025-0123',
        description: '9mm Pistol',
        category: DocketCategory.FIREARM,
        metadata: { initialKey: 'initialValue' },
      })._unsafeUnwrap();
    });

    it('should update metadata successfully', () => {
      const result = docket.updateMetadata({ newKey: 'newValue' });

      expect(result.isOk()).toBe(true);
      const metadata = docket.getMetadata();
      expect(metadata.initialKey).toBe('initialValue');
      expect(metadata.newKey).toBe('newValue');
    });

    it('should not update metadata of archived docket', () => {
      docket.archive();
      const result = docket.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
    });

    it('should not update metadata of disposed docket', () => {
      docket.dispose();
      const result = docket.updateMetadata({ newKey: 'newValue' });

      expect(result.isErr()).toBe(true);
    });
  });
});
