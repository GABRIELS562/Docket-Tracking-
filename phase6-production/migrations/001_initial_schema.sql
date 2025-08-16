-- Phase 1: Foundation Setup - Database Schema
-- Universal Object Tracking System for Dockets, Evidence, Equipment, Files
-- Created: 2025-08-14

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Personnel table with role-based access
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'supervisor', 'technician', 'viewer'
    security_clearance VARCHAR(20) DEFAULT 'normal', -- For sensitive materials
    rfid_badge_id VARCHAR(50) UNIQUE, -- Personnel tracking
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
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
    coordinates POINT, -- Physical coordinates for mapping
    rfid_reader_id VARCHAR(50), -- Associated RFID reader
    security_level VARCHAR(20) DEFAULT 'normal',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Universal objects table (supports any trackable item)
CREATE TABLE objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) NOT NULL, -- 'docket', 'evidence', 'equipment', 'file', etc.
    category VARCHAR(100),
    priority_level VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'active',
    rfid_tag_id VARCHAR(50) UNIQUE,
    current_location_id INTEGER REFERENCES locations(id),
    assigned_to_id INTEGER REFERENCES personnel(id),
    chain_of_custody JSONB DEFAULT '[]'::jsonb, -- For forensic compliance
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible properties per object type
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES personnel(id),
    -- Generated columns for type-specific fields
    case_number VARCHAR(100) GENERATED ALWAYS AS (metadata->>'case_number') STORED,
    court_date DATE GENERATED ALWAYS AS ((metadata->>'court_date')::date) STORED,
    serial_number VARCHAR(100) GENERATED ALWAYS AS (metadata->>'serial_number') STORED
);

-- RFID readers table
CREATE TABLE rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) UNIQUE NOT NULL,
    reader_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' only (no handhelds)
    reader_model VARCHAR(50) DEFAULT 'Zebra FX9600',
    location_id INTEGER REFERENCES locations(id),
    ip_address INET,
    status VARCHAR(20) DEFAULT 'active',
    last_ping TIMESTAMP,
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RFID events table (all tag reads)
CREATE TABLE rfid_events (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NOT NULL,
    reader_id VARCHAR(50),
    signal_strength INTEGER,
    event_type VARCHAR(20) DEFAULT 'detected', -- 'detected', 'lost', 'moved'
    location_id INTEGER REFERENCES locations(id),
    object_id INTEGER REFERENCES objects(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

-- Audit logs table (enhanced for forensic compliance)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    object_id INTEGER REFERENCES objects(id),
    personnel_id INTEGER REFERENCES personnel(id),
    action VARCHAR(50) NOT NULL,
    old_location_id INTEGER REFERENCES locations(id),
    new_location_id INTEGER REFERENCES locations(id),
    old_assigned_to_id INTEGER REFERENCES personnel(id),
    new_assigned_to_id INTEGER REFERENCES personnel(id),
    reader_id VARCHAR(50),
    notes TEXT,
    digital_signature TEXT, -- For forensic integrity
    timestamp TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(50),
    ip_address INET
);

-- Import jobs table
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    object_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES personnel(id)
);

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50), -- 'missing_object', 'unauthorized_access', 'reader_offline'
    object_id INTEGER REFERENCES objects(id),
    location_id INTEGER REFERENCES locations(id),
    personnel_id INTEGER REFERENCES personnel(id),
    reader_id INTEGER REFERENCES rfid_readers(id),
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by_id INTEGER REFERENCES personnel(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_objects_rfid_tag ON objects(rfid_tag_id);
CREATE INDEX idx_objects_type_status ON objects(object_type, status);
CREATE INDEX idx_objects_created ON objects(created_at DESC);
CREATE INDEX idx_objects_location ON objects(current_location_id);
CREATE INDEX idx_objects_assigned ON objects(assigned_to_id);
CREATE INDEX idx_objects_case_number ON objects(case_number) WHERE case_number IS NOT NULL;
CREATE INDEX idx_objects_court_date ON objects(court_date) WHERE court_date IS NOT NULL;

CREATE INDEX idx_rfid_events_tag_time ON rfid_events(tag_id, timestamp DESC);
CREATE INDEX idx_rfid_events_processed ON rfid_events(processed);

CREATE INDEX idx_audit_logs_object_time ON audit_logs(object_id, timestamp DESC);
CREATE INDEX idx_audit_logs_personnel ON audit_logs(personnel_id);

CREATE INDEX idx_locations_reader ON locations(rfid_reader_id);
CREATE INDEX idx_personnel_email ON personnel(email);
CREATE INDEX idx_personnel_active ON personnel(active);

CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);

