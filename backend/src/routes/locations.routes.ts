import { Router } from 'express';
import { LocationsController } from '../controllers/locations.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', LocationsController.createLocation);
router.get('/', LocationsController.listLocations);
router.get('/hierarchy', LocationsController.getLocationHierarchy);
router.get('/search', LocationsController.searchLocations);
router.get('/:id', LocationsController.getLocation);
router.put('/:id', LocationsController.updateLocation);
router.post('/:id/deactivate', LocationsController.deactivateLocation);
router.get('/:id/objects', LocationsController.getLocationObjects);

export default router;