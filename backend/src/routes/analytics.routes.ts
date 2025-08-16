import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', AnalyticsController.getDashboardStats);
router.get('/objects', AnalyticsController.getObjectAnalytics);
router.get('/personnel', AnalyticsController.getPersonnelAnalytics);
router.get('/locations', AnalyticsController.getLocationAnalytics);
router.get('/rfid', AnalyticsController.getRfidAnalytics);
router.get('/reports', AnalyticsController.generateReport);

export default router;