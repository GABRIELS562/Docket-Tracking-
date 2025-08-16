import { Router } from 'express';
import { RfidController } from '../controllers/rfid.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/events', RfidController.processRfidEvent);
router.post('/events/batch', RfidController.processBatchRfidEvents);
router.post('/readers/:reader_id/ping', RfidController.pingReader);

router.use(authenticateToken);

router.post('/readers', RfidController.createReader);
router.get('/readers', RfidController.listReaders);
router.get('/readers/:id', RfidController.getReader);
router.put('/readers/:id', RfidController.updateReader);

router.get('/events', RfidController.getRecentEvents);
router.get('/events/stats', RfidController.getEventStats);
router.get('/readers/offline', RfidController.getOfflineReaders);

router.post('/simulate', RfidController.simulateRfidEvent);

export default router;