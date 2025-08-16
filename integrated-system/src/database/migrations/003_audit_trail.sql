-- =====================================================
-- Audit Trail Database Schema
-- Comprehensive logging for government compliance
-- =====================================================

-- Main audit log table for all system actions
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- User Information
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    user_email VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource_type VARCHAR(50) NOT NULL, -- docket, user, storage_box, retrieval_request, etc.
    resource_id VARCHAR(100), -- ID of the affected resource
    
    -- Request Information
    endpoint VARCHAR(255), -- API endpoint called
    http_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_ip INET,
    user_agent TEXT,
    
    -- Change Details
    before_data JSONB, -- Data before change (for updates/deletes)
    after_data JSONB, -- Data after change (for creates/updates)
    changes JSONB, -- Specific fields that changed
    
    -- Context and Metadata
    description TEXT, -- Human readable description
    category VARCHAR(50), -- AUTHENTICATION, DATA_CHANGE, SYSTEM_EVENT, etc.
    severity VARCHAR(20) DEFAULT 'INFO', -- DEBUG, INFO, WARN, ERROR, CRITICAL
    
    -- Government Compliance Fields
    compliance_level VARCHAR(20) DEFAULT 'STANDARD', -- STANDARD, CONFIDENTIAL, SECRET
    retention_period INTEGER DEFAULT 2555, -- Days to retain (7 years default)
    is_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Technical Details
    transaction_id VARCHAR(100), -- Database transaction ID if applicable
    correlation_id VARCHAR(100), -- For tracking related events
    duration_ms INTEGER, -- Request duration in milliseconds
    
    -- Status and Flags
    status VARCHAR(20) DEFAULT 'SUCCESS', -- SUCCESS, FAILURE, PARTIAL
    error_message TEXT,
    is_automated BOOLEAN DEFAULT FALSE, -- True for system-generated events
    
    -- Indexing for performance
    CONSTRAINT valid_action_type CHECK (action_type IN (
        'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
        'SEARCH', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'ASSIGN',
        'MOVE', 'TRANSFER', 'ARCHIVE', 'RESTORE', 'BACKUP'
    )),
    CONSTRAINT valid_category CHECK (category IN (
        'AUTHENTICATION', 'DATA_CHANGE', 'SYSTEM_EVENT', 'SECURITY_EVENT',
        'RFID_EVENT', 'STORAGE_EVENT', 'USER_MANAGEMENT', 'COMPLIANCE_EVENT'
    )),
    CONSTRAINT valid_severity CHECK (severity IN (
        'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'
    ))
);

-- Docket-specific audit trail for detailed tracking
CREATE TABLE docket_audit_trail (
    id SERIAL PRIMARY KEY,
    docket_id INTEGER REFERENCES dockets(id) ON DELETE CASCADE,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- Docket Movement Details
    movement_type VARCHAR(50), -- check-in, check-out, transfer, locate, search
    from_location VARCHAR(255), -- Previous location
    to_location VARCHAR(255), -- New location
    from_storage_box INTEGER REFERENCES storage_boxes(id) ON DELETE SET NULL,
    to_storage_box INTEGER REFERENCES storage_boxes(id) ON DELETE SET NULL,
    
    -- RFID Details
    rfid_reader_id VARCHAR(100),
    rfid_tag VARCHAR(100),
    signal_strength NUMERIC(5,2),
    coordinates JSONB, -- {x, y, z, accuracy}
    
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
    chain_of_custody JSONB -- Array of custody transfer records
);

-- User action audit for security and compliance
CREATE TABLE user_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Authentication Events
    login_method VARCHAR(50), -- password, sso, api_key
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
    session_duration INTEGER, -- in seconds
    concurrent_sessions INTEGER,
    device_fingerprint TEXT,
    
    -- Security Events
    suspicious_activity BOOLEAN DEFAULT FALSE,
    security_notes TEXT
);

-- System events audit for infrastructure monitoring
CREATE TABLE system_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- System Information
    component VARCHAR(100), -- database, rfid_service, cache, etc.
    subsystem VARCHAR(100), -- authentication, storage, tracking, etc.
    
    -- Event Details
    event_type VARCHAR(50), -- startup, shutdown, error, warning, maintenance
    service_version VARCHAR(50),
    
    -- Performance Metrics
    cpu_usage NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    disk_usage NUMERIC(5,2),
    response_time_ms INTEGER,
    
    -- Configuration Changes
    config_changes JSONB,
    environment_variables JSONB,
    
    -- Error Details
    error_code VARCHAR(50),
    stack_trace TEXT,
    
    -- Maintenance
    maintenance_window BOOLEAN DEFAULT FALSE,
    backup_status VARCHAR(20), -- success, failure, in_progress
    
    -- Health Metrics
    database_connections INTEGER,
    active_sessions INTEGER,
    queue_length INTEGER
);

