"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const uuid_1 = require("uuid");
const DatabaseService_1 = require("./DatabaseService");
const logger_1 = require("../utils/logger");
class ImportService {
    constructor(io) {
        this.io = null;
        this.activeJobs = new Map();
        this.dbService = DatabaseService_1.DatabaseService.getInstance();
        this.io = io || null;
    }
    static getInstance(io) {
        if (!ImportService.instance) {
            ImportService.instance = new ImportService(io);
        }
        if (io && !ImportService.instance.io) {
            ImportService.instance.io = io;
        }
        return ImportService.instance;
    }
    async initialize() {
        logger_1.logger.info('Import service initialized');
    }
    async createJob(data) {
        const jobId = (0, uuid_1.v4)();
        const result = await this.dbService.query(`
      INSERT INTO import_jobs (
        job_id, filename, file_path, object_type, status, 
        mapping_config, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
            jobId,
            data.filename,
            data.file_path,
            data.object_type || 'docket',
            'pending',
            JSON.stringify(data.mapping_config || {}),
            data.created_by_id
        ]);
        return result.rows[0];
    }
    async processJob(jobId) {
        if (this.activeJobs.get(jobId)) {
            throw new Error('Job is already being processed');
        }
        this.activeJobs.set(jobId, true);
        try {
            // Get job details
            const jobResult = await this.dbService.query('SELECT * FROM import_jobs WHERE job_id = $1', [jobId]);
            if (jobResult.rows.length === 0) {
                throw new Error('Job not found');
            }
            const job = jobResult.rows[0];
            // Update job status
            await this.updateJobStatus(jobId, 'processing');
            this.emitProgress(jobId, { status: 'processing', message: 'Import started' });
            // Read and process file
            const records = await this.readFile(job.file_path);
            await this.updateJob(jobId, {
                total_records: records.length,
                started_at: new Date()
            });
            // Process records in batches
            const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '1000');
            let processed = 0;
            let success = 0;
            let errors = 0;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const results = await this.processBatch(batch, job.object_type);
                processed += batch.length;
                success += results.success;
                errors += results.errors;
                // Update progress
                await this.updateJob(jobId, {
                    processed_records: processed,
                    success_records: success,
                    error_records: errors
                });
                this.emitProgress(jobId, {
                    processed,
                    total: records.length,
                    success,
                    errors,
                    percentage: Math.round((processed / records.length) * 100)
                });
            }
            // Complete job
            await this.updateJobStatus(jobId, 'completed');
            await this.updateJob(jobId, {
                completed_at: new Date()
            });
            this.emitProgress(jobId, {
                status: 'completed',
                message: `Import completed: ${success} successful, ${errors} failed`
            });
        }
        catch (error) {
            logger_1.logger.error(`Import job ${jobId} failed:`, error);
            await this.updateJobStatus(jobId, 'failed');
            await this.updateJob(jobId, {
                error_log: error instanceof Error ? error.message : 'Unknown error'
            });
            this.emitProgress(jobId, {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        finally {
            this.activeJobs.delete(jobId);
        }
    }
    async readFile(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const records = [];
        if (ext === '.csv') {
            return new Promise((resolve, reject) => {
                fs_1.default.createReadStream(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (data) => records.push(data))
                    .on('end', () => resolve(records))
                    .on('error', reject);
            });
        }
        else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    }
    async processBatch(records, objectType) {
        let success = 0;
        let errors = 0;
        for (const record of records) {
            try {
                // Generate RFID tag if not provided
                const rfidTag = record.rfid_tag_id || `TAG-${(0, uuid_1.v4)().substring(0, 8)}`;
                await this.dbService.query(`
          INSERT INTO objects (
            object_code, name, description, object_type, category,
            priority_level, status, rfid_tag_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (object_code) DO NOTHING
        `, [
                    record.object_code,
                    record.name,
                    record.description,
                    objectType,
                    record.category,
                    record.priority_level || 'normal',
                    record.status || 'active',
                    rfidTag,
                    JSON.stringify(record.metadata || {})
                ]);
                success++;
            }
            catch (error) {
                logger_1.logger.error('Failed to import record:', error);
                errors++;
            }
        }
        return { success, errors };
    }
    async updateJob(jobId, updates) {
        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [jobId, ...Object.values(updates)];
        await this.dbService.query(`UPDATE import_jobs SET ${fields} WHERE job_id = $1`, values);
    }
    async updateJobStatus(jobId, status) {
        await this.dbService.query('UPDATE import_jobs SET status = $2 WHERE job_id = $1', [jobId, status]);
    }
    emitProgress(jobId, data) {
        if (this.io) {
            this.io.to(`import:${jobId}`).emit('import:progress', {
                jobId,
                ...data
            });
        }
    }
    async getJobs(filters) {
        let query = 'SELECT * FROM import_jobs WHERE 1=1';
        const params = [];
        if (filters?.status) {
            params.push(filters.status);
            query += ` AND status = $${params.length}`;
        }
        query += ' ORDER BY created_at DESC LIMIT 100';
        const result = await this.dbService.query(query, params);
        return result.rows;
    }
    async getJob(jobId) {
        const result = await this.dbService.query('SELECT * FROM import_jobs WHERE job_id = $1', [jobId]);
        return result.rows[0] || null;
    }
    async cancelJob(jobId) {
        this.activeJobs.delete(jobId);
        await this.updateJobStatus(jobId, 'cancelled');
    }
    async retryJob(jobId) {
        await this.updateJobStatus(jobId, 'pending');
        await this.processJob(jobId);
    }
    async getStatistics() {
        const result = await this.dbService.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as active_jobs,
        SUM(total_records) as total_records_processed,
        SUM(success_records) as total_success_records,
        SUM(error_records) as total_error_records
      FROM import_jobs
    `);
        return result.rows[0];
    }
}
exports.ImportService = ImportService;
//# sourceMappingURL=ImportService.js.map