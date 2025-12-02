import { Router } from 'express';
import { container } from 'tsyringe';

import { AuthController } from '../controllers/AuthController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

const router = Router();

/**
 * Helper to get controller instance
 */
function getController(): AuthController {
  return container.resolve(AuthController);
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
 * POST /api/auth/login
 * Authenticates a user and returns JWT tokens
 *
 * Body:
 * - email: string (required)
 * - password: string (required)
 * - tenantSlug: string (optional - for multi-tenant login)
 *
 * Response:
 * - accessToken: string
 * - refreshToken: string
 * - expiresIn: string
 * - user: object
 * - tenant: object
 */
router.post('/login', (req, res, next) => getController().login(req, res, next));

// =============================================================================
// AUTHENTICATED ROUTES (Require valid JWT)
// =============================================================================

/**
 * POST /api/auth/refresh
 * Refreshes an access token using a refresh token
 *
 * Headers:
 * - Authorization: Bearer <refresh_token>
 *
 * Response:
 * - accessToken: string
 * - refreshToken: string
 * - expiresIn: string
 */
router.post(
  '/refresh',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().refresh(req, res, next)
);

/**
 * POST /api/auth/logout
 * Logs out a user
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 */
router.post(
  '/logout',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().logout(req, res, next)
);

/**
 * GET /api/auth/me
 * Gets the current authenticated user's profile
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - user: object
 * - tenant: object
 */
router.get(
  '/me',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().me(req, res, next)
);

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Body:
 * - currentPassword: string (required)
 * - newPassword: string (required)
 */
router.post(
  '/change-password',
  (req, res, next) => getAuthMiddleware().requireAuth()(req, res, next),
  (req, res, next) => getController().changePassword(req, res, next)
);

export default router;
