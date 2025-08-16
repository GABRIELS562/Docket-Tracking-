export interface DocketRecord {
  id?: number;
  docket_number: string;
  case_number?: string;
  evidence_type: string;
  description: string;
  location_found?: string;
  date_collected: string;
  collected_by: string;
  chain_of_custody?: ChainEntry[];
  status: 'active' | 'archived' | 'destroyed';
  priority_level: 'low' | 'normal' | 'high' | 'critical';
  department?: string;
  case_officer?: string;
  forensic_notes?: string;
  storage_requirements?: string;
  rfid_tag_id?: string;
  current_location_id?: number;
  assigned_to_id?: number;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ChainEntry {
  personnel_id: number;
  personnel_name: string;
  action: string;
  location: string;
  timestamp: Date;
  notes?: string;
  digital_signature?: string;
}

export interface TagMapping {
  docket_number: string;
  rfid_tag_id: string;
  tag_type: string;
  assigned_date: Date;
  status: 'available' | 'assigned' | 'damaged' | 'lost';
}

export interface ImportJob {
  id: string;
  job_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  warnings_count: number;
  started_at?: Date;
  completed_at?: Date;
  error_log: ImportError[];
  warning_log: ImportWarning[];
  progress_percentage: number;
  estimated_completion?: Date;
  throughput_per_hour: number;
  current_batch: number;
  total_batches: number;
  data_source: string;
  created_by: string;
  configuration: ImportConfiguration;
}

export interface ImportError {
  row_number: number;
  docket_number?: string;
  error_type: string;
  error_message: string;
  field_name?: string;
  field_value?: string;
  timestamp: Date;
  severity: 'warning' | 'error' | 'critical';
}

export interface ImportWarning {
  row_number: number;
  docket_number?: string;
  warning_type: string;
  warning_message: string;
  field_name?: string;
  field_value?: string;
  suggested_fix?: string;
  timestamp: Date;
}

export interface ImportConfiguration {
  batch_size: number;
  parallel_workers: number;
  validation_level: 'strict' | 'standard' | 'lenient';
  auto_generate_tags: boolean;
  skip_duplicates: boolean;
  update_existing: boolean;
  backup_before_import: boolean;
  verify_after_import: boolean;
  rollback_on_failure: boolean;
  max_errors_per_batch: number;
  data_source_format: 'csv' | 'xlsx' | 'json' | 'sql';
  encoding: 'utf8' | 'latin1' | 'ascii';
  delimiter?: string;
  quote_char?: string;
  escape_char?: string;
  header_row: boolean;
  column_mapping: Record<string, string>;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  record_count: number;
  duplicate_count: number;
  missing_required_fields: string[];
  suggested_fixes: SuggestedFix[];
}

export interface ValidationError {
  row_number: number;
  field_name: string;
  field_value: string;
  error_type: string;
  error_message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  row_number: number;
  field_name: string;
  field_value: string;
  warning_type: string;
  warning_message: string;
  suggested_value?: string;
}

export interface SuggestedFix {
  issue: string;
  description: string;
  fix_type: 'automatic' | 'manual' | 'conditional';
  affected_rows: number;
  fix_script?: string;
}

export interface BatchProcessingResult {
  batch_id: string;
  batch_number: number;
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  warnings_count: number;
  processing_time_ms: number;
  throughput_per_second: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  status: 'completed' | 'failed' | 'partial';
}

export interface ReconciliationReport {
  job_id: string;
  total_source_records: number;
  total_imported_records: number;
  missing_records: string[];
  duplicate_records: string[];
  modified_records: string[];
  verification_passed: boolean;
  discrepancies: Discrepancy[];
  generated_at: Date;
}

export interface Discrepancy {
  docket_number: string;
  field_name: string;
  source_value: string;
  imported_value: string;
  discrepancy_type: 'missing' | 'different' | 'extra';
}

export interface DataPreparationReport {
  source_file: string;
  original_record_count: number;
  cleaned_record_count: number;
  removed_duplicates: number;
  corrected_fields: number;
  data_quality_score: number;
  preparation_time_ms: number;
  issues_found: DataIssue[];
  suggested_actions: string[];
  ready_for_import: boolean;
}

export interface DataIssue {
  issue_type: string;
  description: string;
  affected_records: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_fixable: boolean;
  fix_description?: string;
}

export interface MigrationProgress {
  phase: 'preparation' | 'validation' | 'tagging' | 'import' | 'verification' | 'completed';
  overall_progress: number;
  current_operation: string;
  records_processed: number;
  total_records: number;
  estimated_time_remaining: number;
  start_time: Date;
  last_update: Date;
  throughput_per_hour: number;
  error_rate: number;
  warnings_count: number;
  current_batch: number;
  total_batches: number;
}

export interface TagGenerationResult {
  generated_count: number;
  tag_prefix: string;
  tag_range_start: string;
  tag_range_end: string;
  generation_time_ms: number;
  tags: GeneratedTag[];
}

export interface GeneratedTag {
  tag_id: string;
  tag_type: string;
  docket_number?: string;
  status: 'available' | 'reserved' | 'assigned';
  generated_at: Date;
  batch_id: string;
}

export interface SystemHealth {
  database_connection: boolean;
  redis_connection: boolean;
  disk_space_gb: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  active_connections: number;
  import_jobs_running: number;
  last_backup: Date;
  system_status: 'healthy' | 'warning' | 'critical';
}

export interface BackupSnapshot {
  snapshot_id: string;
  snapshot_name: string;
  created_at: Date;
  record_count: number;
  file_size_mb: number;
  backup_type: 'full' | 'incremental' | 'differential';
  compression_used: boolean;
  encryption_used: boolean;
  storage_location: string;
  verification_status: 'pending' | 'verified' | 'failed';
}

export interface RollbackPlan {
  job_id: string;
  rollback_type: 'full' | 'partial' | 'point_in_time';
  target_snapshot: string;
  affected_records: number;
  rollback_script: string;
  estimated_time_minutes: number;
  prerequisites: string[];
  risks: string[];
  verification_steps: string[];
}