-- Full-text search index
CREATE INDEX idx_objects_search ON objects USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(object_code, '') || ' ' ||
        COALESCE(category, '')
    )
);

-- Create views for easy access
CREATE VIEW dockets AS
SELECT 
    id,
    object_code as docket_code,
    name as case_name,
    description,
    category as case_type,
    status,
    case_number,
    court_date,
    metadata->>'prosecutor' as prosecutor,
    metadata->>'defendant' as defendant,
    current_location_id,
    assigned_to_id,
    created_at,
    updated_at
FROM objects
WHERE object_type = 'docket';

CREATE VIEW evidence_items AS
SELECT 
    id,
    object_code as evidence_code,
    name,
    description,
    category as evidence_category,
    status,
    current_location_id,
    assigned_to_id,
    chain_of_custody,
    created_at,
    updated_at
FROM objects
WHERE object_type = 'evidence';

-- Insert default admin user (password: admin123 - change immediately)
INSERT INTO personnel (employee_id, first_name, last_name, email, password_hash, role, security_clearance) VALUES
('ADMIN001', 'System', 'Administrator', 'admin@dockettrack.gov', '$2b$10$yY7F8EO97cZQYBnZ4nXAfOPXLzZnWzflDcFlELEOhN8s5tLqgP9gK', 'admin', 'high');

-- Insert sample locations
INSERT INTO locations (location_code, location_name, zone, building, floor, room, security_level) VALUES
('MAIN-001', 'Main Docket Storage', 'Storage', 'Building A', 1, '101', 'high'),
('COURT-001', 'Court Room 1', 'Court', 'Building A', 2, '201', 'high'),
('ARCHIVE-001', 'Archive Storage', 'Archive', 'Building B', 0, 'B01', 'normal');

-- Insert sample dockets
INSERT INTO objects (object_code, name, description, object_type, category, metadata, current_location_id, created_by_id) VALUES
('DOC-2025-001', 'State vs Johnson', 'Armed robbery case docket', 'docket', 'criminal', 
 '{"case_number": "CR-2025-001", "court_date": "2025-09-15", "prosecutor": "DA Smith", "defendant": "John Johnson"}', 1, 1),
('DOC-2025-002', 'State vs Williams', 'Fraud case docket', 'docket', 'criminal',
 '{"case_number": "CR-2025-002", "court_date": "2025-09-20", "prosecutor": "DA Brown", "defendant": "Jane Williams"}', 1, 1);

-- Add table comments
COMMENT ON TABLE personnel IS 'System users with role-based access control';
COMMENT ON TABLE locations IS 'Physical locations with RFID reader associations';
COMMENT ON TABLE objects IS 'Universal tracking table for all objects: dockets, evidence, equipment, files';
COMMENT ON TABLE rfid_readers IS 'Zebra FX9600 fixed RFID readers';
COMMENT ON TABLE rfid_events IS 'Real-time RFID tag read events';
COMMENT ON TABLE audit_logs IS 'Complete audit trail for forensic compliance';
COMMENT ON TABLE import_jobs IS 'Bulk import job tracking';
COMMENT ON TABLE alerts IS 'System alerts and notifications';