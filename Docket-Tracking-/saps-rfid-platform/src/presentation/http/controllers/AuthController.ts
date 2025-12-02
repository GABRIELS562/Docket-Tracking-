import type { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcrypt';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type { ITenantRepository } from '../../../domain/repositories/ITenantRepository';
import type { ITenantUserRepository } from '../../../domain/repositories/ITenantUserRepository';
import { generateToken, type AuthenticatedRequest, type JwtConfig } from '../middleware/authMiddleware';

/**
 * Authentication Controller
 *
 * Handles user authentication, token management, and session operations.
 */
@injectable()
export class AuthController {
  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('ITenantRepository') private readonly tenantRepo: ITenantRepository,
    @inject('ITenantUserRepository') private readonly userRepo: ITenantUserRepository,
    @inject('JwtConfig') private readonly jwtConfig: JwtConfig
  ) {}

  /**
   * POST /api/auth/login
   * Authenticates a user and returns JWT tokens
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, tenantSlug } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        });
        return;
      }

      // Find user by email (optionally scoped to tenant)
      let userResult;
      let tenant = null;

      if (tenantSlug) {
        // Find tenant by slug
        const tenantResult = await this.tenantRepo.findBySlug(tenantSlug);
        if (tenantResult.isErr() || !tenantResult.value) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            },
          });
          return;
        }
        tenant = tenantResult.value;

        // Find user within tenant
        userResult = await this.userRepo.findByEmailAndTenant(email.toLowerCase(), tenant.id);
      } else {
        // Find user by email only (for single-tenant or when tenant is derived from email)
        userResult = await this.userRepo.findByEmail(email.toLowerCase());
      }

      if (userResult.isErr() || !userResult.value) {
        this.logger.warn('Login attempt with invalid email', { email });
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        });
        return;
      }

      const user = userResult.value;

      // Check if user is locked
      if (user.isLocked()) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked. Please try again later.',
          },
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Account is disabled',
          },
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Record failed login attempt
        user.recordFailedLogin();
        await this.userRepo.update(user);

        this.logger.warn('Login attempt with invalid password', { email, userId: user.id });
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        });
        return;
      }

      // Get tenant if not already fetched
      if (!tenant) {
        const tenantResult = await this.tenantRepo.findById(user.tenantId);
        if (tenantResult.isErr() || !tenantResult.value) {
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to retrieve tenant information',
            },
          });
          return;
        }
        tenant = tenantResult.value;
      }

      // Check if tenant is active
      if (!tenant.canBeUsed()) {
        res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Organization account is suspended or inactive',
          },
        });
        return;
      }

      // Record successful login
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      user.recordSuccessfulLogin(clientIp);
      await this.userRepo.update(user);

      // Generate tokens
      const accessToken = generateToken(user, tenant, this.jwtConfig);
      const refreshToken = generateToken(user, tenant, this.jwtConfig, this.jwtConfig.refreshExpiresIn);

      this.logger.info('User logged in', {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
      });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtConfig.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
            role: user.role,
            permissions: user.permissions,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            subscriptionTier: tenant.subscriptionTier,
            branding: tenant.branding,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Refreshes an access token using a refresh token
   */
  async refresh(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        });
        return;
      }

      // Fetch user and tenant
      const [userResult, tenantResult] = await Promise.all([
        this.userRepo.findById(userId),
        this.tenantRepo.findById(tenantId),
      ]);

      if (userResult.isErr() || !userResult.value) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
        });
        return;
      }

      if (tenantResult.isErr() || !tenantResult.value) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tenant not found',
          },
        });
        return;
      }

      const user = userResult.value;
      const tenant = tenantResult.value;

      // Check if user is still active
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Account is disabled',
          },
        });
        return;
      }

      // Check if tenant is still active
      if (!tenant.canBeUsed()) {
        res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Organization account is suspended or inactive',
          },
        });
        return;
      }

      // Generate new tokens
      const accessToken = generateToken(user, tenant, this.jwtConfig);
      const refreshToken = generateToken(user, tenant, this.jwtConfig, this.jwtConfig.refreshExpiresIn);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtConfig.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Logs out a user (invalidates token on client side)
   */
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      // In a production system, you might want to:
      // 1. Add the token to a blacklist in Redis
      // 2. Clear any server-side session
      // 3. Emit a logout event

      this.logger.info('User logged out', { userId });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Gets the current authenticated user's profile
   */
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const [userResult, tenantResult] = await Promise.all([
        this.userRepo.findById(userId),
        this.tenantRepo.findById(tenantId),
      ]);

      if (userResult.isErr() || !userResult.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

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

      const user = userResult.value;
      const tenant = tenantResult.value;

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            role: user.role,
            permissions: user.permissions,
            mfaEnabled: user.mfaEnabled,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
            preferences: user.preferences,
            createdAt: user.createdAt,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            subscriptionTier: tenant.subscriptionTier,
            subscriptionStatus: tenant.subscriptionStatus,
            features: tenant.features,
            branding: tenant.branding,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Changes the authenticated user's password
   */
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required',
          },
        });
        return;
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be at least 8 characters long',
          },
        });
        return;
      }

      const userResult = await this.userRepo.findById(userId);
      if (userResult.isErr() || !userResult.value) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      const user = userResult.value;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
        return;
      }

      // Hash new password and update
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      user.updatePassword(newPasswordHash);

      const updateResult = await this.userRepo.update(user);
      if (updateResult.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            code: 'PASSWORD_CHANGE_ERROR',
            message: 'Failed to update password',
          },
        });
        return;
      }

      this.logger.info('User changed password', { userId });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
