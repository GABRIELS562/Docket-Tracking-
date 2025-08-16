/**
 * Data Export Service
 * Handles exporting data in various formats
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from 'json2csv';
import archiver from 'archiver';

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json' | 'xml';
  dataType: 'dockets' | 'audit' | 'analytics' | 'users' | 'custom';
  filters?: any;
  columns?: string[];
  includeMetadata?: boolean;
  compress?: boolean;
}

interface ExportResult {
  filename: string;
  path: string;
  size: number;
  format: string;
  recordCount: number;
  exportDate: Date;
}

export class ExportService {
  private static instance: ExportService;
  private exportPath: string;
  private tempPath: string;

  private constructor() {
    this.exportPath = process.env.EXPORT_PATH || path.join(process.cwd(), 'exports');
    this.tempPath = path.join(this.exportPath, 'temp');
    this.initialize();
  }

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private async initialize() {
    // Create export directories
    if (!fs.existsSync(this.exportPath)) {
      fs.mkdirSync(this.exportPath, { recursive: true });
    }
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
    
    logger.info('Export service initialized');
  }

  /**
   * Export data based on options
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    logger.info(`Starting export: ${options.dataType} as ${options.format}`);
    
    try {
      // Fetch data
      const data = await this.fetchData(options);
      
      // Generate filename
      const filename = this.generateFilename(options);
      const filepath = path.join(this.exportPath, filename);
      
      // Export based on format
      let exportedFile: string;
      switch (options.format) {
        case 'csv':
          exportedFile = await this.exportCSV(data, filepath, options);
          break;
        case 'excel':
          exportedFile = await this.exportExcel(data, filepath, options);
          break;
        case 'pdf':
          exportedFile = await this.exportPDF(data, filepath, options);
          break;
        case 'json':
          exportedFile = await this.exportJSON(data, filepath, options);
          break;
        case 'xml':
          exportedFile = await this.exportXML(data, filepath, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
      
      // Compress if requested
      if (options.compress) {
        exportedFile = await this.compressFile(exportedFile);
      }
      
      // Get file stats
      const stats = fs.statSync(exportedFile);
      
      // Log export in audit trail
      await this.logExport(options, exportedFile, data.length);
      
      return {
        filename: path.basename(exportedFile),
        path: exportedFile,
        size: stats.size,
        format: options.format,
        recordCount: data.length,
        exportDate: new Date(),
      };
    } catch (error) {
      logger.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Fetch data based on export type
   */
  private async fetchData(options: ExportOptions): Promise<any[]> {
    let sql: string;
    let params: any[] = [];
    
    switch (options.dataType) {
      case 'dockets':
        sql = `
          SELECT 
            d.docket_code,
            d.title,
            d.description,
            d.category,
            d.status,
            d.rfid_tag,
            d.barcode,
            d.location,
            dept.name as department,
            u.full_name as created_by,
            d.created_at,
            d.updated_at
          FROM dockets d
          LEFT JOIN departments dept ON d.department_id = dept.id
          LEFT JOIN users u ON d.created_by = u.id
        `;
        
        if (options.filters?.status) {
          sql += ` WHERE d.status = $1`;
          params.push(options.filters.status);
        }
        
        sql += ` ORDER BY d.created_at DESC`;
        break;
        
      case 'audit':
        sql = `
          SELECT 
            al.event_id,
            al.timestamp,
            al.action_type,
            al.resource_type,
            al.resource_id,
            al.description,
            al.category,
            al.severity,
            al.ip_address,
            al.user_agent,
            u.full_name as user_name,
            u.email as user_email
          FROM audit_logs al
          LEFT JOIN users u ON al.user_id = u.id
        `;
        
        if (options.filters?.dateRange) {
          sql += ` WHERE al.timestamp BETWEEN $1 AND $2`;
          params.push(options.filters.dateRange.start, options.filters.dateRange.end);
        }
        
        sql += ` ORDER BY al.timestamp DESC`;
        break;
        
      case 'analytics':
        sql = `
          SELECT 
            metric_date,
            metric_type,
            metric_value,
            department_code,
            category
          FROM analytics_metrics
        `;
        
        if (options.filters?.metricType) {
          sql += ` WHERE metric_type = $1`;
          params.push(options.filters.metricType);
        }
        
        sql += ` ORDER BY metric_date DESC`;
        break;
        
      case 'users':
        sql = `
          SELECT 
            u.id,
            u.email,
            u.full_name,
            u.department,
            u.is_active,
            u.is_admin,
            u.created_at,
            u.last_login,
            COUNT(DISTINCT d.id) as dockets_created,
            COUNT(DISTINCT rr.id) as retrieval_requests
          FROM users u
          LEFT JOIN dockets d ON d.created_by = u.id
          LEFT JOIN retrieval_requests rr ON rr.requested_by = u.id
          GROUP BY u.id
        `;
        break;
        
      case 'custom':
        if (!options.filters?.sql) {
          throw new Error('Custom export requires SQL query');
        }
        sql = options.filters.sql;
        params = options.filters.params || [];
        break;
        
      default:
        throw new Error(`Unknown data type: ${options.dataType}`);
    }
    
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Export to CSV format
   */
  private async exportCSV(data: any[], filepath: string, options: ExportOptions): Promise<string> {
    const filename = filepath + '.csv';
    
    if (data.length === 0) {
      fs.writeFileSync(filename, 'No data to export');
      return filename;
    }
    
    // Get fields from first record or use specified columns
    const fields = options.columns || Object.keys(data[0]);
    
    // Create CSV parser
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    
    // Add metadata if requested
    let content = csv;
    if (options.includeMetadata) {
      const metadata = [
        `# Export Date: ${new Date().toISOString()}`,
        `# Data Type: ${options.dataType}`,
        `# Record Count: ${data.length}`,
        `# Filters: ${JSON.stringify(options.filters || {})}`,
        '',
      ].join('\n');
      content = metadata + content;
    }
    
    fs.writeFileSync(filename, content);
    logger.info(`CSV export completed: ${filename}`);
    
    return filename;
  }

  /**
   * Export to Excel format (using CSV for simplicity)
   */
  private async exportExcel(data: any[], filepath: string, options: ExportOptions): Promise<string> {
    // In production, use xlsx library for proper Excel format
    // For now, export as CSV with .xlsx extension
    const csvFile = await this.exportCSV(data, filepath, options);
    const xlsxFile = csvFile.replace('.csv', '.xlsx');
    
    // In production: Convert CSV to proper Excel format
    fs.renameSync(csvFile, xlsxFile);
    
    logger.info(`Excel export completed: ${xlsxFile}`);
    return xlsxFile;
  }

  /**
   * Export to PDF format
   */
  private async exportPDF(data: any[], filepath: string, options: ExportOptions): Promise<string> {
    const filename = filepath + '.pdf';
    
    // In production, use pdfkit or similar library
    // For now, create a simple text representation
    const content = this.generatePDFContent(data, options);
    
    fs.writeFileSync(filename, content);
    logger.info(`PDF export completed: ${filename}`);
    
    return filename;
  }

  /**
   * Generate PDF content (simplified)
   */
  private generatePDFContent(data: any[], options: ExportOptions): string {
    const lines: string[] = [];
    
    // Header
    lines.push('=' .repeat(80));
    lines.push(`RFID DOCKET TRACKING SYSTEM - DATA EXPORT`);
    lines.push('=' .repeat(80));
    lines.push('');
    lines.push(`Export Date: ${new Date().toISOString()}`);
    lines.push(`Data Type: ${options.dataType.toUpperCase()}`);
    lines.push(`Total Records: ${data.length}`);
    lines.push('');
    lines.push('-' .repeat(80));
    lines.push('');
    
    // Data
    data.forEach((record, index) => {
      lines.push(`Record #${index + 1}`);
      lines.push('-' .repeat(40));
      
      Object.entries(record).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          lines.push(`${key}: ${value}`);
        }
      });
      
      lines.push('');
    });
    
    // Footer
    lines.push('-' .repeat(80));
    lines.push('End of Report');
    lines.push('© 2025 RFID Docket Tracking System');
    
    return lines.join('\n');
  }

  /**
   * Export to JSON format
   */
  private async exportJSON(data: any[], filepath: string, options: ExportOptions): Promise<string> {
    const filename = filepath + '.json';
    
    const exportData: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        dataType: options.dataType,
        recordCount: data.length,
        filters: options.filters || {},
      },
      data: data,
    };
    
    if (!options.includeMetadata) {
      delete exportData.metadata;
    }
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    logger.info(`JSON export completed: ${filename}`);
    
    return filename;
  }

  /**
   * Export to XML format
   */
  private async exportXML(data: any[], filepath: string, options: ExportOptions): Promise<string> {
    const filename = filepath + '.xml';
    
    const xml = this.jsonToXML({
      root: {
        metadata: options.includeMetadata ? {
          exportDate: new Date().toISOString(),
          dataType: options.dataType,
          recordCount: data.length,
        } : undefined,
        records: data,
      },
    });
    
    fs.writeFileSync(filename, xml);
    logger.info(`XML export completed: ${filename}`);
    
    return filename;
  }

  /**
   * Convert JSON to XML (simplified)
   */
  private jsonToXML(obj: any, indent: string = ''): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    const convert = (data: any, key: string, level: string): string => {
      let result = '';
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          result += `${level}<${key}>\n`;
          result += convert(item, '', level + '  ');
          result += `${level}</${key}>\n`;
        });
      } else if (typeof data === 'object' && data !== null) {
        if (key) {
          result += `${level}<${key}>\n`;
        }
        
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined) {
            result += convert(v, k, key ? level + '  ' : level);
          }
        });
        
        if (key) {
          result += `${level}</${key}>\n`;
        }
      } else {
        result += `${level}<${key}>${this.escapeXML(String(data))}</${key}>\n`;
      }
      
      return result;
    };
    
    xml += convert(obj, '', '');
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Compress file
   */
  private async compressFile(filepath: string): Promise<string> {
    const output = filepath + '.zip';
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(output);
    
    return new Promise((resolve, reject) => {
      stream.on('close', () => {
        // Delete original file
        fs.unlinkSync(filepath);
        logger.info(`File compressed: ${output}`);
        resolve(output);
      });
      
      archive.on('error', reject);
      archive.pipe(stream);
      archive.file(filepath, { name: path.basename(filepath) });
      archive.finalize();
    });
  }

  /**
   * Generate filename
   */
  private generateFilename(options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${options.dataType}_export_${timestamp}`;
  }

  /**
   * Log export in audit trail
   */
  private async logExport(options: ExportOptions, filepath: string, recordCount: number): Promise<void> {
    try {
      await query(`
        INSERT INTO audit_logs (
          action_type, resource_type, description, category, severity
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'DATA_EXPORT',
        options.dataType,
        `Exported ${recordCount} ${options.dataType} records as ${options.format}`,
        'DATA_ACCESS',
        'INFO',
      ]);
    } catch (error) {
      logger.error('Failed to log export:', error);
    }
  }

  /**
   * Schedule automatic exports
   */
  async scheduleExport(schedule: string, options: ExportOptions): Promise<void> {
    // In production, use node-cron or similar
    logger.info(`Export scheduled: ${schedule}`);
  }

  /**
   * Get export history
   */
  async getExportHistory(limit: number = 50): Promise<any[]> {
    const result = await query(`
      SELECT * FROM audit_logs
      WHERE action_type = 'DATA_EXPORT'
      ORDER BY timestamp DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  /**
   * Clean old exports
   */
  async cleanOldExports(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const files = fs.readdirSync(this.exportPath);
    let deleted = 0;
    
    for (const file of files) {
      const filepath = path.join(this.exportPath, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtimeMs < cutoffDate) {
        fs.unlinkSync(filepath);
        deleted++;
      }
    }
    
    logger.info(`Cleaned ${deleted} old export files`);
  }
}

export default ExportService;