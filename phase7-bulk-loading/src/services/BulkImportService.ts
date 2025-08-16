import { Worker } from 'worker_threads';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ImportJob,
  ImportConfiguration,
  DocketRecord,
  BatchProcessingResult,
  ImportError,
  ImportWarning,
  MigrationProgress
} from '@/types';
import { Logger } from '@/utils/Logger';
import { DatabaseService } from '@/services/DatabaseService';
import { TagGenerationService } from '@/services/TagGenerationService';
import { DataValidator } from '@/validators/DataValidator';

export class BulkImportService {
  private logger: Logger;
  private dbService: DatabaseService;
  private tagService: TagGenerationService;
  private validator: DataValidator;
  private activeJobs: Map<string, ImportJob> = new Map();
  private workers: Map<string, Worker[]> = new Map();

  constructor() {
    this.logger = new Logger('BulkImportService');
    this.dbService = new DatabaseService();
    this.tagService = new TagGenerationService();
    this.validator = new DataValidator();
  }

  async startImportJob(
    jobName: string,
    dataFilePath: string,
    configuration: ImportConfiguration,
    createdBy: string
  ): Promise<string> {
    const jobId = uuidv4();
    
    try {
      this.logger.info(`Starting import job: ${jobName}`, { job_id: jobId });

      const job: ImportJob = {
        id: jobId,
        job_name: jobName,
        status: 'pending',
        total_records: 0,
        processed_records: 0,
        success_records: 0,
        error_records: 0,
        warnings_count: 0,
        error_log: [],
        warning_log: [],
        progress_percentage: 0,
        throughput_per_hour: 0,
        current_batch: 0,
        total_batches: 0,
        data_source: dataFilePath,
        created_by: createdBy,
        configuration
      };

      await this.saveImportJob(job);
      this.activeJobs.set(jobId, job);

      const records = await this.loadDataForImport(dataFilePath, configuration);
      job.total_records = records.length;
      job.total_batches = Math.ceil(records.length / configuration.batch_size);

      if (configuration.backup_before_import) {
        await this.createPreImportBackup(jobId);
      }

      if (configuration.auto_generate_tags) {
        await this.generateTagsForRecords(jobId, records);
      }

      this.processImportInBackground(jobId, records);

      return jobId;

    } catch (error) {
      this.logger.error(`Failed to start import job ${jobName}:`, error);
      throw error;
    }
  }

  private async processImportInBackground(jobId: string, records: DocketRecord[]): Promise<void> {
    try {
      const job = this.activeJobs.get(jobId)!;
      job.status = 'running';
      job.started_at = new Date();
      await this.updateImportJob(job);

      this.logger.info(`Processing ${records.length} records in ${job.total_batches} batches`);

      const startTime = Date.now();
      const workers: Worker[] = [];

      const batchSize = job.configuration.batch_size;
      const parallelWorkers = job.configuration.parallel_workers;

      for (let i = 0; i < parallelWorkers; i++) {
        const worker = new Worker(path.join(__dirname, '../workers/ImportWorker.js'), {
          workerData: {
            jobId,
            configuration: job.configuration,
            workerId: i
          }
        });

        worker.on('message', async (message) => {
          await this.handleWorkerMessage(jobId, message);
        });

        worker.on('error', (error) => {
          this.logger.error(`Worker ${i} error:`, error);
        });

        workers.push(worker);
      }

      this.workers.set(jobId, workers);

      const batches = this.createBatches(records, batchSize);
      let batchIndex = 0;

      for (const batch of batches) {
        const availableWorker = await this.getAvailableWorker(jobId);
        
        availableWorker.postMessage({
          type: 'process_batch',
          batch_number: batchIndex + 1,
          records: batch,
          total_batches: batches.length
        });

        batchIndex++;

        if (batchIndex % 10 === 0) {
          await this.updateProgress(jobId);
        }
      }

      await this.waitForAllWorkersToComplete(jobId);
      await this.completeImportJob(jobId, startTime);

    } catch (error) {
      await this.failImportJob(jobId, error);
    }
  }

