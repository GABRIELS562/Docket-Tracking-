-- Phase 3: Bulk Import Tables Schema
-- Standalone implementation for bulk import functionality

-- Objects table (supports any trackable item)
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) DEFAULT 'docket',
    category VARCHAR(100),
    priority_level VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'active',
    rfid_tag_id VARCHAR(50) UNIQUE NOT NULL,
    current_location_id INTEGER,
    assigned_to_id INTEGER,
    chain_of_custody JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER
);

-- Import jobs table for tracking bulk imports
CREATE TABLE IF NOT EXISTS import_jobs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_path VARCHAR(500),
    object_type VARCHAR(50) DEFAULT 'docket',
    status VARCHAR(20) DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    processing_time_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER,
    resume_from_row INTEGER DEFAULT 0
);

-- Import job errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS import_errors (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    error_type VARCHAR(50),
    error_message TEXT,
    row_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Import queue table for batch processing
CREATE TABLE IF NOT EXISTS import_queue (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES import_jobs(id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    batch_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for objects table
CREATE INDEX IF NOT EXISTS idx_objects_object_code ON objects(object_code);
CREATE INDEX IF NOT EXISTS idx_objects_rfid_tag ON objects(rfid_tag_id);
CREATE INDEX IF NOT EXISTS idx_objects_type_status ON objects(object_type, status);
CREATE INDEX IF NOT EXISTS idx_objects_created_at ON objects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_objects_location ON objects(current_location_id);
CREATE INDEX IF NOT EXISTS idx_objects_assigned_to ON objects(assigned_to_id);

-- Performance indexes for import tables
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_errors_job ON import_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_import_queue_job_status ON import_queue(job_id, status);

-- Full-text search index for objects
CREATE INDEX IF NOT EXISTS idx_objects_search ON objects USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(object_code, '')
    )
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE
    ON objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stats view for import monitoring
CREATE OR REPLACE VIEW import_stats AS
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
    SUM(total_records) as total_records_imported,
    SUM(successful_records) as total_successful_records,
    SUM(failed_records) as total_failed_records,
    AVG(processing_time_ms) as avg_processing_time_ms
FROM import_jobs;

-- Function to get import job progress
CREATE OR REPLACE FUNCTION get_import_progress(job_id_param INTEGER)
RETURNS TABLE (
    job_id INTEGER,
    filename VARCHAR,
    status VARCHAR,
    progress_percent NUMERIC,
    records_processed INTEGER,
    records_total INTEGER,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ij.id as job_id,
        ij.filename,
        ij.status,
        CASE 
            WHEN ij.total_records > 0 
            THEN ROUND((ij.processed_records::NUMERIC / ij.total_records) * 100, 2)
            ELSE 0
        END as progress_percent,
        ij.processed_records as records_processed,
        ij.total_records as records_total,
        CASE 
            WHEN ij.processed_records > 0 
            THEN ROUND((ij.successful_records::NUMERIC / ij.processed_records) * 100, 2)
            ELSE 0
        END as success_rate
    FROM import_jobs ij
    WHERE ij.id = job_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE objects IS 'Universal tracking table for all object types (dockets, evidence, equipment, files)';
COMMENT ON TABLE import_jobs IS 'Tracks bulk import operations with resume capability';
COMMENT ON TABLE import_errors IS 'Detailed error tracking for failed import records';
COMMENT ON TABLE import_queue IS 'Batch queue for processing large imports';