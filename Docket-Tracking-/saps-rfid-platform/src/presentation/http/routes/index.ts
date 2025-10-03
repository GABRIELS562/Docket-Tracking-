import { Router } from 'express';
import docketRoutes from './docket.routes';
import zoneRoutes from './zone.routes';
import readerRoutes from './reader.routes';
import healthRoutes from './health.routes';

/**
 * API Routes
 *
 * All routes are prefixed with /api
 *
 * Available endpoints:
 * - /api/dockets      - Docket management
 * - /api/zones        - Zone information
 * - /api/readers      - RFID reader status
 * - /api/health       - Health checks
 */
const router = Router();

// Mount sub-routes
router.use('/dockets', docketRoutes);
router.use('/zones', zoneRoutes);
router.use('/readers', readerRoutes);
router.use('/health', healthRoutes);

export default router;
