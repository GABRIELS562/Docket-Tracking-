import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import * as xlsx from 'xlsx';
import { 
  DocketRecord, 
  DataPreparationReport, 
  DataIssue, 
  ValidationResult,
  ImportConfiguration 
} from '@/types';
import { Logger } from '@/utils/Logger';
import { DataValidator } from '@/validators/DataValidator';

export class DataPreparationService {
  private logger: Logger;
  private validator: DataValidator;

  constructor() {
    this.logger = new Logger('DataPreparationService');
    this.validator = new DataValidator();
  }

  async prepareDataFromFile(
    sourceFilePath: string,
    outputPath: string,
    config: ImportConfiguration
  ): Promise<DataPreparationReport> {
    const startTime = Date.now();
    this.logger.info(`Starting data preparation from ${sourceFilePath}`);

    try {
      const records = await this.loadDataFromFile(sourceFilePath, config);
      const originalCount = records.length;

      this.logger.info(`Loaded ${originalCount} records from source file`);

      const cleanedRecords = await this.cleanAndValidateRecords(records, config);
      const deduplicatedRecords = this.removeDuplicates(cleanedRecords);
      const normalizedRecords = this.normalizeData(deduplicatedRecords);

      await this.saveCleanedData(normalizedRecords, outputPath, config);

      const processingTime = Date.now() - startTime;
      const duplicatesRemoved = cleanedRecords.length - deduplicatedRecords.length;

      const report: DataPreparationReport = {
        source_file: sourceFilePath,
        original_record_count: originalCount,
        cleaned_record_count: normalizedRecords.length,
        removed_duplicates: duplicatesRemoved,
        corrected_fields: this.getCorrectedFieldsCount(),
        data_quality_score: this.calculateDataQualityScore(normalizedRecords),
        preparation_time_ms: processingTime,
        issues_found: this.getFoundIssues(),
        suggested_actions: this.getSuggestedActions(normalizedRecords),
        ready_for_import: this.isReadyForImport(normalizedRecords)
      };

      this.logger.info(`Data preparation completed in ${processingTime}ms`);
      return report;

    } catch (error) {
      this.logger.error('Error during data preparation:', error);
      throw error;
    }
  }

  private async loadDataFromFile(
    filePath: string, 
    config: ImportConfiguration
  ): Promise<DocketRecord[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.csv':
        return this.loadFromCSV(filePath, config);
      case '.xlsx':
      case '.xls':
        return this.loadFromExcel(filePath, config);
      case '.json':
        return this.loadFromJSON(filePath);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  private async loadFromCSV(
    filePath: string, 
    config: ImportConfiguration
  ): Promise<DocketRecord[]> {
    return new Promise((resolve, reject) => {
      const records: DocketRecord[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv({
          separator: config.delimiter || ',',
          quote: config.quote_char || '"',
          escape: config.escape_char || '"',
          headers: config.header_row,
          skipEmptyLines: true
        }))
        .on('data', (row) => {
          try {
            const mappedRecord = this.mapRowToRecord(row, config.column_mapping);
            records.push(mappedRecord);
          } catch (error) {
            this.logger.warn(`Error mapping row ${records.length + 1}:`, error);
          }
        })
        .on('end', () => {
          this.logger.info(`CSV parsing completed. ${records.length} records loaded.`);
          resolve(records);
        })
        .on('error', (error) => {
          this.logger.error('CSV parsing error:', error);
          reject(error);
        });
    });
  }

  private async loadFromExcel(
    filePath: string, 
    config: ImportConfiguration
  ): Promise<DocketRecord[]> {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: config.header_row ? 1 : undefined,
        defval: '',
        blankrows: false
      });

