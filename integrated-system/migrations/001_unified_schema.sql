-- Unified RFID Docket Tracking System Schema
-- Combines all phases without duplicates
-- Created: 2025-08-15

-- Drop existing schema if exists (for clean setup)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users table for authentication (unified from multiple phases)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, supervisor, user, viewer
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Personnel table (employees/staff)
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    department VARCHAR(100),
    role VARCHAR(50),
    security_clearance VARCHAR(20) DEFAULT 'normal',
    rfid_badge_id VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Locations with RFID zones
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    description TEXT,
    zone VARCHAR(50),
    building VARCHAR(50),
    floor INTEGER,
    room VARCHAR(50),
    coordinates POINT,
    capacity INTEGER,
    security_level VARCHAR(20) DEFAULT 'normal',
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RFID readers
CREATE TABLE rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) UNIQUE NOT NULL,
    reader_type VARCHAR(20) DEFAULT 'fixed', -- fixed, handheld
    model VARCHAR(50), -- e.g., 'Zebra FX9600'
    location_id INTEGER REFERENCES locations(id),
    ip_address INET,
    mac_address VARCHAR(17),
    firmware_version VARCHAR(50),
    mqtt_topic VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    last_ping TIMESTAMP,
    configuration JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Main objects table (universal tracking)
CREATE TABLE objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) NOT NULL, -- docket, evidence, equipment, file, tool
    category VARCHAR(100),
    subcategory VARCHAR(100),
    priority_level VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'active',
    
    -- RFID & Identification
    rfid_tag_id VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    qr_code VARCHAR(100),
    
    -- Location & Assignment
    current_location_id INTEGER REFERENCES locations(id),
    home_location_id INTEGER REFERENCES locations(id),
    assigned_to_id INTEGER REFERENCES personnel(id),
    owner_id INTEGER REFERENCES personnel(id),
    
    -- Metadata
    chain_of_custody JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Dates
    retention_date DATE,
    disposal_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Tracking
    created_by_id INTEGER REFERENCES personnel(id),
    last_modified_by_id INTEGER REFERENCES personnel(id)
);

-- ==========================================
-- RFID & TRACKING TABLES
-- ==========================================

-- RFID events (all tag reads) - simplified without partitioning for now
CREATE TABLE rfid_events (
    id BIGSERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NOT NULL,
    reader_id VARCHAR(50) REFERENCES rfid_readers(reader_id),
    signal_strength INTEGER,
    antenna_port INTEGER,
    event_type VARCHAR(20), -- detected, lost, moved
    location_id INTEGER REFERENCES locations(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    raw_data JSONB,
    created_at DATE DEFAULT CURRENT_DATE
);

-- Audit logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    object_id INTEGER REFERENCES objects(id),
    personnel_id INTEGER REFERENCES personnel(id),
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    old_location_id INTEGER REFERENCES locations(id),
    new_location_id INTEGER REFERENCES locations(id),
    reader_id VARCHAR(50),
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    digital_signature TEXT,
    session_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- IMPORT & BULK OPERATIONS
-- ==========================================

-- Import jobs for bulk data
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(50) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    object_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    error_log TEXT,
    mapping_config JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES personnel(id)
);

