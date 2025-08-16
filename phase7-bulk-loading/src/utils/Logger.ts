import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

export class Logger {
  private logger: winston.Logger;
  private component: string;

  constructor(component: string = 'BulkLoading') {
    this.component = component;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level.toUpperCase()}] [${component}] ${message} ${metaStr}`;
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { component: this.component },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            logFormat
          )
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'migration.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'performance.log'),
          level: 'info',
          maxsize: 20 * 1024 * 1024, // 20MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      this.logger.error(message, { error });
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  logPerformance(operation: string, duration: number, recordCount?: number, additionalMeta?: any): void {
    const throughput = recordCount ? Math.round(recordCount / (duration / 1000)) : undefined;
    
    this.logger.info('Performance metric', {
      operation,
      duration_ms: duration,
      record_count: recordCount,
      throughput_per_second: throughput,
      ...additionalMeta
    });
  }

  logProgress(operation: string, current: number, total: number, startTime: Date): void {
    const elapsed = Date.now() - startTime.getTime();
    const percentage = Math.round((current / total) * 100);
    const rate = current / (elapsed / 1000);
    const eta = total > current ? Math.round((total - current) / rate) : 0;

    this.info(`Progress: ${operation}`, {
      current,
      total,
      percentage,
      rate_per_second: Math.round(rate),
      eta_seconds: eta,
      elapsed_ms: elapsed
    });
  }

  logBatchProcessing(
    batchNumber: number,
    totalBatches: number,
    batchSize: number,
    processingTime: number,
    errors: number = 0
  ): void {
    const throughput = Math.round(batchSize / (processingTime / 1000));
    
    this.info(`Batch ${batchNumber}/${totalBatches} processed`, {
      batch_number: batchNumber,
      total_batches: totalBatches,
      batch_size: batchSize,
      processing_time_ms: processingTime,
      throughput_per_second: throughput,
      errors_count: errors,
      success_rate: errors > 0 ? Math.round(((batchSize - errors) / batchSize) * 100) : 100
    });
  }

  logImportJob(
    jobId: string,
    operation: string,
    status: 'started' | 'completed' | 'failed' | 'paused',
    meta?: any
  ): void {
    this.info(`Import job ${operation}`, {
      job_id: jobId,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logDataQuality(
    operation: string,
    totalRecords: number,
    validRecords: number,
    errorRecords: number,
    warningRecords: number
  ): void {
    const qualityScore = Math.round((validRecords / totalRecords) * 100);
    
    this.info(`Data quality report: ${operation}`, {
      total_records: totalRecords,
      valid_records: validRecords,
      error_records: errorRecords,
      warning_records: warningRecords,
      quality_score_percentage: qualityScore,
      error_rate_percentage: Math.round((errorRecords / totalRecords) * 100)
    });
  }

  logSystemResource(operation: string, resources: {
    cpu_usage?: number;
    memory_usage_mb?: number;
    disk_usage_mb?: number;
    database_connections?: number;
  }): void {
    this.debug(`System resources during ${operation}`, {
      ...resources,
      timestamp: new Date().toISOString()
    });
  }

  createChildLogger(childComponent: string): Logger {
    return new Logger(`${this.component}.${childComponent}`);
  }

  setLogLevel(level: string): void {
    this.logger.level = level;
  }

  flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}