import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Transform, Readable } from 'stream';
import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { io } from '../server';

interface ImportRecord {
  object_code: string;
  name: string;
  description?: string;
  object_type?: string;
  category?: string;
  priority_level?: string;
  status?: string;
  rfid_tag_id: string;
  location?: string;
  assigned_to?: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
}

export class ImportService {
  private batchSize: number;
  private queue: PQueue;
  private duplicateCache: Set<string> = new Set();

  constructor() {
    this.batchSize = parseInt(process.env.BATCH_SIZE || '5000');
    this.queue = new PQueue({
      concurrency: parseInt(process.env.MAX_CONCURRENT_BATCHES || '3')
    });
  }

  async createImportJob(
    filename: string,
    filePath: string,
    fileSize: number,
    userId: number = 1
  ): Promise<number> {
    const result = await DatabaseService.query(
      `INSERT INTO import_jobs (filename, file_path, file_size, status, created_by_id)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING id`,
      [filename, filePath, fileSize, userId]
    );
    
    return result.rows[0].id;
  }

  async processFile(jobId: number, filePath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.updateJobStatus(jobId, 'processing', { started_at: new Date() });
      
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.csv') {
        await this.processCSV(jobId, filePath);
      } else if (['.xlsx', '.xls'].includes(ext)) {
        await this.processExcel(jobId, filePath);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
      
      const processingTime = Date.now() - startTime;
      await this.updateJobStatus(jobId, 'completed', {
        completed_at: new Date(),
        processing_time_ms: processingTime
      });
      
      logger.info(`Import job ${jobId} completed in ${processingTime}ms`);
      
    } catch (error: any) {
      logger.error(`Import job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', {
        error_log: [{ message: error.message, timestamp: new Date() }]
      });
      throw error;
    } finally {
      this.duplicateCache.clear();
    }
  }

  private async processCSV(jobId: number, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let rowNumber = 0;
      let batch: ImportRecord[] = [];
      let totalRows = 0;
      
      const batchProcessor = new Transform({
        objectMode: true,
        async transform(record: ImportRecord, encoding, callback) {
          rowNumber++;
          batch.push(record);
          
          if (batch.length >= this.batchSize) {
            const currentBatch = [...batch];
            const startRow = rowNumber - currentBatch.length + 1;
            batch = [];
            
            try {
              await this.processBatch(jobId, currentBatch, startRow);
              callback();
            } catch (error) {
              callback(error as Error);
            }
          } else {
            callback();
          }
        },
        async flush(callback) {
          if (batch.length > 0) {
            const startRow = rowNumber - batch.length + 1;
            try {
              await this.processBatch(jobId, batch, startRow);
              callback();
            } catch (error) {
              callback(error as Error);
            }
          } else {
            callback();
          }
        }
      });
      
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .pipe(batchProcessor);
      
      stream.on('finish', () => {
        logger.info(`CSV processing completed for job ${jobId}: ${rowNumber} rows`);
        resolve();
      });
      
      stream.on('error', (error) => {
        logger.error(`CSV processing error for job ${jobId}:`, error);
        reject(error);
      });
    });
  }

  private async processExcel(jobId: number, filePath: string): Promise<void> {
    const workbook = XLSX.readFile(filePath, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ImportRecord>(worksheet);
    
    logger.info(`Processing Excel file with ${jsonData.length} rows`);
    
    const batches = [];
    for (let i = 0; i < jsonData.length; i += this.batchSize) {
      batches.push(jsonData.slice(i, i + this.batchSize));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const startRow = i * this.batchSize + 1;
      await this.processBatch(jobId, batches[i], startRow);
    }
  }

  private async processBatch(
    jobId: number,
    records: ImportRecord[],
    startRow: number
  ): Promise<void> {
    const batchResult: BatchResult = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const validRecords: Array<{ record: ImportRecord; row: number }> = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = startRow + i;
      
      const validation = this.validateRecord(record);
      if (!validation.isValid) {
        batchResult.failed++;
        batchResult.errors.push({
          row: rowNumber,
          error: validation.errors.join('; '),
          data: record
        });
        continue;
      }
      
      if (await this.isDuplicate(record)) {
        batchResult.failed++;
        batchResult.errors.push({
          row: rowNumber,
          error: `Duplicate object_code or rfid_tag_id: ${record.object_code}`,
          data: record
        });
        continue;
      }
      
      validRecords.push({ record, row: rowNumber });
    }
    
    if (validRecords.length > 0) {
      try {
        await this.insertRecords(validRecords.map(v => v.record));
        batchResult.successful = validRecords.length;
        
        for (const { record } of validRecords) {
          this.duplicateCache.add(record.object_code);
          this.duplicateCache.add(record.rfid_tag_id);
        }
      } catch (error: any) {
        logger.error(`Batch insert error:`, error);
        batchResult.failed += validRecords.length;
        for (const { row } of validRecords) {
          batchResult.errors.push({
            row,
            error: 'Database insertion failed'
          });
        }
      }
    }
    
    await this.updateJobProgress(jobId, records.length, batchResult);
    
    this.emitProgress(jobId);
  }

  private validateRecord(record: ImportRecord): ValidationResult {
    const errors: string[] = [];
    
    if (!record.object_code || record.object_code.trim() === '') {
      errors.push('object_code is required');
    }
    
    if (!record.name || record.name.trim() === '') {
      errors.push('name is required');
    }
    
    if (!record.rfid_tag_id || record.rfid_tag_id.trim() === '') {
      errors.push('rfid_tag_id is required');
    }
    
    const validPriorities = ['low', 'normal', 'high', 'critical'];
    if (record.priority_level && !validPriorities.includes(record.priority_level.toLowerCase())) {
      errors.push(`Invalid priority_level. Must be one of: ${validPriorities.join(', ')}`);
    }
    
    const validStatuses = ['active', 'inactive', 'archived', 'lost'];
    if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async isDuplicate(record: ImportRecord): Promise<boolean> {
    if (this.duplicateCache.has(record.object_code) || 
        this.duplicateCache.has(record.rfid_tag_id)) {
      return true;
    }
    
    if (process.env.ENABLE_DUPLICATE_CHECK === 'false') {
      return false;
    }
    
    const result = await DatabaseService.query(
      'SELECT 1 FROM objects WHERE object_code = $1 OR rfid_tag_id = $2 LIMIT 1',
      [record.object_code, record.rfid_tag_id]
    );
    
    return result.rows.length > 0;
  }

  private async insertRecords(records: ImportRecord[]): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;
    
    for (const record of records) {
      const metadata = { ...record };
      delete metadata.object_code;
      delete metadata.name;
      delete metadata.description;
      delete metadata.object_type;
      delete metadata.category;
      delete metadata.priority_level;
      delete metadata.status;
      delete metadata.rfid_tag_id;
      
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 
          $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, 
          $${paramIndex + 8}::jsonb, NOW())`
      );
      
      values.push(
        record.object_code,
        record.name,
        record.description || null,
        record.object_type || 'docket',
        record.category || null,
        record.priority_level || 'normal',
        record.status || 'active',
        record.rfid_tag_id,
        JSON.stringify(metadata)
      );
      
      paramIndex += 9;
    }
    
