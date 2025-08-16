-- =====================================================
-- Audit Trail Database Schema (FIXED)
-- Comprehensive logging for government compliance
-- =====================================================

-- Main audit log table for all system actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- User Information
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    user_email VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    
    -- Request Information
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    request_ip INET,
    user_agent TEXT,
    
    -- Change Details
    before_data JSONB,
    after_data JSONB,
    changes JSONB,
    
    -- Context and Metadata
    description TEXT,
    category VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'INFO',
    
    -- Government Compliance Fields
    compliance_level VARCHAR(20) DEFAULT 'STANDARD',
    retention_period INTEGER DEFAULT 2555,
    is_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Technical Details
    transaction_id VARCHAR(100),
    correlation_id VARCHAR(100),
    duration_ms INTEGER,
    
    -- Status and Flags
    status VARCHAR(20) DEFAULT 'SUCCESS',
    error_message TEXT,
    is_automated BOOLEAN DEFAULT FALSE
);

-- Docket-specific audit trail for detailed tracking
CREATE TABLE IF NOT EXISTS docket_audit_trail (
    id SERIAL PRIMARY KEY,
    docket_id INTEGER REFERENCES dockets(id) ON DELETE CASCADE,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- Docket Movement Details
    movement_type VARCHAR(50),
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_storage_box INTEGER REFERENCES storage_boxes(id) ON DELETE SET NULL,
    to_storage_box INTEGER REFERENCES storage_boxes(id) ON DELETE SET NULL,
    
    -- RFID Details
    rfid_reader_id VARCHAR(100),
    rfid_tag VARCHAR(100),
    signal_strength NUMERIC(5,2),
    coordinates JSONB,
    
    -- Request Context
    retrieval_request_id INTEGER REFERENCES retrieval_requests(id) ON DELETE SET NULL,
    reason TEXT,
    authorized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Compliance
    witness_required BOOLEAN DEFAULT FALSE,
    witness_signature TEXT,
    chain_of_custody JSONB
);

-- User action audit for security and compliance
CREATE TABLE IF NOT EXISTS user_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Authentication Events
    login_method VARCHAR(50),
    login_success BOOLEAN,
    failed_attempts INTEGER DEFAULT 0,
    lockout_reason VARCHAR(255),
    
    -- Permission Changes
    old_roles JSONB,
    new_roles JSONB,
    permission_changes JSONB,
    
    -- Profile Changes
    profile_changes JSONB,
    password_changed BOOLEAN DEFAULT FALSE,
    
    -- Session Information
    session_duration INTEGER,
    concurrent_sessions INTEGER,
    device_fingerprint TEXT,
    
    -- Security Events
    suspicious_activity BOOLEAN DEFAULT FALSE,
    security_notes TEXT
);

-- System events audit for infrastructure monitoring
CREATE TABLE IF NOT EXISTS system_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- System Information
    component VARCHAR(100),
    subsystem VARCHAR(100),
    
    -- Event Details
    event_type VARCHAR(50),
    service_version VARCHAR(50),
    
    -- Performance Metrics
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    disk_usage NUMERIC(5,2),
    response_time_ms INTEGER,
    
    -- Error Details
    error_count INTEGER DEFAULT 0,
    error_details JSONB,
    
    -- Maintenance Information
    maintenance_type VARCHAR(50),
    affected_services TEXT[],
    downtime_seconds INTEGER
);

