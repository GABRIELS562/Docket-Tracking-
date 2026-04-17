import { Router } from 'express';
import { container } from 'tsyringe';

import { HealthController } from '../controllers/HealthController';

const router = Router();

// Lazy resolve controller after DI container is initialized
const getController = () => container.resolve(HealthController);

/**
 * @route   GET /health
 * @desc    Simple health check - returns 200 if server is running
 * @access  Public
 */
router.get('/', (req, res) => getController().check(req, res));

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with all dependencies
 * @access  Public
 */
router.get('/detailed', (req, res) => getController().detailed(req, res));

export default router;
