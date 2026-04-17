import { ok, err } from 'neverthrow';

import type { Result } from 'neverthrow';

/**
 * Subscription tiers available for tenants
 */
export enum SubscriptionTier {
  TRIAL = 'trial',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

/**
 * Feature flags for tenant capabilities
 */
export interface TenantFeatures {
  readonly realtimeTracking: boolean;
  readonly analyticsDashboard: boolean;
  readonly spatialIntelligence: boolean;
  readonly digitalTwin: boolean;
  readonly apiAccess: boolean;
  readonly customFields: boolean;
  readonly exportReports: boolean;
  readonly mobileApp: boolean;
}

/**
 * Tenant-specific settings
 */
export interface TenantSettings {
  readonly timezone: string;
  readonly dateFormat: string;
  readonly itemNumberFormat: string;
  readonly referenceIdFormat: string;
  readonly defaultRetentionDays: number;
  readonly alertEmailEnabled: boolean;
}

/**
 * Tenant branding configuration
 */
export interface TenantBranding {
  readonly logoUrl: string | null;
  readonly primaryColor: string;
  readonly secondaryColor: string;
}

/**
 * Tenant limits based on subscription
 */
export interface TenantLimits {
  readonly maxItems: number;
  readonly maxUsers: number;
  readonly maxZones: number;
  readonly maxReaders: number;
}

/**
 * Props for creating/reconstructing a Tenant
 */
export interface TenantProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly contactEmail: string;
  readonly contactPhone: string | null;
  readonly subscriptionTier: SubscriptionTier;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly limits: TenantLimits;
  readonly branding: TenantBranding;
  readonly features: TenantFeatures;
  readonly settings: TenantSettings;
  readonly metadata: Record<string, unknown>;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly trialEndsAt: Date | null;
  readonly suspendedAt: Date | null;
}

/**
 * Props for creating a new Tenant
 */
export interface CreateTenantProps {
  readonly id?: string;
  readonly name: string;
  readonly slug: string;
  readonly contactEmail: string;
  readonly contactPhone?: string;
  readonly subscriptionTier?: SubscriptionTier;
}

/**
 * Default feature flags by subscription tier
 */
const DEFAULT_FEATURES: Record<SubscriptionTier, TenantFeatures> = {
  [SubscriptionTier.TRIAL]: {
    realtimeTracking: true,
    analyticsDashboard: false,
    spatialIntelligence: false,
    digitalTwin: false,
    apiAccess: false,
    customFields: false,
    exportReports: false,
    mobileApp: false,
  },
  [SubscriptionTier.STARTER]: {
    realtimeTracking: true,
    analyticsDashboard: true,
    spatialIntelligence: false,
    digitalTwin: false,
    apiAccess: false,
    customFields: false,
    exportReports: true,
    mobileApp: false,
  },
  [SubscriptionTier.PROFESSIONAL]: {
    realtimeTracking: true,
    analyticsDashboard: true,
    spatialIntelligence: true,
    digitalTwin: false,
    apiAccess: true,
    customFields: true,
    exportReports: true,
    mobileApp: true,
  },
  [SubscriptionTier.ENTERPRISE]: {
    realtimeTracking: true,
    analyticsDashboard: true,
    spatialIntelligence: true,
    digitalTwin: true,
    apiAccess: true,
    customFields: true,
    exportReports: true,
    mobileApp: true,
  },
};

/**
 * Default limits by subscription tier
 */
const DEFAULT_LIMITS: Record<SubscriptionTier, TenantLimits> = {
  [SubscriptionTier.TRIAL]: {
    maxItems: 100,
    maxUsers: 2,
    maxZones: 5,
    maxReaders: 2,
  },
  [SubscriptionTier.STARTER]: {
    maxItems: 1000,
    maxUsers: 5,
    maxZones: 10,
    maxReaders: 5,
  },
  [SubscriptionTier.PROFESSIONAL]: {
    maxItems: 10000,
    maxUsers: 20,
    maxZones: 50,
    maxReaders: 20,
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxItems: 300000,
    maxUsers: 100,
    maxZones: 200,
    maxReaders: 100,
  },
};

/**
 * Tenant Entity
 *
 * Represents an organization/customer in the multi-tenant SaaS platform.
 * Each tenant has isolated data, users, and configuration.
 */
export class Tenant {
  private constructor(private props: TenantProps) {}

