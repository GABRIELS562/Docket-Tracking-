import { Router } from 'express';
import itemRoutes, { zoneItemsRouter } from './item.routes';
import zoneRoutes from './zone.routes';
import readerRoutes from './reader.routes';
import healthRoutes from './health.routes';
import tenantRoutes from './tenant.routes';
import authRoutes from './auth.routes';
import { createAnalyticsRoutes } from './analytics.routes';
import { createFlowRoutes } from './flow.routes';
import { createSpatialRoutes } from './spatial.routes';

/**
 * API Routes Factory
 *
 * Creates all API routes after DI container is initialized.
 * All routes are prefixed with /api
 *
 * Available endpoints:
 * - /api/auth         - Authentication (login, logout, refresh)
 * - /api/tenants      - Tenant management
 * - /api/items        - Item management
 * - /api/zones        - Zone information
 * - /api/zones/:id/items - Items in zone
 * - /api/readers      - RFID reader status
 * - /api/analytics    - Analytics and reporting
 * - /api/flow         - Flow analytics (Phase 2.2)
 * - /api/spatial      - Spatial analytics (Phase 5: Open3D)
 * - /api/health       - Health checks
 */
export function createRoutes(): Router {
  const router = Router();

  // Mount sub-routes
  router.use('/auth', authRoutes);
  router.use('/tenants', tenantRoutes);
  router.use('/items', itemRoutes);
  router.use('/zones', zoneRoutes);
  router.use('/zones', zoneItemsRouter);      // Zone items sub-routes
  router.use('/readers', readerRoutes);
  router.use('/analytics', createAnalyticsRoutes());
  router.use('/flow', createFlowRoutes());            // Phase 2.2: Flow analytics
  router.use('/spatial', createSpatialRoutes()); // Phase 5: Spatial analytics
  router.use('/health', healthRoutes);

  return router;
}

// Default export for backwards compatibility
export default createRoutes;
