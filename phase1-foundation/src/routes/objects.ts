import express from 'express';
import {
  getObjects,
  getObjectById,
  createObject,
  updateObject,
  deleteObject,
  getObjectHistory
} from '../controllers/objectsController';
import { authenticateToken, requireTechnicianOrAbove } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/objects - List objects with pagination and filtering
router.get('/', getObjects);

// GET /api/objects/:id - Get specific object
router.get('/:id', getObjectById);

// POST /api/objects - Create new object (requires technician+ role)
router.post('/', requireTechnicianOrAbove, createObject);

// PUT /api/objects/:id - Update object (requires technician+ role)
router.put('/:id', requireTechnicianOrAbove, updateObject);

// DELETE /api/objects/:id - Archive object (requires supervisor+ role)
router.delete('/:id', requireTechnicianOrAbove, deleteObject);

// GET /api/objects/:id/history - Get object audit history
router.get('/:id/history', getObjectHistory);

export default router;