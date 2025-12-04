import winston from 'winston';
import { injectable } from 'tsyringe';
import { ILogger } from '../../application/interfaces/ILogger';
import { getLoggingConfig } from '../../config';
import path from 'path';
import fs from 'fs';

/**
 * Winston Logger Implementation
 *
 * Production-grade logging with:
 * - File rotation
 * - Multiple transports (console, file, error file)
 * - Structured JSON logging
 * - Colorized console output (dev)
 * - Request correlation
 */
@injectable()
export class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor() {
    const config = getLoggingConfig();

    // Ensure log directory exists
    if (config.file.enabled) {
      const logDir = path.dirname(config.file.path);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Console format (colorized in dev)
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      config.console.colorize ? winston.format.colorize() : winston.format.uncolorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport
    if (config.console.enabled) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    }

    // File transport (production)
    if (config.file.enabled) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(config.file.path, 'combined.log'),
          format: logFormat,
          maxsize: this.parseSize(config.file.maxSize),
          maxFiles: config.file.maxFiles,
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(config.file.path, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: this.parseSize(config.file.maxSize),
          maxFiles: config.file.maxFiles,
        })
      );
    }

    // Create logger
    this.logger = winston.createLogger({
      level: config.level,
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Parse size string (e.g., "20m", "1g") to bytes
   */
  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = size.match(/^(\d+)([kmg])?$/i);
    if (!match) {
      return 10 * 1024 * 1024; // Default 10MB
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2]?.toLowerCase() || '';

    return value * (units[unit] || 1);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  fatal(message: string, meta?: Record<string, any>): void {
    // Winston doesn't have a fatal level, use error with additional context
    this.logger.error(message, { ...meta, severity: 'FATAL' });
  }

  /**
   * Get the underlying Winston logger instance
   *
   * For advanced usage and custom transports
   */
  getLogger(): winston.Logger {
    return this.logger;
  }
}
