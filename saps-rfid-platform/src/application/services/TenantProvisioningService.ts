import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcrypt';

import type { ILogger } from '../interfaces/ILogger';
import type { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import type { ITenantUserRepository } from '../../domain/repositories/ITenantUserRepository';
import { Tenant, SubscriptionTier } from '../../domain/entities/Tenant';
import { TenantUser, UserRole } from '../../domain/entities/TenantUser';

/**
 * Input for provisioning a new tenant
 */
export interface ProvisionTenantInput {
  readonly name: string;
  readonly slug: string;
  readonly contactEmail: string;
  readonly contactPhone?: string;
  readonly subscriptionTier?: SubscriptionTier;
  readonly ownerFirstName: string;
  readonly ownerLastName: string;
  readonly ownerEmail: string;
  readonly ownerPassword: string;
}

/**
 * Output from tenant provisioning
 */
export interface ProvisionTenantOutput {
  readonly tenant: Tenant;
  readonly owner: TenantUser;
}

/**
 * Tenant Provisioning Service
 *
 * Handles the complete provisioning workflow for new tenants including:
 * - Creating the tenant record
 * - Creating the owner user
 * - Setting up initial configuration
 */
@injectable()
export class TenantProvisioningService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('ITenantRepository') private readonly tenantRepo: ITenantRepository,
    @inject('ITenantUserRepository') private readonly userRepo: ITenantUserRepository
  ) {}

  /**
   * Provisions a new tenant with owner account
   */
  async provision(input: ProvisionTenantInput): Promise<Result<ProvisionTenantOutput, Error>> {
    this.logger.info('Starting tenant provisioning', { slug: input.slug });

    // Validate slug uniqueness
    const slugExists = await this.tenantRepo.existsBySlug(input.slug);
    if (slugExists.isErr()) {
      return err(new Error('Failed to check slug availability'));
    }
    if (slugExists.value) {
      return err(new Error(`Tenant slug "${input.slug}" is already taken`));
    }

    // Create tenant
    const tenantResult = Tenant.create({
      name: input.name,
      slug: input.slug,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      subscriptionTier: input.subscriptionTier ?? SubscriptionTier.TRIAL,
    });

    if (tenantResult.isErr()) {
      this.logger.warn('Failed to create tenant entity', {
        error: tenantResult.error.message,
      });
      return err(tenantResult.error);
    }

    const tenant = tenantResult.value;

    // Save tenant
    const saveTenantResult = await this.tenantRepo.save(tenant);
    if (saveTenantResult.isErr()) {
      this.logger.error('Failed to save tenant', {
        error: saveTenantResult.error.message,
      });
      return err(new Error('Failed to save tenant'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.ownerPassword, TenantProvisioningService.BCRYPT_ROUNDS);

    // Create owner user
    const ownerResult = TenantUser.create({
      tenantId: tenant.id,
      email: input.ownerEmail,
      passwordHash,
      firstName: input.ownerFirstName,
      lastName: input.ownerLastName,
      role: UserRole.OWNER,
    });

    if (ownerResult.isErr()) {
      // Rollback tenant creation
      await this.tenantRepo.delete(tenant.id);
      this.logger.warn('Failed to create owner user', {
        error: ownerResult.error.message,
      });
      return err(ownerResult.error);
    }

    const owner = ownerResult.value;

    // Save owner
    const saveOwnerResult = await this.userRepo.save(owner);
    if (saveOwnerResult.isErr()) {
      // Rollback tenant creation
      await this.tenantRepo.delete(tenant.id);
      this.logger.error('Failed to save owner user', {
        error: saveOwnerResult.error.message,
      });
      return err(new Error('Failed to save owner user'));
    }

    this.logger.info('Tenant provisioned successfully', {
      tenantId: tenant.id,
      slug: tenant.slug,
      ownerId: owner.id,
    });

    return ok({ tenant, owner });
  }

  /**
   * Creates additional user for a tenant
   */
  async createUser(
    tenantId: string,
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: UserRole;
    }
  ): Promise<Result<TenantUser, Error>> {
    // Check tenant exists and is active
    const tenantResult = await this.tenantRepo.findById(tenantId);
    if (tenantResult.isErr() || !tenantResult.value) {
      return err(new Error('Tenant not found'));
    }

    const tenant = tenantResult.value;
    if (!tenant.canBeUsed()) {
      return err(new Error('Tenant is not active'));
    }

    // Check user limit
    const userCount = await this.userRepo.countByTenant(tenantId);
    if (userCount.isErr()) {
      return err(new Error('Failed to check user count'));
    }

    if (!tenant.isWithinLimit('maxUsers', userCount.value)) {
      return err(
        new Error(`User limit reached (${userCount.value}/${tenant.limits.maxUsers})`)
      );
    }

    // Check email uniqueness within tenant
    const emailExists = await this.userRepo.existsByEmailAndTenant(input.email, tenantId);
    if (emailExists.isErr()) {
      return err(new Error('Failed to check email availability'));
    }
    if (emailExists.value) {
      return err(new Error('Email already exists in this tenant'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, TenantProvisioningService.BCRYPT_ROUNDS);

    // Create user
    const userResult = TenantUser.create({
      tenantId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? UserRole.VIEWER,
    });

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    const user = userResult.value;

    // Save user
    const saveResult = await this.userRepo.save(user);
    if (saveResult.isErr()) {
      return err(new Error('Failed to save user'));
    }

    this.logger.info('User created', {
      tenantId,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return ok(user);
  }

  /**
   * Upgrades a tenant's subscription tier
   */
  async upgradeTenant(
    tenantId: string,
    newTier: SubscriptionTier
  ): Promise<Result<Tenant, Error>> {
    const tenantResult = await this.tenantRepo.findById(tenantId);
    if (tenantResult.isErr() || !tenantResult.value) {
      return err(new Error('Tenant not found'));
    }

    const tenant = tenantResult.value;
    const upgradeResult = tenant.upgradeTier(newTier);
    if (upgradeResult.isErr()) {
      return err(upgradeResult.error);
    }

    const updateResult = await this.tenantRepo.update(tenant);
    if (updateResult.isErr()) {
      return err(new Error('Failed to update tenant'));
    }

    this.logger.info('Tenant upgraded', {
      tenantId,
      newTier,
    });

    return ok(tenant);
  }

  /**
   * Suspends a tenant
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<Result<Tenant, Error>> {
    const tenantResult = await this.tenantRepo.findById(tenantId);
    if (tenantResult.isErr() || !tenantResult.value) {
      return err(new Error('Tenant not found'));
    }

    const tenant = tenantResult.value;
    const suspendResult = tenant.suspend(reason);
    if (suspendResult.isErr()) {
      return err(suspendResult.error);
    }

    const updateResult = await this.tenantRepo.update(tenant);
    if (updateResult.isErr()) {
      return err(new Error('Failed to update tenant'));
    }

    this.logger.warn('Tenant suspended', {
      tenantId,
      reason,
    });

    return ok(tenant);
  }

  /**
   * Reactivates a suspended tenant
   */
  async reactivateTenant(tenantId: string): Promise<Result<Tenant, Error>> {
    const tenantResult = await this.tenantRepo.findById(tenantId);
    if (tenantResult.isErr() || !tenantResult.value) {
      return err(new Error('Tenant not found'));
    }

    const tenant = tenantResult.value;
    const reactivateResult = tenant.reactivate();
    if (reactivateResult.isErr()) {
      return err(reactivateResult.error);
    }

    const updateResult = await this.tenantRepo.update(tenant);
    if (updateResult.isErr()) {
      return err(new Error('Failed to update tenant'));
    }

    this.logger.info('Tenant reactivated', { tenantId });

    return ok(tenant);
  }

  /**
   * Validates password against hash
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a slug from a name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
