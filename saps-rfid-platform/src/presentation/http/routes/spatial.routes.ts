/**
 * Spatial Analytics Routes
 *
 * Routes for Open3D-based spatial analysis.
 *
 * Phase 5: Open3D Integration
 */

import { Router } from 'express';
import { container } from 'tsyringe';

import { SpatialAnalyticsController } from '../controllers/SpatialAnalyticsController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

export function createSpatialRoutes(): Router {
  const router = Router();
  const authFactory = container.resolve(AuthMiddlewareFactory);
  const controller = container.resolve(SpatialAnalyticsController);

  // Health check (no auth required) - use controller's router directly for this endpoint
  router.get('/health', (req, res, next) => {
    // Forward to controller's health endpoint
    controller.getRouter()(req, res, next);
  });

  // Protected routes (require authentication)
  router.use(authFactory.requireAuth());
  router.use(controller.getRouter());

  return router;
}
