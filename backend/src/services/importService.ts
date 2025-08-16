import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { query } from '../utils/database';
import { logger } from '../utils/logger';
import { io } from '../server';

interface ImportRecord {
  object_code?: string;
  name?: string;
  description?: string;
  object_type?: string;
  category?: string;
  priority_level?: string;
  status?: string;
  rfid_tag_id?: string;
  location?: string;
  assigned_to?: string;
  [key: string]: any;
}

interface ImportJob {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  error_details: any[];
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export class ImportService {
  private batchSize: number = 5000;
  private currentJob: ImportJob | null = null;

  async createImportJob(
    filename: string,
    fileSize: number,
    userId: number
  ): Promise<number> {
    const result = await query(
      `INSERT INTO import_jobs (filename, file_size, status, started_by_id, started_at)
       VALUES ($1, $2, 'pending', $3, NOW())
       RETURNING id`,
      [filename, fileSize, userId]
    );
    
    return result.rows[0].id;
  }

  async processCSVFile(
    filePath: string,
    jobId: number,
    userId: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const records: ImportRecord[] = [];
      let rowCount = 0;
      let processedCount = 0;
      const errors: ValidationError[] = [];

      this.updateJobStatus(jobId, 'processing');

      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (data: ImportRecord) => {
          rowCount++;
          records.push(data);

          if (records.length >= this.batchSize) {
            stream.pause();
            
            try {
              const batchResult = await this.processBatch(
                records.splice(0, this.batchSize),
                jobId,
                userId,
                processedCount
              );
              
              processedCount += batchResult.processed;
              
              this.emitProgress(jobId, {
                total: rowCount,
                processed: processedCount,
                status: 'processing'
              });
              
              stream.resume();
            } catch (error) {
              logger.error(`Batch processing error: ${error}`);
              stream.destroy();
              reject(error);
            }
          }
        })
        .on('end', async () => {
          try {
            if (records.length > 0) {
              const batchResult = await this.processBatch(
                records,
                jobId,
                userId,
                processedCount
              );
              processedCount += batchResult.processed;
            }

            await this.updateJobStatus(jobId, 'completed', {
              total_records: rowCount,
              processed_records: processedCount
            });

            this.emitProgress(jobId, {
              total: rowCount,
              processed: processedCount,
              status: 'completed'
            });

            logger.info(`Import job ${jobId} completed: ${processedCount}/${rowCount} records`);
            resolve();
          } catch (error) {
            logger.error(`Final batch processing error: ${error}`);
            reject(error);
          }
        })
        .on('error', async (error) => {
          logger.error(`CSV parsing error: ${error}`);
          await this.updateJobStatus(jobId, 'failed', {
            error_details: { message: error.message }
          });
          reject(error);
        });
    });
  }

  private async processBatch(
    records: ImportRecord[],
    jobId: number,
    userId: number,
    startRow: number
  ): Promise<{ processed: number; successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = startRow + i + 1;

      try {
        const validation = this.validateRecord(record, rowNumber);
        
        if (validation.errors.length > 0) {
          failed++;
          errors.push(...validation.errors);
          continue;
        }

        const isDuplicate = await this.checkDuplicate(record);
        if (isDuplicate) {
          failed++;
          errors.push({
            row: rowNumber,
            message: `Duplicate object_code: ${record.object_code}`
          });
          continue;
        }

        await this.insertRecord(record, userId);
        successful++;

      } catch (error: any) {
        failed++;
        errors.push({
          row: rowNumber,
          message: error.message || 'Unknown error'
        });
        logger.error(`Error processing row ${rowNumber}: ${error}`);
      }
    }

    await query(
      `UPDATE import_jobs 
       SET processed_records = processed_records + $1,
           successful_records = successful_records + $2,
           failed_records = failed_records + $3,
           error_details = COALESCE(error_details, '[]'::jsonb) || $4::jsonb
       WHERE id = $5`,
      [records.length, successful, failed, JSON.stringify(errors), jobId]
    );

    return {
      processed: records.length,
      successful,
      failed
    };
  }

  private validateRecord(record: ImportRecord, rowNumber: number): { errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!record.object_code || record.object_code.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'object_code',
        value: record.object_code,
        message: 'Object code is required'
      });
    }

    if (!record.name || record.name.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'name',
        value: record.name,
        message: 'Name is required'
      });
    }

    if (!record.rfid_tag_id || record.rfid_tag_id.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'rfid_tag_id',
        value: record.rfid_tag_id,
        message: 'RFID tag ID is required'
      });
    }

    const validPriorities = ['low', 'normal', 'high', 'critical'];
    if (record.priority_level && !validPriorities.includes(record.priority_level.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'priority_level',
        value: record.priority_level,
        message: `Invalid priority level. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    const validStatuses = ['active', 'inactive', 'archived', 'lost'];
    if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'status',
        value: record.status,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    return { errors };
  }

  private async checkDuplicate(record: ImportRecord): Promise<boolean> {
    const result = await query(
      'SELECT id FROM objects WHERE object_code = $1 OR rfid_tag_id = $2',
      [record.object_code, record.rfid_tag_id]
    );
    
    return result.rows.length > 0;
  }

  private async insertRecord(record: ImportRecord, userId: number): Promise<void> {
    let locationId = null;
    if (record.location) {
      const locationResult = await query(
        'SELECT id FROM locations WHERE location_code = $1',
        [record.location]
      );
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].id;
      }
    }

    let assignedToId = null;
    if (record.assigned_to) {
      const personnelResult = await query(
        'SELECT id FROM personnel WHERE employee_id = $1',
        [record.assigned_to]
      );
      if (personnelResult.rows.length > 0) {
        assignedToId = personnelResult.rows[0].id;
      }
    }

    const metadata = { ...record };
    delete metadata.object_code;
    delete metadata.name;
    delete metadata.description;
    delete metadata.object_type;
    delete metadata.category;
    delete metadata.priority_level;
    delete metadata.status;
    delete metadata.rfid_tag_id;
    delete metadata.location;
    delete metadata.assigned_to;

    await query(
      `INSERT INTO objects (
        object_code, name, description, object_type, category,
        priority_level, status, rfid_tag_id, current_location_id,
        assigned_to_id, metadata, created_by_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        record.object_code,
        record.name,
        record.description || null,
        record.object_type || 'docket',
        record.category || null,
        record.priority_level || 'normal',
        record.status || 'active',
        record.rfid_tag_id,
        locationId,
        assignedToId,
        JSON.stringify(metadata),
        userId
      ]
    );
  }

  private async updateJobStatus(
    jobId: number,
    status: string,
    additionalData?: any
  ): Promise<void> {
    let updateQuery = `UPDATE import_jobs SET status = $1`;
    const params: any[] = [status];
    let paramIndex = 2;

    if (status === 'completed') {
      updateQuery += `, completed_at = NOW()`;
    }

    if (additionalData) {
      if (additionalData.total_records !== undefined) {
        updateQuery += `, total_records = $${paramIndex}`;
        params.push(additionalData.total_records);
        paramIndex++;
      }
      if (additionalData.processed_records !== undefined) {
        updateQuery += `, processed_records = $${paramIndex}`;
        params.push(additionalData.processed_records);
        paramIndex++;
      }
      if (additionalData.error_details !== undefined) {
        updateQuery += `, error_details = $${paramIndex}::jsonb`;
        params.push(JSON.stringify(additionalData.error_details));
        paramIndex++;
      }
    }

    updateQuery += ` WHERE id = $${paramIndex}`;
    params.push(jobId);

    await query(updateQuery, params);
  }

  private emitProgress(jobId: number, progress: any): void {
    io.emit(`import-progress-${jobId}`, progress);
  }

  async getImportJobs(limit: number = 10): Promise<ImportJob[]> {
    const result = await query(
      `SELECT id, filename, file_size, total_records, processed_records,
              successful_records, failed_records, status, error_details,
              started_at, completed_at
       FROM import_jobs
       ORDER BY started_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  }

  async getImportJobById(jobId: number): Promise<ImportJob | null> {
    const result = await query(
      `SELECT id, filename, file_size, total_records, processed_records,
              successful_records, failed_records, status, error_details,
              started_at, completed_at
       FROM import_jobs
       WHERE id = $1`,
      [jobId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async pauseImportJob(jobId: number): Promise<void> {
    await this.updateJobStatus(jobId, 'paused');
  }

  async resumeImportJob(jobId: number): Promise<void> {
    const job = await this.getImportJobById(jobId);
    if (!job || job.status !== 'paused') {
      throw new Error('Job cannot be resumed');
    }
    
    await this.updateJobStatus(jobId, 'processing');
  }
}

export default new ImportService();