import { Router } from 'express';
import objectsRoutes from './objects.routes';
import personnelRoutes from './personnel.routes';
import locationsRoutes from './locations.routes';
import rfidRoutes from './rfid.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/objects', objectsRoutes);
router.use('/personnel', personnelRoutes);
router.use('/locations', locationsRoutes);
router.use('/rfid', rfidRoutes);
router.use('/analytics', analyticsRoutes);

export default router;