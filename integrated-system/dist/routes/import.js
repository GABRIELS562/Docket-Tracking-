"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const ImportService_1 = require("../services/ImportService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
    },
    fileFilter: (_req, file, cb) => {
        const allowedExtensions = /\.(csv|xlsx|xls|txt)$/i;
        const extname = allowedExtensions.test(file.originalname);
        if (extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only CSV, Excel, and text files are allowed'));
        }
    }
});
// Get all import jobs
router.get('/jobs', async (req, res) => {
    try {
        const importService = ImportService_1.ImportService.getInstance();
        const jobs = await importService.getJobs(req.query);
        res.json({ success: true, data: jobs });
    }
    catch (error) {
        logger_1.logger.error('Error fetching import jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch import jobs' });
    }
});
// Get specific import job
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const importService = ImportService_1.ImportService.getInstance();
        const job = await importService.getJob(req.params.jobId);
        if (!job) {
            res.status(404).json({ success: false, error: 'Import job not found' });
            return;
        }
        res.json({ success: true, data: job });
    }
    catch (error) {
        logger_1.logger.error('Error fetching import job:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch import job' });
    }
});
// Upload and start import
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No file uploaded' });
            return;
        }
        const { object_type = 'docket', mapping } = req.body;
        const importService = ImportService_1.ImportService.getInstance();
        // Create import job
        const job = await importService.createJob({
            filename: req.file.originalname,
            file_path: req.file.path,
            object_type,
            mapping_config: mapping ? JSON.parse(mapping) : null,
            created_by_id: req.user?.id
        });
        // Start processing in background
        importService.processJob(job.job_id).catch(error => {
            logger_1.logger.error(`Import job ${job.job_id} failed:`, error);
        });
        res.json({
            success: true,
            data: {
                job_id: job.job_id,
                message: 'Import started',
                status_url: `/api/import/jobs/${job.job_id}`
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error starting import:', error);
        res.status(500).json({ success: false, error: 'Failed to start import' });
    }
});
// Cancel import job
router.post('/jobs/:jobId/cancel', async (req, res) => {
    try {
        const importService = ImportService_1.ImportService.getInstance();
        await importService.cancelJob(req.params.jobId);
        res.json({ success: true, message: 'Import job cancelled' });
    }
    catch (error) {
        logger_1.logger.error('Error cancelling import job:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel import job' });
    }
});
// Retry failed import job
router.post('/jobs/:jobId/retry', async (req, res) => {
    try {
        const importService = ImportService_1.ImportService.getInstance();
        await importService.retryJob(req.params.jobId);
        res.json({ success: true, message: 'Import job restarted' });
    }
    catch (error) {
        logger_1.logger.error('Error retrying import job:', error);
        res.status(500).json({ success: false, error: 'Failed to retry import job' });
    }
});
// Get import statistics
router.get('/stats', async (_req, res) => {
    try {
        const importService = ImportService_1.ImportService.getInstance();
        const stats = await importService.getStatistics();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        logger_1.logger.error('Error fetching import statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch import statistics' });
    }
});
// Download import template
router.get('/template/:type', (req, res) => {
    const type = req.params.type;
    const templates = {
        docket: {
            headers: ['object_code', 'name', 'description', 'category', 'priority_level', 'case_number', 'court_date'],
            sample: [
                'DOC-2025-001', 'Criminal Case #12345', 'Theft investigation case', 'criminal', 'high', 'CR-2025-001', '2025-09-30'
            ]
        },
        evidence: {
            headers: ['object_code', 'name', 'description', 'category', 'evidence_type', 'case_reference'],
            sample: [
                'EVD-2025-001', 'Fingerprint Card', 'Latent prints from scene', 'forensic', 'physical', 'CR-2025-001'
            ]
        },
        equipment: {
            headers: ['object_code', 'name', 'description', 'category', 'serial_number', 'purchase_date'],
            sample: [
                'EQP-2025-001', 'RFID Scanner', 'Zebra handheld scanner', 'technology', 'ZBR123456', '2025-01-15'
            ]
        }
    };
    const template = templates[type];
    if (!template) {
        res.status(404).json({ success: false, error: 'Template not found' });
        return;
    }
    res.json({
        success: true,
        data: {
            type,
            template
        }
    });
});
exports.default = router;
//# sourceMappingURL=import.js.map