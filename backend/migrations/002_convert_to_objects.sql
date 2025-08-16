-- Migration: Convert evidence table to universal objects table
-- Created: 2025-08-14
-- Purpose: Support tracking of dockets, evidence, equipment, files, and any other trackable items

-- Create the new objects table with extended functionality
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) NOT NULL, -- 'docket', 'evidence', 'equipment', 'file', 'tool', etc.
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
    -- Docket-specific fields (stored in metadata but indexed for performance)
    case_number VARCHAR(100) GENERATED ALWAYS AS (metadata->>'case_number') STORED,
    court_date DATE GENERATED ALWAYS AS ((metadata->>'court_date')::date) STORED,
    -- Evidence-specific fields
    evidence_type VARCHAR(50) GENERATED ALWAYS AS (metadata->>'evidence_type') STORED,
    -- Equipment-specific fields  
    serial_number VARCHAR(100) GENERATED ALWAYS AS (metadata->>'serial_number') STORED,
    maintenance_due DATE GENERATED ALWAYS AS ((metadata->>'maintenance_due')::date) STORED
);

-- Create RFID readers table if not exists
CREATE TABLE IF NOT EXISTS rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) UNIQUE NOT NULL,
    reader_type VARCHAR(20) NOT NULL, -- 'fixed' only (no handhelds)
    reader_model VARCHAR(50), -- 'Zebra FX9600'
    location_id INTEGER REFERENCES locations(id),
    ip_address INET,
    status VARCHAR(20) DEFAULT 'active',
    last_ping TIMESTAMP,
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create alerts table for system notifications
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'missing_object', 'unauthorized_access', 'reader_offline', 'maintenance_due'
    object_id INTEGER,
    location_id INTEGER REFERENCES locations(id),
    personnel_id INTEGER REFERENCES personnel(id),
    reader_id INTEGER REFERENCES rfid_readers(id),
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by_id INTEGER REFERENCES personnel(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Migrate existing evidence data to objects table
INSERT INTO objects (
    object_code, 
    name, 
    description, 
    object_type,
    category,
    priority_level, 
    status, 
    rfid_tag_id,
    current_location_id, 
    assigned_to_id, 
    chain_of_custody,
    metadata,
    created_at, 
    updated_at, 
    created_by_id
)
SELECT 
    evidence_code,
    name,
    description,
    'evidence', -- Set all existing records as evidence type
    evidence_type as category, -- Move evidence_type to category
    priority_level,
    status,
    rfid_tag_id,
    current_location_id,
    assigned_to_id,
    chain_of_custody,
    jsonb_build_object('evidence_type', evidence_type) || metadata,
    created_at,
    updated_at,
    created_by_id
FROM evidence
ON CONFLICT (object_code) DO NOTHING;

-- Update audit_logs to reference objects instead of evidence
ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES objects(id);

-- Copy evidence_id to object_id
UPDATE audit_logs 
SET object_id = (
    SELECT o.id 
    FROM objects o 
    JOIN evidence e ON o.object_code = e.evidence_code 
    WHERE e.id = audit_logs.evidence_id
)
WHERE evidence_id IS NOT NULL;

-- Update rfid_events to reference objects
ALTER TABLE rfid_events 
    ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES objects(id);

-- Copy evidence_id to object_id  
UPDATE rfid_events 
SET object_id = (
    SELECT o.id 
    FROM objects o 
    JOIN evidence e ON o.object_code = e.evidence_code 
    WHERE e.id = rfid_events.evidence_id
)
WHERE evidence_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_objects_rfid_tag ON objects(rfid_tag_id);
CREATE INDEX IF NOT EXISTS idx_objects_type_status ON objects(object_type, status);
CREATE INDEX IF NOT EXISTS idx_objects_created_at ON objects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_objects_location ON objects(current_location_id);
CREATE INDEX IF NOT EXISTS idx_objects_assigned_to ON objects(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_objects_case_number ON objects(case_number) WHERE case_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_objects_court_date ON objects(court_date) WHERE court_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfid_readers_location ON rfid_readers(location_id);
CREATE INDEX IF NOT EXISTS idx_rfid_readers_status ON rfid_readers(status);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Create full-text search index on objects
CREATE INDEX IF NOT EXISTS idx_objects_search ON objects USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(object_code, '') || ' ' ||
        COALESCE(category, '') || ' ' ||
        COALESCE(object_type, '')
    )
);