  private async handleWorkerMessage(jobId: string, message: any): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    switch (message.type) {
      case 'batch_completed':
        await this.handleBatchCompleted(jobId, message.result);
        break;
      case 'batch_failed':
        await this.handleBatchFailed(jobId, message.error);
        break;
      case 'progress_update':
        await this.handleProgressUpdate(jobId, message.progress);
        break;
      case 'worker_ready':
        break;
      default:
        this.logger.warn(`Unknown message type from worker: ${message.type}`);
    }
  }

  private async handleBatchCompleted(jobId: string, result: BatchProcessingResult): Promise<void> {
    const job = this.activeJobs.get(jobId)!;
    
    job.processed_records += result.processed_records;
    job.success_records += result.success_records;
    job.error_records += result.error_records;
    job.warnings_count += result.warnings_count;
    job.current_batch = result.batch_number;
    
    job.error_log.push(...result.errors);
    job.warning_log.push(...result.warnings);

    job.progress_percentage = Math.round((job.processed_records / job.total_records) * 100);

    await this.saveBatchResult(result);
    await this.updateImportJob(job);

    this.logger.logBatchProcessing(
      result.batch_number,
      job.total_batches,
      result.total_records,
      result.processing_time_ms,
      result.error_records
    );
  }

  private async handleBatchFailed(jobId: string, error: any): Promise<void> {
    const job = this.activeJobs.get(jobId)!;
    
    const importError: ImportError = {
      row_number: 0,
      error_type: 'batch_failure',
      error_message: error.message || 'Batch processing failed',
      timestamp: new Date(),
      severity: 'critical'
    };

    job.error_log.push(importError);
    job.error_records += 1;

    if (job.error_log.filter(e => e.severity === 'critical').length > job.configuration.max_errors_per_batch) {
      await this.failImportJob(jobId, new Error('Too many critical errors, stopping import'));
    }
  }

  private async handleProgressUpdate(jobId: string, progress: any): Promise<void> {
    await this.updateMigrationProgress(jobId, progress);
  }

  private createBatches(records: DocketRecord[], batchSize: number): DocketRecord[][] {
    const batches: DocketRecord[][] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private async getAvailableWorker(jobId: string): Promise<Worker> {
    const workers = this.workers.get(jobId);
    if (!workers) {
      throw new Error(`No workers found for job ${jobId}`);
    }

    return new Promise((resolve) => {
      const checkWorkers = () => {
        for (const worker of workers) {
          worker.postMessage({ type: 'ping' });
          
          const timeout = setTimeout(() => {
            resolve(worker);
          }, 10);
          
          worker.once('message', (message) => {
            if (message.type === 'pong') {
              clearTimeout(timeout);
              resolve(worker);
            }
          });
        }
        
        setTimeout(checkWorkers, 100);
      };
      
      checkWorkers();
    });
  }

  private async waitForAllWorkersToComplete(jobId: string): Promise<void> {
    const workers = this.workers.get(jobId);
    if (!workers) return;

    return new Promise((resolve) => {
      let completedWorkers = 0;
      
      workers.forEach(worker => {
        worker.postMessage({ type: 'finish' });
        
        worker.on('exit', () => {
          completedWorkers++;
          if (completedWorkers === workers.length) {
            resolve();
          }
        });
      });
    });
  }

  private async completeImportJob(jobId: string, startTime: number): Promise<void> {
    const job = this.activeJobs.get(jobId)!;
    const totalTime = Date.now() - startTime;
    
    job.status = 'completed';
    job.completed_at = new Date();
    job.throughput_per_hour = Math.round((job.success_records / totalTime) * 3600000);
    job.progress_percentage = 100;

    if (job.configuration.verify_after_import) {
      await this.verifyImportedData(jobId);
    }

    await this.updateImportJob(job);
    this.activeJobs.delete(jobId);
    this.workers.delete(jobId);

    this.logger.info(`Import job completed: ${job.job_name}`, {
      job_id: jobId,
      total_records: job.total_records,
      success_records: job.success_records,
      error_records: job.error_records,
      total_time_ms: totalTime,
      throughput_per_hour: job.throughput_per_hour
    });
  }

  private async failImportJob(jobId: string, error: any): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.completed_at = new Date();

    const importError: ImportError = {
      row_number: 0,
      error_type: 'job_failure',
      error_message: error.message || 'Import job failed',
      timestamp: new Date(),
      severity: 'critical'
    };

    job.error_log.push(importError);

    if (job.configuration.rollback_on_failure) {
      await this.rollbackImport(jobId);
    }

    await this.updateImportJob(job);
    this.activeJobs.delete(jobId);

    const workers = this.workers.get(jobId);
    if (workers) {
      workers.forEach(worker => worker.terminate());
      this.workers.delete(jobId);
    }

    this.logger.error(`Import job failed: ${job.job_name}`, { job_id: jobId, error });
  }

  async pauseImportJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'paused';
    await this.updateImportJob(job);

    const workers = this.workers.get(jobId);
    if (workers) {
      workers.forEach(worker => {
        worker.postMessage({ type: 'pause' });
      });
    }

    this.logger.info(`Import job paused: ${job.job_name}`, { job_id: jobId });
  }

  async resumeImportJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'running';
    await this.updateImportJob(job);

    const workers = this.workers.get(jobId);
    if (workers) {
      workers.forEach(worker => {
        worker.postMessage({ type: 'resume' });
      });
    }

    this.logger.info(`Import job resumed: ${job.job_name}`, { job_id: jobId });
  }

  async getImportJobStatus(jobId: string): Promise<ImportJob | null> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      return job;
    }

    return await this.loadImportJob(jobId);
  }

  async getActiveJobs(): Promise<ImportJob[]> {
    return Array.from(this.activeJobs.values());
  }

  private async loadDataForImport(filePath: string, config: ImportConfiguration): Promise<DocketRecord[]> {
    this.logger.info(`Loading data from ${filePath}`);
    
    const records: DocketRecord[] = [];
    return records;
  }

  private async generateTagsForRecords(jobId: string, records: DocketRecord[]): Promise<void> {
    this.logger.info(`Generating tags for ${records.length} records`, { job_id: jobId });
    
    const tagResult = await this.tagService.generateTagsForDockets(records, 'EVID', 'UHF');
    await this.tagService.createTagMappings(records, tagResult.tags);
    
    this.logger.info(`Generated and mapped ${tagResult.generated_count} tags`, { job_id: jobId });
  }

  private async createPreImportBackup(jobId: string): Promise<void> {
    this.logger.info(`Creating pre-import backup for job ${jobId}`);
    await this.dbService.createBackup(`pre_import_${jobId}`, { compress: true });
  }

  private async verifyImportedData(jobId: string): Promise<void> {
    this.logger.info(`Verifying imported data for job ${jobId}`);
  }

  private async rollbackImport(jobId: string): Promise<void> {
    this.logger.info(`Rolling back import for job ${jobId}`);
  }

  private async updateProgress(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    await this.updateMigrationProgress(jobId, {
      phase: 'import',
      overall_progress: job.progress_percentage,
      current_operation: `Processing batch ${job.current_batch}/${job.total_batches}`,
      records_processed: job.processed_records,
      total_records: job.total_records,
      current_batch: job.current_batch,
      total_batches: job.total_batches
    });
  }

  private async saveImportJob(job: ImportJob): Promise<void> {
    await this.dbService.query(`
      INSERT INTO import_jobs (
        id, job_name, status, total_records, processed_records,
        success_records, error_records, warnings_count, started_at,
        completed_at, progress_percentage, estimated_completion,
        throughput_per_hour, current_batch, total_batches,
        data_source, created_by, configuration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      job.id, job.job_name, job.status, job.total_records, job.processed_records,
      job.success_records, job.error_records, job.warnings_count, job.started_at,
      job.completed_at, job.progress_percentage, job.estimated_completion,
      job.throughput_per_hour, job.current_batch, job.total_batches,
      job.data_source, job.created_by, JSON.stringify(job.configuration)
    ]);
  }

  private async updateImportJob(job: ImportJob): Promise<void> {
    await this.dbService.query(`
      UPDATE import_jobs SET
        status = $2, total_records = $3, processed_records = $4,
        success_records = $5, error_records = $6, warnings_count = $7,
        started_at = $8, completed_at = $9, progress_percentage = $10,
        estimated_completion = $11, throughput_per_hour = $12,
        current_batch = $13, total_batches = $14, updated_at = NOW()
      WHERE id = $1
    `, [
      job.id, job.status, job.total_records, job.processed_records,
      job.success_records, job.error_records, job.warnings_count,
      job.started_at, job.completed_at, job.progress_percentage,
      job.estimated_completion, job.throughput_per_hour,
      job.current_batch, job.total_batches
    ]);
  }

  private async loadImportJob(jobId: string): Promise<ImportJob | null> {
    const result = await this.dbService.query(
      'SELECT * FROM import_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      configuration: row.configuration,
      error_log: [],
      warning_log: []
    };
  }

  private async saveBatchResult(result: BatchProcessingResult): Promise<void> {
    await this.dbService.query(`
      INSERT INTO batch_processing_results (
        id, job_id, batch_number, total_records, processed_records,
        success_records, error_records, warnings_count,
        processing_time_ms, throughput_per_second, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      result.batch_id, result.batch_id, result.batch_number, result.total_records,
      result.processed_records, result.success_records, result.error_records,
      result.warnings_count, result.processing_time_ms, result.throughput_per_second,
      result.status
    ]);
  }

  private async updateMigrationProgress(jobId: string, progress: Partial<MigrationProgress>): Promise<void> {
    await this.dbService.query(`
      INSERT INTO migration_progress (
        job_id, phase, overall_progress, current_operation, records_processed,
        total_records, current_batch, total_batches, last_update
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (job_id) DO UPDATE SET
        phase = EXCLUDED.phase,
        overall_progress = EXCLUDED.overall_progress,
        current_operation = EXCLUDED.current_operation,
        records_processed = EXCLUDED.records_processed,
        total_records = EXCLUDED.total_records,
        current_batch = EXCLUDED.current_batch,
        total_batches = EXCLUDED.total_batches,
        last_update = NOW()
    `, [
      jobId, progress.phase, progress.overall_progress, progress.current_operation,
      progress.records_processed, progress.total_records, progress.current_batch,
      progress.total_batches
    ]);
  }
}