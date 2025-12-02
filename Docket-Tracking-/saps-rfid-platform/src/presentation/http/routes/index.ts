import { Router } from 'express';
import itemRoutes, { zoneItemsRouter } from './item.routes';
import zoneRoutes from './zone.routes';
import readerRoutes from './reader.routes';
import healthRoutes from './health.routes';
import tenantRoutes from './tenant.routes';
import authRoutes from './auth.routes';

/**
 * API Routes
 *
 * All routes are prefixed with /api
 *
 * Available endpoints:
 * - /api/auth         - Authentication (login, logout, refresh)
 * - /api/tenants      - Tenant management
 * - /api/items        - Item management
 * - /api/zones        - Zone information
 * - /api/zones/:id/items - Items in zone
 * - /api/readers      - RFID reader status
 * - /api/health       - Health checks
 */
const router = Router();

// Mount sub-routes
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/items', itemRoutes);
router.use('/zones', zoneRoutes);
router.use('/zones', zoneItemsRouter);      // Zone items sub-routes
router.use('/readers', readerRoutes);
router.use('/health', healthRoutes);

export default router;