    const query = `
      INSERT INTO objects (
        object_code, name, description, object_type, category,
        priority_level, status, rfid_tag_id, metadata, created_at
      ) VALUES ${placeholders.join(', ')}
    `;
    
    await DatabaseService.query(query, values);
  }

  private async updateJobProgress(
    jobId: number,
    processedCount: number,
    batchResult: BatchResult
  ): Promise<void> {
    await DatabaseService.query(
      `UPDATE import_jobs 
       SET processed_records = processed_records + $1,
           successful_records = successful_records + $2,
           failed_records = failed_records + $3,
           total_records = GREATEST(total_records, processed_records + $1)
       WHERE id = $4`,
      [processedCount, batchResult.successful, batchResult.failed, jobId]
    );
    
    if (batchResult.errors.length > 0) {
      for (const error of batchResult.errors) {
        await DatabaseService.query(
          `INSERT INTO import_errors (job_id, row_number, error_type, error_message, row_data)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [jobId, error.row, 'validation', error.error, JSON.stringify(error.data || {})]
        );
      }
    }
  }

  private async updateJobStatus(
    jobId: number,
    status: string,
    additionalData?: any
  ): Promise<void> {
    const updates: string[] = [`status = '${status}'`];
    
    if (additionalData?.started_at) {
      updates.push(`started_at = '${additionalData.started_at.toISOString()}'`);
    }
    
    if (additionalData?.completed_at) {
      updates.push(`completed_at = '${additionalData.completed_at.toISOString()}'`);
    }
    
    if (additionalData?.processing_time_ms) {
      updates.push(`processing_time_ms = ${additionalData.processing_time_ms}`);
    }
    
    if (additionalData?.error_log) {
      updates.push(`error_log = '${JSON.stringify(additionalData.error_log)}'::jsonb`);
    }
    
    await DatabaseService.query(
      `UPDATE import_jobs SET ${updates.join(', ')} WHERE id = $1`,
      [jobId]
    );
  }

  private async emitProgress(jobId: number): Promise<void> {
    const result = await DatabaseService.query(
      'SELECT * FROM get_import_progress($1)',
      [jobId]
    );
    
    if (result.rows.length > 0) {
      io.to(`import-${jobId}`).emit('import-progress', result.rows[0]);
    }
  }

  async getJobStatus(jobId: number): Promise<any> {
    const result = await DatabaseService.query(
      `SELECT j.*, 
              (SELECT COUNT(*) FROM import_errors WHERE job_id = j.id) as error_count
       FROM import_jobs j 
       WHERE j.id = $1`,
      [jobId]
    );
    
    return result.rows[0] || null;
  }

  async getJobErrors(jobId: number, limit: number = 100): Promise<any[]> {
    const result = await DatabaseService.query(
      `SELECT * FROM import_errors 
       WHERE job_id = $1 
       ORDER BY row_number 
       LIMIT $2`,
      [jobId, limit]
    );
    
    return result.rows;
  }

  async resumeJob(jobId: number): Promise<void> {
    const job = await this.getJobStatus(jobId);
    
    if (!job || job.status !== 'paused') {
      throw new Error('Job cannot be resumed');
    }
    
    await this.processFile(jobId, job.file_path);
  }

  async pauseJob(jobId: number): Promise<void> {
    await this.updateJobStatus(jobId, 'paused', {});
  }
}

export default new ImportService();