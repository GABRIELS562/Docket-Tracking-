import { Router } from 'express';
import { container } from 'tsyringe';
import { DocketController } from '../controllers/DocketController';
import { validate, validateParams, validateQuery } from '../middleware/requestValidator';
import {
  createDocketSchema,
  searchDocketsQuerySchema,
  docketHistoryQuerySchema,
  labNumberParamSchema,
} from '../schemas/docket.schema';

const router = Router();

// Lazy resolve controller after DI container is initialized
const getController = () => container.resolve(DocketController);

/**
 * @route   POST /api/dockets
 * @desc    Register a new docket
 * @access  Public
 * @body    { labNumber, caseReference, rfidEpc, evidenceType?, metadata? }
 */
router.post(
  '/',
  validate(createDocketSchema),
  (req, res, next) => getController().create(req, res, next)
);

/**
 * @route   GET /api/dockets
 * @desc    Search dockets with filters and pagination
 * @access  Public
 * @query   { q?, status?, zoneId?, limit?, offset?, sortBy?, sortOrder? }
 */
router.get(
  '/',
  validateQuery(searchDocketsQuerySchema),
  (req, res, next) => getController().search(req, res, next)
);

/**
 * @route   GET /api/dockets/:labNumber
 * @desc    Get detailed information about a docket
 * @access  Public
 * @param   labNumber - Lab number in format FSL-YYYY-NNNNNN
 */
router.get(
  '/:labNumber',
  validateParams(labNumberParamSchema),
  (req, res, next) => getController().getById(req, res, next)
);

/**
 * @route   GET /api/dockets/:labNumber/history
 * @desc    Get location history for a docket
 * @access  Public
 * @param   labNumber - Lab number in format FSL-YYYY-NNNNNN
 * @query   { hours? } - Number of hours to look back (1-168, default 24)
 */
router.get(
  '/:labNumber/history',
  validateParams(labNumberParamSchema),
  validateQuery(docketHistoryQuerySchema),
  (req, res, next) => getController().getHistory(req, res, next)
);

export default router;
