import { Router } from 'express';
import { ObjectController } from '../controllers/ObjectController';
import { validateRequest } from '../middleware/validator';
import Joi from 'joi';

const router = Router();
const controller = new ObjectController();

// Validation schemas
const createObjectSchema = Joi.object({
  object_code: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  object_type: Joi.string().required().valid('docket', 'evidence', 'equipment', 'file', 'tool'),
  category: Joi.string().optional(),
  priority_level: Joi.string().optional().valid('low', 'normal', 'high', 'critical'),
  rfid_tag_id: Joi.string().optional(),
  current_location_id: Joi.number().optional(),
  assigned_to_id: Joi.number().optional(),
  metadata: Joi.object().optional()
});

const updateObjectSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
  priority_level: Joi.string().optional().valid('low', 'normal', 'high', 'critical'),
  status: Joi.string().optional().valid('active', 'inactive', 'archived', 'disposed'),
  current_location_id: Joi.number().optional(),
  assigned_to_id: Joi.number().optional(),
  metadata: Joi.object().optional()
});

// Routes
router.get('/', controller.listObjects);
router.get('/search', controller.searchObjects);
router.get('/types', controller.getObjectTypes);
router.get('/stats', controller.getObjectStats);
router.get('/:id', controller.getObject);
router.get('/:id/history', controller.getObjectHistory);
router.get('/:id/chain-of-custody', controller.getChainOfCustody);

router.post('/', validateRequest(createObjectSchema), controller.createObject);
router.post('/:id/assign', controller.assignObject);
router.post('/:id/move', controller.moveObject);
router.post('/:id/tag', controller.tagObject);

router.put('/:id', validateRequest(updateObjectSchema), controller.updateObject);

router.delete('/:id', controller.deleteObject);

export default router;