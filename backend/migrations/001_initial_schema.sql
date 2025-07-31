-- RFID Evidence Management System - Initial Database Schema
-- Created: 2025-01-31

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Personnel table (users of the system)
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    security_clearance VARCHAR(20) DEFAULT 'normal',
    rfid_badge_id VARCHAR(50) UNIQUE,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Locations table (physical locations in the facility)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    description TEXT,
    zone VARCHAR(50),
    building VARCHAR(50),
    floor INTEGER,
    room VARCHAR(50),
    rfid_reader_id VARCHAR(50),
    security_level VARCHAR(20) DEFAULT 'normal',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Evidence table (main entity for tracking objects)
CREATE TABLE evidence (
    id SERIAL PRIMARY KEY,
    evidence_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50),
    priority_level VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'active',
    rfid_tag_id VARCHAR(50) UNIQUE,
    current_location_id INTEGER REFERENCES locations(id),
    assigned_to_id INTEGER REFERENCES personnel(id),
    chain_of_custody JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES personnel(id)
);

-- RFID events table (log of all RFID tag readings)
CREATE TABLE rfid_events (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) NOT NULL,
    reader_id VARCHAR(50),
    signal_strength INTEGER,
    event_type VARCHAR(20) DEFAULT 'read',
    location_id INTEGER REFERENCES locations(id),
    evidence_id INTEGER REFERENCES evidence(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

-- Audit logs table (complete audit trail)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    evidence_id INTEGER REFERENCES evidence(id),
    personnel_id INTEGER REFERENCES personnel(id),
    action VARCHAR(50) NOT NULL,
    old_location_id INTEGER REFERENCES locations(id),
    new_location_id INTEGER REFERENCES locations(id),
    old_assigned_to_id INTEGER REFERENCES personnel(id),
    new_assigned_to_id INTEGER REFERENCES personnel(id),
    notes TEXT,
    digital_signature TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(50),
    ip_address INET
);

-- Import jobs table (track bulk import operations)
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    error_details JSONB,
    started_by_id INTEGER REFERENCES personnel(id),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_evidence_rfid_tag ON evidence(rfid_tag_id);
CREATE INDEX idx_evidence_type_status ON evidence(evidence_type, status);
CREATE INDEX idx_evidence_created_at ON evidence(created_at DESC);
CREATE INDEX idx_evidence_location ON evidence(current_location_id);
CREATE INDEX idx_evidence_assigned_to ON evidence(assigned_to_id);

CREATE INDEX idx_rfid_events_tag_id ON rfid_events(tag_id);
CREATE INDEX idx_rfid_events_timestamp ON rfid_events(timestamp DESC);
CREATE INDEX idx_rfid_events_processed ON rfid_events(processed);

CREATE INDEX idx_audit_logs_evidence_id ON audit_logs(evidence_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE INDEX idx_personnel_email ON personnel(email);
CREATE INDEX idx_personnel_employee_id ON personnel(employee_id);
CREATE INDEX idx_personnel_active ON personnel(active);

CREATE INDEX idx_locations_code ON locations(location_code);
CREATE INDEX idx_locations_reader ON locations(rfid_reader_id);

-- Create full-text search indexes
CREATE INDEX idx_evidence_search ON evidence USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(evidence_code, '')
    )
);

-- Insert initial data
INSERT INTO personnel (employee_id, first_name, last_name, email, password_hash, role, security_clearance) VALUES
('ADMIN001', 'System', 'Administrator', 'admin@forensics.gov', '$2b$10$rQ8QqQqQqQqQqQqQqQqQqO', 'admin', 'high'),
('TECH001', 'John', 'Doe', 'john.doe@forensics.gov', '$2b$10$rQ8QqQqQqQqQqQqQqQqQqO', 'technician', 'normal'),
('VIEW001', 'Jane', 'Smith', 'jane.smith@forensics.gov', '$2b$10$rQ8QqQqQqQqQqQqQqQqQqO', 'viewer', 'normal');

INSERT INTO locations (location_code, location_name, zone, building, floor, room, security_level) VALUES
('STOR-001', 'Main Evidence Storage', 'Evidence', 'Building A', 1, '101', 'high'),
('STOR-002', 'Secondary Storage', 'Evidence', 'Building A', 1, '102', 'normal'),
('LAB-001', 'Forensics Lab 1', 'Laboratory', 'Building B', 2, '201', 'high'),
('LAB-002', 'Forensics Lab 2', 'Laboratory', 'Building B', 2, '202', 'high'),
('ARCH-001', 'Archive Storage', 'Archive', 'Building C', 0, 'B01', 'normal');

-- Insert sample evidence data
INSERT INTO evidence (evidence_code, name, description, evidence_type, current_location_id, created_by_id) VALUES
('EVD-2025-001', 'Case File 2025-001', 'Murder case evidence collection', 'document', 1, 1),
('EVD-2025-002', 'Digital Camera', 'Samsung Galaxy S23 - suspect phone', 'electronics', 1, 1),
('EVD-2025-003', 'Blood Sample', 'Blood sample from crime scene', 'biological', 3, 1);

COMMENT ON TABLE personnel IS 'System users with role-based access control';
COMMENT ON TABLE locations IS 'Physical locations where evidence can be stored';
COMMENT ON TABLE evidence IS 'Main evidence tracking table with RFID integration';
COMMENT ON TABLE rfid_events IS 'Log of all RFID tag read events';
COMMENT ON TABLE audit_logs IS 'Complete audit trail for compliance';

-- End of initial schema