import { injectable, inject } from 'tsyringe';

import { TenantProvisioningService } from '../../../application/services/TenantProvisioningService';
import { SubscriptionTier } from '../../../domain/entities/Tenant';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type { ITenantRepository } from '../../../domain/repositories/ITenantRepository';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';
import type { Request, Response, NextFunction } from 'express';

/**
 * Tenant Management Controller
 *
 * Handles tenant CRUD operations and administration.
 * Most endpoints require admin/owner permissions.
 */
@injectable()
export class TenantController {
  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('ITenantRepository') private readonly tenantRepo: ITenantRepository,
    @inject(TenantProvisioningService)
    private readonly provisioningService: TenantProvisioningService
  ) {}

  /**
   * POST /api/tenants
   * Creates a new tenant (public - for signup)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        slug,
        contactEmail,
        contactPhone,
        subscriptionTier,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPassword,
      } = req.body;

      // Validate required fields
      if (
        !name ||
        !slug ||
        !contactEmail ||
        !ownerFirstName ||
        !ownerLastName ||
        !ownerEmail ||
        !ownerPassword
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        });
        return;
      }

      const result = await this.provisioningService.provision({
        name,
        slug,
        contactEmail,
        contactPhone,
        subscriptionTier: subscriptionTier as SubscriptionTier,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPassword,
      });

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PROVISIONING_ERROR',
            message: result.error.message,
          },
        });
        return;
      }

      const { tenant, owner } = result.value;

      this.logger.info('Tenant created', { tenantId: tenant.id, slug: tenant.slug });

      res.status(201).json({
        success: true,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            subscriptionTier: tenant.subscriptionTier,
            subscriptionStatus: tenant.subscriptionStatus,
          },
          owner: {
            id: owner.id,
            email: owner.email,
            firstName: owner.firstName,
            lastName: owner.lastName,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/:id
   * Gets tenant details (requires admin)
   */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant ID is required',
          },
        });
        return;
      }

      const result = await this.tenantRepo.findById(id);

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch tenant',
          },
        });
        return;
      }

      if (!result.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        });
        return;
      }

      const tenant = result.value;

      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          contactEmail: tenant.contactEmail,
          contactPhone: tenant.contactPhone,
          subscriptionTier: tenant.subscriptionTier,
          subscriptionStatus: tenant.subscriptionStatus,
          limits: tenant.limits,
          features: tenant.features,
          branding: tenant.branding,
          settings: tenant.settings,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
          trialEndsAt: tenant.trialEndsAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/current
   * Gets current tenant details (authenticated user's tenant)
   */
  async getCurrent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const result = await this.tenantRepo.findById(tenantId);

      if (result.isErr() || !result.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        });
        return;
      }

      const tenant = result.value;

      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          contactEmail: tenant.contactEmail,
          subscriptionTier: tenant.subscriptionTier,
          subscriptionStatus: tenant.subscriptionStatus,
          limits: tenant.limits,
          features: tenant.features,
          branding: tenant.branding,
          settings: tenant.settings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/current/usage
   * Gets current tenant usage statistics
   */
  async getCurrentUsage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const result = await this.tenantRepo.getUsageStats(tenantId);

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch usage statistics',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tenants/current/branding
   * Updates tenant branding
   */
  async updateBranding(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { logoUrl, primaryColor, secondaryColor } = req.body;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const tenantResult = await this.tenantRepo.findById(tenantId);
      if (tenantResult.isErr() || !tenantResult.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        });
        return;
      }

      const tenant = tenantResult.value;
      const updateResult = tenant.updateBranding({
        logoUrl,
        primaryColor,
        secondaryColor,
      });

      if (updateResult.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: updateResult.error.message,
          },
        });
        return;
      }

      await this.tenantRepo.update(tenant);

      res.json({
        success: true,
        data: {
          branding: tenant.branding,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tenants/current/settings
   * Updates tenant settings
   */
  async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const settings = req.body;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const tenantResult = await this.tenantRepo.findById(tenantId);
      if (tenantResult.isErr() || !tenantResult.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        });
        return;
      }

      const tenant = tenantResult.value;
      tenant.updateSettings(settings);
      await this.tenantRepo.update(tenant);

      res.json({
        success: true,
        data: {
          settings: tenant.settings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants (admin only)
   * Lists all tenants
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        query,
        subscriptionTier,
        subscriptionStatus,
        activeOnly,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await this.tenantRepo.search({
        query: query as string,
        subscriptionTier: subscriptionTier as SubscriptionTier,
        subscriptionStatus: subscriptionStatus as any,
        activeOnly: activeOnly === 'true',
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch tenants',
          },
        });
        return;
      }

      const { tenants, total } = result.value;

      res.json({
        success: true,
        data: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          contactEmail: t.contactEmail,
          subscriptionTier: t.subscriptionTier,
          subscriptionStatus: t.subscriptionStatus,
          isActive: t.isActive,
          createdAt: t.createdAt,
        })),
        pagination: {
          total,
          limit: parseInt((limit as string) ?? '50', 10),
          offset: parseInt((offset as string) ?? '0', 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenants/:id/suspend (admin only)
   * Suspends a tenant
   */
  async suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant ID is required',
          },
        });
        return;
      }

      const result = await this.provisioningService.suspendTenant(id, reason);

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'SUSPEND_ERROR',
            message: result.error.message,
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tenant suspended',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenants/:id/reactivate (admin only)
   * Reactivates a suspended tenant
   */
  async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant ID is required',
          },
        });
        return;
      }

      const result = await this.provisioningService.reactivateTenant(id);

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'REACTIVATE_ERROR',
            message: result.error.message,
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tenant reactivated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenants/:id/upgrade (admin only)
   * Upgrades tenant subscription
   */
  async upgrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { tier } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant ID is required',
          },
        });
        return;
      }

      if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid subscription tier',
          },
        });
        return;
      }

      const result = await this.provisioningService.upgradeTenant(id, tier as SubscriptionTier);

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'UPGRADE_ERROR',
            message: result.error.message,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          subscriptionTier: result.value.subscriptionTier,
          limits: result.value.limits,
          features: result.value.features,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/check-slug/:slug
   * Checks if a slug is available (public)
   */
  async checkSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Slug is required',
          },
        });
        return;
      }

      const result = await this.tenantRepo.existsBySlug(slug);

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to check slug',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          slug,
          available: !result.value,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
