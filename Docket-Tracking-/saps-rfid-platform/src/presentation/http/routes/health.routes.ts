import { Router } from 'express';
import { container } from 'tsyringe';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const controller = container.resolve(HealthController);

/**
 * @route   GET /health
 * @desc    Simple health check - returns 200 if server is running
 * @access  Public
 */
router.get('/', (req, res) => controller.check(req, res));

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with all dependencies
 * @access  Public
 */
router.get('/detailed', (req, res) => controller.detailed(req, res));

export default router;
