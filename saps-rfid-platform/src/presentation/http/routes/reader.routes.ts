import { Router } from 'express';
import { container } from 'tsyringe';

import { ReaderController } from '../controllers/ReaderController';

const router = Router();

// Lazy resolve controller after DI container is initialized
const getController = () => container.resolve(ReaderController);

/**
 * @route   GET /api/readers
 * @desc    Get all RFID readers with current status
 * @access  Public
 */
router.get('/', (req, res, next) => getController().getAll(req, res, next));

export default router;
