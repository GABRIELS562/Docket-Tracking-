import { Router } from 'express';
import { ObjectsController } from '../controllers/objects.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', ObjectsController.createObject);
router.get('/', ObjectsController.listObjects);
router.get('/types', ObjectsController.getObjectTypes);
router.get('/search', ObjectsController.searchObjects);
router.get('/:id', ObjectsController.getObject);
router.put('/:id', ObjectsController.updateObject);
router.delete('/:id', ObjectsController.deleteObject);
router.post('/:id/assign', ObjectsController.assignObject);
router.post('/:id/move', ObjectsController.moveObject);

export default router;