-- Phase 2: Core Object Management Schema
-- Complete RFID object tracking with chain of custody

-- Create database if not exists
-- Note: Run this separately if needed: CREATE DATABASE docket_tracking_phase2;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS rfid_events CASCADE;
DROP TABLE IF EXISTS import_jobs CASCADE;
DROP TABLE IF EXISTS objects CASCADE;
DROP TABLE IF EXISTS rfid_readers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Personnel table with role-based access
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    department VARCHAR(100),
    role VARCHAR(50), 
    security_clearance VARCHAR(20),
    rfid_badge_id VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Locations table with zone hierarchy
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
    rfid_reader_id VARCHAR(50),
    security_level VARCHAR(20) DEFAULT 'normal',
    capacity INTEGER,
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RFID readers table
CREATE TABLE rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) UNIQUE NOT NULL,
    reader_type VARCHAR(20),
    location_id INTEGER REFERENCES locations(id),
    ip_address INET,
    mac_address VARCHAR(17),
    firmware_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    last_ping TIMESTAMP,
    configuration JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Universal objects table
CREATE TABLE objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    priority_level VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'active',
    rfid_tag_id VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    qr_code VARCHAR(100),
    current_location_id INTEGER REFERENCES locations(id),
    home_location_id INTEGER REFERENCES locations(id),
    assigned_to_id INTEGER REFERENCES personnel(id),
    owner_id INTEGER REFERENCES personnel(id),
    chain_of_custody JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    retention_date DATE,
    disposal_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES personnel(id),
    last_modified_by_id INTEGER REFERENCES personnel(id)
);

-- RFID events table
CREATE TABLE rfid_events (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NOT NULL,
    reader_id VARCHAR(50) REFERENCES rfid_readers(reader_id),
    signal_strength INTEGER,
    antenna_port INTEGER,
    event_type VARCHAR(20),
    location_id INTEGER REFERENCES locations(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    raw_data JSONB
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
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
    timestamp TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(50)
);

-- Import jobs table
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(50) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    filename VARCHAR(255) NOT NULL,
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

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50),
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

-- Create indexes for performance
CREATE INDEX idx_objects_rfid_tag ON objects(rfid_tag_id);
CREATE INDEX idx_objects_type_status ON objects(object_type, status);
CREATE INDEX idx_objects_location ON objects(current_location_id);
CREATE INDEX idx_objects_assigned ON objects(assigned_to_id);
CREATE INDEX idx_objects_created ON objects(created_at DESC);
CREATE INDEX idx_objects_search ON objects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_rfid_events_tag_time ON rfid_events(tag_id, timestamp DESC);
CREATE INDEX idx_rfid_events_reader ON rfid_events(reader_id);
CREATE INDEX idx_rfid_events_location ON rfid_events(location_id);
CREATE INDEX idx_rfid_events_unprocessed ON rfid_events(processed) WHERE processed = false;

CREATE INDEX idx_audit_logs_object_time ON audit_logs(object_id, timestamp DESC);
CREATE INDEX idx_audit_logs_personnel ON audit_logs(personnel_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE INDEX idx_locations_reader ON locations(rfid_reader_id);
CREATE INDEX idx_locations_zone ON locations(zone);

CREATE INDEX idx_alerts_unacknowledged ON alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX idx_alerts_object ON alerts(object_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Insert default data
INSERT INTO users (email, password_hash, role) VALUES
    ('admin@dockettrack.gov', '$2a$10$YourHashHere', 'admin'),
    ('supervisor@dockettrack.gov', '$2a$10$YourHashHere', 'supervisor'),
    ('user@dockettrack.gov', '$2a$10$YourHashHere', 'user');

INSERT INTO personnel (user_id, employee_id, first_name, last_name, email, department, role) VALUES
    (1, 'EMP001', 'System', 'Admin', 'admin@dockettrack.gov', 'IT', 'admin'),
    (2, 'EMP002', 'John', 'Supervisor', 'supervisor@dockettrack.gov', 'Operations', 'supervisor'),
    (3, 'EMP003', 'Jane', 'User', 'user@dockettrack.gov', 'Operations', 'user');

INSERT INTO locations (location_code, location_name, description, zone, building) VALUES
    ('LOC-001', 'Main Entrance', 'Building main entrance', 'PUBLIC', 'MAIN'),
    ('LOC-002', 'Evidence Room A', 'Secure evidence storage', 'SECURE', 'MAIN'),
    ('LOC-003', 'Processing Lab', 'Evidence processing area', 'RESTRICTED', 'MAIN'),
    ('LOC-004', 'Archive Storage', 'Long-term storage', 'SECURE', 'WAREHOUSE'),
    ('LOC-005', 'Dispatch Area', 'Item dispatch zone', 'OPERATIONAL', 'MAIN');

-- Create views for common queries
CREATE OR REPLACE VIEW object_current_status AS
SELECT 
    o.*,
    l.location_name,
    l.zone,
    p.first_name || ' ' || p.last_name as assigned_to_name,
    owner.first_name || ' ' || owner.last_name as owner_name
FROM objects o
LEFT JOIN locations l ON o.current_location_id = l.id
LEFT JOIN personnel p ON o.assigned_to_id = p.id
LEFT JOIN personnel owner ON o.owner_id = owner.id;

CREATE OR REPLACE VIEW recent_object_movements AS
SELECT 
    al.timestamp,
    o.object_code,
    o.name as object_name,
    old_loc.location_name as from_location,
    new_loc.location_name as to_location,
    p.first_name || ' ' || p.last_name as moved_by
FROM audit_logs al
JOIN objects o ON al.object_id = o.id
LEFT JOIN locations old_loc ON al.old_location_id = old_loc.id
LEFT JOIN locations new_loc ON al.new_location_id = new_loc.id
LEFT JOIN personnel p ON al.personnel_id = p.id
WHERE al.action = 'location_update'
ORDER BY al.timestamp DESC
LIMIT 100;

-- Grant permissions (adjust as needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO docket_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO docket_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO docket_user;