  /**
   * Creates a new Tenant
   */
  static create(props: CreateTenantProps): Result<Tenant, Error> {
    // Validate slug format
    if (!Tenant.isValidSlug(props.slug)) {
      return err(
        new Error(
          'Invalid slug format. Must be lowercase alphanumeric with hyphens, 3-50 characters'
        )
      );
    }

    // Validate email
    if (!Tenant.isValidEmail(props.contactEmail)) {
      return err(new Error('Invalid contact email format'));
    }

    // Validate name
    if (!props.name || props.name.trim().length < 2) {
      return err(new Error('Tenant name must be at least 2 characters'));
    }

    const tier = props.subscriptionTier ?? SubscriptionTier.TRIAL;
    const now = new Date();

    const tenant = new Tenant({
      id: props.id ?? crypto.randomUUID(),
      name: props.name.trim(),
      slug: props.slug.toLowerCase(),
      contactEmail: props.contactEmail.toLowerCase(),
      contactPhone: props.contactPhone ?? null,
      subscriptionTier: tier,
      subscriptionStatus:
        tier === SubscriptionTier.TRIAL ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      limits: DEFAULT_LIMITS[tier],
      branding: {
        logoUrl: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      },
      features: DEFAULT_FEATURES[tier],
      settings: {
        timezone: 'Africa/Johannesburg',
        dateFormat: 'DD/MM/YYYY',
        itemNumberFormat: 'NNNNNN/YY',
        referenceIdFormat: 'DD/NN/YY',
        defaultRetentionDays: 90,
        alertEmailEnabled: true,
      },
      metadata: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
      trialEndsAt: tier === SubscriptionTier.TRIAL ? Tenant.getTrialEndDate() : null,
      suspendedAt: null,
    });

    return ok(tenant);
  }

  /**
   * Reconstitutes a Tenant from stored data
   */
  static reconstitute(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get contactEmail(): string {
    return this.props.contactEmail;
  }

  get contactPhone(): string | null {
    return this.props.contactPhone;
  }

  get subscriptionTier(): SubscriptionTier {
    return this.props.subscriptionTier;
  }

  get subscriptionStatus(): SubscriptionStatus {
    return this.props.subscriptionStatus;
  }

  get limits(): TenantLimits {
    return this.props.limits;
  }

  get branding(): TenantBranding {
    return this.props.branding;
  }

  get features(): TenantFeatures {
    return this.props.features;
  }

  get settings(): TenantSettings {
    return this.props.settings;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get trialEndsAt(): Date | null {
    return this.props.trialEndsAt;
  }

  get suspendedAt(): Date | null {
    return this.props.suspendedAt;
  }

  /**
   * Checks if a feature is enabled for this tenant
   */
  hasFeature(feature: keyof TenantFeatures): boolean {
    return this.props.features[feature];
  }

  /**
   * Checks if tenant is within limits
   */
  isWithinLimit(resource: keyof TenantLimits, currentCount: number): boolean {
    return currentCount < this.props.limits[resource];
  }

  /**
   * Checks if the trial has expired
   */
  isTrialExpired(): boolean {
    if (!this.props.trialEndsAt) return false;
    return new Date() > this.props.trialEndsAt;
  }

  /**
   * Checks if tenant can be used (active and not suspended)
   */
  canBeUsed(): boolean {
    return (
      this.props.isActive &&
      this.props.subscriptionStatus !== SubscriptionStatus.SUSPENDED &&
      this.props.subscriptionStatus !== SubscriptionStatus.CANCELLED &&
      !this.isTrialExpired()
    );
  }

  /**
   * Updates the subscription tier
   */
  upgradeTier(newTier: SubscriptionTier): Result<void, Error> {
    if (newTier === this.props.subscriptionTier) {
      return err(new Error('Already on this subscription tier'));
    }

    this.props = {
      ...this.props,
      subscriptionTier: newTier,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      limits: DEFAULT_LIMITS[newTier],
      features: DEFAULT_FEATURES[newTier],
      trialEndsAt: null,
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Suspends the tenant
   */
  suspend(reason?: string): Result<void, Error> {
    if (this.props.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      return err(new Error('Tenant is already suspended'));
    }

    this.props = {
      ...this.props,
      subscriptionStatus: SubscriptionStatus.SUSPENDED,
      suspendedAt: new Date(),
      metadata: {
        ...this.props.metadata,
        suspensionReason: reason,
      },
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Reactivates a suspended tenant
   */
  reactivate(): Result<void, Error> {
    if (this.props.subscriptionStatus !== SubscriptionStatus.SUSPENDED) {
      return err(new Error('Tenant is not suspended'));
    }

    this.props = {
      ...this.props,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      suspendedAt: null,
      metadata: {
        ...this.props.metadata,
        suspensionReason: undefined,
        reactivatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Updates branding
   */
  updateBranding(branding: Partial<TenantBranding>): Result<void, Error> {
    if (branding.primaryColor && !Tenant.isValidColor(branding.primaryColor)) {
      return err(new Error('Invalid primary color format'));
    }
    if (branding.secondaryColor && !Tenant.isValidColor(branding.secondaryColor)) {
      return err(new Error('Invalid secondary color format'));
    }

    this.props = {
      ...this.props,
      branding: {
        ...this.props.branding,
        ...branding,
      },
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Updates settings
   */
  updateSettings(settings: Partial<TenantSettings>): void {
    this.props = {
      ...this.props,
      settings: {
        ...this.props.settings,
        ...settings,
      },
      updatedAt: new Date(),
    };
  }

  /**
   * Deactivates the tenant
   */
  deactivate(): void {
    this.props = {
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    };
  }

  /**
   * Validates slug format
   */
  private static isValidSlug(slug: string): boolean {
    return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validates color format
   */
  private static isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Gets trial end date (14 days from now)
   */
  private static getTrialEndDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date;
  }

  /**
   * Returns all props for persistence
   */
  toProps(): TenantProps {
    return { ...this.props };
  }
}
