import { Router } from 'express';
import { container } from 'tsyringe';
import { ZoneController } from '../controllers/ZoneController';

const router = Router();
const controller = container.resolve(ZoneController);

/**
 * @route   GET /api/zones
 * @desc    Get all zones with occupancy information
 * @access  Public
 */
router.get('/', (req, res, next) => controller.getAll(req, res, next));

/**
 * @route   GET /api/zones/:id/dockets
 * @desc    Get dockets currently in a specific zone
 * @access  Public
 * @param   id - Zone ID
 * @query   { limit? } - Maximum dockets to return (default 5)
 */
router.get('/:id/dockets', (req, res, next) => controller.getDockets(req, res, next));

export default router;
