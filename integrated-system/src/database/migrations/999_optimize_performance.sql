-- Performance Optimization Migration
-- Adds indexes, constraints, and optimizations for production use

-- Dockets table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_status ON dockets(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_created_at ON dockets(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_department_id ON dockets(department_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_category ON dockets(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_priority ON dockets(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_location ON dockets(location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_docket_number ON dockets(docket_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_title_gin ON dockets USING gin(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_description_gin ON dockets USING gin(to_tsvector('english', description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dockets_full_text ON dockets USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(category, '') || ' ' ||
        COALESCE(docket_number, '')
    )
);

-- Audit logs optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_compliance_level ON audit_logs(compliance_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp_user ON audit_logs(timestamp, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp_action ON audit_logs(timestamp, action);

-- Composite index for common audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp DESC);

-- RFID events optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_timestamp ON rfid_events(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_tag_id ON rfid_events(tag_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_reader_id ON rfid_events(reader_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_tag_timestamp ON rfid_events(tag_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_reader_timestamp ON rfid_events(reader_id, timestamp DESC);

-- GiST index for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_events_location ON rfid_events USING gist(
    ll_to_earth(
        (location->>'lat')::double precision,
        (location->>'lng')::double precision
    )
) WHERE location IS NOT NULL;

-- Users table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Retrieval requests optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retrieval_requests_status ON retrieval_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retrieval_requests_requested_date ON retrieval_requests(requested_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retrieval_requests_requested_by ON retrieval_requests(requested_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retrieval_requests_department_id ON retrieval_requests(department_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retrieval_requests_docket_id ON retrieval_requests(docket_id);

-- Storage zones optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_zones_building_floor ON storage_zones(building, floor);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_zones_capacity ON storage_zones(capacity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_zones_current_occupancy ON storage_zones(current_occupancy);

-- Data changes optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_changes_audit_log_id ON data_changes(audit_log_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_changes_table_name ON data_changes(table_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_changes_record_id ON data_changes(record_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_changes_operation ON data_changes(operation);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_changes_changed_by ON data_changes(changed_by);

-- Docket movements optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_audit_log_id ON docket_movements(audit_log_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_docket_id ON docket_movements(docket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_from_location ON docket_movements(from_location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_to_location ON docket_movements(to_location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_moved_by ON docket_movements(moved_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docket_movements_rfid_tag ON docket_movements(rfid_tag);

-- System audit trail optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_audit_trail_audit_log_id ON system_audit_trail(audit_log_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_audit_trail_component ON system_audit_trail(component);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_audit_trail_cpu_usage ON system_audit_trail(cpu_usage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_audit_trail_memory_usage ON system_audit_trail(memory_usage);

-- Compliance reports optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reports_audit_log_id ON compliance_reports(audit_log_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reports_report_period_start ON compliance_reports(report_period_start);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reports_report_period_end ON compliance_reports(report_period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reports_compliance_level ON compliance_reports(compliance_level);

-- Add materialized views for common aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_docket_stats AS
SELECT 
    status,
    category,
    priority,
    department_id,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400) as avg_age_days
FROM dockets 
GROUP BY status, category, priority, department_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_docket_stats ON mv_docket_stats(status, category, priority, department_id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_docket_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_docket_stats;
END;
$$ LANGUAGE plpgsql;

-- Daily usage statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_usage AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    action,
    entity_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp), action, entity_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_usage ON mv_daily_usage(date, action, entity_type);

-- RFID activity summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_rfid_activity AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    reader_id,
    COUNT(*) as scan_count,
    AVG(signal_strength) as avg_signal_strength,
    COUNT(DISTINCT tag_id) as unique_tags
FROM rfid_events
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), reader_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_rfid_activity ON mv_rfid_activity(hour, reader_id);

-- Add triggers for automatic stats refresh
CREATE OR REPLACE FUNCTION trigger_refresh_stats()
RETURNS trigger AS $$
BEGIN
    -- Refresh stats asynchronously
    PERFORM pg_notify('refresh_stats', 'docket_stats');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS tr_dockets_stats_refresh ON dockets;
CREATE TRIGGER tr_dockets_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON dockets
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_stats();

-- Partitioning for audit_logs (by month)
-- Note: This would require data migration in production
/*
CREATE TABLE IF NOT EXISTS audit_logs_template (LIKE audit_logs INCLUDING ALL);

-- Create partitions for current and next 12 months
DO $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
    i integer;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    
    FOR i IN 0..12 LOOP
        end_date := start_date + interval '1 month';
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
            
        start_date := end_date;
    END LOOP;
END $$;
*/

-- Database maintenance functions
CREATE OR REPLACE FUNCTION analyze_all_tables()
RETURNS void AS $$
BEGIN
    ANALYZE dockets;
    ANALYZE audit_logs;
    ANALYZE rfid_events;
    ANALYZE users;
    ANALYZE retrieval_requests;
    ANALYZE storage_zones;
    ANALYZE data_changes;
    ANALYZE docket_movements;
    ANALYZE system_audit_trail;
    ANALYZE compliance_reports;
END;
$$ LANGUAGE plpgsql;

-- Vacuum maintenance function
CREATE OR REPLACE FUNCTION vacuum_maintenance()
RETURNS void AS $$
BEGIN
    VACUUM ANALYZE dockets;
    VACUUM ANALYZE audit_logs;
    VACUUM ANALYZE rfid_events;
    VACUUM ANALYZE retrieval_requests;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring views
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking more than 1 second on average
ORDER BY mean_time DESC;

CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Add constraint for data integrity
ALTER TABLE dockets ADD CONSTRAINT chk_dockets_status 
    CHECK (status IN ('active', 'archived', 'deleted', 'in_retrieval'));

ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_compliance_level 
    CHECK (compliance_level IN ('STANDARD', 'CONFIDENTIAL', 'SECRET'));

ALTER TABLE rfid_events ADD CONSTRAINT chk_rfid_events_signal_strength 
    CHECK (signal_strength >= 0 AND signal_strength <= 1);

-- Add comments for documentation
COMMENT ON INDEX idx_dockets_full_text IS 'Full-text search index for dockets using GIN';
COMMENT ON MATERIALIZED VIEW mv_docket_stats IS 'Aggregated docket statistics refreshed hourly';
COMMENT ON FUNCTION refresh_docket_stats() IS 'Manually refresh docket statistics materialized view';

-- Grant permissions for application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;