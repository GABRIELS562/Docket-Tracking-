import { Router } from 'express';
import { container } from 'tsyringe';

import { TenantController } from '../controllers/TenantController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

const router = Router();

/**
 * Helper to get controller instance
 */
function getController(): TenantController {
  return container.resolve(TenantController);
}

/**
 * Helper to get auth middleware
 */
function getAuthMiddleware(): AuthMiddlewareFactory {
  return container.resolve(AuthMiddlewareFactory);
}

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * POST /api/tenants
 * Creates a new tenant with owner account (signup)
 */
router.post('/', (req, res, next) => getController().create(req, res, next));

/**
 * GET /api/tenants/check-slug/:slug
 * Checks if a slug is available
 */
router.get('/check-slug/:slug', (req, res, next) => getController().checkSlug(req, res, next));

// =============================================================================
// AUTHENTICATED ROUTES (Require valid JWT)
// =============================================================================

/**
 * GET /api/tenants/current
 * Gets the current user's tenant
 */
router.get(
  '/current',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().getCurrent(req, res, next)
);

/**
 * GET /api/tenants/current/usage
 * Gets usage statistics for current tenant
 */
router.get(
  '/current/usage',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().getCurrentUsage(req, res, next)
);

/**
 * PATCH /api/tenants/current/branding
 * Updates branding for current tenant (admin only)
 */
router.patch(
  '/current/branding',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('admin')(req, res, next),
  (req, res, next) => getController().updateBranding(req, res, next)
);

/**
 * PATCH /api/tenants/current/settings
 * Updates settings for current tenant (admin only)
 */
router.patch(
  '/current/settings',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('admin')(req, res, next),
  (req, res, next) => getController().updateSettings(req, res, next)
);

// =============================================================================
// PLATFORM ADMIN ROUTES (Super admin only - for SaaS management)
// =============================================================================

/**
 * GET /api/tenants
 * Lists all tenants (platform admin only)
 */
router.get(
  '/',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('owner')(req, res, next),
  (req, res, next) => getController().list(req, res, next)
);

/**
 * GET /api/tenants/:id
 * Gets a specific tenant (platform admin only)
 */
router.get(
  '/:id',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('owner')(req, res, next),
  (req, res, next) => getController().getById(req, res, next)
);

/**
 * POST /api/tenants/:id/suspend
 * Suspends a tenant (platform admin only)
 */
router.post(
  '/:id/suspend',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('owner')(req, res, next),
  (req, res, next) => getController().suspend(req, res, next)
);

/**
 * POST /api/tenants/:id/reactivate
 * Reactivates a suspended tenant (platform admin only)
 */
router.post(
  '/:id/reactivate',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('owner')(req, res, next),
  (req, res, next) => getController().reactivate(req, res, next)
);

/**
 * POST /api/tenants/:id/upgrade
 * Upgrades tenant subscription (platform admin only)
 */
router.post(
  '/:id/upgrade',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getAuthMiddleware().requireRole('owner')(req, res, next),
  (req, res, next) => getController().upgrade(req, res, next)
);

export default router;
