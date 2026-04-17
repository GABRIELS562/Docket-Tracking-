import { Result, ok, err } from 'neverthrow';

/**
 * User roles within a tenant
 */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
}

/**
 * User UI preferences
 */
export interface UIPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly timezone: string | null;
}

/**
 * User preferences
 */
export interface UserPreferences {
  readonly notifications: NotificationPreferences;
  readonly ui: UIPreferences;
}

/**
 * Props for creating/reconstructing a TenantUser
 */
export interface TenantUserProps {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly phone: string | null;
  readonly role: UserRole;
  readonly permissions: string[];
  readonly lastLoginAt: Date | null;
  readonly lastLoginIp: string | null;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  readonly passwordChangedAt: Date | null;
  readonly mfaEnabled: boolean;
  readonly mfaSecret: string | null;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
  readonly emailVerifiedAt: Date | null;
  readonly preferences: UserPreferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Props for creating a new TenantUser
 */
export interface CreateTenantUserProps {
  readonly id?: string;
  readonly tenantId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role?: UserRole;
  readonly phone?: string;
}

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.OWNER]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.OPERATOR]: 40,
  [UserRole.VIEWER]: 20,
};

/**
 * Default permissions by role
 */
const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ['*'],
  [UserRole.ADMIN]: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'items:*',
    'zones:*',
    'readers:*',
    'reports:*',
    'settings:read',
    'settings:update',
  ],
  [UserRole.MANAGER]: [
    'users:read',
    'items:read',
    'items:create',
    'items:update',
    'zones:read',
    'zones:update',
    'readers:read',
    'reports:read',
    'reports:create',
  ],
  [UserRole.OPERATOR]: [
    'items:read',
    'items:create',
    'items:update',
    'zones:read',
    'readers:read',
  ],
  [UserRole.VIEWER]: ['items:read', 'zones:read', 'readers:read'],
};

/**
 * Maximum failed login attempts before lockout
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Lockout duration in minutes
 */
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * TenantUser Entity
 *
 * Represents a user belonging to a specific tenant.
 * Users have roles and permissions scoped to their tenant.
 */
export class TenantUser {
  private constructor(private props: TenantUserProps) {}

