import { 
  DocketRecord, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning 
} from '@/types';
import { Logger } from '@/utils/Logger';

export class DataValidator {
  private logger: Logger;
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  constructor() {
    this.logger = new Logger('DataValidator');
  }

  async validateRecord(record: DocketRecord, rowNumber: number): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];

    this.validateRequiredFields(record, rowNumber);
    this.validateFieldFormats(record, rowNumber);
    this.validateFieldLengths(record, rowNumber);
    this.validateBusinessRules(record, rowNumber);
    this.validateDataTypes(record, rowNumber);

    return {
      is_valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      record_count: 1,
      duplicate_count: 0,
      missing_required_fields: this.getMissingRequiredFields(record),
      suggested_fixes: this.generateSuggestedFixes()
    };
  }

  async validateBatch(records: DocketRecord[]): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];
    let duplicateCount = 0;

    const docketNumbers = new Set<string>();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1;

      await this.validateRecord(record, rowNumber);

      if (docketNumbers.has(record.docket_number.toLowerCase())) {
        duplicateCount++;
        this.addError(rowNumber, 'docket_number', record.docket_number, 
          'duplicate', 'Duplicate docket number found in batch', 'error');
      } else {
        docketNumbers.add(record.docket_number.toLowerCase());
      }
    }

    return {
      is_valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      record_count: records.length,
      duplicate_count: duplicateCount,
      missing_required_fields: [],
      suggested_fixes: this.generateSuggestedFixes()
    };
  }

  private validateRequiredFields(record: DocketRecord, rowNumber: number): void {
    const requiredFields = [
      { field: 'docket_number', value: record.docket_number },
      { field: 'evidence_type', value: record.evidence_type },
      { field: 'description', value: record.description },
      { field: 'date_collected', value: record.date_collected },
      { field: 'collected_by', value: record.collected_by },
      { field: 'status', value: record.status },
      { field: 'priority_level', value: record.priority_level }
    ];

    for (const { field, value } of requiredFields) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        this.addError(rowNumber, field, value || '', 'required', 
          `${field} is required and cannot be empty`, 'error');
      }
    }
  }

  private validateFieldFormats(record: DocketRecord, rowNumber: number): void {
    if (record.docket_number) {
      if (!/^[A-Z0-9-_]+$/i.test(record.docket_number)) {
        this.addError(rowNumber, 'docket_number', record.docket_number, 
          'format', 'Docket number can only contain letters, numbers, hyphens, and underscores', 'error');
      }

      if (record.docket_number.length < 3 || record.docket_number.length > 50) {
        this.addError(rowNumber, 'docket_number', record.docket_number, 
          'length', 'Docket number must be between 3 and 50 characters', 'error');
      }
    }

    if (record.case_number && !/^[A-Z0-9-_/]+$/i.test(record.case_number)) {
      this.addWarning(rowNumber, 'case_number', record.case_number, 
        'format', 'Case number contains unexpected characters');
    }

    if (record.date_collected) {
      const date = new Date(record.date_collected);
      if (isNaN(date.getTime())) {
        this.addError(rowNumber, 'date_collected', record.date_collected, 
          'format', 'Invalid date format', 'error');
      } else {
        const now = new Date();
        const futureLimit = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        if (date > futureLimit) {
          this.addError(rowNumber, 'date_collected', record.date_collected, 
            'logical', 'Collection date cannot be more than 7 days in the future', 'error');
        }

        const pastLimit = new Date('1900-01-01');
        if (date < pastLimit) {
          this.addError(rowNumber, 'date_collected', record.date_collected, 
            'logical', 'Collection date cannot be before 1900', 'error');
        }
      }
    }

    if (record.status && !['active', 'archived', 'destroyed'].includes(record.status)) {
      this.addError(rowNumber, 'status', record.status, 
        'value', 'Status must be one of: active, archived, destroyed', 'error');
    }

    if (record.priority_level && !['low', 'normal', 'high', 'critical'].includes(record.priority_level)) {
      this.addError(rowNumber, 'priority_level', record.priority_level, 
        'value', 'Priority level must be one of: low, normal, high, critical', 'error');
    }
  }

  private validateFieldLengths(record: DocketRecord, rowNumber: number): void {
    const fieldLimits = [
      { field: 'docket_number', value: record.docket_number, max: 50 },
      { field: 'case_number', value: record.case_number, max: 50 },
      { field: 'evidence_type', value: record.evidence_type, max: 100 },
      { field: 'description', value: record.description, max: 1000 },
      { field: 'location_found', value: record.location_found, max: 200 },
      { field: 'collected_by', value: record.collected_by, max: 100 },
      { field: 'department', value: record.department, max: 100 },
      { field: 'case_officer', value: record.case_officer, max: 100 },
      { field: 'forensic_notes', value: record.forensic_notes, max: 2000 },
      { field: 'storage_requirements', value: record.storage_requirements, max: 500 }
    ];

    for (const { field, value, max } of fieldLimits) {
      if (value && value.length > max) {
        this.addError(rowNumber, field, value, 'length', 
          `${field} exceeds maximum length of ${max} characters`, 'error');
      }
    }

    if (record.description && record.description.length < 10) {
      this.addWarning(rowNumber, 'description', record.description, 
        'length', 'Description is very short, consider adding more detail');
    }
  }

  private validateBusinessRules(record: DocketRecord, rowNumber: number): void {
    if (record.status === 'destroyed' && record.priority_level === 'critical') {
      this.addWarning(rowNumber, 'status', record.status, 
        'business_rule', 'Critical evidence marked as destroyed - verify this is correct');
    }

    if (record.collected_by && record.case_officer && 
        record.collected_by.toLowerCase() === record.case_officer.toLowerCase()) {
      this.addWarning(rowNumber, 'collected_by', record.collected_by, 
        'business_rule', 'Same person listed as both collector and case officer');
    }

    if (record.evidence_type) {
      const suspiciousTypes = ['weapon', 'firearm', 'explosive', 'drug', 'narcotic'];
      const isSuspicious = suspiciousTypes.some(type => 
        record.evidence_type.toLowerCase().includes(type));
      
      if (isSuspicious && record.priority_level === 'low') {
        this.addWarning(rowNumber, 'priority_level', record.priority_level, 
          'business_rule', 'Sensitive evidence type with low priority - verify classification');
      }
    }

    if (record.date_collected) {
      const collectionDate = new Date(record.date_collected);
      const daysSinceCollection = (Date.now() - collectionDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCollection > 365 * 5) {
        this.addWarning(rowNumber, 'date_collected', record.date_collected, 
          'business_rule', 'Evidence is over 5 years old - verify retention requirements');
      }
    }
  }

  private validateDataTypes(record: DocketRecord, rowNumber: number): void {
    if (record.current_location_id !== undefined && record.current_location_id !== null) {
      if (!Number.isInteger(record.current_location_id) || record.current_location_id < 1) {
        this.addError(rowNumber, 'current_location_id', String(record.current_location_id), 
          'data_type', 'Location ID must be a positive integer', 'error');
      }
    }

    if (record.assigned_to_id !== undefined && record.assigned_to_id !== null) {
      if (!Number.isInteger(record.assigned_to_id) || record.assigned_to_id < 1) {
        this.addError(rowNumber, 'assigned_to_id', String(record.assigned_to_id), 
          'data_type', 'Assigned to ID must be a positive integer', 'error');
      }
    }

    if (record.metadata && typeof record.metadata !== 'object') {
      this.addError(rowNumber, 'metadata', String(record.metadata), 
        'data_type', 'Metadata must be a valid JSON object', 'error');
    }

    if (record.chain_of_custody && !Array.isArray(record.chain_of_custody)) {
      this.addError(rowNumber, 'chain_of_custody', String(record.chain_of_custody), 
        'data_type', 'Chain of custody must be an array', 'error');
    }
  }

  private addError(
    rowNumber: number, 
    fieldName: string, 
    fieldValue: string, 
    errorType: string, 
    message: string, 
    severity: 'error' | 'critical'
  ): void {
    this.errors.push({
      row_number: rowNumber,
      field_name: fieldName,
      field_value: fieldValue,
      error_type: errorType,
      error_message: message,
      severity
    });
  }

  private addWarning(
    rowNumber: number, 
    fieldName: string, 
    fieldValue: string, 
    warningType: string, 
    message: string,
    suggestedValue?: string
  ): void {
    this.warnings.push({
      row_number: rowNumber,
      field_name: fieldName,
      field_value: fieldValue,
      warning_type: warningType,
      warning_message: message,
      suggested_value: suggestedValue
    });
  }

  private getMissingRequiredFields(record: DocketRecord): string[] {
    const missing: string[] = [];
    
    if (!record.docket_number) missing.push('docket_number');
    if (!record.evidence_type) missing.push('evidence_type');
    if (!record.description) missing.push('description');
    if (!record.date_collected) missing.push('date_collected');
    if (!record.collected_by) missing.push('collected_by');
    if (!record.status) missing.push('status');
    if (!record.priority_level) missing.push('priority_level');
    
    return missing;
  }

  private generateSuggestedFixes(): any[] {
    const fixes: any[] = [];
    
    const formatErrors = this.errors.filter(e => e.error_type === 'format');
    if (formatErrors.length > 0) {
      fixes.push({
        issue: 'Format validation errors',
        description: 'Multiple records have format validation issues',
        fix_type: 'manual',
        affected_rows: formatErrors.length,
        fix_script: 'Review and correct field formats according to validation rules'
      });
    }
    
    const lengthErrors = this.errors.filter(e => e.error_type === 'length');
    if (lengthErrors.length > 0) {
      fixes.push({
        issue: 'Field length violations',
        description: 'Fields exceed maximum allowed length',
        fix_type: 'automatic',
        affected_rows: lengthErrors.length,
        fix_script: 'Truncate fields to maximum allowed length'
      });
    }
    
    return fixes;
  }

  validateDocketNumberFormat(docketNumber: string): boolean {
    return /^[A-Z0-9-_]{3,50}$/i.test(docketNumber);
  }

  validateDateFormat(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  validateEmailFormat(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  sanitizeString(input: string, maxLength?: number): string {
    let sanitized = input.trim().replace(/[<>]/g, '');
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...';
    }
    
    return sanitized;
  }

  normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  }
}