-- Add foreign key constraint after migration
ALTER TABLE alerts 
    ADD CONSTRAINT fk_alerts_object 
    FOREIGN KEY (object_id) 
    REFERENCES objects(id) 
    ON DELETE CASCADE;

-- Insert sample docket data
INSERT INTO objects (object_code, name, description, object_type, category, metadata, current_location_id, created_by_id) VALUES
('DOC-2025-001', 'State vs Johnson', 'Armed robbery case docket', 'docket', 'criminal', 
 '{"case_number": "CR-2025-001", "court_date": "2025-09-15", "prosecutor": "DA Smith", "defendant": "John Johnson"}', 1, 1),
('DOC-2025-002', 'State vs Williams', 'Fraud case docket', 'docket', 'criminal',
 '{"case_number": "CR-2025-002", "court_date": "2025-09-20", "prosecutor": "DA Brown", "defendant": "Jane Williams"}', 1, 1),
('EQP-2025-001', 'Zebra FX9600 Reader #1', 'Fixed RFID reader for main entrance', 'equipment', 'rfid_hardware',
 '{"serial_number": "ZBR-FX9600-001", "maintenance_due": "2025-12-01", "warranty_expires": "2027-08-14"}', 2, 1);

-- Insert sample RFID readers
INSERT INTO rfid_readers (reader_id, reader_type, reader_model, location_id, ip_address, status) VALUES
('FX9600-001', 'fixed', 'Zebra FX9600', 1, '192.168.1.100', 'active'),
('FX9600-002', 'fixed', 'Zebra FX9600', 2, '192.168.1.101', 'active'),
('FX9600-003', 'fixed', 'Zebra FX9600', 3, '192.168.1.102', 'active');

-- Add comments for documentation
COMMENT ON TABLE objects IS 'Universal tracking table for all trackable items: dockets, evidence, equipment, files, etc.';
COMMENT ON TABLE rfid_readers IS 'RFID reader hardware configuration and status';
COMMENT ON TABLE alerts IS 'System alerts and notifications';
COMMENT ON COLUMN objects.object_type IS 'Type of object: docket, evidence, equipment, file, tool, etc.';
COMMENT ON COLUMN objects.metadata IS 'Flexible JSON storage for type-specific properties';

-- Create a view for easy docket access
CREATE OR REPLACE VIEW dockets AS
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

-- Create a view for evidence
CREATE OR REPLACE VIEW evidence_items AS
SELECT 
    id,
    object_code as evidence_code,
    name,
    description,
    category as evidence_category,
    evidence_type,
    status,
    current_location_id,
    assigned_to_id,
    chain_of_custody,
    created_at,
    updated_at
FROM objects
WHERE object_type = 'evidence';

-- Create a view for equipment
CREATE OR REPLACE VIEW equipment AS
SELECT 
    id,
    object_code as equipment_code,
    name,
    description,
    category as equipment_type,
    serial_number,
    maintenance_due,
    status,
    current_location_id,
    assigned_to_id,
    metadata->>'warranty_expires' as warranty_expires,
    created_at,
    updated_at
FROM objects
WHERE object_type = 'equipment';

COMMENT ON VIEW dockets IS 'Convenient view for accessing docket objects';
COMMENT ON VIEW evidence_items IS 'Convenient view for accessing evidence objects';
COMMENT ON VIEW equipment IS 'Convenient view for accessing equipment objects';