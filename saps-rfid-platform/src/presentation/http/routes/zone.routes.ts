import { Router } from 'express';
import { container } from 'tsyringe';

import { ZoneController } from '../controllers/ZoneController';

const router = Router();

// Lazy resolve controller after DI container is initialized
const getController = () => container.resolve(ZoneController);

/**
 * @route   GET /api/zones
 * @desc    Get all zones with occupancy information
 * @access  Public
 */
router.get('/', (req, res, next) => getController().getAll(req, res, next));

/**
 * @route   GET /api/zones/:id/items
 * @desc    Get items currently in a specific zone
 * @access  Public
 * @param   id - Zone ID
 * @query   { limit? } - Maximum items to return (default 50)
 * @query   { recentOnly? } - Only return recently seen items (default false)
 */
router.get('/:id/items', (req, res, next) => getController().getItems(req, res, next));

export default router;
