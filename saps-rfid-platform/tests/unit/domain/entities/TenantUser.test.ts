import { TenantUser, UserRole, CreateTenantUserProps } from '@domain/entities/TenantUser';

describe('TenantUser', () => {
  const validCreateProps: CreateTenantUserProps = {
    id: 'user-001',
    tenantId: 'tenant-001',
    email: 'john.doe@example.com',
    passwordHash: '$2b$10$hashedpassword123456789012345678901234567890',
    firstName: 'John',
    lastName: 'Doe',
  };

  describe('create', () => {
    it('should create valid user with minimal props', () => {
      const result = TenantUser.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user.id).toBe('user-001');
        expect(user.tenantId).toBe('tenant-001');
        expect(user.email).toBe('john.doe@example.com');
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
        expect(user.fullName).toBe('John Doe');
        expect(user.displayName).toBe('John Doe');
        expect(user.role).toBe(UserRole.VIEWER);
        expect(user.isActive).toBe(true);
        expect(user.emailVerified).toBe(false);
        expect(user.mfaEnabled).toBe(false);
        expect(user.failedLoginAttempts).toBe(0);
        expect(user.lockedUntil).toBeNull();
        expect(user.lastLoginAt).toBeNull();
      }
    });

    it('should create user with specified role', () => {
      const result = TenantUser.create({
        ...validCreateProps,
        role: UserRole.ADMIN,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.role).toBe(UserRole.ADMIN);
      }
    });

    it('should create user with phone number', () => {
      const result = TenantUser.create({
        ...validCreateProps,
        phone: '+1-555-123-4567',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.phone).toBe('+1-555-123-4567');
      }
    });

    it('should generate ID when not provided', () => {
      const propsWithoutId = { ...validCreateProps };
      delete (propsWithoutId as Partial<CreateTenantUserProps>).id;

      const result = TenantUser.create(propsWithoutId as CreateTenantUserProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBeDefined();
        expect(result.value.id.length).toBeGreaterThan(0);
      }
    });

    it('should normalize email to lowercase', () => {
      const result = TenantUser.create({
        ...validCreateProps,
        email: 'JOHN.DOE@EXAMPLE.COM',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe('john.doe@example.com');
      }
    });

    it('should reject email with leading/trailing whitespace', () => {
      // Email validation happens before normalization, so spaces fail validation
      const result = TenantUser.create({
        ...validCreateProps,
        email: '  john.doe@example.com  ',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid email format');
      }
    });

    it('should trim first and last name', () => {
      const result = TenantUser.create({
        ...validCreateProps,
        firstName: '  John  ',
        lastName: '  Doe  ',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.firstName).toBe('John');
        expect(result.value.lastName).toBe('Doe');
      }
    });

    it('should set default preferences', () => {
      const result = TenantUser.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const prefs = result.value.preferences;
        expect(prefs.notifications.email).toBe(true);
        expect(prefs.notifications.push).toBe(false);
        expect(prefs.notifications.sms).toBe(false);
        expect(prefs.ui.theme).toBe('light');
        expect(prefs.ui.language).toBe('en');
        expect(prefs.ui.timezone).toBeNull();
      }
    });

    it('should set passwordChangedAt on creation', () => {
      const beforeCreation = new Date();
      const result = TenantUser.create(validCreateProps);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.passwordChangedAt).toBeDefined();
        expect(result.value.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(
          beforeCreation.getTime()
        );
      }
    });

    it('should assign default permissions based on role', () => {
      const roles = Object.values(UserRole);

      for (const role of roles) {
        const result = TenantUser.create({
          ...validCreateProps,
          id: `user-${role}`,
          role,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.permissions.length).toBeGreaterThan(0);
        }
      }
    });

    describe('validation errors', () => {
      it('should reject invalid email format', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          email: 'invalid-email',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid email format');
        }
      });

      it('should reject email without domain', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          email: 'john@',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject email without local part', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          email: '@example.com',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject email with spaces', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          email: 'john doe@example.com',
        });

        expect(result.isErr()).toBe(true);
      });

      it('should reject empty first name', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          firstName: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('First name is required');
        }
      });

      it('should reject whitespace-only first name', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          firstName: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('First name is required');
        }
      });

      it('should reject empty last name', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          lastName: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Last name is required');
        }
      });

      it('should reject whitespace-only last name', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          lastName: '   ',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Last name is required');
        }
      });

      it('should reject empty tenant ID', () => {
        const result = TenantUser.create({
          ...validCreateProps,
          tenantId: '',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Tenant ID is required');
        }
      });
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute user from stored props', () => {
      const now = new Date();
      const storedProps = {
        id: 'user-001',
        tenantId: 'tenant-001',
        email: 'john.doe@example.com',
        passwordHash: 'hashed',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'Johnny',
        avatarUrl: 'https://example.com/avatar.png',
        phone: '+1-555-123-4567',
        role: UserRole.ADMIN,
        permissions: ['users:read', 'items:*'],
        lastLoginAt: now,
        lastLoginIp: '192.168.1.1',
        failedLoginAttempts: 2,
        lockedUntil: null,
        passwordChangedAt: now,
        mfaEnabled: true,
        mfaSecret: 'secret123',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: now,
        preferences: {
          notifications: { email: true, push: true, sms: false },
          ui: { theme: 'dark' as const, language: 'en', timezone: 'UTC' },
        },
        createdAt: now,
        updatedAt: now,
      };

      const user = TenantUser.reconstitute(storedProps);

      expect(user.id).toBe('user-001');
      expect(user.displayName).toBe('Johnny');
      expect(user.avatarUrl).toBe('https://example.com/avatar.png');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.mfaEnabled).toBe(true);
      expect(user.emailVerified).toBe(true);
      expect(user.preferences.ui.theme).toBe('dark');
    });
  });

  describe('hasPermission', () => {
    it('should return true for owner with wildcard permission', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.OWNER,
      })._unsafeUnwrap();

      expect(user.hasPermission('users:read')).toBe(true);
      expect(user.hasPermission('items:delete')).toBe(true);
      expect(user.hasPermission('any:permission')).toBe(true);
    });

    it('should return true for exact permission match', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      expect(user.hasPermission('items:read')).toBe(true);
      expect(user.hasPermission('zones:read')).toBe(true);
    });

    it('should return false for missing permission', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      expect(user.hasPermission('items:delete')).toBe(false);
      expect(user.hasPermission('users:create')).toBe(false);
    });

    it('should support wildcard resource permissions', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.ADMIN,
      })._unsafeUnwrap();

      // Admin has items:* permission
      expect(user.hasPermission('items:read')).toBe(true);
      expect(user.hasPermission('items:create')).toBe(true);
      expect(user.hasPermission('items:delete')).toBe(true);
    });
  });

  describe('hasRoleLevel', () => {
    it('should return true for same role level', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.MANAGER,
      })._unsafeUnwrap();

      expect(user.hasRoleLevel(UserRole.MANAGER)).toBe(true);
    });

    it('should return true for higher role level', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.ADMIN,
      })._unsafeUnwrap();

      expect(user.hasRoleLevel(UserRole.MANAGER)).toBe(true);
      expect(user.hasRoleLevel(UserRole.OPERATOR)).toBe(true);
      expect(user.hasRoleLevel(UserRole.VIEWER)).toBe(true);
    });

    it('should return false for lower role level', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      expect(user.hasRoleLevel(UserRole.OPERATOR)).toBe(false);
      expect(user.hasRoleLevel(UserRole.MANAGER)).toBe(false);
      expect(user.hasRoleLevel(UserRole.ADMIN)).toBe(false);
      expect(user.hasRoleLevel(UserRole.OWNER)).toBe(false);
    });

    it('should verify role hierarchy order', () => {
      const owner = TenantUser.create({
        ...validCreateProps,
        role: UserRole.OWNER,
      })._unsafeUnwrap();
      const admin = TenantUser.create({
        ...validCreateProps,
        role: UserRole.ADMIN,
      })._unsafeUnwrap();
      const manager = TenantUser.create({
        ...validCreateProps,
        role: UserRole.MANAGER,
      })._unsafeUnwrap();
      const operator = TenantUser.create({
        ...validCreateProps,
        role: UserRole.OPERATOR,
      })._unsafeUnwrap();
      const viewer = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      // Owner > Admin > Manager > Operator > Viewer
      expect(owner.hasRoleLevel(UserRole.ADMIN)).toBe(true);
      expect(admin.hasRoleLevel(UserRole.OWNER)).toBe(false);
      expect(manager.hasRoleLevel(UserRole.ADMIN)).toBe(false);
      expect(operator.hasRoleLevel(UserRole.MANAGER)).toBe(false);
      expect(viewer.hasRoleLevel(UserRole.OPERATOR)).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('should return false when lockedUntil is null', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.isLocked()).toBe(false);
    });

    it('should return false when lock has expired', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const user = TenantUser.reconstitute({
        ...validCreateProps,
        displayName: null,
        avatarUrl: null,
        phone: null,
        permissions: ['items:read'],
        lastLoginAt: null,
        lastLoginIp: null,
        failedLoginAttempts: 5,
        lockedUntil: pastDate,
        passwordChangedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        isActive: true,
        emailVerified: false,
        emailVerifiedAt: null,
        preferences: {
          notifications: { email: true, push: false, sms: false },
          ui: { theme: 'light', language: 'en', timezone: null },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        role: UserRole.VIEWER,
      });

      expect(user.isLocked()).toBe(false);
    });

    it('should return true when lock is still active', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const user = TenantUser.reconstitute({
        ...validCreateProps,
        displayName: null,
        avatarUrl: null,
        phone: null,
        permissions: ['items:read'],
        lastLoginAt: null,
        lastLoginIp: null,
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
        passwordChangedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        isActive: true,
        emailVerified: false,
        emailVerifiedAt: null,
        preferences: {
          notifications: { email: true, push: false, sms: false },
          ui: { theme: 'light', language: 'en', timezone: null },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        role: UserRole.VIEWER,
      });

      expect(user.isLocked()).toBe(true);
    });
  });

  describe('canLogin', () => {
    it('should return true for active unlocked user', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.canLogin()).toBe(true);
    });

    it('should return false for inactive user', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.deactivate();

      expect(user.canLogin()).toBe(false);
    });

    it('should return false for locked user', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const user = TenantUser.reconstitute({
        ...validCreateProps,
        displayName: null,
        avatarUrl: null,
        phone: null,
        permissions: ['items:read'],
        lastLoginAt: null,
        lastLoginIp: null,
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
        passwordChangedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        isActive: true,
        emailVerified: false,
        emailVerifiedAt: null,
        preferences: {
          notifications: { email: true, push: false, sms: false },
          ui: { theme: 'light', language: 'en', timezone: null },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        role: UserRole.VIEWER,
      });

      expect(user.canLogin()).toBe(false);
    });

    it('should return false for both inactive and locked user', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const user = TenantUser.reconstitute({
        ...validCreateProps,
        displayName: null,
        avatarUrl: null,
        phone: null,
        permissions: ['items:read'],
        lastLoginAt: null,
        lastLoginIp: null,
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
        passwordChangedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        isActive: false,
        emailVerified: false,
        emailVerifiedAt: null,
        preferences: {
          notifications: { email: true, push: false, sms: false },
          ui: { theme: 'light', language: 'en', timezone: null },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        role: UserRole.VIEWER,
      });

      expect(user.canLogin()).toBe(false);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should update login info and reset failed attempts', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const beforeLogin = new Date();

      user.recordSuccessfulLogin('192.168.1.100');

      expect(user.lastLoginIp).toBe('192.168.1.100');
      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it('should clear lock after successful login', () => {
      // Simulate a locked user
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      // Simulate 5 failed logins to trigger lock
      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }
      expect(user.lockedUntil).not.toBeNull();

      // Successful login should clear the lock
      user.recordSuccessfulLogin('192.168.1.100');

      expect(user.lockedUntil).toBeNull();
      expect(user.failedLoginAttempts).toBe(0);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.failedLoginAttempts).toBe(0);

      user.recordFailedLogin();
      expect(user.failedLoginAttempts).toBe(1);

      user.recordFailedLogin();
      expect(user.failedLoginAttempts).toBe(2);
    });

    it('should not lock account before max attempts', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      for (let i = 0; i < 4; i++) {
        user.recordFailedLogin();
      }

      expect(user.failedLoginAttempts).toBe(4);
      expect(user.lockedUntil).toBeNull();
      expect(user.isLocked()).toBe(false);
    });

    it('should lock account after 5 failed attempts', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil).not.toBeNull();
      expect(user.isLocked()).toBe(true);
    });

    it('should set lock duration to 30 minutes', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const beforeLock = Date.now();

      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      const lockEndTime = user.lockedUntil!.getTime();
      const expectedMinimumLock = beforeLock + 30 * 60 * 1000 - 1000; // 30 minutes minus tolerance
      const expectedMaximumLock = beforeLock + 30 * 60 * 1000 + 1000; // 30 minutes plus tolerance

      expect(lockEndTime).toBeGreaterThanOrEqual(expectedMinimumLock);
      expect(lockEndTime).toBeLessThanOrEqual(expectedMaximumLock);
    });
  });

  describe('updatePassword', () => {
    it('should update password hash and timestamp', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalHash = user.passwordHash;
      const beforeUpdate = new Date();

      user.updatePassword('newhash123');

      expect(user.passwordHash).toBe('newhash123');
      expect(user.passwordHash).not.toBe(originalHash);
      expect(user.passwordChangedAt).toBeDefined();
      expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      const result = user.updateRole(UserRole.MANAGER);

      expect(result.isOk()).toBe(true);
      expect(user.role).toBe(UserRole.MANAGER);
    });

    it('should update permissions when role changes', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.VIEWER,
      })._unsafeUnwrap();

      const viewerPermissions = [...user.permissions];
      user.updateRole(UserRole.ADMIN);
      const adminPermissions = user.permissions;

      expect(adminPermissions).not.toEqual(viewerPermissions);
      expect(adminPermissions.length).toBeGreaterThan(viewerPermissions.length);
    });

    it('should reject demoting owner role', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.OWNER,
      })._unsafeUnwrap();

      const result = user.updateRole(UserRole.ADMIN);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot demote owner role');
      }
      expect(user.role).toBe(UserRole.OWNER);
    });

    it('should allow owner to stay owner', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.OWNER,
      })._unsafeUnwrap();

      const result = user.updateRole(UserRole.OWNER);

      expect(result.isOk()).toBe(true);
      expect(user.role).toBe(UserRole.OWNER);
    });
  });

  describe('updateProfile', () => {
    it('should update first name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ firstName: 'Jane' });

      expect(result.isOk()).toBe(true);
      expect(user.firstName).toBe('Jane');
      expect(user.fullName).toBe('Jane Doe');
    });

    it('should update last name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ lastName: 'Smith' });

      expect(result.isOk()).toBe(true);
      expect(user.lastName).toBe('Smith');
      expect(user.fullName).toBe('John Smith');
    });

    it('should update display name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ displayName: 'Johnny D' });

      expect(result.isOk()).toBe(true);
      expect(user.displayName).toBe('Johnny D');
    });

    it('should update phone', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ phone: '+1-555-999-8888' });

      expect(result.isOk()).toBe(true);
      expect(user.phone).toBe('+1-555-999-8888');
    });

    it('should update avatar URL', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ avatarUrl: 'https://example.com/new-avatar.png' });

      expect(result.isOk()).toBe(true);
      expect(user.avatarUrl).toBe('https://example.com/new-avatar.png');
    });

    it('should update multiple fields at once', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'J. Smith',
        phone: '+1-555-000-1111',
      });

      expect(result.isOk()).toBe(true);
      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
      expect(user.displayName).toBe('J. Smith');
      expect(user.phone).toBe('+1-555-000-1111');
    });

    it('should trim first name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updateProfile({ firstName: '  Jane  ' });

      expect(user.firstName).toBe('Jane');
    });

    it('should trim last name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updateProfile({ lastName: '  Smith  ' });

      expect(user.lastName).toBe('Smith');
    });

    it('should reject empty first name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ firstName: '' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('First name cannot be empty');
      }
      expect(user.firstName).toBe('John'); // Unchanged
    });

    it('should reject whitespace-only first name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ firstName: '   ' });

      expect(result.isErr()).toBe(true);
    });

    it('should reject empty last name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ lastName: '' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Last name cannot be empty');
      }
      expect(user.lastName).toBe('Doe'); // Unchanged
    });

    it('should reject whitespace-only last name', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const result = user.updateProfile({ lastName: '   ' });

      expect(result.isErr()).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updatePreferences({
        notifications: { email: false, push: true, sms: true },
      });

      expect(user.preferences.notifications.email).toBe(false);
      expect(user.preferences.notifications.push).toBe(true);
      expect(user.preferences.notifications.sms).toBe(true);
    });

    it('should update UI preferences', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updatePreferences({
        ui: { theme: 'dark', language: 'es', timezone: 'America/New_York' },
      });

      expect(user.preferences.ui.theme).toBe('dark');
      expect(user.preferences.ui.language).toBe('es');
      expect(user.preferences.ui.timezone).toBe('America/New_York');
    });

    it('should partially update notification preferences', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updatePreferences({
        notifications: { push: true } as any, // Partial update
      });

      expect(user.preferences.notifications.email).toBe(true); // Original
      expect(user.preferences.notifications.push).toBe(true); // Updated
      expect(user.preferences.notifications.sms).toBe(false); // Original
    });

    it('should update both notification and UI preferences', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      user.updatePreferences({
        notifications: { email: false, push: true, sms: false },
        ui: { theme: 'system', language: 'fr', timezone: 'Europe/Paris' },
      });

      expect(user.preferences.notifications.email).toBe(false);
      expect(user.preferences.notifications.push).toBe(true);
      expect(user.preferences.ui.theme).toBe('system');
      expect(user.preferences.ui.language).toBe('fr');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and set timestamp', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const beforeVerify = new Date();

      expect(user.emailVerified).toBe(false);

      user.verifyEmail();

      expect(user.emailVerified).toBe(true);
      const props = user.toProps();
      expect(props.emailVerifiedAt).toBeDefined();
      expect(props.emailVerifiedAt!.getTime()).toBeGreaterThanOrEqual(beforeVerify.getTime());
    });
  });

  describe('enableMfa', () => {
    it('should enable MFA with secret', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.mfaEnabled).toBe(false);

      user.enableMfa('JBSWY3DPEHPK3PXP');

      expect(user.mfaEnabled).toBe(true);
      const props = user.toProps();
      expect(props.mfaSecret).toBe('JBSWY3DPEHPK3PXP');
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA and clear secret', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.enableMfa('JBSWY3DPEHPK3PXP');

      expect(user.mfaEnabled).toBe(true);

      user.disableMfa();

      expect(user.mfaEnabled).toBe(false);
      const props = user.toProps();
      expect(props.mfaSecret).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.isActive).toBe(true);

      user.deactivate();

      expect(user.isActive).toBe(false);
    });

    it('should prevent login after deactivation', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.deactivate();

      expect(user.canLogin()).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('should reactivate user', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.deactivate();

      expect(user.isActive).toBe(false);

      user.reactivate();

      expect(user.isActive).toBe(true);
    });

    it('should reset failed attempts and lock on reactivation', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      // Lock the user
      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }
      user.deactivate();

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil).not.toBeNull();

      user.reactivate();

      expect(user.isActive).toBe(true);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it('should allow login after reactivation', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.deactivate();

      expect(user.canLogin()).toBe(false);

      user.reactivate();

      expect(user.canLogin()).toBe(true);
    });
  });

  describe('unlock', () => {
    it('should unlock account and reset failed attempts', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      // Lock the user
      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      expect(user.isLocked()).toBe(true);
      expect(user.failedLoginAttempts).toBe(5);

      user.unlock();

      expect(user.isLocked()).toBe(false);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it('should allow login after unlock', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      expect(user.canLogin()).toBe(false);

      user.unlock();

      expect(user.canLogin()).toBe(true);
    });
  });

  describe('toProps', () => {
    it('should return all properties for persistence', () => {
      const user = TenantUser.create({
        ...validCreateProps,
        role: UserRole.ADMIN,
        phone: '+1-555-123-4567',
      })._unsafeUnwrap();

      const props = user.toProps();

      expect(props.id).toBe('user-001');
      expect(props.tenantId).toBe('tenant-001');
      expect(props.email).toBe('john.doe@example.com');
      expect(props.firstName).toBe('John');
      expect(props.lastName).toBe('Doe');
      expect(props.role).toBe(UserRole.ADMIN);
      expect(props.phone).toBe('+1-555-123-4567');
      expect(props.isActive).toBe(true);
      expect(props.emailVerified).toBe(false);
      expect(props.mfaEnabled).toBe(false);
      expect(props.permissions).toBeDefined();
      expect(props.preferences).toBeDefined();
      expect(props.createdAt).toBeDefined();
      expect(props.updatedAt).toBeDefined();
    });

    it('should return a copy of props (immutability)', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const props1 = user.toProps();
      const props2 = user.toProps();

      expect(props1).not.toBe(props2);
      expect(props1).toEqual(props2);
    });
  });

  describe('getters', () => {
    it('should return correct fullName', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.fullName).toBe('John Doe');
    });

    it('should return displayName when set', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      user.updateProfile({ displayName: 'Johnny' });

      expect(user.displayName).toBe('Johnny');
    });

    it('should return fullName when displayName is not set', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      expect(user.displayName).toBe('John Doe');
    });

    it('should return copy of permissions array', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();

      const permissions1 = user.permissions;
      const permissions2 = user.permissions;

      expect(permissions1).not.toBe(permissions2);
      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('updatedAt tracking', () => {
    it('should update updatedAt on profile update', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      // Small delay to ensure different timestamp
      user.updateProfile({ firstName: 'Jane' });

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on role change', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.updateRole(UserRole.MANAGER);

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on password change', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.updatePassword('newhash');

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on deactivation', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.deactivate();

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on email verification', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.verifyEmail();

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on MFA enable', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.enableMfa('secret');

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update updatedAt on preferences update', () => {
      const user = TenantUser.create(validCreateProps)._unsafeUnwrap();
      const originalUpdatedAt = user.updatedAt;

      user.updatePreferences({ ui: { theme: 'dark', language: 'en', timezone: null } });

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });
});
