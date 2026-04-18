import {
  Tenant,
  SubscriptionTier,
  SubscriptionStatus,
  TenantProps,
  TenantFeatures,
  TenantLimits,
} from '@domain/entities/Tenant';

describe('Tenant', () => {
  const validCreateProps = {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    contactEmail: 'admin@acme.com',
  };

  describe('create', () => {
    it('should create a valid tenant with minimal props', () => {
      const result = Tenant.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tenant = result.value;
        expect(tenant.name).toBe('Acme Corporation');
        expect(tenant.slug).toBe('acme-corp');
        expect(tenant.contactEmail).toBe('admin@acme.com');
        expect(tenant.contactPhone).toBeNull();
        expect(tenant.subscriptionTier).toBe(SubscriptionTier.TRIAL);
        expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.TRIAL);
        expect(tenant.isActive).toBe(true);
        expect(tenant.trialEndsAt).not.toBeNull();
        expect(tenant.suspendedAt).toBeNull();
      }
    });

    it('should create tenant with provided ID', () => {
      const result = Tenant.create({
        ...validCreateProps,
        id: 'tenant-123',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('tenant-123');
      }
    });

    it('should generate UUID when ID not provided', () => {
      const result = Tenant.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should create tenant with contact phone', () => {
      const result = Tenant.create({
        ...validCreateProps,
        contactPhone: '+27123456789',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contactPhone).toBe('+27123456789');
      }
    });

    it('should create tenant with specific subscription tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tenant = result.value;
        expect(tenant.subscriptionTier).toBe(SubscriptionTier.PROFESSIONAL);
        expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
        expect(tenant.trialEndsAt).toBeNull();
      }
    });

    it('should set TRIAL status for trial tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.subscriptionStatus).toBe(SubscriptionStatus.TRIAL);
        expect(result.value.trialEndsAt).not.toBeNull();
      }
    });

    it('should set ACTIVE status for non-trial tiers', () => {
      const tiers = [
        SubscriptionTier.STARTER,
        SubscriptionTier.PROFESSIONAL,
        SubscriptionTier.ENTERPRISE,
      ];

      for (const tier of tiers) {
        const result = Tenant.create({
          ...validCreateProps,
          slug: `acme-${tier}`,
          subscriptionTier: tier,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
          expect(result.value.trialEndsAt).toBeNull();
        }
      }
    });

    it('should normalize email to lowercase', () => {
      const result = Tenant.create({
        ...validCreateProps,
        contactEmail: 'Admin@ACME.COM',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contactEmail).toBe('admin@acme.com');
      }
    });

    it('should store slug in lowercase (validation requires lowercase input)', () => {
      const result = Tenant.create({
        ...validCreateProps,
        slug: 'acme-corp',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.slug).toBe('acme-corp');
      }
    });

    it('should trim name whitespace', () => {
      const result = Tenant.create({
        ...validCreateProps,
        name: '  Acme Corporation  ',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe('Acme Corporation');
      }
    });

    it('should set default settings', () => {
      const result = Tenant.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const settings = result.value.settings;
        expect(settings.timezone).toBe('Africa/Johannesburg');
        expect(settings.dateFormat).toBe('DD/MM/YYYY');
        expect(settings.itemNumberFormat).toBe('NNNNNN/YY');
        expect(settings.referenceIdFormat).toBe('DD/NN/YY');
        expect(settings.defaultRetentionDays).toBe(90);
        expect(settings.alertEmailEnabled).toBe(true);
      }
    });

    it('should set default branding', () => {
      const result = Tenant.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const branding = result.value.branding;
        expect(branding.logoUrl).toBeNull();
        expect(branding.primaryColor).toBe('#3B82F6');
        expect(branding.secondaryColor).toBe('#1E40AF');
      }
    });

    it('should set trial end date 14 days from creation', () => {
      const beforeCreation = new Date();
      const result = Tenant.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const trialEndsAt = result.value.trialEndsAt!;
        const expectedMinDate = new Date(beforeCreation);
        expectedMinDate.setDate(expectedMinDate.getDate() + 14);

        // Should be approximately 14 days from now (within a few seconds)
        const diffMs = trialEndsAt.getTime() - beforeCreation.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(13.9);
        expect(diffDays).toBeLessThanOrEqual(14.1);
      }
    });

    // Validation errors
    describe('slug validation', () => {
      it('should reject slug shorter than 3 characters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'ab',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid slug format');
        }
      });

      it('should reject slug longer than 50 characters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'a'.repeat(51),
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid slug format');
        }
      });

      it('should reject slug starting with hyphen', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: '-acme-corp',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject slug ending with hyphen', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'acme-corp-',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject slug with uppercase letters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'AcmeCorp',
        });

        // Validation happens before normalization, so uppercase letters are rejected
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid slug format');
        }
      });

      it('should reject slug with special characters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'acme_corp',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject slug with spaces', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'acme corp',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should accept valid slug with numbers', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'acme123',
        });

        expect(result.isOk()).toBe(true);
      });

      it('should accept valid slug with hyphens in middle', () => {
        const result = Tenant.create({
          ...validCreateProps,
          slug: 'acme-corp-2024',
        });

        expect(result.isOk()).toBe(true);
      });
    });

    describe('email validation', () => {
      it('should reject invalid email without @', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'adminacme.com',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid contact email format');
        }
      });

      it('should reject invalid email without domain', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'admin@',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject invalid email without TLD', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'admin@acme',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject email with spaces', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'admin @acme.com',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should accept valid email with subdomain', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'admin@mail.acme.com',
        });

        expect(result.isOk()).toBe(true);
      });

      it('should accept valid email with plus sign', () => {
        const result = Tenant.create({
          ...validCreateProps,
          contactEmail: 'admin+test@acme.com',
        });

        expect(result.isOk()).toBe(true);
      });
    });

    describe('name validation', () => {
      it('should reject empty name', () => {
        const result = Tenant.create({
          ...validCreateProps,
          name: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Tenant name must be at least 2 characters');
        }
      });

      it('should reject name with only whitespace', () => {
        const result = Tenant.create({
          ...validCreateProps,
          name: '   ',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject name shorter than 2 characters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          name: 'A',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should accept name with exactly 2 characters', () => {
        const result = Tenant.create({
          ...validCreateProps,
          name: 'AB',
        });

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute tenant from stored props', () => {
      const now = new Date();
      const props: TenantProps = {
        id: 'tenant-123',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        contactEmail: 'admin@acme.com',
        contactPhone: '+27123456789',
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        limits: {
          maxItems: 10000,
          maxUsers: 20,
          maxZones: 50,
          maxReaders: 20,
        },
        branding: {
          logoUrl: 'https://acme.com/logo.png',
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00',
        },
        features: {
          realtimeTracking: true,
          analyticsDashboard: true,
          spatialIntelligence: true,
          digitalTwin: false,
          apiAccess: true,
          customFields: true,
          exportReports: true,
          mobileApp: true,
        },
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          itemNumberFormat: 'CUSTOM-NNNN',
          referenceIdFormat: 'REF-NNNN',
          defaultRetentionDays: 180,
          alertEmailEnabled: false,
        },
        metadata: { customField: 'value' },
        isActive: true,
        createdAt: now,
        updatedAt: now,
        trialEndsAt: null,
        suspendedAt: null,
      };

      const tenant = Tenant.reconstitute(props);

      expect(tenant.id).toBe('tenant-123');
      expect(tenant.name).toBe('Acme Corporation');
      expect(tenant.slug).toBe('acme-corp');
      expect(tenant.contactEmail).toBe('admin@acme.com');
      expect(tenant.contactPhone).toBe('+27123456789');
      expect(tenant.subscriptionTier).toBe(SubscriptionTier.PROFESSIONAL);
      expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(tenant.limits.maxItems).toBe(10000);
      expect(tenant.branding.logoUrl).toBe('https://acme.com/logo.png');
      expect(tenant.features.digitalTwin).toBe(false);
      expect(tenant.settings.timezone).toBe('UTC');
      expect(tenant.metadata).toEqual({ customField: 'value' });
      expect(tenant.isActive).toBe(true);
      expect(tenant.createdAt).toBe(now);
      expect(tenant.updatedAt).toBe(now);
    });
  });

  describe('tier-based features and limits', () => {
    it('should set correct features for TRIAL tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value.features;
        expect(features.realtimeTracking).toBe(true);
        expect(features.analyticsDashboard).toBe(false);
        expect(features.spatialIntelligence).toBe(false);
        expect(features.digitalTwin).toBe(false);
        expect(features.apiAccess).toBe(false);
        expect(features.customFields).toBe(false);
        expect(features.exportReports).toBe(false);
        expect(features.mobileApp).toBe(false);
      }
    });

    it('should set correct features for STARTER tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.STARTER,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value.features;
        expect(features.realtimeTracking).toBe(true);
        expect(features.analyticsDashboard).toBe(true);
        expect(features.spatialIntelligence).toBe(false);
        expect(features.digitalTwin).toBe(false);
        expect(features.apiAccess).toBe(false);
        expect(features.customFields).toBe(false);
        expect(features.exportReports).toBe(true);
        expect(features.mobileApp).toBe(false);
      }
    });

    it('should set correct features for PROFESSIONAL tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value.features;
        expect(features.realtimeTracking).toBe(true);
        expect(features.analyticsDashboard).toBe(true);
        expect(features.spatialIntelligence).toBe(true);
        expect(features.digitalTwin).toBe(false);
        expect(features.apiAccess).toBe(true);
        expect(features.customFields).toBe(true);
        expect(features.exportReports).toBe(true);
        expect(features.mobileApp).toBe(true);
      }
    });

    it('should set correct features for ENTERPRISE tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value.features;
        expect(features.realtimeTracking).toBe(true);
        expect(features.analyticsDashboard).toBe(true);
        expect(features.spatialIntelligence).toBe(true);
        expect(features.digitalTwin).toBe(true);
        expect(features.apiAccess).toBe(true);
        expect(features.customFields).toBe(true);
        expect(features.exportReports).toBe(true);
        expect(features.mobileApp).toBe(true);
      }
    });

    it('should set correct limits for TRIAL tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const limits = result.value.limits;
        expect(limits.maxItems).toBe(100);
        expect(limits.maxUsers).toBe(2);
        expect(limits.maxZones).toBe(5);
        expect(limits.maxReaders).toBe(2);
      }
    });

    it('should set correct limits for STARTER tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.STARTER,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const limits = result.value.limits;
        expect(limits.maxItems).toBe(1000);
        expect(limits.maxUsers).toBe(5);
        expect(limits.maxZones).toBe(10);
        expect(limits.maxReaders).toBe(5);
      }
    });

    it('should set correct limits for PROFESSIONAL tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const limits = result.value.limits;
        expect(limits.maxItems).toBe(10000);
        expect(limits.maxUsers).toBe(20);
        expect(limits.maxZones).toBe(50);
        expect(limits.maxReaders).toBe(20);
      }
    });

    it('should set correct limits for ENTERPRISE tier', () => {
      const result = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const limits = result.value.limits;
        expect(limits.maxItems).toBe(300000);
        expect(limits.maxUsers).toBe(100);
        expect(limits.maxZones).toBe(200);
        expect(limits.maxReaders).toBe(100);
      }
    });
  });

  describe('hasFeature', () => {
    it('should return true for enabled feature', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
      })._unsafeUnwrap();

      expect(tenant.hasFeature('digitalTwin')).toBe(true);
      expect(tenant.hasFeature('apiAccess')).toBe(true);
    });

    it('should return false for disabled feature', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      })._unsafeUnwrap();

      expect(tenant.hasFeature('digitalTwin')).toBe(false);
      expect(tenant.hasFeature('apiAccess')).toBe(false);
    });
  });

  describe('isWithinLimit', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      })._unsafeUnwrap();
    });

    it('should return true when under limit', () => {
      expect(tenant.isWithinLimit('maxItems', 50)).toBe(true);
      expect(tenant.isWithinLimit('maxUsers', 1)).toBe(true);
    });

    it('should return false when at limit', () => {
      expect(tenant.isWithinLimit('maxItems', 100)).toBe(false);
      expect(tenant.isWithinLimit('maxUsers', 2)).toBe(false);
    });

    it('should return false when over limit', () => {
      expect(tenant.isWithinLimit('maxItems', 150)).toBe(false);
      expect(tenant.isWithinLimit('maxUsers', 5)).toBe(false);
    });
  });

  describe('isTrialExpired', () => {
    it('should return false when no trial end date', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      expect(tenant.isTrialExpired()).toBe(false);
    });

    it('should return false when trial has not expired', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.TRIAL,
      })._unsafeUnwrap();

      expect(tenant.isTrialExpired()).toBe(false);
    });

    it('should return true when trial has expired', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const tenant = Tenant.reconstitute({
        id: 'tenant-123',
        name: 'Test',
        slug: 'test',
        contactEmail: 'test@test.com',
        contactPhone: null,
        subscriptionTier: SubscriptionTier.TRIAL,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        limits: { maxItems: 100, maxUsers: 2, maxZones: 5, maxReaders: 2 },
        branding: { logoUrl: null, primaryColor: '#3B82F6', secondaryColor: '#1E40AF' },
        features: {
          realtimeTracking: true,
          analyticsDashboard: false,
          spatialIntelligence: false,
          digitalTwin: false,
          apiAccess: false,
          customFields: false,
          exportReports: false,
          mobileApp: false,
        },
        settings: {
          timezone: 'UTC',
          dateFormat: 'DD/MM/YYYY',
          itemNumberFormat: 'NNNNNN/YY',
          referenceIdFormat: 'DD/NN/YY',
          defaultRetentionDays: 90,
          alertEmailEnabled: true,
        },
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        trialEndsAt: pastDate,
        suspendedAt: null,
      });

      expect(tenant.isTrialExpired()).toBe(true);
    });
  });

  describe('canBeUsed', () => {
    it('should return true for active tenant with active subscription', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      expect(tenant.canBeUsed()).toBe(true);
    });

    it('should return true for active trial tenant', () => {
      const tenant = Tenant.create(validCreateProps)._unsafeUnwrap();

      expect(tenant.canBeUsed()).toBe(true);
    });

    it('should return false for suspended tenant', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      tenant.suspend();
      expect(tenant.canBeUsed()).toBe(false);
    });

    it('should return false for deactivated tenant', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      tenant.deactivate();
      expect(tenant.canBeUsed()).toBe(false);
    });

    it('should return false for expired trial', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const tenant = Tenant.reconstitute({
        id: 'tenant-123',
        name: 'Test',
        slug: 'test',
        contactEmail: 'test@test.com',
        contactPhone: null,
        subscriptionTier: SubscriptionTier.TRIAL,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        limits: { maxItems: 100, maxUsers: 2, maxZones: 5, maxReaders: 2 },
        branding: { logoUrl: null, primaryColor: '#3B82F6', secondaryColor: '#1E40AF' },
        features: {
          realtimeTracking: true,
          analyticsDashboard: false,
          spatialIntelligence: false,
          digitalTwin: false,
          apiAccess: false,
          customFields: false,
          exportReports: false,
          mobileApp: false,
        },
        settings: {
          timezone: 'UTC',
          dateFormat: 'DD/MM/YYYY',
          itemNumberFormat: 'NNNNNN/YY',
          referenceIdFormat: 'DD/NN/YY',
          defaultRetentionDays: 90,
          alertEmailEnabled: true,
        },
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        trialEndsAt: pastDate,
        suspendedAt: null,
      });

      expect(tenant.canBeUsed()).toBe(false);
    });

    it('should return false for cancelled subscription', () => {
      const tenant = Tenant.reconstitute({
        id: 'tenant-123',
        name: 'Test',
        slug: 'test',
        contactEmail: 'test@test.com',
        contactPhone: null,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        limits: { maxItems: 10000, maxUsers: 20, maxZones: 50, maxReaders: 20 },
        branding: { logoUrl: null, primaryColor: '#3B82F6', secondaryColor: '#1E40AF' },
        features: {
          realtimeTracking: true,
          analyticsDashboard: true,
          spatialIntelligence: true,
          digitalTwin: false,
          apiAccess: true,
          customFields: true,
          exportReports: true,
          mobileApp: true,
        },
        settings: {
          timezone: 'UTC',
          dateFormat: 'DD/MM/YYYY',
          itemNumberFormat: 'NNNNNN/YY',
          referenceIdFormat: 'DD/NN/YY',
          defaultRetentionDays: 90,
          alertEmailEnabled: true,
        },
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        trialEndsAt: null,
        suspendedAt: null,
      });

      expect(tenant.canBeUsed()).toBe(false);
    });
  });

  describe('upgradeTier', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create(validCreateProps)._unsafeUnwrap();
    });

    it('should upgrade tier successfully', () => {
      const result = tenant.upgradeTier(SubscriptionTier.PROFESSIONAL);

      expect(result.isOk()).toBe(true);
      expect(tenant.subscriptionTier).toBe(SubscriptionTier.PROFESSIONAL);
      expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(tenant.trialEndsAt).toBeNull();
    });

    it('should update limits when upgrading', () => {
      tenant.upgradeTier(SubscriptionTier.ENTERPRISE);

      expect(tenant.limits.maxItems).toBe(300000);
      expect(tenant.limits.maxUsers).toBe(100);
    });

    it('should update features when upgrading', () => {
      expect(tenant.hasFeature('digitalTwin')).toBe(false);

      tenant.upgradeTier(SubscriptionTier.ENTERPRISE);

      expect(tenant.hasFeature('digitalTwin')).toBe(true);
    });

    it('should clear trial end date when upgrading', () => {
      expect(tenant.trialEndsAt).not.toBeNull();

      tenant.upgradeTier(SubscriptionTier.STARTER);

      expect(tenant.trialEndsAt).toBeNull();
    });

    it('should reject upgrading to same tier', () => {
      const result = tenant.upgradeTier(SubscriptionTier.TRIAL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Already on this subscription tier');
      }
    });

    it('should update updatedAt timestamp', () => {
      const beforeUpgrade = tenant.updatedAt;

      // Small delay to ensure timestamp difference
      tenant.upgradeTier(SubscriptionTier.ENTERPRISE);

      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpgrade.getTime());
    });
  });

  describe('suspend', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();
    });

    it('should suspend tenant successfully', () => {
      const result = tenant.suspend();

      expect(result.isOk()).toBe(true);
      expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.SUSPENDED);
      expect(tenant.suspendedAt).not.toBeNull();
    });

    it('should suspend with reason', () => {
      tenant.suspend('Payment failed');

      expect(tenant.metadata.suspensionReason).toBe('Payment failed');
    });

    it('should reject suspending already suspended tenant', () => {
      tenant.suspend();
      const result = tenant.suspend();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('already suspended');
      }
    });

    it('should update updatedAt timestamp', () => {
      const beforeSuspend = tenant.updatedAt;

      tenant.suspend();

      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSuspend.getTime());
    });
  });

  describe('reactivate', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();
      tenant.suspend('Test suspension');
    });

    it('should reactivate suspended tenant', () => {
      const result = tenant.reactivate();

      expect(result.isOk()).toBe(true);
      expect(tenant.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(tenant.suspendedAt).toBeNull();
    });

    it('should clear suspension reason and add reactivatedAt', () => {
      tenant.reactivate();

      expect(tenant.metadata.suspensionReason).toBeUndefined();
      expect(tenant.metadata.reactivatedAt).toBeDefined();
    });

    it('should reject reactivating non-suspended tenant', () => {
      tenant.reactivate();
      const result = tenant.reactivate();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not suspended');
      }
    });

    it('should reject reactivating active tenant', () => {
      const activeTenant = Tenant.create({
        ...validCreateProps,
        slug: 'active-tenant',
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      const result = activeTenant.reactivate();

      expect(result.isErr()).toBe(true);
    });
  });

  describe('updateBranding', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create(validCreateProps)._unsafeUnwrap();
    });

    it('should update logo URL', () => {
      const result = tenant.updateBranding({ logoUrl: 'https://acme.com/logo.png' });

      expect(result.isOk()).toBe(true);
      expect(tenant.branding.logoUrl).toBe('https://acme.com/logo.png');
    });

    it('should update primary color', () => {
      const result = tenant.updateBranding({ primaryColor: '#FF5733' });

      expect(result.isOk()).toBe(true);
      expect(tenant.branding.primaryColor).toBe('#FF5733');
    });

    it('should update secondary color', () => {
      const result = tenant.updateBranding({ secondaryColor: '#33FF57' });

      expect(result.isOk()).toBe(true);
      expect(tenant.branding.secondaryColor).toBe('#33FF57');
    });

    it('should update multiple branding properties', () => {
      const result = tenant.updateBranding({
        logoUrl: 'https://acme.com/logo.png',
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
      });

      expect(result.isOk()).toBe(true);
      expect(tenant.branding.logoUrl).toBe('https://acme.com/logo.png');
      expect(tenant.branding.primaryColor).toBe('#FF5733');
      expect(tenant.branding.secondaryColor).toBe('#33FF57');
    });

    it('should reject invalid primary color format', () => {
      const result = tenant.updateBranding({ primaryColor: 'red' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid primary color format');
      }
    });

    it('should reject invalid secondary color format', () => {
      const result = tenant.updateBranding({ secondaryColor: '#GGG' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid secondary color format');
      }
    });

    it('should reject color with wrong length', () => {
      const result = tenant.updateBranding({ primaryColor: '#FFF' });

      expect(result.isErr()).toBe(true);
    });

    it('should accept lowercase hex colors', () => {
      const result = tenant.updateBranding({ primaryColor: '#ff5733' });

      expect(result.isOk()).toBe(true);
    });

    it('should preserve unchanged branding values', () => {
      const originalSecondary = tenant.branding.secondaryColor;

      tenant.updateBranding({ primaryColor: '#FF5733' });

      expect(tenant.branding.secondaryColor).toBe(originalSecondary);
    });
  });

  describe('updateSettings', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create(validCreateProps)._unsafeUnwrap();
    });

    it('should update timezone', () => {
      tenant.updateSettings({ timezone: 'America/New_York' });

      expect(tenant.settings.timezone).toBe('America/New_York');
    });

    it('should update date format', () => {
      tenant.updateSettings({ dateFormat: 'YYYY-MM-DD' });

      expect(tenant.settings.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should update item number format', () => {
      tenant.updateSettings({ itemNumberFormat: 'ITEM-NNNNNN' });

      expect(tenant.settings.itemNumberFormat).toBe('ITEM-NNNNNN');
    });

    it('should update reference ID format', () => {
      tenant.updateSettings({ referenceIdFormat: 'REF-NNNN' });

      expect(tenant.settings.referenceIdFormat).toBe('REF-NNNN');
    });

    it('should update retention days', () => {
      tenant.updateSettings({ defaultRetentionDays: 365 });

      expect(tenant.settings.defaultRetentionDays).toBe(365);
    });

    it('should update alert email enabled', () => {
      tenant.updateSettings({ alertEmailEnabled: false });

      expect(tenant.settings.alertEmailEnabled).toBe(false);
    });

    it('should update multiple settings at once', () => {
      tenant.updateSettings({
        timezone: 'Europe/London',
        dateFormat: 'MM/DD/YYYY',
        defaultRetentionDays: 180,
      });

      expect(tenant.settings.timezone).toBe('Europe/London');
      expect(tenant.settings.dateFormat).toBe('MM/DD/YYYY');
      expect(tenant.settings.defaultRetentionDays).toBe(180);
    });

    it('should preserve unchanged settings', () => {
      const originalFormat = tenant.settings.itemNumberFormat;

      tenant.updateSettings({ timezone: 'UTC' });

      expect(tenant.settings.itemNumberFormat).toBe(originalFormat);
    });

    it('should update updatedAt timestamp', () => {
      const beforeUpdate = tenant.updatedAt;

      tenant.updateSettings({ timezone: 'UTC' });

      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('deactivate', () => {
    let tenant: Tenant;

    beforeEach(() => {
      tenant = Tenant.create(validCreateProps)._unsafeUnwrap();
    });

    it('should deactivate tenant', () => {
      tenant.deactivate();

      expect(tenant.isActive).toBe(false);
    });

    it('should update updatedAt timestamp', () => {
      const beforeDeactivate = tenant.updatedAt;

      tenant.deactivate();

      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeDeactivate.getTime());
    });

    it('should make canBeUsed return false', () => {
      expect(tenant.canBeUsed()).toBe(true);

      tenant.deactivate();

      expect(tenant.canBeUsed()).toBe(false);
    });
  });

  describe('toProps', () => {
    it('should return all properties for persistence', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        id: 'tenant-123',
        contactPhone: '+27123456789',
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      const props = tenant.toProps();

      expect(props.id).toBe('tenant-123');
      expect(props.name).toBe('Acme Corporation');
      expect(props.slug).toBe('acme-corp');
      expect(props.contactEmail).toBe('admin@acme.com');
      expect(props.contactPhone).toBe('+27123456789');
      expect(props.subscriptionTier).toBe(SubscriptionTier.PROFESSIONAL);
      expect(props.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(props.isActive).toBe(true);
      expect(props.limits).toBeDefined();
      expect(props.branding).toBeDefined();
      expect(props.features).toBeDefined();
      expect(props.settings).toBeDefined();
      expect(props.metadata).toBeDefined();
      expect(props.createdAt).toBeInstanceOf(Date);
      expect(props.updatedAt).toBeInstanceOf(Date);
    });

    it('should return a copy of props (immutable)', () => {
      const tenant = Tenant.create(validCreateProps)._unsafeUnwrap();

      const props1 = tenant.toProps();
      const props2 = tenant.toProps();

      expect(props1).not.toBe(props2);
      expect(props1).toEqual(props2);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid slug length (3 chars)', () => {
      const result = Tenant.create({
        ...validCreateProps,
        slug: 'abc',
      });

      expect(result.isOk()).toBe(true);
    });

    it('should handle maximum valid slug length (50 chars)', () => {
      const result = Tenant.create({
        ...validCreateProps,
        slug: 'a' + 'b'.repeat(48) + 'c',
      });

      expect(result.isOk()).toBe(true);
    });

    it('should handle empty metadata', () => {
      const tenant = Tenant.create(validCreateProps)._unsafeUnwrap();

      expect(tenant.metadata).toEqual({});
    });

    it('should handle suspension and reactivation cycle', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
      })._unsafeUnwrap();

      expect(tenant.canBeUsed()).toBe(true);

      tenant.suspend('Payment issue');
      expect(tenant.canBeUsed()).toBe(false);
      expect(tenant.suspendedAt).not.toBeNull();

      tenant.reactivate();
      expect(tenant.canBeUsed()).toBe(true);
      expect(tenant.suspendedAt).toBeNull();
    });

    it('should handle upgrade from trial to enterprise', () => {
      const tenant = Tenant.create(validCreateProps)._unsafeUnwrap();

      expect(tenant.subscriptionTier).toBe(SubscriptionTier.TRIAL);
      expect(tenant.limits.maxItems).toBe(100);
      expect(tenant.hasFeature('digitalTwin')).toBe(false);

      tenant.upgradeTier(SubscriptionTier.ENTERPRISE);

      expect(tenant.subscriptionTier).toBe(SubscriptionTier.ENTERPRISE);
      expect(tenant.limits.maxItems).toBe(300000);
      expect(tenant.hasFeature('digitalTwin')).toBe(true);
    });

    it('should handle downgrade from enterprise to starter', () => {
      const tenant = Tenant.create({
        ...validCreateProps,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
      })._unsafeUnwrap();

      tenant.upgradeTier(SubscriptionTier.STARTER);

      expect(tenant.subscriptionTier).toBe(SubscriptionTier.STARTER);
      expect(tenant.limits.maxItems).toBe(1000);
      expect(tenant.hasFeature('digitalTwin')).toBe(false);
    });
  });
});