      return jsonData.map((row: any, index: number) => {
        try {
          return this.mapRowToRecord(row, config.column_mapping);
        } catch (error) {
          this.logger.warn(`Error mapping Excel row ${index + 1}:`, error);
          return null;
        }
      }).filter(record => record !== null) as DocketRecord[];

    } catch (error) {
      this.logger.error('Excel parsing error:', error);
      throw error;
    }
  }

  private async loadFromJSON(filePath: string): Promise<DocketRecord[]> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (Array.isArray(data)) {
        return data as DocketRecord[];
      } else if (data.records && Array.isArray(data.records)) {
        return data.records as DocketRecord[];
      } else {
        throw new Error('JSON file must contain an array of records or an object with a "records" array');
      }
    } catch (error) {
      this.logger.error('JSON parsing error:', error);
      throw error;
    }
  }

  private mapRowToRecord(row: any, columnMapping: Record<string, string>): DocketRecord {
    const record: Partial<DocketRecord> = {};

    for (const [sourceColumn, targetField] of Object.entries(columnMapping)) {
      const value = row[sourceColumn];
      
      if (value !== undefined && value !== null && value !== '') {
        switch (targetField) {
          case 'docket_number':
            record.docket_number = String(value).trim();
            break;
          case 'case_number':
            record.case_number = String(value).trim();
            break;
          case 'evidence_type':
            record.evidence_type = String(value).trim();
            break;
          case 'description':
            record.description = String(value).trim();
            break;
          case 'location_found':
            record.location_found = String(value).trim();
            break;
          case 'date_collected':
            record.date_collected = this.parseDate(value);
            break;
          case 'collected_by':
            record.collected_by = String(value).trim();
            break;
          case 'status':
            record.status = this.normalizeStatus(String(value));
            break;
          case 'priority_level':
            record.priority_level = this.normalizePriority(String(value));
            break;
          case 'department':
            record.department = String(value).trim();
            break;
          case 'case_officer':
            record.case_officer = String(value).trim();
            break;
          case 'forensic_notes':
            record.forensic_notes = String(value).trim();
            break;
          case 'storage_requirements':
            record.storage_requirements = String(value).trim();
            break;
          default:
            if (!record.metadata) record.metadata = {};
            record.metadata[targetField] = value;
        }
      }
    }

    if (!record.docket_number) {
      throw new Error('Docket number is required');
    }

    return record as DocketRecord;
  }

  private parseDate(value: any): string {
    if (!value) return new Date().toISOString();
    
    try {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return date.toISOString();
      }
      
      if (typeof value === 'number') {
        const date = new Date(value);
        return date.toISOString();
      }
      
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      throw new Error('Unsupported date format');
    } catch (error) {
      this.logger.warn(`Invalid date value: ${value}, using current date`);
      return new Date().toISOString();
    }
  }

  private normalizeStatus(status: string): 'active' | 'archived' | 'destroyed' {
    const normalized = status.toLowerCase().trim();
    
    if (['active', 'current', 'open', 'in-progress'].includes(normalized)) {
      return 'active';
    }
    
    if (['archived', 'closed', 'completed', 'stored'].includes(normalized)) {
      return 'archived';
    }
    
    if (['destroyed', 'disposed', 'deleted'].includes(normalized)) {
      return 'destroyed';
    }
    
    this.logger.warn(`Unknown status: ${status}, defaulting to 'active'`);
    return 'active';
  }

  private normalizePriority(priority: string): 'low' | 'normal' | 'high' | 'critical' {
    const normalized = priority.toLowerCase().trim();
    
    if (['low', '1', 'minor'].includes(normalized)) {
      return 'low';
    }
    
    if (['normal', 'medium', '2', 'standard'].includes(normalized)) {
      return 'normal';
    }
    
    if (['high', '3', 'important', 'urgent'].includes(normalized)) {
      return 'high';
    }
    
    if (['critical', '4', 'emergency', 'highest'].includes(normalized)) {
      return 'critical';
    }
    
    this.logger.warn(`Unknown priority: ${priority}, defaulting to 'normal'`);
    return 'normal';
  }

  private async cleanAndValidateRecords(
    records: DocketRecord[],
    config: ImportConfiguration
  ): Promise<DocketRecord[]> {
    const cleanedRecords: DocketRecord[] = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const cleanedRecord = this.cleanRecord(record);
        const validation = await this.validator.validateRecord(cleanedRecord, i + 1);
        
        if (validation.is_valid || config.validation_level === 'lenient') {
          cleanedRecords.push(cleanedRecord);
        } else {
          this.logger.warn(`Record ${i + 1} failed validation:`, validation.errors);
        }
      } catch (error) {
        this.logger.error(`Error cleaning record ${i + 1}:`, error);
      }
    }
    
    return cleanedRecords;
  }

  private cleanRecord(record: DocketRecord): DocketRecord {
    const cleaned = { ...record };
    
    if (cleaned.docket_number) {
      cleaned.docket_number = cleaned.docket_number.trim().toUpperCase();
    }
    
    if (cleaned.case_number) {
      cleaned.case_number = cleaned.case_number.trim().toUpperCase();
    }
    
    if (cleaned.description) {
      cleaned.description = cleaned.description.trim();
      if (cleaned.description.length > 1000) {
        cleaned.description = cleaned.description.substring(0, 997) + '...';
      }
    }
    
    if (cleaned.forensic_notes && cleaned.forensic_notes.length > 2000) {
      cleaned.forensic_notes = cleaned.forensic_notes.substring(0, 1997) + '...';
    }
    
    return cleaned;
  }

  private removeDuplicates(records: DocketRecord[]): DocketRecord[] {
    const seen = new Set<string>();
    const unique: DocketRecord[] = [];
    
    for (const record of records) {
      const key = record.docket_number.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(record);
      } else {
        this.logger.warn(`Duplicate docket number found: ${record.docket_number}`);
      }
    }
    
    return unique;
  }

  private normalizeData(records: DocketRecord[]): DocketRecord[] {
    return records.map(record => ({
      ...record,
      created_at: new Date(),
      updated_at: new Date()
    }));
  }

  private async saveCleanedData(
    records: DocketRecord[],
    outputPath: string,
    config: ImportConfiguration
  ): Promise<void> {
    const ext = path.extname(outputPath).toLowerCase();
    
    switch (ext) {
      case '.csv':
        await this.saveAsCSV(records, outputPath);
        break;
      case '.json':
        await this.saveAsJSON(records, outputPath);
        break;
      default:
        throw new Error(`Unsupported output format: ${ext}`);
    }
  }

  private async saveAsCSV(records: DocketRecord[], outputPath: string): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'docket_number', title: 'Docket Number' },
        { id: 'case_number', title: 'Case Number' },
        { id: 'evidence_type', title: 'Evidence Type' },
        { id: 'description', title: 'Description' },
        { id: 'location_found', title: 'Location Found' },
        { id: 'date_collected', title: 'Date Collected' },
        { id: 'collected_by', title: 'Collected By' },
        { id: 'status', title: 'Status' },
        { id: 'priority_level', title: 'Priority Level' },
        { id: 'department', title: 'Department' },
        { id: 'case_officer', title: 'Case Officer' },
        { id: 'forensic_notes', title: 'Forensic Notes' },
        { id: 'storage_requirements', title: 'Storage Requirements' }
      ]
    });

    await csvWriter.writeRecords(records);
    this.logger.info(`Saved ${records.length} cleaned records to ${outputPath}`);
  }

  private async saveAsJSON(records: DocketRecord[], outputPath: string): Promise<void> {
    const data = {
      metadata: {
        total_records: records.length,
        generated_at: new Date().toISOString(),
        version: '1.0'
      },
      records
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    this.logger.info(`Saved ${records.length} cleaned records to ${outputPath}`);
  }

  private getCorrectedFieldsCount(): number {
    return 0;
  }

  private calculateDataQualityScore(records: DocketRecord[]): number {
    if (records.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const record of records) {
      let recordScore = 0;
      let maxScore = 0;
      
      if (record.docket_number) recordScore += 20;
      maxScore += 20;
      
      if (record.evidence_type) recordScore += 15;
      maxScore += 15;
      
      if (record.description && record.description.length > 10) recordScore += 15;
      maxScore += 15;
      
      if (record.date_collected) recordScore += 10;
      maxScore += 10;
      
      if (record.collected_by) recordScore += 10;
      maxScore += 10;
      
      if (record.status) recordScore += 10;
      maxScore += 10;
      
      if (record.priority_level) recordScore += 5;
      maxScore += 5;
      
      if (record.department) recordScore += 5;
      maxScore += 5;
      
      if (record.case_officer) recordScore += 5;
      maxScore += 5;
      
      if (record.case_number) recordScore += 5;
      maxScore += 5;
      
      totalScore += (recordScore / maxScore) * 100;
    }
    
    return Math.round(totalScore / records.length);
  }

  private getFoundIssues(): DataIssue[] {
    return [];
  }

  private getSuggestedActions(records: DocketRecord[]): string[] {
    const actions: string[] = [];
    
    const missingDescriptions = records.filter(r => !r.description || r.description.length < 10).length;
    if (missingDescriptions > 0) {
      actions.push(`${missingDescriptions} records have insufficient descriptions`);
    }
    
    const missingOfficers = records.filter(r => !r.case_officer).length;
    if (missingOfficers > 0) {
      actions.push(`${missingOfficers} records are missing case officer assignments`);
    }
    
    const missingDepartments = records.filter(r => !r.department).length;
    if (missingDepartments > 0) {
      actions.push(`${missingDepartments} records are missing department information`);
    }
    
    return actions;
  }

  private isReadyForImport(records: DocketRecord[]): boolean {
    const requiredFieldsComplete = records.every(r => 
      r.docket_number && 
      r.evidence_type && 
      r.description && 
      r.date_collected &&
      r.collected_by
    );
    
    const qualityScore = this.calculateDataQualityScore(records);
    
    return requiredFieldsComplete && qualityScore >= 75;
  }
}