import { Router } from 'express';
import { container } from 'tsyringe';
import { ReaderController } from '../controllers/ReaderController';

const router = Router();
const controller = container.resolve(ReaderController);

/**
 * @route   GET /api/readers
 * @desc    Get all RFID readers with current status
 * @access  Public
 */
router.get('/', (req, res, next) => controller.getAll(req, res, next));

export default router;