-- Data integrity audit for compliance
CREATE TABLE data_integrity_audit (
    id SERIAL PRIMARY KEY,
    audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- Data Verification
    table_name VARCHAR(100) NOT NULL,
    record_count INTEGER,
    checksum VARCHAR(255),
    
    -- Integrity Checks
    validation_rules_passed INTEGER DEFAULT 0,
    validation_rules_failed INTEGER DEFAULT 0,
    constraint_violations JSONB,
    
    -- Backup and Recovery
    backup_verified BOOLEAN DEFAULT FALSE,
    recovery_tested BOOLEAN DEFAULT FALSE,
    
    -- Compliance Status
    compliance_check_passed BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT,
    
    -- Timestamps
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_verification TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action_type, timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp);
CREATE INDEX idx_audit_logs_compliance ON audit_logs(compliance_level, category, timestamp);

-- Docket audit indexes
CREATE INDEX idx_docket_audit_docket_id ON docket_audit_trail(docket_id);
CREATE INDEX idx_docket_audit_movement ON docket_audit_trail(movement_type, actual_time);
CREATE INDEX idx_docket_audit_rfid ON docket_audit_trail(rfid_tag, actual_time);

-- User audit indexes
CREATE INDEX idx_user_audit_user_id ON user_audit_trail(user_id);
CREATE INDEX idx_user_audit_login ON user_audit_trail(login_success, audit_log_id);

-- System audit indexes
CREATE INDEX idx_system_audit_component ON system_audit_trail(component, event_type);
CREATE INDEX idx_system_audit_performance ON system_audit_trail(response_time_ms, audit_log_id);

-- =====================================================
-- AUDIT VIEWS FOR REPORTING
-- =====================================================

-- Comprehensive audit view
CREATE VIEW v_audit_summary AS
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
CREATE VIEW v_security_events AS
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
CREATE VIEW v_docket_movements AS
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
-- FUNCTIONS FOR AUDIT MANAGEMENT
-- =====================================================

-- Function to clean up old audit records based on retention policy
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 day' * retention_period;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (
        action_type, resource_type, description, category, 
        is_automated, user_id, username
    ) VALUES (
        'DELETE', 'audit_logs', 
        'Automated cleanup removed ' || deleted_count || ' old audit records',
        'SYSTEM_EVENT', TRUE, NULL, 'SYSTEM'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_events BIGINT,
    user_actions BIGINT,
    system_events BIGINT,
    security_events BIGINT,
    data_changes BIGINT,
    failed_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE category = 'DATA_CHANGE') as user_actions,
        COUNT(*) FILTER (WHERE category = 'SYSTEM_EVENT') as system_events,
        COUNT(*) FILTER (WHERE category = 'SECURITY_EVENT') as security_events,
        COUNT(*) FILTER (WHERE action_type IN ('CREATE', 'UPDATE', 'DELETE')) as data_changes,
        COUNT(*) FILTER (WHERE status = 'FAILURE') as failed_events
    FROM audit_logs 
    WHERE timestamp::date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Function to automatically audit docket changes
CREATE OR REPLACE FUNCTION audit_docket_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_id INTEGER;
    action_desc TEXT;
BEGIN
    -- Determine action description
    IF TG_OP = 'INSERT' THEN
        action_desc := 'Docket created: ' || NEW.docket_code;
    ELSIF TG_OP = 'UPDATE' THEN
        action_desc := 'Docket modified: ' || NEW.docket_code;
    ELSIF TG_OP = 'DELETE' THEN
        action_desc := 'Docket deleted: ' || OLD.docket_code;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        action_type, resource_type, resource_id, description,
        category, before_data, after_data, is_automated
    ) VALUES (
        TG_OP, 'docket', 
        COALESCE(NEW.id::text, OLD.id::text),
        action_desc, 'DATA_CHANGE',
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
        TRUE
    ) RETURNING id INTO audit_id;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic audit logging
CREATE TRIGGER trigger_audit_dockets
    AFTER INSERT OR UPDATE OR DELETE ON dockets
    FOR EACH ROW EXECUTE FUNCTION audit_docket_changes();

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
);

-- Grant appropriate permissions
GRANT SELECT ON audit_logs TO PUBLIC;
GRANT SELECT ON v_audit_summary TO PUBLIC;
GRANT SELECT ON v_security_events TO PUBLIC;
GRANT SELECT ON v_docket_movements TO PUBLIC;