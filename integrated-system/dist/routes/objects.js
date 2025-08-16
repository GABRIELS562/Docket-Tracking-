"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ObjectController_1 = require("../controllers/ObjectController");
const validator_1 = require("../middleware/validator");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const controller = new ObjectController_1.ObjectController();
// Validation schemas
const createObjectSchema = joi_1.default.object({
    object_code: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    description: joi_1.default.string().optional(),
    object_type: joi_1.default.string().required().valid('docket', 'evidence', 'equipment', 'file', 'tool'),
    category: joi_1.default.string().optional(),
    priority_level: joi_1.default.string().optional().valid('low', 'normal', 'high', 'critical'),
    rfid_tag_id: joi_1.default.string().optional(),
    current_location_id: joi_1.default.number().optional(),
    assigned_to_id: joi_1.default.number().optional(),
    metadata: joi_1.default.object().optional()
});
const updateObjectSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    category: joi_1.default.string().optional(),
    priority_level: joi_1.default.string().optional().valid('low', 'normal', 'high', 'critical'),
    status: joi_1.default.string().optional().valid('active', 'inactive', 'archived', 'disposed'),
    current_location_id: joi_1.default.number().optional(),
    assigned_to_id: joi_1.default.number().optional(),
    metadata: joi_1.default.object().optional()
});
// Routes
router.get('/', controller.listObjects);
router.get('/search', controller.searchObjects);
router.get('/types', controller.getObjectTypes);
router.get('/stats', controller.getObjectStats);
router.get('/:id', controller.getObject);
router.get('/:id/history', controller.getObjectHistory);
router.get('/:id/chain-of-custody', controller.getChainOfCustody);
router.post('/', (0, validator_1.validateRequest)(createObjectSchema), controller.createObject);
router.post('/:id/assign', controller.assignObject);
router.post('/:id/move', controller.moveObject);
router.post('/:id/tag', controller.tagObject);
router.put('/:id', (0, validator_1.validateRequest)(updateObjectSchema), controller.updateObject);
router.delete('/:id', controller.deleteObject);
exports.default = router;
//# sourceMappingURL=objects.js.map