-- Data integrity audit for critical operations
CREATE TABLE IF NOT EXISTS data_integrity_audit (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- Verification Details
    check_type VARCHAR(50),
    table_name VARCHAR(100),
    record_count INTEGER,
    
    -- Hash Information
    data_hash VARCHAR(256),
    previous_hash VARCHAR(256),
    
    -- Validation Results
    validation_passed BOOLEAN DEFAULT TRUE,
    discrepancies JSONB,
    
    -- Backup Information
    backup_id VARCHAR(100),
    backup_location VARCHAR(255),
    
    -- Recovery Details
    recovery_point_objective INTEGER,
    recovery_time_actual INTEGER
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(compliance_level, category, timestamp);

-- Docket audit indexes
CREATE INDEX IF NOT EXISTS idx_docket_audit_docket_id ON docket_audit_trail(docket_id);
CREATE INDEX IF NOT EXISTS idx_docket_audit_movement ON docket_audit_trail(movement_type, actual_time);
CREATE INDEX IF NOT EXISTS idx_docket_audit_rfid ON docket_audit_trail(rfid_tag, actual_time);

-- User audit indexes
CREATE INDEX IF NOT EXISTS idx_user_audit_user_id ON user_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_login ON user_audit_trail(login_success, audit_log_id);

-- System audit indexes
CREATE INDEX IF NOT EXISTS idx_system_audit_component ON system_audit_trail(component, event_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_performance ON system_audit_trail(response_time_ms, audit_log_id);

-- =====================================================
-- AUDIT VIEWS FOR REPORTING
-- =====================================================

-- Comprehensive audit view
CREATE OR REPLACE VIEW v_audit_summary AS
SELECT 
    al.id,
    al.event_id,
    al.timestamp,
    al.user_id,
    al.username,
    al.action_type,
    al.resource_type,
    al.resource_id,
    al.description,
    al.category,
    al.severity,
    al.status,
    al.request_ip,
    al.compliance_level,
    
    -- User details
    u.full_name as user_full_name,
    u.department as user_department,
    
    -- Docket details (if applicable)
    dat.movement_type,
    dat.from_location,
    dat.to_location,
    
    -- System details (if applicable)
    sat.component,
    sat.event_type as system_event_type

FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN docket_audit_trail dat ON al.id = dat.audit_log_id
LEFT JOIN system_audit_trail sat ON al.id = sat.audit_log_id;

-- Security events view
CREATE OR REPLACE VIEW v_security_events AS
SELECT 
    al.*,
    uat.login_success,
    uat.failed_attempts,
    uat.suspicious_activity
FROM audit_logs al
JOIN user_audit_trail uat ON al.id = uat.audit_log_id
WHERE al.category = 'SECURITY_EVENT' 
   OR al.action_type IN ('LOGIN', 'LOGOUT')
   OR uat.suspicious_activity = TRUE;

-- Docket movement history view
CREATE OR REPLACE VIEW v_docket_movements AS
SELECT 
    d.docket_code,
    d.title,
    al.timestamp,
    al.username,
    dat.movement_type,
    dat.from_location,
    dat.to_location,
    dat.rfid_tag,
    dat.reason,
    au.full_name as authorized_by_name
FROM dockets d
JOIN docket_audit_trail dat ON d.id = dat.docket_id
JOIN audit_logs al ON dat.audit_log_id = al.id
LEFT JOIN users au ON dat.authorized_by = au.id
ORDER BY al.timestamp DESC;

-- =====================================================
-- SIMPLIFIED FUNCTIONS (PostgreSQL compatible)
-- =====================================================

-- Function to get audit statistics (simplified)
CREATE OR REPLACE FUNCTION get_audit_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_events BIGINT,
    data_changes BIGINT,
    security_events BIGINT,
    failed_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN action_type IN ('CREATE', 'UPDATE', 'DELETE') THEN 1 END) as data_changes,
        COUNT(CASE WHEN category = 'SECURITY_EVENT' THEN 1 END) as security_events,
        COUNT(CASE WHEN status = 'FAILURE' THEN 1 END) as failed_events
    FROM audit_logs 
    WHERE timestamp > CURRENT_TIMESTAMP - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA AND SETUP
-- =====================================================

-- Create initial system audit entry
INSERT INTO audit_logs (
    action_type, resource_type, description, category, severity,
    user_id, username, is_automated
) VALUES (
    'CREATE', 'audit_system', 
    'Audit trail system initialized and ready for compliance logging',
    'SYSTEM_EVENT', 'INFO', NULL, 'SYSTEM', TRUE
) ON CONFLICT (event_id) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT ON audit_logs TO PUBLIC;
GRANT SELECT ON v_audit_summary TO PUBLIC;
GRANT SELECT ON v_security_events TO PUBLIC;
GRANT SELECT ON v_docket_movements TO PUBLIC;