  /**
   * Creates a new TenantUser
   */
  static create(props: CreateTenantUserProps): Result<TenantUser, Error> {
    // Validate email
    if (!TenantUser.isValidEmail(props.email)) {
      return err(new Error('Invalid email format'));
    }

    // Validate name
    if (!props.firstName || props.firstName.trim().length < 1) {
      return err(new Error('First name is required'));
    }
    if (!props.lastName || props.lastName.trim().length < 1) {
      return err(new Error('Last name is required'));
    }

    // Validate tenant ID
    if (!props.tenantId) {
      return err(new Error('Tenant ID is required'));
    }

    const role = props.role ?? UserRole.VIEWER;
    const now = new Date();

    const user = new TenantUser({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      email: props.email.toLowerCase().trim(),
      passwordHash: props.passwordHash,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      displayName: null,
      avatarUrl: null,
      phone: props.phone ?? null,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      lastLoginAt: null,
      lastLoginIp: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: now,
      mfaEnabled: false,
      mfaSecret: null,
      isActive: true,
      emailVerified: false,
      emailVerifiedAt: null,
      preferences: {
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        ui: {
          theme: 'light',
          language: 'en',
          timezone: null,
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    return ok(user);
  }

  /**
   * Reconstitutes a TenantUser from stored data
   */
  static reconstitute(props: TenantUserProps): TenantUser {
    return new TenantUser(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get displayName(): string {
    return this.props.displayName ?? this.fullName;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get permissions(): string[] {
    return [...this.props.permissions];
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get lastLoginIp(): string | null {
    return this.props.lastLoginIp;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get passwordChangedAt(): Date | null {
    return this.props.passwordChangedAt;
  }

  get mfaEnabled(): boolean {
    return this.props.mfaEnabled;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get preferences(): UserPreferences {
    return this.props.preferences;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Checks if user has a specific permission
   */
  hasPermission(permission: string): boolean {
    // Owner has all permissions
    if (this.props.permissions.includes('*')) {
      return true;
    }

    // Check exact permission
    if (this.props.permissions.includes(permission)) {
      return true;
    }

    // Check wildcard (e.g., items:* includes items:read)
    const [resource] = permission.split(':');
    return this.props.permissions.includes(`${resource}:*`);
  }

  /**
   * Checks if user's role is at least the given level
   */
  hasRoleLevel(minimumRole: UserRole): boolean {
    return ROLE_HIERARCHY[this.props.role] >= ROLE_HIERARCHY[minimumRole];
  }

  /**
   * Checks if user account is locked
   */
  isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    return new Date() < this.props.lockedUntil;
  }

  /**
   * Checks if user can log in
   */
  canLogin(): boolean {
    return this.props.isActive && !this.isLocked();
  }

  /**
   * Records a successful login
   */
  recordSuccessfulLogin(ip: string): void {
    this.props = {
      ...this.props,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    };
  }

  /**
   * Records a failed login attempt
   */
  recordFailedLogin(): void {
    const newAttempts = this.props.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    this.props = {
      ...this.props,
      failedLoginAttempts: newAttempts,
      lockedUntil: shouldLock ? TenantUser.getLockoutEndTime() : null,
      updatedAt: new Date(),
    };
  }

  /**
   * Updates the password
   */
  updatePassword(newPasswordHash: string): void {
    this.props = {
      ...this.props,
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Updates the role
   */
  updateRole(newRole: UserRole): Result<void, Error> {
    if (this.props.role === UserRole.OWNER && newRole !== UserRole.OWNER) {
      return err(new Error('Cannot demote owner role'));
    }

    this.props = {
      ...this.props,
      role: newRole,
      permissions: DEFAULT_PERMISSIONS[newRole],
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Updates profile information
   */
  updateProfile(profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Result<void, Error> {
    if (profile.firstName !== undefined && profile.firstName.trim().length < 1) {
      return err(new Error('First name cannot be empty'));
    }
    if (profile.lastName !== undefined && profile.lastName.trim().length < 1) {
      return err(new Error('Last name cannot be empty'));
    }

    this.props = {
      ...this.props,
      firstName: profile.firstName?.trim() ?? this.props.firstName,
      lastName: profile.lastName?.trim() ?? this.props.lastName,
      displayName: profile.displayName ?? this.props.displayName,
      phone: profile.phone ?? this.props.phone,
      avatarUrl: profile.avatarUrl ?? this.props.avatarUrl,
      updatedAt: new Date(),
    };

    return ok(undefined);
  }

  /**
   * Updates preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.props = {
      ...this.props,
      preferences: {
        notifications: {
          ...this.props.preferences.notifications,
          ...(preferences.notifications ?? {}),
        },
        ui: {
          ...this.props.preferences.ui,
          ...(preferences.ui ?? {}),
        },
      },
      updatedAt: new Date(),
    };
  }

  /**
   * Verifies email
   */
  verifyEmail(): void {
    this.props = {
      ...this.props,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Enables MFA
   */
  enableMfa(secret: string): void {
    this.props = {
      ...this.props,
      mfaEnabled: true,
      mfaSecret: secret,
      updatedAt: new Date(),
    };
  }

  /**
   * Disables MFA
   */
  disableMfa(): void {
    this.props = {
      ...this.props,
      mfaEnabled: false,
      mfaSecret: null,
      updatedAt: new Date(),
    };
  }

  /**
   * Deactivates the user
   */
  deactivate(): void {
    this.props = {
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    };
  }

  /**
   * Reactivates the user
   */
  reactivate(): void {
    this.props = {
      ...this.props,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    };
  }

  /**
   * Unlocks the account
   */
  unlock(): void {
    this.props = {
      ...this.props,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    };
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Gets lockout end time
   */
  private static getLockoutEndTime(): Date {
    const date = new Date();
    date.setMinutes(date.getMinutes() + LOCKOUT_DURATION_MINUTES);
    return date;
  }

  /**
   * Returns all props for persistence
   */
  toProps(): TenantUserProps {
    return { ...this.props };
  }
}
