import { Router } from 'express';
import { container } from 'tsyringe';
import { ItemController } from '../controllers/ItemController';
import { validate, validateParams, validateQuery } from '../middleware/requestValidator';
import {
  createItemSchema,
  searchItemsQuerySchema,
  itemHistoryQuerySchema,
  itemNumberParamSchema,
  zoneIdParamSchema,
  zoneItemsQuerySchema,
} from '../schemas/item.schema';

const router = Router();

// Lazy resolve controller after DI container is initialized
const getController = () => container.resolve(ItemController);

/**
 * @route   POST /api/items
 * @desc    Register a new item
 * @access  Public
 * @body    { itemNumber, referenceId, rfidEpc, description, category, serialNumber?, receivedBy?, metadata? }
 */
router.post(
  '/',
  validate(createItemSchema),
  (req, res, next) => getController().create(req, res, next)
);

/**
 * @route   GET /api/items
 * @desc    Search items with filters and pagination
 * @access  Public
 * @query   { q?, status?, zoneId?, category?, limit?, offset?, sortBy?, sortOrder? }
 */
router.get(
  '/',
  validateQuery(searchItemsQuerySchema),
  (req, res, next) => getController().search(req, res, next)
);

/**
 * @route   GET /api/items/:itemNumber
 * @desc    Get detailed information about an item
 * @access  Public
 * @param   itemNumber - Item number (flexible format, e.g., INV-2025-000001)
 */
router.get(
  '/:itemNumber',
  validateParams(itemNumberParamSchema),
  (req, res, next) => getController().getById(req, res, next)
);

/**
 * @route   GET /api/items/:itemNumber/history
 * @desc    Get location history for an item
 * @access  Public
 * @param   itemNumber - Item number
 * @query   { hours?, limit?, startTime?, endTime? }
 */
router.get(
  '/:itemNumber/history',
  validateParams(itemNumberParamSchema),
  validateQuery(itemHistoryQuerySchema),
  (req, res, next) => getController().getHistory(req, res, next)
);

export default router;

/**
 * Zone Items Routes
 *
 * These routes are mounted separately under /api/zones
 * to maintain RESTful resource hierarchy.
 */
export const zoneItemsRouter = Router({ mergeParams: true });

/**
 * @route   GET /api/zones/:zoneId/items
 * @desc    Get all items currently in a specific zone
 * @access  Public
 * @param   zoneId - Zone ID
 * @query   { limit?, recentOnly? }
 */
zoneItemsRouter.get(
  '/:zoneId/items',
  validateParams(zoneIdParamSchema),
  validateQuery(zoneItemsQuerySchema),
  (req, res, next) => getController().getZoneItems(req, res, next)
);
