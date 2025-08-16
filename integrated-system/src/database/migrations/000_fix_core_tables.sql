-- =====================================================
-- Fix Core Database Tables
-- Critical tables for system operation
-- =====================================================

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dockets table
CREATE TABLE IF NOT EXISTS dockets (
    id SERIAL PRIMARY KEY,
    docket_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    department_id INTEGER REFERENCES departments(id),
    created_by INTEGER REFERENCES users(id),
    rfid_tag VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create storage zones table
CREATE TABLE IF NOT EXISTS storage_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(20),
    section VARCHAR(50),
    capacity INTEGER DEFAULT 1000,
    current_occupancy INTEGER DEFAULT 0,
    zone_type VARCHAR(50),
    climate_controlled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create storage boxes table
CREATE TABLE IF NOT EXISTS storage_boxes (
    id SERIAL PRIMARY KEY,
    box_code VARCHAR(50) UNIQUE NOT NULL,
    zone_id INTEGER REFERENCES storage_zones(id),
    shelf_number VARCHAR(20),
    position VARCHAR(20),
    capacity INTEGER DEFAULT 50,
    current_items INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available',
    rfid_tag VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create retrieval requests table
CREATE TABLE IF NOT EXISTS retrieval_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    docket_id INTEGER REFERENCES dockets(id),
    requested_by INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    reason TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    needed_by TIMESTAMP,
    fulfilled_date TIMESTAMP,
    fulfilled_by INTEGER REFERENCES users(id)
);

-- Create RFID events table
CREATE TABLE IF NOT EXISTS rfid_events (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid(),
    tag_id VARCHAR(100) NOT NULL,
    reader_id VARCHAR(100),
    event_type VARCHAR(50),
    location VARCHAR(255),
    signal_strength NUMERIC(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    data JSONB
);

-- Create RFID readers table
CREATE TABLE IF NOT EXISTS rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    location VARCHAR(255),
    zone_id INTEGER REFERENCES storage_zones(id),
    status VARCHAR(20) DEFAULT 'active',
    last_ping TIMESTAMP,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    channel VARCHAR(20), -- email, sms, push
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    enabled BOOLEAN DEFAULT TRUE,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create RFID geofences table
CREATE TABLE IF NOT EXISTS rfid_geofences (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    fence_type VARCHAR(20), -- inclusion, exclusion
    boundaries JSONB NOT NULL,
    authorized_tags TEXT[],
    alert_on_entry BOOLEAN DEFAULT TRUE,
    alert_on_exit BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create RFID alerts table
CREATE TABLE IF NOT EXISTS rfid_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    tag_id VARCHAR(100),
    docket_id INTEGER REFERENCES dockets(id),
    location JSONB,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create RFID tracking sessions table
CREATE TABLE IF NOT EXISTS rfid_tracking_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    docket_id INTEGER REFERENCES dockets(id),
    tag_id VARCHAR(100),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    last_seen TIMESTAMP,
    current_location VARCHAR(255),
    path JSONB,
    status VARCHAR(20) DEFAULT 'tracking',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, department, is_admin, is_active)
VALUES ('admin@dockettrack.gov', '$2b$10$8KqRxG9wJK5LH6Xj9kQvJ.P.6hJ9aDzAo4b7XvO9JzVBCNJGT/T3W', 'System Administrator', 'IT Department', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, code, description) VALUES
('Legal Department', 'LEGAL', 'Handles all legal documentation and contracts'),
('Finance Department', 'FIN', 'Manages financial records and invoices'),
('Human Resources', 'HR', 'Employee records and personnel files'),
('Operations', 'OPS', 'Operational documents and procedures'),
('IT Department', 'IT', 'System administration and technical documents')
ON CONFLICT (code) DO NOTHING;

-- Insert sample storage zones
INSERT INTO storage_zones (name, code, building, floor, section, capacity) VALUES
('Main Archive', 'MA-01', 'Building A', 'Basement', 'North', 10000),
('Secure Vault', 'SV-01', 'Building A', 'Basement', 'South', 5000),
('Active Storage', 'AS-01', 'Building B', 'Floor 1', 'East', 3000),
('Cold Storage', 'CS-01', 'Building C', 'Basement', 'West', 8000)
ON CONFLICT (code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_dockets_code ON dockets(docket_code);
CREATE INDEX IF NOT EXISTS idx_dockets_rfid ON dockets(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_rfid_events_tag ON rfid_events(tag_id);
CREATE INDEX IF NOT EXISTS idx_rfid_events_timestamp ON rfid_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_storage_boxes_zone ON storage_boxes(zone_id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;