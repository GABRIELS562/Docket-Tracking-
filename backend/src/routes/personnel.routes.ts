import { Router } from 'express';
import { PersonnelController } from '../controllers/personnel.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', PersonnelController.login);
router.post('/badge-scan', PersonnelController.scanBadge);

router.use(authenticateToken);

router.post('/', PersonnelController.createPersonnel);
router.get('/', PersonnelController.listPersonnel);
router.get('/:id', PersonnelController.getPersonnel);
router.put('/:id', PersonnelController.updatePersonnel);
router.post('/:id/deactivate', PersonnelController.deactivatePersonnel);
router.get('/:id/objects', PersonnelController.getPersonnelObjects);

export default router;