-- Import batches for tracking progress
CREATE TABLE import_batches (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES import_jobs(id),
    batch_number INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    records_count INTEGER,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- ==========================================
-- ALERTS & NOTIFICATIONS
-- ==========================================

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50), -- missing_object, unauthorized_access, reader_offline
    severity VARCHAR(20) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    object_id INTEGER REFERENCES objects(id),
    location_id INTEGER REFERENCES locations(id),
    personnel_id INTEGER REFERENCES personnel(id),
    reader_id VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by_id INTEGER REFERENCES personnel(id),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_by_id INTEGER REFERENCES personnel(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Objects indexes
CREATE INDEX idx_objects_rfid_tag ON objects(rfid_tag_id);
CREATE INDEX idx_objects_type_status ON objects(object_type, status);
CREATE INDEX idx_objects_location ON objects(current_location_id);
CREATE INDEX idx_objects_assigned ON objects(assigned_to_id);
CREATE INDEX idx_objects_created ON objects(created_at DESC);
CREATE INDEX idx_objects_search ON objects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- RFID events indexes
CREATE INDEX idx_rfid_events_tag_time ON rfid_events(tag_id, timestamp DESC);
CREATE INDEX idx_rfid_events_reader ON rfid_events(reader_id);
CREATE INDEX idx_rfid_events_location ON rfid_events(location_id);
CREATE INDEX idx_rfid_events_unprocessed ON rfid_events(processed) WHERE processed = false;

-- Audit logs indexes
CREATE INDEX idx_audit_logs_object_time ON audit_logs(object_id, timestamp DESC);
CREATE INDEX idx_audit_logs_personnel ON audit_logs(personnel_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Other indexes
CREATE INDEX idx_locations_reader ON locations(location_code);
CREATE INDEX idx_alerts_unacknowledged ON alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_personnel_email ON personnel(email);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON objects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfid_readers_updated_at BEFORE UPDATE ON rfid_readers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Current object status with location
CREATE OR REPLACE VIEW object_current_status AS
SELECT 
    o.*,
    l.location_name,
    l.zone,
    l.building,
    p.first_name || ' ' || p.last_name as assigned_to_name,
    owner.first_name || ' ' || owner.last_name as owner_name,
    creator.first_name || ' ' || creator.last_name as created_by_name
FROM objects o
LEFT JOIN locations l ON o.current_location_id = l.id
LEFT JOIN personnel p ON o.assigned_to_id = p.id
LEFT JOIN personnel owner ON o.owner_id = owner.id
LEFT JOIN personnel creator ON o.created_by_id = creator.id;

-- Recent object movements
CREATE OR REPLACE VIEW recent_object_movements AS
SELECT 
    al.timestamp,
    o.object_code,
    o.name as object_name,
    o.object_type,
    old_loc.location_name as from_location,
    new_loc.location_name as to_location,
    p.first_name || ' ' || p.last_name as moved_by,
    al.notes
FROM audit_logs al
JOIN objects o ON al.object_id = o.id
LEFT JOIN locations old_loc ON al.old_location_id = old_loc.id
LEFT JOIN locations new_loc ON al.new_location_id = new_loc.id
LEFT JOIN personnel p ON al.personnel_id = p.id
WHERE al.action IN ('location_update', 'moved')
ORDER BY al.timestamp DESC
LIMIT 100;

-- Reader status view
CREATE OR REPLACE VIEW reader_status AS
SELECT 
    r.*,
    l.location_name,
    COUNT(DISTINCT e.tag_id) as tags_detected_today,
    MAX(e.timestamp) as last_event_time
FROM rfid_readers r
LEFT JOIN locations l ON r.location_id = l.id
LEFT JOIN rfid_events e ON r.reader_id = e.reader_id 
    AND e.timestamp > CURRENT_DATE
GROUP BY r.id, l.location_name;

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Default admin user
INSERT INTO users (email, password_hash, role) VALUES
    ('admin@dockettrack.gov', '$2a$10$rBaVoEKxJwQJNg5q8W9FO.w2VZqCkpXQ5KzJHpDmX8AKmqbVqzqse', 'admin'); -- Password: admin123

-- Default personnel
INSERT INTO personnel (user_id, employee_id, first_name, last_name, email, department, role) VALUES
    (1, 'EMP001', 'System', 'Admin', 'admin@dockettrack.gov', 'IT', 'admin');

-- Default locations
INSERT INTO locations (location_code, location_name, description, zone, building) VALUES
    ('LOC-001', 'Main Entrance', 'Building main entrance with RFID portal', 'PUBLIC', 'MAIN'),
    ('LOC-002', 'Evidence Room A', 'Secure evidence storage room', 'SECURE', 'MAIN'),
    ('LOC-003', 'Processing Lab', 'Evidence processing laboratory', 'RESTRICTED', 'MAIN'),
    ('LOC-004', 'Archive Storage', 'Long-term document storage', 'SECURE', 'WAREHOUSE'),
    ('LOC-005', 'Dispatch Area', 'Item dispatch and receiving', 'OPERATIONAL', 'MAIN'),
    ('LOC-006', 'Court Prep Room', 'Court document preparation', 'RESTRICTED', 'MAIN'),
    ('LOC-007', 'Digital Evidence Lab', 'Digital forensics laboratory', 'SECURE', 'TECH'),
    ('LOC-008', 'Temporary Storage', 'Short-term storage area', 'OPERATIONAL', 'MAIN');

-- Sample RFID readers
INSERT INTO rfid_readers (reader_id, reader_type, model, location_id, ip_address, status) VALUES
    ('READER-001', 'fixed', 'Zebra FX9600', 1, '192.168.1.101', 'active'),
    ('READER-002', 'fixed', 'Zebra FX9600', 2, '192.168.1.102', 'active'),
    ('READER-003', 'fixed', 'Zebra FX9600', 3, '192.168.1.103', 'active'),
    ('READER-004', 'handheld', 'Zebra MC3390R', NULL, '192.168.1.201', 'active');

-- ==========================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ==========================================

-- Function to generate unique RFID tag
CREATE OR REPLACE FUNCTION generate_rfid_tag()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'TAG-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Function to move object and create audit trail
CREATE OR REPLACE FUNCTION move_object(
    p_object_id INTEGER,
    p_new_location_id INTEGER,
    p_personnel_id INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_location_id INTEGER;
BEGIN
    -- Get current location
    SELECT current_location_id INTO v_old_location_id
    FROM objects WHERE id = p_object_id;
    
    -- Update object location
    UPDATE objects 
    SET current_location_id = p_new_location_id,
        last_modified_by_id = p_personnel_id
    WHERE id = p_object_id;
    
    -- Create audit log
    INSERT INTO audit_logs (
        object_id, personnel_id, action,
        old_location_id, new_location_id, notes
    ) VALUES (
        p_object_id, p_personnel_id, 'location_update',
        v_old_location_id, p_new_location_id, p_notes
    );
    
    -- Update chain of custody
    UPDATE objects 
    SET chain_of_custody = chain_of_custody || jsonb_build_object(
        'timestamp', NOW(),
        'action', 'moved',
        'from_location_id', v_old_location_id,
        'to_location_id', p_new_location_id,
        'personnel_id', p_personnel_id,
        'notes', p_notes
    )
    WHERE id = p_object_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO docket_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO docket_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO docket_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Unified RFID Docket Tracking System schema created successfully!';
    RAISE NOTICE 'Default admin user: admin@dockettrack.gov / admin123';
    RAISE NOTICE 'Database is ready for integrated system operation';
END $$;