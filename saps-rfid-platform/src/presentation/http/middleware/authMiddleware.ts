import jwt, { type SignOptions } from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';

import { TenantContext, createTenantContext } from '../../../application/context/TenantContext';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type { ITenantRepository } from '../../../domain/repositories/ITenantRepository';
import type { ITenantUserRepository } from '../../../domain/repositories/ITenantUserRepository';
import type { Request, Response, NextFunction } from 'express';

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  tenantId: string;
  tenantSlug: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Extended Express Request with auth info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    tenantSlug: string;
    email: string;
    role: string;
  };
  tenantId?: string;
  tenantSlug?: string;
  requestId?: string;
}

/**
 * Configuration for auth middleware
 */
export interface AuthMiddlewareConfig {
  jwtSecret: string;
  jwtIssuer?: string;
  jwtAudience?: string;
}

/**
 * JWT Configuration (alias for easier import)
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Authentication Middleware Factory
 *
 * Creates middleware for JWT authentication and tenant context setup.
 */
@injectable()
export class AuthMiddlewareFactory {
  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('ITenantRepository') private readonly tenantRepo: ITenantRepository,
    @inject('ITenantUserRepository') private readonly userRepo: ITenantUserRepository,
    @inject('AuthConfig') private readonly config: AuthMiddlewareConfig
  ) {}

  /**
   * Creates middleware that requires authentication
   */
  requireAuth() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication token required',
            },
          });
          return;
        }

        const payload = this.verifyToken(token);
        if (!payload) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired token',
            },
          });
          return;
        }

        // Verify tenant exists and is active
        const tenantResult = await this.tenantRepo.findById(payload.tenantId);
        if (tenantResult.isErr() || !tenantResult.value) {
          res.status(401).json({
            success: false,
            error: {
              code: 'TENANT_NOT_FOUND',
              message: 'Tenant not found',
            },
          });
          return;
        }

        const tenant = tenantResult.value;
        if (!tenant.canBeUsed()) {
          res.status(403).json({
            success: false,
            error: {
              code: 'TENANT_SUSPENDED',
              message: 'Tenant account is suspended or inactive',
            },
          });
          return;
        }

        // Set user info on request
        req.user = {
          id: payload.sub,
          tenantId: payload.tenantId,
          tenantSlug: payload.tenantSlug,
          email: payload.email,
          role: payload.role,
        };
        req.tenantId = payload.tenantId;
        req.tenantSlug = payload.tenantSlug;
        req.requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();

        // Run rest of request in tenant context
        const context = createTenantContext(payload.tenantId, payload.tenantSlug, req.requestId);
        TenantContext.run(
          {
            ...context,
            userId: payload.sub,
            userRole: payload.role,
          },
          () => {
            next();
          }
        );
      } catch (error) {
        this.logger.error('Authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Authentication failed',
          },
        });
      }
    };
  }

  /**
   * Creates middleware that optionally authenticates
   * Sets user info if token present, but doesn't require it
   */
  optionalAuth() {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);

        if (token) {
          const payload = this.verifyToken(token);
          if (payload) {
            req.user = {
              id: payload.sub,
              tenantId: payload.tenantId,
              tenantSlug: payload.tenantSlug,
              email: payload.email,
              role: payload.role,
            };
            req.tenantId = payload.tenantId;
            req.tenantSlug = payload.tenantSlug;
          }
        }

        req.requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
        next();
      } catch (error) {
        // Don't fail on optional auth errors, just log
        this.logger.debug('Optional auth failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        next();
      }
    };
  }

  /**
   * Creates middleware that requires a specific role or higher
   */
  requireRole(minimumRole: string) {
    const roleHierarchy: Record<string, number> = {
      owner: 100,
      admin: 80,
      manager: 60,
      operator: 40,
      viewer: 20,
    };

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const userLevel = roleHierarchy[req.user.role] ?? 0;
      const requiredLevel = roleHierarchy[minimumRole] ?? 0;

      if (userLevel < requiredLevel) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Role '${minimumRole}' or higher required`,
          },
        });
        return;
      }

      next();
    };
  }

  /**
   * Creates middleware that requires specific permissions
   */
  requirePermission(...permissions: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // Get user with permissions
      const userResult = await this.userRepo.findById(req.user.id);
      if (userResult.isErr() || !userResult.value) {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      const user = userResult.value;
      const hasAllPermissions = permissions.every((perm) => user.hasPermission(perm));

      if (!hasAllPermissions) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
        return;
      }

      next();
    };
  }

  /**
   * Extracts JWT token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie (for web clients)
    if (req.cookies?.token) {
      return req.cookies.token;
    }

    // Check query parameter (for WebSocket connections)
    if (typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  /**
   * Verifies and decodes JWT token
   */
  private verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.jwtIssuer,
        audience: this.config.jwtAudience,
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      this.logger.debug('JWT verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

/**
 * Generates a JWT token for a user
 */
export function generateToken(
  user: { id: string; email: string; role: string },
  tenant: { id: string; slug: string },
  config: AuthMiddlewareConfig | JwtConfig,
  expiresIn: string = '24h'
): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    email: user.email,
    role: user.role,
  };

  // Support both config formats
  const secret = 'jwtSecret' in config ? config.jwtSecret : config.secret;
  const issuer = 'jwtIssuer' in config ? config.jwtIssuer : undefined;
  const audience = 'jwtAudience' in config ? config.jwtAudience : undefined;

  const signOptions: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer,
    audience,
  };

  return jwt.sign(payload, secret, signOptions);
}
