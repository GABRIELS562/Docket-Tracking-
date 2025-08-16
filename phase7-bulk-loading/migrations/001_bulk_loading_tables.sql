-- Bulk Loading System Tables for 700K+ Docket Migration
-- Created for Phase 7: Bulk Loading Data Migration

-- Import Jobs tracking table
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    estimated_completion TIMESTAMP,
    throughput_per_hour INTEGER DEFAULT 0,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    data_source TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Import errors tracking
CREATE TABLE IF NOT EXISTS import_errors (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    docket_number VARCHAR(50),
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    field_name VARCHAR(100),
    field_value TEXT,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Import warnings tracking
CREATE TABLE IF NOT EXISTS import_warnings (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    docket_number VARCHAR(50),
    warning_type VARCHAR(50) NOT NULL,
    warning_message TEXT NOT NULL,
    field_name VARCHAR(100),
    field_value TEXT,
    suggested_fix TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Batch processing results
CREATE TABLE IF NOT EXISTS batch_processing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    total_records INTEGER NOT NULL,
    processed_records INTEGER NOT NULL,
    success_records INTEGER NOT NULL,
    error_records INTEGER NOT NULL,
    warnings_count INTEGER DEFAULT 0,
    processing_time_ms BIGINT NOT NULL,
    throughput_per_second DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Generated RFID tags tracking
CREATE TABLE IF NOT EXISTS generated_tags (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) UNIQUE NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'UHF',
    docket_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'assigned', 'damaged', 'lost')),
    generated_at TIMESTAMP DEFAULT NOW(),
    batch_id UUID NOT NULL,
    assigned_at TIMESTAMP,
    released_at TIMESTAMP
);

-- Tag counters for generation
CREATE TABLE IF NOT EXISTS tag_counters (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) UNIQUE NOT NULL,
    next_counter INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Tag mappings (docket to tag relationships)
CREATE TABLE IF NOT EXISTS tag_mappings (
    id SERIAL PRIMARY KEY,
    docket_number VARCHAR(50) NOT NULL,
    rfid_tag_id VARCHAR(50) REFERENCES generated_tags(tag_id),
    tag_type VARCHAR(20) NOT NULL,
    assigned_date TIMESTAMP DEFAULT NOW(),
    released_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'available', 'damaged', 'lost')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Data preparation reports
CREATE TABLE IF NOT EXISTS data_preparation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file VARCHAR(500) NOT NULL,
    original_record_count INTEGER NOT NULL,
    cleaned_record_count INTEGER NOT NULL,
    removed_duplicates INTEGER DEFAULT 0,
    corrected_fields INTEGER DEFAULT 0,
    data_quality_score DECIMAL(5,2) DEFAULT 0,
    preparation_time_ms BIGINT NOT NULL,
    ready_for_import BOOLEAN DEFAULT false,
    issues_found JSONB,
    suggested_actions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Migration progress tracking
CREATE TABLE IF NOT EXISTS migration_progress (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    phase VARCHAR(50) NOT NULL,
    overall_progress DECIMAL(5,2) DEFAULT 0,
    current_operation VARCHAR(200),
    records_processed INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    estimated_time_remaining INTEGER,
    start_time TIMESTAMP DEFAULT NOW(),
    last_update TIMESTAMP DEFAULT NOW(),
    throughput_per_hour INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id SERIAL PRIMARY KEY,
    database_connection BOOLEAN DEFAULT true,
    redis_connection BOOLEAN DEFAULT true,
    disk_space_gb DECIMAL(10,2),
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    active_connections INTEGER,
    import_jobs_running INTEGER DEFAULT 0,
    last_backup TIMESTAMP,
    system_status VARCHAR(20) DEFAULT 'healthy' CHECK (system_status IN ('healthy', 'warning', 'critical')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Backup snapshots tracking
CREATE TABLE IF NOT EXISTS backup_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_name VARCHAR(255) NOT NULL,
    record_count INTEGER NOT NULL,
    file_size_mb DECIMAL(10,2),
    backup_type VARCHAR(20) DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'differential')),
    compression_used BOOLEAN DEFAULT false,
    encryption_used BOOLEAN DEFAULT false,
    storage_location VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Reconciliation reports
CREATE TABLE IF NOT EXISTS reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    total_source_records INTEGER NOT NULL,
    total_imported_records INTEGER NOT NULL,
    missing_records JSONB,
    duplicate_records JSONB,
    modified_records JSONB,
    verification_passed BOOLEAN DEFAULT false,
    discrepancies JSONB,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_import_errors_job_id ON import_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_import_errors_docket ON import_errors(docket_number);
CREATE INDEX IF NOT EXISTS idx_import_warnings_job_id ON import_warnings(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_job_id ON batch_processing_results(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tags_status ON generated_tags(status);
CREATE INDEX IF NOT EXISTS idx_generated_tags_docket ON generated_tags(docket_number);
CREATE INDEX IF NOT EXISTS idx_generated_tags_batch ON generated_tags(batch_id);
CREATE INDEX IF NOT EXISTS idx_tag_mappings_docket ON tag_mappings(docket_number);
CREATE INDEX IF NOT EXISTS idx_tag_mappings_tag ON tag_mappings(rfid_tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_mappings_status ON tag_mappings(status);
CREATE INDEX IF NOT EXISTS idx_migration_progress_job ON migration_progress(job_id);
CREATE INDEX IF NOT EXISTS idx_migration_progress_phase ON migration_progress(phase);
CREATE INDEX IF NOT EXISTS idx_system_health_created ON system_health_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_created ON backup_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_job ON reconciliation_reports(job_id);

-- Insert initial tag counter prefixes
INSERT INTO tag_counters (prefix, next_counter) VALUES 
    ('EVID', 1),
    ('DRUG', 1),
    ('WEAP', 1),
    ('DOC', 1),
    ('BULK', 1)
ON CONFLICT (prefix) DO NOTHING;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER update_import_jobs_updated_at
    BEFORE UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_mappings_updated_at ON tag_mappings;
CREATE TRIGGER update_tag_mappings_updated_at
    BEFORE UPDATE ON tag_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for quick statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS import_statistics AS
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
    SUM(total_records) as total_records_processed,
    SUM(success_records) as total_success_records,
    SUM(error_records) as total_error_records,
    AVG(throughput_per_hour) as avg_throughput_per_hour,
    MAX(created_at) as last_job_created
FROM import_jobs;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_statistics ON import_statistics(total_jobs);

-- Function to refresh statistics
CREATE OR REPLACE FUNCTION refresh_import_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY import_statistics;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE import_jobs IS 'Tracks bulk import jobs for 700K+ docket migration';
COMMENT ON TABLE import_errors IS 'Detailed error tracking for import validation failures';
COMMENT ON TABLE import_warnings IS 'Warning tracking for data quality issues';
COMMENT ON TABLE batch_processing_results IS 'Performance tracking for batch processing operations';
COMMENT ON TABLE generated_tags IS 'RFID tag generation and assignment tracking';
COMMENT ON TABLE tag_mappings IS 'Mapping between dockets and RFID tags';
COMMENT ON TABLE migration_progress IS 'Real-time progress tracking for migration phases';
COMMENT ON TABLE system_health_snapshots IS 'System resource monitoring during migration';
COMMENT ON TABLE backup_snapshots IS 'Backup tracking for rollback capabilities';
COMMENT ON TABLE reconciliation_reports IS 'Data verification and reconciliation results';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO migration_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO migration_user;